-- Soft-delete + auditoria + lixeira (30 dias) para entrevistas
alter table public.entrevistas
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null,
  add column if not exists deleted_reason text,
  add column if not exists purge_at timestamptz;

create index if not exists entrevistas_deleted_at_idx on public.entrevistas (deleted_at);
create index if not exists entrevistas_purge_at_idx on public.entrevistas (purge_at);

create table if not exists public.entrevista_audit (
  id uuid primary key default gen_random_uuid(),
  entrevista_id uuid not null references public.entrevistas(id) on delete cascade,
  action text not null check (action in ('trash','restore','purge','create','update')),
  actor_id uuid references auth.users(id) on delete set null,
  actor_email text,
  reason text,
  meta jsonb,
  created_at timestamptz not null default now()
);

grant select, insert on public.entrevista_audit to authenticated;
grant all on public.entrevista_audit to service_role;

alter table public.entrevista_audit enable row level security;

drop policy if exists entrev_audit_select on public.entrevista_audit;
create policy entrev_audit_select on public.entrevista_audit
  for select to authenticated
  using (
    exists (
      select 1 from public.entrevistas e
      where e.id = entrevista_audit.entrevista_id
        and (e.criado_por = auth.uid()
             or public.has_role(auth.uid(), 'admin'::app_role)
             or public.has_role(auth.uid(), 'manager'::app_role))
    )
  );

drop policy if exists entrev_audit_insert on public.entrevista_audit;
create policy entrev_audit_insert on public.entrevista_audit
  for insert to authenticated
  with check (actor_id = auth.uid());

drop policy if exists entrev_delete_admin on public.entrevistas;
create policy entrev_delete_admin on public.entrevistas
  for delete to authenticated
  using (
    public.has_role(auth.uid(), 'admin'::app_role)
    or public.has_role(auth.uid(), 'manager'::app_role)
  );
