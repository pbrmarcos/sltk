-- ============================================================
-- Fase 1 — Cadastro de Fornecedores
-- ============================================================
-- Tabelas: fornecedores, fornecedor_contatos, fornecedor_categorias_catalog,
--          fornecedor_categoria_link, fornecedor_anexos, fornecedor_notas
-- Inclui seeds das principais categorias e permissão default para roles relevantes.
-- ============================================================

-- Enums
do $$ begin
  create type public.fornecedor_ranking as enum ('A','B','C');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.fornecedor_status as enum ('ativo','em_avaliacao','inativo','bloqueado');
exception when duplicate_object then null; end $$;

-- Sequence para código
create sequence if not exists public.fornecedores_codigo_seq;

-- =========================================================
-- Tabela: fornecedores
-- =========================================================
create table if not exists public.fornecedores (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  nome_fantasia text,
  pais text not null default 'CN',
  cidade text,
  endereco text,
  site text,
  email_corporativo text,
  telefone_ddi text,
  telefone_numero text,
  idioma text default 'en',
  ranking public.fornecedor_ranking not null default 'B',
  status public.fornecedor_status not null default 'em_avaliacao',
  score_calculado numeric(5,2),
  observacoes text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create index if not exists fornecedores_pais_idx on public.fornecedores (pais) where deleted_at is null;
create index if not exists fornecedores_status_idx on public.fornecedores (status) where deleted_at is null;
create index if not exists fornecedores_ranking_idx on public.fornecedores (ranking) where deleted_at is null;
create index if not exists fornecedores_nome_trgm_idx on public.fornecedores using gin (nome gin_trgm_ops);
create index if not exists fornecedores_tags_idx on public.fornecedores using gin (tags);

-- Triggers
create or replace function public.tg_fornecedores_set_codigo()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.codigo is null or new.codigo = '' then
    new.codigo := 'FOR-' || lpad(nextval('public.fornecedores_codigo_seq')::text, 5, '0');
  end if;
  if new.created_by is null then
    new.created_by := auth.uid();
  end if;
  return new;
end $$;

create or replace function public.tg_fornecedores_set_updated()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

drop trigger if exists tg_fornecedores_set_codigo on public.fornecedores;
create trigger tg_fornecedores_set_codigo
  before insert on public.fornecedores
  for each row execute function public.tg_fornecedores_set_codigo();

drop trigger if exists tg_fornecedores_set_updated on public.fornecedores;
create trigger tg_fornecedores_set_updated
  before update on public.fornecedores
  for each row execute function public.tg_fornecedores_set_updated();

-- =========================================================
-- fornecedor_contatos
-- =========================================================
create table if not exists public.fornecedor_contatos (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references public.fornecedores(id) on delete cascade,
  nome text not null,
  cargo text,
  email text,
  telefone_ddi text,
  telefone_numero text,
  wechat text,
  whatsapp text,
  principal boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);
create index if not exists fornecedor_contatos_fornecedor_idx on public.fornecedor_contatos (fornecedor_id);

-- =========================================================
-- fornecedor_categorias_catalog
-- =========================================================
create table if not exists public.fornecedor_categorias_catalog (
  slug text primary key,
  nome_pt text not null,
  nome_en text not null,
  parent_slug text references public.fornecedor_categorias_catalog(slug),
  ordem int not null default 0,
  ativo boolean not null default true
);

-- =========================================================
-- fornecedor_categoria_link (N:N)
-- =========================================================
create table if not exists public.fornecedor_categoria_link (
  fornecedor_id uuid not null references public.fornecedores(id) on delete cascade,
  categoria_slug text not null references public.fornecedor_categorias_catalog(slug),
  primary key (fornecedor_id, categoria_slug)
);
create index if not exists fornecedor_categoria_link_categoria_idx on public.fornecedor_categoria_link (categoria_slug);

-- =========================================================
-- fornecedor_anexos
-- =========================================================
create table if not exists public.fornecedor_anexos (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references public.fornecedores(id) on delete cascade,
  tipo text not null default 'documento',  -- cartao | folder | catalogo | foto_produto | documento
  nome_original text not null,
  nome_final text not null,
  mime text,
  tamanho bigint,
  storage_bucket text not null default 'fornecedores',
  storage_path text not null,
  descricao text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  deleted_at timestamptz
);
create index if not exists fornecedor_anexos_fornecedor_idx on public.fornecedor_anexos (fornecedor_id) where deleted_at is null;

-- =========================================================
-- fornecedor_notas
-- =========================================================
create table if not exists public.fornecedor_notas (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid not null references public.fornecedores(id) on delete cascade,
  tipo text not null default 'nota',       -- nota | email | reuniao | avaliacao
  texto text not null,
  user_id uuid references auth.users(id),
  user_nome text,
  created_at timestamptz not null default now()
);
create index if not exists fornecedor_notas_fornecedor_idx on public.fornecedor_notas (fornecedor_id);

-- =========================================================
-- GRANTs
-- =========================================================
grant select, insert, update, delete on public.fornecedores                   to authenticated;
grant select, insert, update, delete on public.fornecedor_contatos            to authenticated;
grant select                          on public.fornecedor_categorias_catalog to authenticated;
grant select, insert, update, delete on public.fornecedor_categoria_link      to authenticated;
grant select, insert, update, delete on public.fornecedor_anexos              to authenticated;
grant select, insert, update, delete on public.fornecedor_notas               to authenticated;
grant all on public.fornecedores, public.fornecedor_contatos, public.fornecedor_categorias_catalog,
            public.fornecedor_categoria_link, public.fornecedor_anexos, public.fornecedor_notas
       to service_role;
grant usage, select on sequence public.fornecedores_codigo_seq to authenticated, service_role;

-- =========================================================
-- RLS
-- =========================================================
alter table public.fornecedores                   enable row level security;
alter table public.fornecedor_contatos            enable row level security;
alter table public.fornecedor_categorias_catalog  enable row level security;
alter table public.fornecedor_categoria_link      enable row level security;
alter table public.fornecedor_anexos              enable row level security;
alter table public.fornecedor_notas               enable row level security;

-- fornecedores
drop policy if exists fornecedores_select on public.fornecedores;
create policy fornecedores_select on public.fornecedores
  for select to authenticated
  using (deleted_at is null and public.can_access_module(auth.uid(), 'fornecedores'::public.app_module));

drop policy if exists fornecedores_insert on public.fornecedores;
create policy fornecedores_insert on public.fornecedores
  for insert to authenticated
  with check (public.can_access_module(auth.uid(), 'fornecedores'::public.app_module));

drop policy if exists fornecedores_update on public.fornecedores;
create policy fornecedores_update on public.fornecedores
  for update to authenticated
  using (public.can_access_module(auth.uid(), 'fornecedores'::public.app_module))
  with check (public.can_access_module(auth.uid(), 'fornecedores'::public.app_module));

drop policy if exists fornecedores_delete on public.fornecedores;
create policy fornecedores_delete on public.fornecedores
  for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));

