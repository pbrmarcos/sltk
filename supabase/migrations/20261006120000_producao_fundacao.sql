-- Fundação do banco de produção: repara o drift do bootstrap-por-snapshot.
-- 1) O trigger on_auth_user_created não veio no snapshot (triggers em auth.users
--    não entram no dump) — sem ele, usuário novo fica sem linha em profiles.
-- 2) A seed de role_module_permissions constava como aplicada mas a tabela
--    estava VAZIA — nenhuma role além de admin enxergava módulo algum.
-- Tudo idempotente: seguro re-rodar.

-- ============ 1) Trigger de criação de profile + backfill ============
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.profiles (id, email, full_name)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', u.email)
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- ============ 2) Snapshot de roles pra reativação de usuário ============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS roles_snapshot jsonb;

-- ============ 3) Seed de permissões por role (sem 'processos', removido) ============
INSERT INTO public.role_module_permissions (role, module, enabled) VALUES
  ('admin','dashboard',true),('admin','clientes',true),
  ('admin','comercial',true),('admin','engenharia',true),('admin','producao',true),
  ('admin','qualidade',true),('admin','logistica',true),('admin','pos_vendas',true),
  ('admin','know_how',true),('admin','admin',true),('admin','changelog',true),
  ('admin','compras',true),('admin','fornecedores',true),
  ('manager','dashboard',true),('manager','clientes',true),
  ('manager','comercial',true),('manager','engenharia',true),('manager','producao',true),
  ('manager','qualidade',true),('manager','logistica',true),('manager','pos_vendas',true),
  ('manager','know_how',true),('manager','admin',false),('manager','changelog',true),
  ('manager','compras',true),('manager','fornecedores',true),
  ('sales','dashboard',true),('sales','clientes',true),
  ('sales','comercial',true),('sales','engenharia',false),('sales','producao',false),
  ('sales','qualidade',false),('sales','logistica',false),('sales','pos_vendas',true),
  ('sales','know_how',true),('sales','admin',false),('sales','changelog',true),
  ('engineer','dashboard',true),('engineer','clientes',false),
  ('engineer','comercial',false),('engineer','engenharia',true),('engineer','producao',false),
  ('engineer','qualidade',true),('engineer','logistica',false),('engineer','pos_vendas',false),
  ('engineer','know_how',true),('engineer','admin',false),('engineer','changelog',true),
  ('production','dashboard',true),('production','clientes',false),
  ('production','comercial',false),('production','engenharia',false),('production','producao',true),
  ('production','qualidade',false),('production','logistica',true),('production','pos_vendas',false),
  ('production','know_how',true),('production','admin',false),('production','changelog',true),
  ('purchasing','dashboard',true),('purchasing','clientes',true),
  ('purchasing','comercial',true),('purchasing','engenharia',false),('purchasing','producao',false),
  ('purchasing','qualidade',false),('purchasing','logistica',true),('purchasing','pos_vendas',false),
  ('purchasing','know_how',true),('purchasing','admin',false),('purchasing','changelog',true),
  ('purchasing','compras',true),('purchasing','fornecedores',true),
  ('assembly','dashboard',true),('assembly','clientes',false),
  ('assembly','comercial',false),('assembly','engenharia',false),('assembly','producao',true),
  ('assembly','qualidade',true),('assembly','logistica',false),('assembly','pos_vendas',false),
  ('assembly','know_how',true),('assembly','admin',false),('assembly','changelog',true),
  ('field','dashboard',true),('field','clientes',false),
  ('field','comercial',false),('field','engenharia',false),('field','producao',false),
  ('field','qualidade',true),('field','logistica',false),('field','pos_vendas',true),
  ('field','know_how',true),('field','admin',false),('field','changelog',true)
ON CONFLICT (role, module) DO NOTHING;

NOTIFY pgrst, 'reload schema';
