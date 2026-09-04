-- Know-how & Treinamentos — MVP (Fase 1)
-- Tables, RLS, grants, seed default collections.

-- =========================
-- ENUMS
-- =========================
do $$ begin
  create type public.kh_item_tipo as enum ('artigo', 'video', 'pdf', 'checklist');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.kh_item_status as enum ('rascunho', 'em_revisao', 'publicado', 'arquivado');
exception when duplicate_object then null; end $$;

-- =========================
-- kh_colecoes
-- =========================
create table if not exists public.kh_colecoes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome text not null,
  descricao text,
  cor text,
  ordem int not null default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

grant select, insert, update, delete on public.kh_colecoes to authenticated;
grant all on public.kh_colecoes to service_role;
alter table public.kh_colecoes enable row level security;

create policy "kh_colecoes select authenticated" on public.kh_colecoes
  for select to authenticated using (true);
create policy "kh_colecoes admin/manager insert" on public.kh_colecoes
  for insert to authenticated with check (
    public.has_role(auth.uid(), 'admin'::app_role) or public.has_role(auth.uid(), 'manager'::app_role)
  );
create policy "kh_colecoes admin/manager update" on public.kh_colecoes
  for update to authenticated using (
    public.has_role(auth.uid(), 'admin'::app_role) or public.has_role(auth.uid(), 'manager'::app_role)
  );
create policy "kh_colecoes admin delete" on public.kh_colecoes
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'::app_role));

-- =========================
-- kh_itens
-- =========================
create table if not exists public.kh_itens (
  id uuid primary key default gen_random_uuid(),
  colecao_id uuid not null references public.kh_colecoes(id) on delete restrict,
  slug text not null unique,
  tipo public.kh_item_tipo not null default 'artigo',
  titulo text not null,
  resumo text,
  corpo text,
  midia_url text,
  status public.kh_item_status not null default 'rascunho',
  versao int not null default 1,
  papeis_alvo text[] not null default '{}',
  tags text[] not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  revisor_id uuid references auth.users(id) on delete set null,
  aprovado_em timestamptz,
  aprovado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists idx_kh_itens_colecao on public.kh_itens(colecao_id);
create index if not exists idx_kh_itens_status on public.kh_itens(status);
create index if not exists idx_kh_itens_created_by on public.kh_itens(created_by);
create index if not exists idx_kh_itens_tags on public.kh_itens using gin(tags);

grant select, insert, update, delete on public.kh_itens to authenticated;
grant all on public.kh_itens to service_role;
alter table public.kh_itens enable row level security;

-- Read: publicado (todos autenticados), ou é o autor, ou é manager/admin
create policy "kh_itens read" on public.kh_itens
  for select to authenticated using (
    status = 'publicado'
    or created_by = auth.uid()
    or revisor_id = auth.uid()
    or public.has_role(auth.uid(), 'admin'::app_role)
    or public.has_role(auth.uid(), 'manager'::app_role)
  );

-- Insert: engineer, manager, admin
create policy "kh_itens insert autores" on public.kh_itens
  for insert to authenticated with check (
    created_by = auth.uid()
    and (
      public.has_role(auth.uid(), 'admin'::app_role)
      or public.has_role(auth.uid(), 'manager'::app_role)
      or public.has_role(auth.uid(), 'engineer'::app_role)
    )
  );


-- Update: autor (enquanto não publicado) ou manager/admin
create policy "kh_itens update" on public.kh_itens
  for update to authenticated using (
    public.has_role(auth.uid(), 'admin'::app_role)
    or public.has_role(auth.uid(), 'manager'::app_role)
    or (created_by = auth.uid() and status <> 'publicado')
  );

create policy "kh_itens delete admin/manager" on public.kh_itens
  for delete to authenticated using (
    public.has_role(auth.uid(), 'admin'::app_role) or public.has_role(auth.uid(), 'manager'::app_role)
  );

-- Trigger para atualizado_em
create or replace function public.tg_kh_itens_touch() returns trigger
  language plpgsql set search_path = public as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists tg_kh_itens_touch on public.kh_itens;
create trigger tg_kh_itens_touch before update on public.kh_itens
  for each row execute function public.tg_kh_itens_touch();

-- =========================
-- kh_item_versoes (histórico)
-- =========================
create table if not exists public.kh_item_versoes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.kh_itens(id) on delete cascade,
  versao int not null,
  titulo text,
  resumo text,
  corpo text,
  midia_url text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists idx_kh_versoes_item on public.kh_item_versoes(item_id);
grant select, insert on public.kh_item_versoes to authenticated;
grant all on public.kh_item_versoes to service_role;
alter table public.kh_item_versoes enable row level security;

create policy "kh_item_versoes read" on public.kh_item_versoes
  for select to authenticated using (
    exists (
      select 1 from public.kh_itens i
      where i.id = kh_item_versoes.item_id
        and (
          i.status = 'publicado'
          or i.created_by = auth.uid()
          or public.has_role(auth.uid(), 'admin'::app_role)
          or public.has_role(auth.uid(), 'manager'::app_role)
        )
    )
  );

create policy "kh_item_versoes insert" on public.kh_item_versoes
  for insert to authenticated with check (
    exists (
      select 1 from public.kh_itens i
      where i.id = kh_item_versoes.item_id
        and (
          i.created_by = auth.uid()
          or public.has_role(auth.uid(), 'admin'::app_role)
          or public.has_role(auth.uid(), 'manager'::app_role)
        )
    )
  );

-- =========================
-- kh_visualizacoes (auditoria de leitura)
-- =========================
create table if not exists public.kh_visualizacoes (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.kh_itens(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create index if not exists idx_kh_vis_item on public.kh_visualizacoes(item_id);
create index if not exists idx_kh_vis_user on public.kh_visualizacoes(user_id);
grant select, insert on public.kh_visualizacoes to authenticated;
grant all on public.kh_visualizacoes to service_role;
alter table public.kh_visualizacoes enable row level security;

create policy "kh_visualizacoes self read" on public.kh_visualizacoes
  for select to authenticated using (
    user_id = auth.uid()
    or public.has_role(auth.uid(), 'admin'::app_role)
    or public.has_role(auth.uid(), 'manager'::app_role)
  );
create policy "kh_visualizacoes self insert" on public.kh_visualizacoes
  for insert to authenticated with check (user_id = auth.uid());

-- =========================
-- Seed coleções default
-- =========================
insert into public.kh_colecoes (slug, nome, descricao, ordem) values
  ('montagem',        'Montagem',            'Procedimentos e boas práticas de montagem mecânica.', 1),
  ('eletrica',        'Elétrica',            'Diagramas, ligações e comissionamento elétrico.',    2),
  ('comissionamento', 'Comissionamento',     'Partida, ajuste fino e validação inicial.',           3),
  ('fat-sat',         'FAT / SAT',           'Ensaios de aceitação em fábrica e no cliente.',       4),
  ('comercial',       'Comercial',           'Boas práticas de venda técnica e pós-venda.',         5),
  ('compras',         'Compras',             'Homologação de fornecedores e RFQ.',                  6),
  ('seguranca',       'Segurança',           'EPI, procedimentos de segurança e NRs.',              7)
on conflict (slug) do nothing;