-- fornecedor_contatos
drop policy if exists fornecedor_contatos_all on public.fornecedor_contatos;
create policy fornecedor_contatos_all on public.fornecedor_contatos
  for all to authenticated
  using (public.can_access_module(auth.uid(), 'fornecedores'::public.app_module))
  with check (public.can_access_module(auth.uid(), 'fornecedores'::public.app_module));

-- catálogo: leitura livre, escrita admin
drop policy if exists fornecedor_categorias_catalog_select on public.fornecedor_categorias_catalog;
create policy fornecedor_categorias_catalog_select on public.fornecedor_categorias_catalog
  for select to authenticated using (true);

drop policy if exists fornecedor_categorias_catalog_write on public.fornecedor_categorias_catalog;
create policy fornecedor_categorias_catalog_write on public.fornecedor_categorias_catalog
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

-- link N:N
drop policy if exists fornecedor_categoria_link_all on public.fornecedor_categoria_link;
create policy fornecedor_categoria_link_all on public.fornecedor_categoria_link
  for all to authenticated
  using (public.can_access_module(auth.uid(), 'fornecedores'::public.app_module))
  with check (public.can_access_module(auth.uid(), 'fornecedores'::public.app_module));

-- anexos
drop policy if exists fornecedor_anexos_all on public.fornecedor_anexos;
create policy fornecedor_anexos_all on public.fornecedor_anexos
  for all to authenticated
  using (public.can_access_module(auth.uid(), 'fornecedores'::public.app_module))
  with check (public.can_access_module(auth.uid(), 'fornecedores'::public.app_module));

