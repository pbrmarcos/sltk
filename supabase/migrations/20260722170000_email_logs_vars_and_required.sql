alter table public.email_send_log
  add column if not exists vars_used jsonb,
  add column if not exists template_snapshot jsonb,
  add column if not exists required_missing text[];

alter table public.email_event_config
  add column if not exists required_vars text[] not null default '{}';
