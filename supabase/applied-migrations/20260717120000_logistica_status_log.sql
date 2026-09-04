-- Trilha de auditoria de status por embarque
create table if not exists public.logistica_embarque_status_log (
  id uuid primary key default gen_random_uuid(),
  embarque_id uuid not null references public.logistica_embarques(id) on delete cascade,
  from_status public.logistica_embarque_status,
  to_status public.logistica_embarque_status not null,
  notas text,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);

create index if not exists idx_logistica_status_log_embarque
  on public.logistica_embarque_status_log(embarque_id, changed_at desc);

grant select, insert on public.logistica_embarque_status_log to authenticated;
grant all on public.logistica_embarque_status_log to service_role;
alter table public.logistica_embarque_status_log enable row level security;

create policy "logistica_status_log select authenticated" on public.logistica_embarque_status_log
  for select to authenticated using (true);

create policy "logistica_status_log insert authenticated" on public.logistica_embarque_status_log
  for insert to authenticated with check (
    public.has_role(auth.uid(), 'admin'::app_role)
    or public.has_role(auth.uid(), 'manager'::app_role)
    or public.has_role(auth.uid(), 'field'::app_role)
  );
