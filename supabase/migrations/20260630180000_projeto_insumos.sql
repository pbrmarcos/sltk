-- Fase 1: Lista de Insumos do Projeto (BOM por pilar/disciplina)
-- Atrelado a equipamento_projetos (que já carrega disciplina e cliente)

do $$ begin
  create type public.insumo_criticidade as enum ('baixa', 'media', 'alta', 'critica');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.insumo_status as enum (
    'rascunho','aprovado','em_cotacao','cotado','em_compra','recebido','cancelado'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.projeto_insumos (
  id uuid primary key default gen_random_uuid(),
  projeto_id uuid not null references public.equipamento_projetos(id) on delete cascade,
  equipamento_id uuid references public.cliente_equipamentos(id) on delete set null,
  cliente_id uuid references public.clientes(id) on delete set null,
  disciplina text not null,
  descricao text not null,
  especificacao_tecnica text,
  codigo_interno text,
  fabricante_sugerido text,
  part_number text,
  categoria_slug text references public.fornecedor_categorias_catalog(slug) on delete set null,
  unidade text not null default 'UN',
  quantidade numeric(14,4) not null default 1 check (quantidade > 0),
  quantidade_reserva numeric(14,4) not null default 0 check (quantidade_reserva >= 0),
  criticidade public.insumo_criticidade not null default 'media',
  lead_time_desejado_dias integer,
  necessidade_em date,
  status public.insumo_status not null default 'rascunho',
  observacoes text,
  solicitado_por uuid references auth.users(id) on delete set null,
  aprovado_por uuid references auth.users(id) on delete set null,
  aprovado_em timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists projeto_insumos_projeto_idx on public.projeto_insumos(projeto_id) where deleted_at is null;
create index if not exists projeto_insumos_cliente_idx on public.projeto_insumos(cliente_id) where deleted_at is null;
create index if not exists projeto_insumos_status_idx on public.projeto_insumos(status) where deleted_at is null;
create index if not exists projeto_insumos_categoria_idx on public.projeto_insumos(categoria_slug) where deleted_at is null;
create index if not exists projeto_insumos_disciplina_idx on public.projeto_insumos(disciplina) where deleted_at is null;

create or replace function public.projeto_insumos_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projeto_insumos_updated_at on public.projeto_insumos;
create trigger projeto_insumos_updated_at
before update on public.projeto_insumos
for each row execute function public.projeto_insumos_set_updated_at();

grant select, insert, update, delete on public.projeto_insumos to authenticated;
grant all on public.projeto_insumos to service_role;

alter table public.projeto_insumos enable row level security;

drop policy if exists "projeto_insumos_select" on public.projeto_insumos;
create policy "projeto_insumos_select" on public.projeto_insumos
for select to authenticated
using (deleted_at is null);

drop policy if exists "projeto_insumos_insert" on public.projeto_insumos;
create policy "projeto_insumos_insert" on public.projeto_insumos
for insert to authenticated
with check (
  public.has_role(auth.uid(), 'admin')
  or public.has_role(auth.uid(), 'manager')
  or public.has_role(auth.uid(), 'engineer')
  or public.has_role(auth.uid(), 'purchasing')
);

drop policy if exists "projeto_insumos_update" on public.projeto_insumos;
create policy "projeto_insumos_update" on public.projeto_insumos
for update to authenticated
using (
  public.has_role(auth.uid(), 'admin')
  or public.has_role(auth.uid(), 'manager')
  or public.has_role(auth.uid(), 'engineer')
  or public.has_role(auth.uid(), 'purchasing')
)
with check (
  public.has_role(auth.uid(), 'admin')
  or public.has_role(auth.uid(), 'manager')
  or public.has_role(auth.uid(), 'engineer')
  or public.has_role(auth.uid(), 'purchasing')
);

drop policy if exists "projeto_insumos_delete" on public.projeto_insumos;
create policy "projeto_insumos_delete" on public.projeto_insumos
for delete to authenticated
using (
  public.has_role(auth.uid(), 'admin')
  or public.has_role(auth.uid(), 'manager')
);
