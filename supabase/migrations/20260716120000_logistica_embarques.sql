-- Logística & Embarque — MVP (Fase 2)
-- Tabelas de embarque, itens e anexos + RLS + grants.

-- =========================
-- ENUM status
-- =========================
do $$ begin
  create type public.logistica_embarque_status as enum ('rascunho', 'programado', 'embarcado', 'entregue', 'cancelado');
exception when duplicate_object then null; end $$;

-- =========================
-- Sequence para numero legível
-- =========================
create sequence if not exists public.logistica_embarques_numero_seq;

create or replace function public.logistica_embarques_set_numero()
returns trigger language plpgsql as $$
begin
  if new.numero is null or new.numero = '' then
    new.numero := 'EMB-' || to_char(now(), 'YYYY') || '-' ||
      lpad(nextval('public.logistica_embarques_numero_seq')::text, 4, '0');
  end if;
  return new;
end $$;

-- =========================
-- logistica_embarques
-- =========================
create table if not exists public.logistica_embarques (
  id uuid primary key default gen_random_uuid(),
  numero text unique,
  projeto_id uuid not null references public.equipamento_projetos(id) on delete restrict,
  transportadora_id uuid references public.compras_transportadoras(id) on delete set null,
  status public.logistica_embarque_status not null default 'rascunho',
  previsao_saida date,
  data_saida timestamptz,
  data_entrega timestamptz,
  nf_saida text,
  destino text,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_logistica_embarques_projeto on public.logistica_embarques(projeto_id);
create index if not exists idx_logistica_embarques_status on public.logistica_embarques(status);
create index if not exists idx_logistica_embarques_previsao on public.logistica_embarques(previsao_saida);

drop trigger if exists trg_logistica_embarques_numero on public.logistica_embarques;
create trigger trg_logistica_embarques_numero
  before insert on public.logistica_embarques
  for each row execute function public.logistica_embarques_set_numero();

grant select, insert, update, delete on public.logistica_embarques to authenticated;
grant all on public.logistica_embarques to service_role;
alter table public.logistica_embarques enable row level security;

create policy "logistica_embarques select authenticated" on public.logistica_embarques
  for select to authenticated using (true);

create policy "logistica_embarques insert" on public.logistica_embarques
  for insert to authenticated with check (
    public.has_role(auth.uid(), 'admin'::app_role)
    or public.has_role(auth.uid(), 'manager'::app_role)
    or public.has_role(auth.uid(), 'field'::app_role)
  );

create policy "logistica_embarques update" on public.logistica_embarques
  for update to authenticated using (
    public.has_role(auth.uid(), 'admin'::app_role)
    or public.has_role(auth.uid(), 'manager'::app_role)
    or public.has_role(auth.uid(), 'field'::app_role)
  );

create policy "logistica_embarques delete admin" on public.logistica_embarques
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'::app_role));

-- =========================
-- logistica_embarque_itens
-- =========================
create table if not exists public.logistica_embarque_itens (
  id uuid primary key default gen_random_uuid(),
  embarque_id uuid not null references public.logistica_embarques(id) on delete cascade,
  descricao text not null,
  quantidade numeric(14,3) not null default 1,
  unidade text default 'un',
  peso_kg numeric(12,3),
  volume_m3 numeric(12,3),
  serial text,
  observacoes text,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_logistica_embarque_itens_embarque on public.logistica_embarque_itens(embarque_id);

grant select, insert, update, delete on public.logistica_embarque_itens to authenticated;
grant all on public.logistica_embarque_itens to service_role;
alter table public.logistica_embarque_itens enable row level security;

create policy "logistica_embarque_itens select" on public.logistica_embarque_itens
  for select to authenticated using (true);

create policy "logistica_embarque_itens write" on public.logistica_embarque_itens
  for all to authenticated using (
    public.has_role(auth.uid(), 'admin'::app_role)
    or public.has_role(auth.uid(), 'manager'::app_role)
    or public.has_role(auth.uid(), 'field'::app_role)
  ) with check (
    public.has_role(auth.uid(), 'admin'::app_role)
    or public.has_role(auth.uid(), 'manager'::app_role)
    or public.has_role(auth.uid(), 'field'::app_role)
  );

-- =========================
-- logistica_embarque_anexos
-- =========================
create table if not exists public.logistica_embarque_anexos (
  id uuid primary key default gen_random_uuid(),
  embarque_id uuid not null references public.logistica_embarques(id) on delete cascade,
  categoria text not null default 'foto',   -- foto, nf, comprovante, outro
  nome_arquivo text not null,
  storage_path text not null,
  tamanho_bytes bigint,
  mime_type text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_logistica_embarque_anexos_embarque on public.logistica_embarque_anexos(embarque_id);

grant select, insert, update, delete on public.logistica_embarque_anexos to authenticated;
grant all on public.logistica_embarque_anexos to service_role;
alter table public.logistica_embarque_anexos enable row level security;

create policy "logistica_embarque_anexos select" on public.logistica_embarque_anexos
  for select to authenticated using (true);

create policy "logistica_embarque_anexos write" on public.logistica_embarque_anexos
  for all to authenticated using (
    public.has_role(auth.uid(), 'admin'::app_role)
    or public.has_role(auth.uid(), 'manager'::app_role)
    or public.has_role(auth.uid(), 'field'::app_role)
  ) with check (
    public.has_role(auth.uid(), 'admin'::app_role)
    or public.has_role(auth.uid(), 'manager'::app_role)
    or public.has_role(auth.uid(), 'field'::app_role)
  );

-- =========================
-- updated_at trigger
-- =========================
create or replace function public.logistica_embarques_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_logistica_embarques_touch on public.logistica_embarques;
create trigger trg_logistica_embarques_touch
  before update on public.logistica_embarques
  for each row execute function public.logistica_embarques_touch();
