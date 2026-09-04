-- Audit log para chamadas ao Gemini (scan de fornecedores e similares).
-- Cada chamada (sucesso ou falha) registra status HTTP, código do Google,
-- mensagem e usuário responsável, para auditoria rápida quando a API falha.
create table if not exists public.gemini_scan_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  endpoint text not null default 'scan_fornecedor',
  ok boolean not null,
  status integer,
  code text,
  message text,
  provider_message text,
  duration_ms integer,
  imagens_count integer,
  request_context text
);

create index if not exists gemini_scan_log_created_idx
  on public.gemini_scan_log (created_at desc);
create index if not exists gemini_scan_log_ok_idx
  on public.gemini_scan_log (ok, created_at desc);

grant select on public.gemini_scan_log to authenticated;
grant all on public.gemini_scan_log to service_role;

alter table public.gemini_scan_log enable row level security;

-- Apenas admin/manager/purchasing leem os logs.
drop policy if exists "gemini_scan_log_select_priv" on public.gemini_scan_log;
create policy "gemini_scan_log_select_priv"
  on public.gemini_scan_log
  for select
  to authenticated
  using (
    public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'manager')
    or public.has_role(auth.uid(), 'purchasing')
  );