-- notas
drop policy if exists fornecedor_notas_all on public.fornecedor_notas;
create policy fornecedor_notas_all on public.fornecedor_notas
  for all to authenticated
  using (public.can_access_module(auth.uid(), 'fornecedores'::public.app_module))
  with check (public.can_access_module(auth.uid(), 'fornecedores'::public.app_module));

-- =========================================================
-- Storage RLS para o bucket 'fornecedores' (já criado via tool)
-- =========================================================
drop policy if exists fornecedores_storage_read on storage.objects;
create policy fornecedores_storage_read on storage.objects
  for select to authenticated
  using (bucket_id = 'fornecedores'
         and public.can_access_module(auth.uid(), 'fornecedores'::public.app_module));

drop policy if exists fornecedores_storage_write on storage.objects;
create policy fornecedores_storage_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fornecedores'
              and public.can_access_module(auth.uid(), 'fornecedores'::public.app_module));

drop policy if exists fornecedores_storage_update on storage.objects;
create policy fornecedores_storage_update on storage.objects
  for update to authenticated
  using (bucket_id = 'fornecedores'
         and public.can_access_module(auth.uid(), 'fornecedores'::public.app_module));

drop policy if exists fornecedores_storage_delete on storage.objects;
create policy fornecedores_storage_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'fornecedores'
         and public.can_access_module(auth.uid(), 'fornecedores'::public.app_module));

-- =========================================================
-- Seed: catálogo de categorias
-- =========================================================
insert into public.fornecedor_categorias_catalog (slug, nome_pt, nome_en, ordem) values
  ('esteiras',             'Esteiras / Transportadores',     'Conveyors / Belts',              10),
  ('envasadoras',          'Envasadoras',                    'Filling machines',               20),
  ('rotuladoras',          'Rotuladoras',                    'Labeling machines',              30),
  ('empacotadoras',        'Empacotadoras',                  'Packing machines',               40),
  ('paletizadoras',        'Paletizadoras',                  'Palletizers',                    50),
  ('sensores',             'Sensores',                       'Sensors',                        60),
  ('valvulas',             'Válvulas',                       'Valves',                         70),
  ('bombas',               'Bombas',                         'Pumps',                          80),
  ('motores_redutores',    'Motores e Redutores',            'Motors & Gearboxes',             90),
  ('inversores',           'Inversores e Servos',            'Drives & Servos',               100),
  ('clps_ihm',             'CLPs e IHMs',                    'PLCs & HMIs',                   110),
  ('paineis_eletricos',    'Painéis Elétricos',              'Electrical panels',             120),
  ('inox',                 'Componentes em Inox',            'Stainless components',          130),
  ('embalagem_filme',      'Filmes / Embalagem flexível',    'Films / Flexible packaging',    140),
  ('caixas_papelao',       'Caixas de papelão',              'Cardboard boxes',               150),
  ('frete_internacional',  'Frete internacional',            'International freight',         160),
  ('servicos_engenharia',  'Serviços de engenharia',         'Engineering services',          170),
  ('automacao_geral',      'Automação geral',                'General automation',            180)
on conflict (slug) do update set
  nome_pt = excluded.nome_pt,
  nome_en = excluded.nome_en,
  ordem   = excluded.ordem;

-- =========================================================
-- Seed: habilita módulo fornecedores para roles relevantes
-- =========================================================
insert into public.role_module_permissions (role, module, enabled, updated_by)
values
  ('manager',    'fornecedores'::public.app_module, true, null),
  ('purchasing', 'fornecedores'::public.app_module, true, null),
  ('sales',      'fornecedores'::public.app_module, true, null),
  ('engineer',   'fornecedores'::public.app_module, true, null)
on conflict (role, module) do update set enabled = excluded.enabled;
