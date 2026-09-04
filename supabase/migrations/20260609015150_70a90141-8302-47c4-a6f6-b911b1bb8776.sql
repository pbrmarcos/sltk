
-- Enum for audit actions
do $$ begin
  create type public.audit_action as enum ('INSERT', 'UPDATE', 'DELETE');
exception when duplicate_object then null; end $$;

-- 1. CREATE TABLE
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  table_name text not null,
  record_id text not null,
  action public.audit_action not null,
  field_changed text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_record_idx on public.audit_log (table_name, record_id, created_at desc);
create index audit_log_user_idx on public.audit_log (user_id, created_at desc);
create index audit_log_created_idx on public.audit_log (created_at desc);

-- 2. GRANTS (no insert/update/delete to authenticated; writes only via service_role)
grant select on public.audit_log to authenticated;
grant all on public.audit_log to service_role;

-- 3. RLS
alter table public.audit_log enable row level security;

-- 4. POLICIES
create policy audit_log_admin_manager_select
  on public.audit_log
  for select
  to authenticated
  using (
    public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'manager')
  );
