-- RLS de logistica_embarques/_itens/_anexos/_status_log e das storage
-- policies do bucket logistica-embarques usava lista fixa has_role(admin/
-- manager/field). Mas o seed de role_module_permissions diz field:false
-- pro modulo logistica e production:true/purchasing:true -- um usuario
-- so-field passava na RLS mas era barrado pela guarda de aplicacao
-- (assertCanAccessModule); um usuario production/purchasing passava na
-- guarda de aplicacao mas era barrado pela RLS na hora de gravar. Troca
-- as duas listas por can_access_module(logistica), resolvendo os dois
-- lados do mismatch de uma vez.

DROP POLICY IF EXISTS "logistica_embarques insert" ON public.logistica_embarques;
CREATE POLICY "logistica_embarques insert" ON public.logistica_embarques
  FOR INSERT TO authenticated WITH CHECK (
    public.can_access_module(auth.uid(), 'logistica'::public.app_module)
  );

DROP POLICY IF EXISTS "logistica_embarques update" ON public.logistica_embarques;
CREATE POLICY "logistica_embarques update" ON public.logistica_embarques
  FOR UPDATE TO authenticated USING (
    public.can_access_module(auth.uid(), 'logistica'::public.app_module)
  );

DROP POLICY IF EXISTS "logistica_embarque_itens write" ON public.logistica_embarque_itens;
CREATE POLICY "logistica_embarque_itens write" ON public.logistica_embarque_itens
  FOR ALL TO authenticated
  USING (public.can_access_module(auth.uid(), 'logistica'::public.app_module))
  WITH CHECK (public.can_access_module(auth.uid(), 'logistica'::public.app_module));

DROP POLICY IF EXISTS "logistica_embarque_anexos write" ON public.logistica_embarque_anexos;
CREATE POLICY "logistica_embarque_anexos write" ON public.logistica_embarque_anexos
  FOR ALL TO authenticated
  USING (public.can_access_module(auth.uid(), 'logistica'::public.app_module))
  WITH CHECK (public.can_access_module(auth.uid(), 'logistica'::public.app_module));

DROP POLICY IF EXISTS "logistica_status_log insert authenticated" ON public.logistica_embarque_status_log;
CREATE POLICY "logistica_status_log insert authenticated" ON public.logistica_embarque_status_log
  FOR INSERT TO authenticated WITH CHECK (
    public.can_access_module(auth.uid(), 'logistica'::public.app_module)
  );

DROP POLICY IF EXISTS "logistica_embarques_objects_insert" ON storage.objects;
CREATE POLICY "logistica_embarques_objects_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'logistica-embarques'
    AND public.can_access_module(auth.uid(), 'logistica'::public.app_module)
  );
