-- v0.81.0 — Códigos curtos + histórico de importações/edições em etapas por disciplina

-- 1) Colunas de código curto
alter table public.equipamento_disciplina_etapas
  add column if not exists codigo text;

alter table public.etapa_template_item
  add column if not exists codigo text;

alter table public.etapa_template_bom_item
  add column if not exists codigo text;

-- 2) Helper para prefixo por disciplina
create or replace function public._codigo_prefixo_disciplina(_disc text)
returns text
language sql
immutable
as $$
  select case lower(coalesce(_disc,''))
    when 'engenharia'   then 'ENG'
    when 'planejamento' then 'PLN'
    when 'producao'     then 'PRD'
    when 'qualidade'    then 'QLD'
    when 'pos_venda'    then 'POS'
    when 'automacao'    then 'AUT'
    when 'compras'      then 'CMP'
    when 'montagem'     then 'MNT'
    else upper(left(regexp_replace(coalesce(_disc,'x'),'[^a-zA-Z0-9]','','g'),3))
  end
$$;

-- 3) Trigger para gerar código automaticamente em equipamento_disciplina_etapas
create or replace function public._set_codigo_disciplina_etapa()
returns trigger
language plpgsql
as $$
declare
  _prefix text;
begin
  if new.codigo is null or length(trim(new.codigo)) = 0 then
    _prefix := public._codigo_prefixo_disciplina(new.disciplina);
    new.codigo := _prefix || '-' || lpad(coalesce(new.ordem, 0)::text, 2, '0');
  end if;
  return new;
end
$$;

drop trigger if exists trg_set_codigo_disc_etapa on public.equipamento_disciplina_etapas;
create trigger trg_set_codigo_disc_etapa
before insert or update of ordem, disciplina on public.equipamento_disciplina_etapas
for each row execute function public._set_codigo_disciplina_etapa();

-- 4) Backfill em equipamento_disciplina_etapas
update public.equipamento_disciplina_etapas
   set codigo = public._codigo_prefixo_disciplina(disciplina) || '-' || lpad(ordem::text, 2, '0')
 where codigo is null or length(trim(codigo)) = 0;

-- 5) Backfill dos templates admin
update public.etapa_template_item
   set codigo = public._codigo_prefixo_disciplina(disciplina) || '-' || lpad(ordem::text, 2, '0')
 where codigo is null or length(trim(codigo)) = 0;

update public.etapa_template_bom_item
   set codigo = 'BOM-' || lpad(ordem::text, 2, '0')
 where codigo is null or length(trim(codigo)) = 0;

-- 6) Tabela de histórico de importações/edições
create table if not exists public.equipamento_import_historico (
  id uuid primary key default gen_random_uuid(),
  equipamento_id uuid not null references public.cliente_equipamentos(id) on delete cascade,
  tipo text not null check (tipo in ('import_excel','export_excel','edicao_manual','exclusao','criacao','reordenacao')),
  disciplina text,
  user_id uuid references auth.users(id) on delete set null,
  user_nome text,
  descricao text not null,
  diff jsonb not null default '{}'::jsonb,
  arquivo_nome text,
  created_at timestamptz not null default now()
);

create index if not exists idx_eq_import_hist_eq on public.equipamento_import_historico(equipamento_id, created_at desc);
create index if not exists idx_eq_import_hist_disc on public.equipamento_import_historico(equipamento_id, disciplina, created_at desc);

grant select, insert on public.equipamento_import_historico to authenticated;
grant all on public.equipamento_import_historico to service_role;

alter table public.equipamento_import_historico enable row level security;

drop policy if exists hist_select on public.equipamento_import_historico;
create policy hist_select on public.equipamento_import_historico
  for select to authenticated using (true);

drop policy if exists hist_insert on public.equipamento_import_historico;
create policy hist_insert on public.equipamento_import_historico
  for insert to authenticated with check (user_id = auth.uid());
