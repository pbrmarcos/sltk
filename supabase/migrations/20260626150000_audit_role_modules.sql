-- Garante linhas explícitas para fornecedores/compras em todas as roles
-- (admin já recebe tudo via has_role; demais usam matriz).
insert into public.role_module_permissions (role, module, enabled)
values
  ('admin',      'fornecedores'::public.app_module, true),
  ('admin',      'compras'::public.app_module,      true),
  ('engineer',   'compras'::public.app_module,      false),
  ('production', 'fornecedores'::public.app_module, false),
  ('production', 'compras'::public.app_module,      false),
  ('assembly',   'fornecedores'::public.app_module, false),
  ('assembly',   'compras'::public.app_module,      false),
  ('field',      'fornecedores'::public.app_module, false),
  ('field',      'compras'::public.app_module,      false),
  ('sales',      'compras'::public.app_module,      false)
on conflict (role, module) do nothing;
