insert into public.role_module_permissions (role, module, enabled, updated_by)
values
  ('manager',    'compras'::public.app_module,      true, null),
  ('purchasing', 'compras'::public.app_module,      true, null),
  ('manager',    'fornecedores'::public.app_module, true, null),
  ('purchasing', 'fornecedores'::public.app_module, true, null)
on conflict (role, module) do update set enabled = excluded.enabled;
