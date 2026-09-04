-- =========================================================
-- Histórico de submissões de scan/enriquecimento por fornecedor
-- =========================================================
create table if not exists public.fornecedor_scan_submissoes (
  id uuid primary key default gen_random_uuid(),
  fornecedor_id uuid references public.fornecedores(id) on delete cascade,
  origem text not null default 'scan',
  imagens_count int not null default 0,
  extracted jsonb,
  enrichment jsonb,
  endereco_original text,
  drive_folder_id text,
  drive_files jsonb,
  ok boolean not null default true,
  error text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  created_by_email text
);

create index if not exists fornecedor_scan_submissoes_forn_idx
  on public.fornecedor_scan_submissoes (fornecedor_id, created_at desc);

grant select, insert, update on public.fornecedor_scan_submissoes to authenticated;
grant all on public.fornecedor_scan_submissoes to service_role;

alter table public.fornecedor_scan_submissoes enable row level security;

drop policy if exists fornecedor_scan_submissoes_all on public.fornecedor_scan_submissoes;
create policy fornecedor_scan_submissoes_all on public.fornecedor_scan_submissoes
  for all to authenticated using (true) with check (true);
