-- Cadastro de cliente pelo app falhava para TODOS ("new row violates
-- row-level security policy for table clientes"). Causa: a política de SELECT
-- dependia só de can_access_cliente(id), que RECONSULTA public.clientes; sendo
-- STABLE, ela enxerga o snapshot anterior ao INSERT e não acha a linha nova —
-- então o INSERT ... RETURNING (supabase .insert().select()) era recusado.
-- Correção: checar papel e autoria direto nas colunas da linha (sem reconsulta)
-- antes de cair na regra completa de can_access_cliente.

DROP POLICY IF EXISTS clientes_select_auth ON public.clientes;
CREATE POLICY clientes_select_auth ON public.clientes
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      created_by = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'manager'::public.app_role)
      OR public.can_access_cliente(id)
    )
  );

NOTIFY pgrst, 'reload schema';
