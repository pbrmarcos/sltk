
-- 1) Enum de módulos
create type public.app_module as enum (
  'dashboard','processos','clientes','comercial','engenharia',
  'producao','qualidade','logistica','pos_vendas','know_how',
  'admin','changelog'
);

-- 2) Tabela
create table public.role_module_permissions (
  id uuid primary key default gen_random_uuid(),
  role public.app_role not null,
  module public.app_module not null,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  unique (role, module)
);

-- 3) Grants
grant select, insert, update, delete on public.role_module_permissions to authenticated;
grant all on public.role_module_permissions to service_role;

-- 4) RLS
alter table public.role_module_permissions enable row level security;

create policy "rmp_select_all_auth" on public.role_module_permissions
  for select to authenticated using (true);

create policy "rmp_admin_insert" on public.role_module_permissions
  for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "rmp_admin_update" on public.role_module_permissions
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

create policy "rmp_admin_delete" on public.role_module_permissions
  for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 5) Trigger updated_at
create trigger tg_rmp_updated_at
  before update on public.role_module_permissions
  for each row execute function public.tg_set_updated_at();

-- 6) Trigger audit dedicada
create or replace function public.tg_role_module_permissions_audit()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.audit_log (user_id, table_name, record_id, action, new_value)
    values (auth.uid(), 'role_module_permissions', new.id::text, 'INSERT', to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    if new.enabled is distinct from old.enabled then
      insert into public.audit_log (user_id, table_name, record_id, action, field_changed, old_value, new_value)
      values (auth.uid(), 'role_module_permissions', new.id::text, 'UPDATE', 'enabled', to_jsonb(old.enabled), to_jsonb(new.enabled));
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_log (user_id, table_name, record_id, action, old_value)
    values (auth.uid(), 'role_module_permissions', old.id::text, 'DELETE', to_jsonb(old));
    return old;
  end if;
  return null;
end $$;

create trigger tg_rmp_audit
  after insert or update or delete on public.role_module_permissions
  for each row execute function public.tg_role_module_permissions_audit();

-- 7) Função de checagem
create or replace function public.can_access_module(_user uuid, _module public.app_module)
returns boolean
language sql stable security definer set search_path = public as $$
  select
    public.has_role(_user, 'admin'::public.app_role)
    or exists (
      select 1
      from public.user_roles ur
      join public.role_module_permissions rmp on rmp.role = ur.role
      where ur.user_id = _user
        and rmp.module = _module
        and rmp.enabled = true
    )
$$;

-- 8) Seed inicial
insert into public.role_module_permissions (role, module, enabled) values
  -- admin: tudo
  ('admin','dashboard',true),('admin','processos',true),('admin','clientes',true),
  ('admin','comercial',true),('admin','engenharia',true),('admin','producao',true),
  ('admin','qualidade',true),('admin','logistica',true),('admin','pos_vendas',true),
  ('admin','know_how',true),('admin','admin',true),('admin','changelog',true),
  -- manager: tudo exceto admin
  ('manager','dashboard',true),('manager','processos',true),('manager','clientes',true),
  ('manager','comercial',true),('manager','engenharia',true),('manager','producao',true),
  ('manager','qualidade',true),('manager','logistica',true),('manager','pos_vendas',true),
  ('manager','know_how',true),('manager','admin',false),('manager','changelog',true),
  -- sales
  ('sales','dashboard',true),('sales','processos',true),('sales','clientes',true),
  ('sales','comercial',true),('sales','engenharia',false),('sales','producao',false),
  ('sales','qualidade',false),('sales','logistica',false),('sales','pos_vendas',true),
  ('sales','know_how',true),('sales','admin',false),('sales','changelog',true),
  -- engineer
  ('engineer','dashboard',true),('engineer','processos',true),('engineer','clientes',false),
  ('engineer','comercial',false),('engineer','engenharia',true),('engineer','producao',false),
  ('engineer','qualidade',true),('engineer','logistica',false),('engineer','pos_vendas',false),
  ('engineer','know_how',true),('engineer','admin',false),('engineer','changelog',true),
  -- production
  ('production','dashboard',true),('production','processos',true),('production','clientes',false),
  ('production','comercial',false),('production','engenharia',false),('production','producao',true),
  ('production','qualidade',false),('production','logistica',true),('production','pos_vendas',false),
  ('production','know_how',true),('production','admin',false),('production','changelog',true),
  -- purchasing
  ('purchasing','dashboard',true),('purchasing','processos',false),('purchasing','clientes',true),
  ('purchasing','comercial',true),('purchasing','engenharia',false),('purchasing','producao',false),
  ('purchasing','qualidade',false),('purchasing','logistica',true),('purchasing','pos_vendas',false),
  ('purchasing','know_how',true),('purchasing','admin',false),('purchasing','changelog',true),
  -- assembly
  ('assembly','dashboard',true),('assembly','processos',true),('assembly','clientes',false),
  ('assembly','comercial',false),('assembly','engenharia',false),('assembly','producao',true),
  ('assembly','qualidade',true),('assembly','logistica',false),('assembly','pos_vendas',false),
  ('assembly','know_how',true),('assembly','admin',false),('assembly','changelog',true),
  -- field
  ('field','dashboard',true),('field','processos',true),('field','clientes',false),
  ('field','comercial',false),('field','engenharia',false),('field','producao',false),
  ('field','qualidade',true),('field','logistica',false),('field','pos_vendas',true),
  ('field','know_how',true),('field','admin',false),('field','changelog',true);
