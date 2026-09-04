-- Almoxarifado — Fase 1 (schema, movimentos imutáveis, custo médio, reservas)
-- Convenções aprovadas:
--  * movimentos append-only são a fonte de verdade; saldo é view SQL comum
--  * custo médio global por item, calculado em trigger BEFORE INSERT com advisory lock
--  * quantidade recebida da OC é derivada dos movimentos entrada_oc (sem coluna mutável)
--  * catálogo mestre = almox_itens; projeto_insumos.almox_item_id é o vínculo

create extension if not exists pg_trgm;
create extension if not exists unaccent;

------------------------------------------------------------------
-- 0. Helpers
------------------------------------------------------------------

-- Normalização determinística (IMMUTABLE) para unicidade e comparação.
create or replace function public.almox_norm(_t text)
returns text
language sql
immutable
as $$
  select nullif(
    regexp_replace(
      lower(translate(coalesce(_t,''),
        'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäéèêëíìîïóòôõöúùûüçñ',
        'AAAAAEEEEIIIIOOOOOUUUUCNaaaaaeeeeiiiiooooouuuucn')),
      '[^a-z0-9]', '', 'g'),
    '');
$$;

-- Namespace fixo dos advisory locks do almoxarifado.
create or replace function public.almox_lock_classid()
returns integer
language sql
immutable
as $$ select 918273 $$;

create sequence if not exists public.almox_item_codigo_seq;

------------------------------------------------------------------
-- 1. Unidades
------------------------------------------------------------------

