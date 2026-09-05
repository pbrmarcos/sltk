-- v0.82.0 — Insumos: estoque de almoxarifado + histórico + gate de OC por liberação

-- 1) Estoque disponível no almoxarifado (quantidade que já temos e não precisa comprar)
alter table public.projeto_insumos
  add column if not exists qtd_estoque numeric(14,3) not null default 0;

comment on column public.projeto_insumos.qtd_estoque is
  'Quantidade já disponível em almoxarifado para este insumo neste projeto. quantidade_a_comprar = max(0, quantidade - qtd_estoque).';

-- 2) Histórico dedicado dos insumos por projeto (mesmo padrão do equipamento_import_historico)
create table if not exists public.projeto_insumo_historico (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.equipamento_projetos(id) on delete cascade,
  tipo text not null check (tipo in (
    'import_excel','export_excel','edicao_manual','exclusao','criacao',
    'envio_aprovacao','estoque_alterado','liberado_producao'
  )),
  user_id uuid references auth.users(id) on delete set null,
  user_nome text,
  descricao text not null,
  diff jsonb not null default '{}'::jsonb,
  arquivo_nome text,
  created_at timestamptz not null default now()
);

create index if not exists idx_pih_proj
  on public.projeto_insumo_historico (projeto_id, created_at desc);
create index if not exists idx_pih_proj_tipo
  on public.projeto_insumo_historico (projeto_id, tipo, created_at desc);

grant select, insert on public.projeto_insumo_historico to authenticated;
grant all on public.projeto_insumo_historico to service_role;

alter table public.projeto_insumo_historico enable row level security;

drop policy if exists pih_select on public.projeto_insumo_historico;
create policy pih_select on public.projeto_insumo_historico
  for select to authenticated using (true);

drop policy if exists pih_insert on public.projeto_insumo_historico;
create policy pih_insert on public.projeto_insumo_historico
  for insert to authenticated with check (user_id = auth.uid());

notify pgrst, 'reload schema';
