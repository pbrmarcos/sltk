-- Fase 2 Compras: RFQ / Cotações com Fornecedores

do $$ begin
  create type public.cotacao_status as enum (
    'rascunho','aberta','respondida','escolhida','encerrada','cancelada'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.cotacao_convite_status as enum (
    'pendente','visualizado','respondido','recusado'
  );
exception when duplicate_object then null; end $$;

create sequence if not exists public.cotacoes_codigo_seq;

create or replace function public.gerar_codigo_cotacao()
returns text language plpgsql as $$
declare n bigint;
begin
  n := nextval('public.cotacoes_codigo_seq');
  return 'RFQ-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 5, '0');
end;
$$;

create table if not exists public.cotacoes (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique default public.gerar_codigo_cotacao(),
  titulo text not null,
  descricao text,
  status public.cotacao_status not null default 'rascunho',
  prazo_resposta date,
  incoterm text,
  moeda text not null default 'BRL',
  condicoes_pagamento text,
  observacoes text,
  criado_por uuid references auth.users(id) on delete set null,
  responsavel_compras uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists cotacoes_status_idx on public.cotacoes(status) where deleted_at is null;
create index if not exists cotacoes_prazo_idx on public.cotacoes(prazo_resposta) where deleted_at is null;

create table if not exists public.cotacao_itens (
  id uuid primary key default gen_random_uuid(),
  cotacao_id uuid not null references public.cotacoes(id) on delete cascade,
  insumo_id uuid not null references public.projeto_insumos(id) on delete restrict,
  quantidade numeric(14,4) not null check (quantidade > 0),
  unidade text not null default 'UN',
  descricao_snapshot text not null,
  spec_snapshot text,
  part_number_snapshot text,
  observacoes text,
  created_at timestamptz not null default now()
);
create index if not exists cotacao_itens_cotacao_idx on public.cotacao_itens(cotacao_id);
create index if not exists cotacao_itens_insumo_idx on public.cotacao_itens(insumo_id);

create table if not exists public.cotacao_fornecedores (
  id uuid primary key default gen_random_uuid(),
  cotacao_id uuid not null references public.cotacoes(id) on delete cascade,
  fornecedor_id uuid not null references public.fornecedores(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  email_enviado_para text,
  enviado_em timestamptz,
  visualizado_em timestamptz,
  respondido_em timestamptz,
  status public.cotacao_convite_status not null default 'pendente',
  created_at timestamptz not null default now(),
  unique (cotacao_id, fornecedor_id)
);
create index if not exists cotacao_fornecedores_cotacao_idx on public.cotacao_fornecedores(cotacao_id);
create index if not exists cotacao_fornecedores_token_idx on public.cotacao_fornecedores(token);

create table if not exists public.cotacao_propostas (
  id uuid primary key default gen_random_uuid(),
  convite_id uuid not null unique references public.cotacao_fornecedores(id) on delete cascade,
  validade date,
  lead_time_dias integer,
  frete numeric(14,2),
  observacoes_fornecedor text,
  anexo_url text,
  submetido_em timestamptz not null default now(),
  submetido_ip text
);

create table if not exists public.cotacao_proposta_itens (
  id uuid primary key default gen_random_uuid(),
  proposta_id uuid not null references public.cotacao_propostas(id) on delete cascade,
  cotacao_item_id uuid not null references public.cotacao_itens(id) on delete cascade,
  preco_unit numeric(14,4) not null default 0,
  desconto_pct numeric(6,3) not null default 0,
  ipi_pct numeric(6,3) not null default 0,
  icms_st_pct numeric(6,3) not null default 0,
  prazo_entrega_dias integer,
  marca_oferecida text,
  part_number_oferecido text,
  observacoes text,
  quantidade_snapshot numeric(14,4) not null default 1,
  valor_total numeric(16,4) generated always as (
    quantidade_snapshot * preco_unit
      * (1 - coalesce(desconto_pct,0)/100)
      * (1 + coalesce(ipi_pct,0)/100 + coalesce(icms_st_pct,0)/100)
  ) stored,
  unique (proposta_id, cotacao_item_id)
);
create index if not exists cotacao_proposta_itens_item_idx on public.cotacao_proposta_itens(cotacao_item_id);

create table if not exists public.cotacao_escolhas (
  id uuid primary key default gen_random_uuid(),
  cotacao_item_id uuid not null unique references public.cotacao_itens(id) on delete cascade,
  proposta_item_id uuid not null references public.cotacao_proposta_itens(id) on delete cascade,
  escolhido_por uuid references auth.users(id) on delete set null,
  escolhido_em timestamptz not null default now(),
  justificativa text
);

create table if not exists public.cotacao_historico (
  id uuid primary key default gen_random_uuid(),
  cotacao_id uuid not null references public.cotacoes(id) on delete cascade,
  evento text not null,
  detalhes jsonb,
  ator uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists cotacao_historico_cotacao_idx on public.cotacao_historico(cotacao_id);

create or replace function public.cotacoes_set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists cotacoes_updated_at on public.cotacoes;
create trigger cotacoes_updated_at before update on public.cotacoes
for each row execute function public.cotacoes_set_updated_at();

create or replace function public.cotacao_escolha_propaga_insumo()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_insumo uuid;
begin
  select ci.insumo_id into v_insumo from public.cotacao_itens ci where ci.id = new.cotacao_item_id;
  if v_insumo is not null then
    update public.projeto_insumos set status = 'cotado' where id = v_insumo;
  end if;
  return new;
end;
$$;
drop trigger if exists cotacao_escolha_propaga on public.cotacao_escolhas;
create trigger cotacao_escolha_propaga after insert on public.cotacao_escolhas
for each row execute function public.cotacao_escolha_propaga_insumo();

create or replace function public.cotacao_abrir_propaga_insumos()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'aberta' and (old.status is null or old.status <> 'aberta') then
    update public.projeto_insumos pi
      set status = 'em_cotacao'
      from public.cotacao_itens ci
      where ci.cotacao_id = new.id
        and ci.insumo_id = pi.id
        and pi.status = 'aprovado';
  end if;
  return new;
end;
$$;
drop trigger if exists cotacao_abrir_propaga on public.cotacoes;
create trigger cotacao_abrir_propaga after update on public.cotacoes
for each row execute function public.cotacao_abrir_propaga_insumos();

grant select, insert, update, delete on public.cotacoes to authenticated;
grant select, insert, update, delete on public.cotacao_itens to authenticated;
grant select, insert, update, delete on public.cotacao_fornecedores to authenticated;
grant select, insert, update, delete on public.cotacao_propostas to authenticated;
grant select, insert, update, delete on public.cotacao_proposta_itens to authenticated;
grant select, insert, update, delete on public.cotacao_escolhas to authenticated;
grant select, insert on public.cotacao_historico to authenticated;
grant all on public.cotacoes, public.cotacao_itens, public.cotacao_fornecedores,
  public.cotacao_propostas, public.cotacao_proposta_itens, public.cotacao_escolhas,
  public.cotacao_historico to service_role;
grant usage, select on sequence public.cotacoes_codigo_seq to authenticated, service_role;

alter table public.cotacoes enable row level security;
alter table public.cotacao_itens enable row level security;
alter table public.cotacao_fornecedores enable row level security;
alter table public.cotacao_propostas enable row level security;
alter table public.cotacao_proposta_itens enable row level security;
alter table public.cotacao_escolhas enable row level security;
alter table public.cotacao_historico enable row level security;

create or replace function public.user_pode_compras(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(uid,'admin') or public.has_role(uid,'manager') or public.has_role(uid,'purchasing');
$$;

drop policy if exists "cotacoes_select" on public.cotacoes;
create policy "cotacoes_select" on public.cotacoes for select to authenticated using (deleted_at is null);
drop policy if exists "cotacoes_write" on public.cotacoes;
create policy "cotacoes_write" on public.cotacoes for all to authenticated
  using (public.user_pode_compras(auth.uid())) with check (public.user_pode_compras(auth.uid()));

drop policy if exists "cotacao_itens_select" on public.cotacao_itens;
create policy "cotacao_itens_select" on public.cotacao_itens for select to authenticated using (true);
drop policy if exists "cotacao_itens_write" on public.cotacao_itens;
create policy "cotacao_itens_write" on public.cotacao_itens for all to authenticated
  using (public.user_pode_compras(auth.uid())) with check (public.user_pode_compras(auth.uid()));

drop policy if exists "cotacao_fornecedores_select" on public.cotacao_fornecedores;
create policy "cotacao_fornecedores_select" on public.cotacao_fornecedores for select to authenticated using (true);
drop policy if exists "cotacao_fornecedores_write" on public.cotacao_fornecedores;
create policy "cotacao_fornecedores_write" on public.cotacao_fornecedores for all to authenticated
  using (public.user_pode_compras(auth.uid())) with check (public.user_pode_compras(auth.uid()));

drop policy if exists "cotacao_propostas_select" on public.cotacao_propostas;
create policy "cotacao_propostas_select" on public.cotacao_propostas for select to authenticated using (true);

drop policy if exists "cotacao_proposta_itens_select" on public.cotacao_proposta_itens;
create policy "cotacao_proposta_itens_select" on public.cotacao_proposta_itens for select to authenticated using (true);

drop policy if exists "cotacao_escolhas_select" on public.cotacao_escolhas;
create policy "cotacao_escolhas_select" on public.cotacao_escolhas for select to authenticated using (true);
drop policy if exists "cotacao_escolhas_write" on public.cotacao_escolhas;
create policy "cotacao_escolhas_write" on public.cotacao_escolhas for all to authenticated
  using (public.user_pode_compras(auth.uid())) with check (public.user_pode_compras(auth.uid()));

drop policy if exists "cotacao_historico_select" on public.cotacao_historico;
create policy "cotacao_historico_select" on public.cotacao_historico for select to authenticated using (true);
drop policy if exists "cotacao_historico_insert" on public.cotacao_historico;
create policy "cotacao_historico_insert" on public.cotacao_historico for insert to authenticated
  with check (public.user_pode_compras(auth.uid()));
