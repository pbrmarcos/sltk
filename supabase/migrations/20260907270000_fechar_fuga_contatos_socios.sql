-- cliente_contatos e cliente_socios nunca adotaram can_access_cliente() --
-- select de ambas era "USING (deleted_at IS NULL)", sem nenhuma checagem de
-- acesso ao cliente: qualquer usuario autenticado lia nome/email/telefone
-- de TODOS os contatos e socios de TODOS os clientes, contornando
-- exatamente a trava que can_access_cliente() foi estendida pra impor
-- nesta sessao. O insert/update tambem usava lista de papeis hardcoded
-- (admin/manager/sales), desalinhada da guarda de aplicacao dinamica
-- (assertCanAccessModule(...,"clientes"), que ja usa role_module_permissions).

DROP POLICY IF EXISTS cliente_contatos_select_auth ON public.cliente_contatos;
CREATE POLICY cliente_contatos_select_auth ON public.cliente_contatos
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.can_access_cliente(cliente_id));

DROP POLICY IF EXISTS cliente_contatos_insert_roles ON public.cliente_contatos;
CREATE POLICY cliente_contatos_insert_roles ON public.cliente_contatos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_access_cliente(cliente_id)
    AND public.can_access_module(auth.uid(), 'clientes'::public.app_module)
  );

DROP POLICY IF EXISTS cliente_contatos_update_roles ON public.cliente_contatos;
CREATE POLICY cliente_contatos_update_roles ON public.cliente_contatos
  FOR UPDATE TO authenticated
  USING (
    public.can_access_cliente(cliente_id)
    AND public.can_access_module(auth.uid(), 'clientes'::public.app_module)
  )
  WITH CHECK (
    public.can_access_cliente(cliente_id)
    AND public.can_access_module(auth.uid(), 'clientes'::public.app_module)
  );

DROP POLICY IF EXISTS "cliente_socios_select_auth" ON public.cliente_socios;
CREATE POLICY "cliente_socios_select_auth" ON public.cliente_socios
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.can_access_cliente(cliente_id));

DROP POLICY IF EXISTS "cliente_socios_write_roles" ON public.cliente_socios;
CREATE POLICY "cliente_socios_write_roles" ON public.cliente_socios
  FOR INSERT TO authenticated
  WITH CHECK (
    public.can_access_cliente(cliente_id)
    AND public.can_access_module(auth.uid(), 'clientes'::public.app_module)
  );

DROP POLICY IF EXISTS "cliente_socios_update_roles" ON public.cliente_socios;
CREATE POLICY "cliente_socios_update_roles" ON public.cliente_socios
  FOR UPDATE TO authenticated
  USING (
    public.can_access_cliente(cliente_id)
    AND public.can_access_module(auth.uid(), 'clientes'::public.app_module)
  )
  WITH CHECK (
    public.can_access_cliente(cliente_id)
    AND public.can_access_module(auth.uid(), 'clientes'::public.app_module)
  );