create table if not exists public.almox_unidades (
  codigo text primary key,
  descricao text not null,
  casas_decimais smallint not null default 2 check (casas_decimais between 0 and 4),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

grant select on public.almox_unidades to authenticated;
grant all on public.almox_unidades to service_role;
alter table public.almox_unidades enable row level security;

drop policy if exists almox_unidades_select on public.almox_unidades;
create policy almox_unidades_select on public.almox_unidades
  for select to authenticated using (
    public.can_access_module(auth.uid(), 'compras'::public.app_module)
    or public.can_access_module(auth.uid(), 'engenharia'::public.app_module)
  );

drop policy if exists almox_unidades_write on public.almox_unidades;
create policy almox_unidades_write on public.almox_unidades
  for all to authenticated using (
    public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
    or public.has_role(auth.uid(),'purchasing')
  ) with check (
    public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
    or public.has_role(auth.uid(),'purchasing')
  );

insert into public.almox_unidades (codigo, descricao, casas_decimais) values
  ('UN','Unidade',0), ('PC','Peça',0), ('CJ','Conjunto',0), ('PAR','Par',0),
  ('CX','Caixa',0), ('M','Metro',3), ('M2','Metro quadrado',3), ('M3','Metro cúbico',3),
  ('KG','Quilograma',3), ('L','Litro',3)
on conflict (codigo) do nothing;

------------------------------------------------------------------
-- 2. Locais (endereços do almoxarifado)
------------------------------------------------------------------

create table if not exists public.almox_locais (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  descricao text,
  rua text,
  prateleira text,
  posicao text,
  padrao boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists almox_locais_um_padrao
  on public.almox_locais ((padrao)) where padrao;

grant select on public.almox_locais to authenticated;
grant all on public.almox_locais to service_role;
alter table public.almox_locais enable row level security;

drop policy if exists almox_locais_select on public.almox_locais;
create policy almox_locais_select on public.almox_locais
  for select to authenticated using (
    public.can_access_module(auth.uid(), 'compras'::public.app_module)
    or public.can_access_module(auth.uid(), 'engenharia'::public.app_module)
  );

drop policy if exists almox_locais_write on public.almox_locais;
create policy almox_locais_write on public.almox_locais
  for all to authenticated using (
    public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
    or public.has_role(auth.uid(),'purchasing')
  ) with check (
    public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
    or public.has_role(auth.uid(),'purchasing')
  );

insert into public.almox_locais (codigo, descricao, padrao)
select 'GERAL', 'Almoxarifado geral (sem endereçamento)', true
where not exists (select 1 from public.almox_locais);

------------------------------------------------------------------
-- 3. Itens (catálogo mestre)
------------------------------------------------------------------

create table if not exists public.almox_itens (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  descricao text not null,
  descricao_norm text generated always as (public.almox_norm(descricao)) stored,
  unidade_estoque text not null references public.almox_unidades(codigo),
  categoria text,
  part_number text,
  part_number_norm text generated always as (public.almox_norm(part_number)) stored,
  codigo_fabricante text,
  codigo_fabricante_norm text generated always as (public.almox_norm(codigo_fabricante)) stored,
  fabricante text,
  estoque_minimo numeric(14,3) not null default 0 check (estoque_minimo >= 0),
  fornecedor_preferencial_id uuid references public.fornecedores(id) on delete set null,
  observacoes text,
  ativo boolean not null default true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists almox_itens_part_number_unq
  on public.almox_itens (part_number_norm) where part_number_norm is not null;
create unique index if not exists almox_itens_codigo_fab_unq
  on public.almox_itens (codigo_fabricante_norm) where codigo_fabricante_norm is not null;
create index if not exists almox_itens_descricao_trgm
  on public.almox_itens using gin (descricao gin_trgm_ops);

create or replace function public.tg_almox_itens_defaults()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.codigo is null or new.codigo = '' then
      new.codigo := 'ALM-' || lpad(nextval('public.almox_item_codigo_seq')::text, 5, '0');
    end if;
    new.created_by := coalesce(new.created_by, public.audit_actor());
  end if;
  new.updated_at := now();
  new.updated_by := coalesce(public.audit_actor(), new.updated_by);
  return new;
end $$;

drop trigger if exists tg_almox_itens_defaults on public.almox_itens;
create trigger tg_almox_itens_defaults
  before insert or update on public.almox_itens
  for each row execute function public.tg_almox_itens_defaults();

grant select, insert, update on public.almox_itens to authenticated;
grant all on public.almox_itens to service_role;
alter table public.almox_itens enable row level security;

drop policy if exists almox_itens_select on public.almox_itens;
create policy almox_itens_select on public.almox_itens
  for select to authenticated using (
    public.can_access_module(auth.uid(), 'compras'::public.app_module)
    or public.can_access_module(auth.uid(), 'engenharia'::public.app_module)
  );

drop policy if exists almox_itens_insert on public.almox_itens;
create policy almox_itens_insert on public.almox_itens
  for insert to authenticated with check (
    public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
    or public.has_role(auth.uid(),'purchasing') or public.has_role(auth.uid(),'engineer')
  );

drop policy if exists almox_itens_update on public.almox_itens;
create policy almox_itens_update on public.almox_itens
  for update to authenticated using (
    public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
    or public.has_role(auth.uid(),'purchasing')
  ) with check (
    public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
    or public.has_role(auth.uid(),'purchasing')
  );

------------------------------------------------------------------
-- 4. Conversão de unidade de compra -> unidade de estoque
------------------------------------------------------------------

create table if not exists public.almox_itens_conversao (
  item_id uuid not null references public.almox_itens(id) on delete cascade,
  unidade_compra_norm text not null,
  unidade_compra text not null,
  fator numeric(14,6) not null check (fator > 0),
  created_by uuid,
  created_at timestamptz not null default now(),
  primary key (item_id, unidade_compra_norm)
);

grant select, insert, update, delete on public.almox_itens_conversao to authenticated;
grant all on public.almox_itens_conversao to service_role;
alter table public.almox_itens_conversao enable row level security;

drop policy if exists almox_conv_select on public.almox_itens_conversao;
create policy almox_conv_select on public.almox_itens_conversao
  for select to authenticated using (
    public.can_access_module(auth.uid(), 'compras'::public.app_module)
    or public.can_access_module(auth.uid(), 'engenharia'::public.app_module)
  );

drop policy if exists almox_conv_write on public.almox_itens_conversao;
create policy almox_conv_write on public.almox_itens_conversao
  for all to authenticated using (
    public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
    or public.has_role(auth.uid(),'purchasing') or public.has_role(auth.uid(),'engineer')
  ) with check (
    public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
    or public.has_role(auth.uid(),'purchasing') or public.has_role(auth.uid(),'engineer')
  );

------------------------------------------------------------------
-- 5. Recebimentos (evento idempotente por OC)
------------------------------------------------------------------

create table if not exists public.almox_recebimentos (
  id uuid primary key default gen_random_uuid(),
  ordem_compra_id uuid not null references public.ordens_compra(id) on delete cascade,
  evento_key text not null,
  nota_fiscal text,
  observacao text,
  recebido_por uuid,
  recebido_em timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (ordem_compra_id, evento_key)
);

grant select, insert on public.almox_recebimentos to authenticated;
grant all on public.almox_recebimentos to service_role;
alter table public.almox_recebimentos enable row level security;

drop policy if exists almox_receb_select on public.almox_recebimentos;
create policy almox_receb_select on public.almox_recebimentos
  for select to authenticated using (
    public.can_access_module(auth.uid(), 'compras'::public.app_module)
    or public.can_access_module(auth.uid(), 'engenharia'::public.app_module)
  );

drop policy if exists almox_receb_insert on public.almox_recebimentos;
create policy almox_receb_insert on public.almox_recebimentos
  for insert to authenticated with check (
    public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'purchasing')
  );

------------------------------------------------------------------
-- 6. Reservas (empenho por projeto)
------------------------------------------------------------------

create table if not exists public.almox_reservas (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.almox_itens(id) on delete restrict,
  projeto_id uuid not null references public.equipamento_projetos(id) on delete cascade,
  quantidade numeric(14,3) not null check (quantidade > 0),
  quantidade_retirada numeric(14,3) not null default 0 check (quantidade_retirada >= 0),
  status text not null default 'ativa'
    check (status in ('ativa','atendida','cancelada','liberada_auto')),
  expira_em timestamptz not null default (now() + interval '90 days'),
  observacao text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists almox_reservas_item_ativa
  on public.almox_reservas (item_id) where status = 'ativa';
create index if not exists almox_reservas_projeto
  on public.almox_reservas (projeto_id, status);

grant select on public.almox_reservas to authenticated;
grant all on public.almox_reservas to service_role;
alter table public.almox_reservas enable row level security;

drop policy if exists almox_reservas_select on public.almox_reservas;
create policy almox_reservas_select on public.almox_reservas
  for select to authenticated using (
    public.can_access_module(auth.uid(), 'compras'::public.app_module)
    or public.can_access_module(auth.uid(), 'engenharia'::public.app_module)
  );

-- Escrita só pelas funções SECURITY DEFINER (almox_reservar / almox_cancelar_reserva).

------------------------------------------------------------------
-- 7. Movimentos (append-only, fonte de verdade)
------------------------------------------------------------------

create table if not exists public.almox_movimentos (
  id uuid primary key default gen_random_uuid(),
  seq bigserial not null unique,
  item_id uuid not null references public.almox_itens(id) on delete restrict,
  local_id uuid not null references public.almox_locais(id) on delete restrict,
  tipo text not null check (tipo in
    ('entrada_oc','entrada_avulsa','saida_projeto','devolucao','transferencia','ajuste')),
  quantidade numeric(14,3) not null check (quantidade <> 0),
  unidade_origem text,
  fator_conversao numeric(14,6) not null default 1 check (fator_conversao > 0),
  custo_unitario numeric(14,4) not null default 0 check (custo_unitario >= 0),
  custo_medio_apos numeric(14,4) not null default 0 check (custo_medio_apos >= 0),
  ordem_compra_item_id uuid references public.ordem_compra_itens(id) on delete set null,
  recebimento_id uuid references public.almox_recebimentos(id) on delete set null,
  projeto_id uuid references public.equipamento_projetos(id) on delete set null,
  reserva_id uuid references public.almox_reservas(id) on delete set null,
  movimento_origem_id uuid references public.almox_movimentos(id) on delete set null,
  permite_negativo boolean not null default false,
  justificativa text,
  observacao text,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index if not exists almox_mov_item_seq on public.almox_movimentos (item_id, seq desc);
create index if not exists almox_mov_item_local on public.almox_movimentos (item_id, local_id);
create index if not exists almox_mov_oc_item on public.almox_movimentos (ordem_compra_item_id)
  where ordem_compra_item_id is not null;
create index if not exists almox_mov_projeto on public.almox_movimentos (projeto_id)
  where projeto_id is not null;

grant select on public.almox_movimentos to authenticated;
grant insert on public.almox_movimentos to authenticated;
grant all on public.almox_movimentos to service_role;
alter table public.almox_movimentos enable row level security;

drop policy if exists almox_mov_select on public.almox_movimentos;
create policy almox_mov_select on public.almox_movimentos
  for select to authenticated using (
    public.can_access_module(auth.uid(), 'compras'::public.app_module)
    or public.can_access_module(auth.uid(), 'engenharia'::public.app_module)
  );

drop policy if exists almox_mov_insert on public.almox_movimentos;
create policy almox_mov_insert on public.almox_movimentos
  for insert to authenticated with check (
    case
      when tipo in ('entrada_oc','entrada_avulsa') then
        public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'purchasing')
      when tipo = 'ajuste' then
        public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
      else
        public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'purchasing')
        or public.has_role(auth.uid(),'production')
    end
  );

-- Sem policy de UPDATE/DELETE: movimentos são imutáveis por construção.
revoke update, delete, truncate on public.almox_movimentos from authenticated, anon;

------------------------------------------------------------------
-- 8. Trigger de custo médio + validações (BEFORE INSERT)
------------------------------------------------------------------

create or replace function public.tg_almox_mov_before()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_saldo_ant numeric := 0;
  v_media_ant numeric := 0;
  v_saldo_local numeric := 0;
  v_reserva_terceiros numeric := 0;
  v_reserva_propria numeric := 0;
  v_livre numeric := 0;
  v_origem record;
  v_qtd_abs numeric := abs(new.quantidade);
begin
  -- lock por item, com namespace fixo: cobre qualquer via de escrita
  perform pg_advisory_xact_lock(
    public.almox_lock_classid(),
    (hashtextextended(new.item_id::text, 0) % 2147483647)::int
  );

  new.created_by := coalesce(new.created_by, public.audit_actor());

  select coalesce(sum(m.quantidade), 0) into v_saldo_ant
    from public.almox_movimentos m where m.item_id = new.item_id;

  select coalesce(m.custo_medio_apos, 0) into v_media_ant
    from public.almox_movimentos m
   where m.item_id = new.item_id
   order by m.seq desc limit 1;
  v_media_ant := coalesce(v_media_ant, 0);

  if new.quantidade > 0 then
    -- ENTRADAS
    if new.tipo = 'devolucao' then
      if new.movimento_origem_id is not null then
        select m.custo_unitario into v_origem
          from public.almox_movimentos m where m.id = new.movimento_origem_id;
        if found then new.custo_unitario := v_origem.custo_unitario; end if;
      end if;
      -- devolução entra pelo custo de saída e não altera a média vigente
      new.custo_medio_apos := v_media_ant;
    else
      if new.custo_unitario = 0 then
        new.custo_unitario := v_media_ant;
      end if;
      if (v_saldo_ant + new.quantidade) > 0 then
        new.custo_medio_apos :=
          round(((greatest(v_saldo_ant, 0) * v_media_ant) + (new.quantidade * new.custo_unitario))
                / (greatest(v_saldo_ant, 0) + new.quantidade), 4);
      else
        new.custo_medio_apos := new.custo_unitario;
      end if;
    end if;
  else
    -- SAÍDAS
    new.custo_unitario := v_media_ant;
    new.custo_medio_apos := v_media_ant;

    select coalesce(sum(m.quantidade), 0) into v_saldo_local
      from public.almox_movimentos m
     where m.item_id = new.item_id and m.local_id = new.local_id;

    if (v_saldo_local + new.quantidade) < 0 then
      if not new.permite_negativo then
        raise exception 'Saldo insuficiente neste endereço: disponível %, solicitado %',
          v_saldo_local, v_qtd_abs;
      end if;
      if coalesce(btrim(new.justificativa), '') = '' then
        raise exception 'Saldo negativo exige justificativa.';
      end if;
      if not public.has_role(coalesce(new.created_by, public.audit_actor()), 'admin') then
        raise exception 'Somente administradores podem lançar saída com saldo negativo.';
      end if;
    end if;

    -- reservas de terceiros bloqueiam o consumo
    select coalesce(sum(r.quantidade - r.quantidade_retirada), 0) into v_reserva_terceiros
      from public.almox_reservas r
     where r.item_id = new.item_id
       and r.status = 'ativa'
       and r.expira_em > now()
       and (new.projeto_id is null or r.projeto_id is distinct from new.projeto_id);

    select coalesce(sum(r.quantidade - r.quantidade_retirada), 0) into v_reserva_propria
      from public.almox_reservas r
     where r.item_id = new.item_id
       and r.status = 'ativa'
       and r.expira_em > now()
       and new.projeto_id is not null
       and r.projeto_id = new.projeto_id;

    v_livre := greatest(v_saldo_ant, 0) - v_reserva_terceiros;

    if v_qtd_abs > (v_livre + v_reserva_propria) and not new.permite_negativo then
      raise exception
        'Quantidade indisponível: % livre (+% reservado para este projeto), solicitado %',
        v_livre, v_reserva_propria, v_qtd_abs;
    end if;
  end if;

  return new;
end $$;

drop trigger if exists tg_almox_mov_before on public.almox_movimentos;
create trigger tg_almox_mov_before
  before insert on public.almox_movimentos
  for each row execute function public.tg_almox_mov_before();

------------------------------------------------------------------
-- 9. Trigger AFTER INSERT: consumo de reserva + status da OC
------------------------------------------------------------------

create or replace function public.tg_almox_mov_after()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_oc uuid;
  v_pedido numeric;
  v_recebido numeric;
  v_status public.oc_status;
begin
  -- consumo/estorno de reserva
  if new.reserva_id is not null then
    update public.almox_reservas r
       set quantidade_retirada = greatest(0, r.quantidade_retirada + (-1 * new.quantidade)),
           status = case
             when greatest(0, r.quantidade_retirada + (-1 * new.quantidade)) >= r.quantidade
               then 'atendida' else r.status end,
           updated_at = now()
     where r.id = new.reserva_id;
  end if;

  -- status da OC derivado dos movimentos entrada_oc (vale para recebimento e estorno)
  if new.ordem_compra_item_id is not null then
    select oci.ordem_compra_id into v_oc
      from public.ordem_compra_itens oci where oci.id = new.ordem_compra_item_id;

    if v_oc is not null then
      select coalesce(sum(oci.quantidade), 0) into v_pedido
        from public.ordem_compra_itens oci where oci.ordem_compra_id = v_oc;

      select coalesce(sum(m.quantidade / nullif(m.fator_conversao, 0)), 0) into v_recebido
        from public.almox_movimentos m
        join public.ordem_compra_itens oci on oci.id = m.ordem_compra_item_id
       where oci.ordem_compra_id = v_oc and m.tipo = 'entrada_oc';

      select oc.status into v_status from public.ordens_compra oc where oc.id = v_oc;

      if v_status in ('aprovada','enviada','recebida_parcial','recebida') then
        if v_recebido <= 0 then
          update public.ordens_compra set status = 'enviada'
           where id = v_oc and status in ('recebida_parcial','recebida');
        elsif v_recebido >= v_pedido then
          update public.ordens_compra set status = 'recebida' where id = v_oc;
        else
          update public.ordens_compra set status = 'recebida_parcial' where id = v_oc;
        end if;
      end if;
    end if;
  end if;

  return new;
end $$;

drop trigger if exists tg_almox_mov_after on public.almox_movimentos;
create trigger tg_almox_mov_after
  after insert on public.almox_movimentos
  for each row execute function public.tg_almox_mov_after();

------------------------------------------------------------------
-- 10. Views de saldo e recebimento
------------------------------------------------------------------

create or replace view public.almox_saldo_item_local as
  select m.item_id, m.local_id, sum(m.quantidade)::numeric(14,3) as saldo
    from public.almox_movimentos m
   group by m.item_id, m.local_id;

create or replace view public.almox_saldo_item as
  select
    i.id as item_id,
    i.codigo,
    i.descricao,
    i.unidade_estoque,
    i.estoque_minimo,
    i.ativo,
    coalesce(t.total, 0)::numeric(14,3) as total,
    coalesce(r.reservado, 0)::numeric(14,3) as reservado,
    (coalesce(t.total, 0) - coalesce(r.reservado, 0))::numeric(14,3) as disponivel,
    coalesce(c.custo_medio, 0)::numeric(14,4) as custo_medio,
    (coalesce(t.total, 0) * coalesce(c.custo_medio, 0))::numeric(16,4) as valor_total,
    (coalesce(t.total, 0) < i.estoque_minimo) as abaixo_minimo
  from public.almox_itens i
  left join (
    select item_id, sum(quantidade) as total
      from public.almox_movimentos group by item_id
  ) t on t.item_id = i.id
  left join (
    select item_id, sum(quantidade - quantidade_retirada) as reservado
      from public.almox_reservas
     where status = 'ativa' and expira_em > now()
     group by item_id
  ) r on r.item_id = i.id
  left join lateral (
    select m.custo_medio_apos as custo_medio
      from public.almox_movimentos m
     where m.item_id = i.id
     order by m.seq desc limit 1
  ) c on true;

create or replace view public.almox_recebimento_oc_item as
  select
    oci.id as ordem_compra_item_id,
    oci.ordem_compra_id,
    oci.quantidade as quantidade_pedida,
    coalesce(sum(m.quantidade / nullif(m.fator_conversao, 0)), 0)::numeric(14,3) as quantidade_recebida,
    greatest(oci.quantidade - coalesce(sum(m.quantidade / nullif(m.fator_conversao, 0)), 0), 0)::numeric(14,3) as quantidade_pendente
  from public.ordem_compra_itens oci
  left join public.almox_movimentos m
    on m.ordem_compra_item_id = oci.id and m.tipo = 'entrada_oc'
  group by oci.id, oci.ordem_compra_id, oci.quantidade;

create or replace view public.almox_recebimento_oc as
  select
    ordem_compra_id,
    sum(quantidade_pedida)::numeric(14,3) as quantidade_pedida,
    sum(quantidade_recebida)::numeric(14,3) as quantidade_recebida,
    sum(quantidade_pendente)::numeric(14,3) as quantidade_pendente
  from public.almox_recebimento_oc_item
  group by ordem_compra_id;

alter view public.almox_saldo_item_local set (security_invoker = on);
alter view public.almox_saldo_item set (security_invoker = on);
alter view public.almox_recebimento_oc_item set (security_invoker = on);
alter view public.almox_recebimento_oc set (security_invoker = on);

grant select on public.almox_saldo_item_local to authenticated;
grant select on public.almox_saldo_item to authenticated;
grant select on public.almox_recebimento_oc_item to authenticated;
grant select on public.almox_recebimento_oc to authenticated;
grant select on public.almox_saldo_item_local, public.almox_saldo_item,
  public.almox_recebimento_oc_item, public.almox_recebimento_oc to service_role;

------------------------------------------------------------------
-- 11. Reserva: função com lock e validação de disponível
------------------------------------------------------------------

create or replace function public.almox_reservar(
  _item_id uuid,
  _projeto_id uuid,
  _quantidade numeric,
  _expira_em timestamptz default null,
  _observacao text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := public.audit_actor();
  v_total numeric := 0;
  v_reservado numeric := 0;
  v_id uuid;
begin
  if v_actor is null then raise exception 'Sessão inválida.'; end if;
  if not (public.has_role(v_actor,'admin') or public.has_role(v_actor,'manager')
          or public.has_role(v_actor,'engineer') or public.has_role(v_actor,'purchasing')) then
    raise exception 'Sem permissão para reservar estoque.';
  end if;
  if _quantidade is null or _quantidade <= 0 then
    raise exception 'Quantidade de reserva deve ser maior que zero.';
  end if;

  perform pg_advisory_xact_lock(
    public.almox_lock_classid(),
    (hashtextextended(_item_id::text, 0) % 2147483647)::int
  );

  select coalesce(sum(m.quantidade), 0) into v_total
    from public.almox_movimentos m where m.item_id = _item_id;

  select coalesce(sum(r.quantidade - r.quantidade_retirada), 0) into v_reservado
    from public.almox_reservas r
   where r.item_id = _item_id and r.status = 'ativa' and r.expira_em > now();

  if _quantidade > (v_total - v_reservado) then
    raise exception 'Disponível insuficiente para reserva: % disponível, % solicitado',
      (v_total - v_reservado), _quantidade;
  end if;

  insert into public.almox_reservas
    (item_id, projeto_id, quantidade, expira_em, observacao, created_by)
  values
    (_item_id, _projeto_id, _quantidade,
     coalesce(_expira_em, now() + interval '90 days'), _observacao, v_actor)
  returning id into v_id;

  return v_id;
end $$;

revoke all on function public.almox_reservar(uuid, uuid, numeric, timestamptz, text) from public;
grant execute on function public.almox_reservar(uuid, uuid, numeric, timestamptz, text)
  to authenticated, service_role;

create or replace function public.almox_cancelar_reserva(_reserva_id uuid, _motivo text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_actor uuid := public.audit_actor();
begin
  if v_actor is null then raise exception 'Sessão inválida.'; end if;
  if not (public.has_role(v_actor,'admin') or public.has_role(v_actor,'manager')
          or public.has_role(v_actor,'engineer') or public.has_role(v_actor,'purchasing')) then
    raise exception 'Sem permissão para cancelar reserva.';
  end if;

  update public.almox_reservas
     set status = 'cancelada',
         observacao = coalesce(_motivo, observacao),
         updated_at = now()
   where id = _reserva_id and status = 'ativa';
end $$;

revoke all on function public.almox_cancelar_reserva(uuid, text) from public;
grant execute on function public.almox_cancelar_reserva(uuid, text) to authenticated, service_role;

-- Rede de segurança: nenhuma reserva pode ultrapassar o disponível, venha de onde vier.
create or replace function public.tg_almox_reserva_check()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total numeric := 0;
  v_reservado numeric := 0;
begin
  if new.status <> 'ativa' then return new; end if;

  perform pg_advisory_xact_lock(
    public.almox_lock_classid(),
    (hashtextextended(new.item_id::text, 0) % 2147483647)::int
  );

  select coalesce(sum(m.quantidade), 0) into v_total
    from public.almox_movimentos m where m.item_id = new.item_id;

  select coalesce(sum(r.quantidade - r.quantidade_retirada), 0) into v_reservado
    from public.almox_reservas r
   where r.item_id = new.item_id and r.status = 'ativa' and r.expira_em > now()
     and r.id is distinct from new.id;

  if (new.quantidade - new.quantidade_retirada) > (v_total - v_reservado) then
    raise exception 'Reserva excede o disponível: % disponível, % solicitado',
      (v_total - v_reservado), (new.quantidade - new.quantidade_retirada);
  end if;

  return new;
end $$;

drop trigger if exists tg_almox_reserva_check on public.almox_reservas;
create trigger tg_almox_reserva_check
  before insert or update of quantidade, status, expira_em on public.almox_reservas
  for each row execute function public.tg_almox_reserva_check();

-- Projeto obsoleto libera reservas ativas automaticamente.
create or replace function public.tg_projeto_libera_reservas()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'obsoleto' and old.status is distinct from new.status then
    update public.almox_reservas
       set status = 'liberada_auto', updated_at = now()
     where projeto_id = new.id and status = 'ativa';
  end if;
  return new;
end $$;

drop trigger if exists tg_projeto_libera_reservas on public.equipamento_projetos;
create trigger tg_projeto_libera_reservas
  after update of status on public.equipamento_projetos
  for each row execute function public.tg_projeto_libera_reservas();

------------------------------------------------------------------
-- 12. Vínculo com projeto_insumos
------------------------------------------------------------------

alter table public.projeto_insumos
  add column if not exists almox_item_id uuid references public.almox_itens(id) on delete set null,
  add column if not exists almox_fator_conversao numeric(14,6);

alter table public.projeto_insumos
  drop constraint if exists projeto_insumos_almox_fator_ck;
alter table public.projeto_insumos
  add constraint projeto_insumos_almox_fator_ck check (
    almox_item_id is null
    or (almox_fator_conversao is not null and almox_fator_conversao > 0)
  );

create index if not exists projeto_insumos_almox_item
  on public.projeto_insumos (almox_item_id) where almox_item_id is not null;

comment on column public.projeto_insumos.almox_fator_conversao is
  'Quantas unidades de estoque equivalem a 1 unidade desta linha de insumo. Obrigatório quando há vínculo.';

------------------------------------------------------------------
-- 13. Auditoria
------------------------------------------------------------------

create or replace function public.tg_almox_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare actor uuid := public.audit_actor();
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log (user_id, table_name, record_id, action, new_value)
    values (actor, tg_table_name, new.id::text, 'INSERT', to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_log (user_id, table_name, record_id, action, old_value, new_value)
    values (actor, tg_table_name, new.id::text, 'UPDATE', to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into public.audit_log (user_id, table_name, record_id, action, old_value)
    values (actor, tg_table_name, old.id::text, 'DELETE', to_jsonb(old));
    return old;
  end if;
end $$;

drop trigger if exists tg_almox_itens_audit on public.almox_itens;
create trigger tg_almox_itens_audit
  after insert or update or delete on public.almox_itens
  for each row execute function public.tg_almox_audit();

drop trigger if exists tg_almox_movimentos_audit on public.almox_movimentos;
create trigger tg_almox_movimentos_audit
  after insert on public.almox_movimentos
  for each row execute function public.tg_almox_audit();

drop trigger if exists tg_almox_reservas_audit on public.almox_reservas;
create trigger tg_almox_reservas_audit
  after insert or update or delete on public.almox_reservas
  for each row execute function public.tg_almox_audit();

notify pgrst, 'reload schema';
