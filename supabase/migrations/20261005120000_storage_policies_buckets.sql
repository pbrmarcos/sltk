-- Políticas de RLS em storage.objects para os buckets recriados no projeto
-- de produção (o snapshot de bootstrap trouxe apenas as de 'avatars' e as de
-- 'montagem-evidencias' vieram na migration 20260911120000). Sem elas, upload
-- pelo navegador falha com "new row violates row-level security policy".
-- Os buckets são todos privados; leitura externa é sempre por URL assinada.

-- ============ brand (logomarcas/favicon — tela Admin > Geral) ============
DROP POLICY IF EXISTS "brand_storage_rw" ON storage.objects;
CREATE POLICY "brand_storage_rw" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'brand' AND (
    public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'manager'::public.app_role)
  ))
  WITH CHECK (bucket_id = 'brand' AND (
    public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'manager'::public.app_role)
  ));

-- ============ fornecedores (fotos/anexos do cadastro de fornecedores) ============
DROP POLICY IF EXISTS "fornecedores_storage_rw" ON storage.objects;
CREATE POLICY "fornecedores_storage_rw" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'fornecedores' AND (
    public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'manager'::public.app_role)
    OR public.can_access_module(auth.uid(),'fornecedores'::public.app_module)
    OR public.can_access_module(auth.uid(),'compras'::public.app_module)
  ))
  WITH CHECK (bucket_id = 'fornecedores' AND (
    public.has_role(auth.uid(),'admin'::public.app_role) OR public.has_role(auth.uid(),'manager'::public.app_role)
    OR public.can_access_module(auth.uid(),'fornecedores'::public.app_module)
    OR public.can_access_module(auth.uid(),'compras'::public.app_module)
  ));

-- ============ documentos (central de documentos) ============
-- Os fluxos passam por server functions autenticadas com o JWT do usuário e
-- envolvem papéis variados — acesso para qualquer usuário logado; o bucket é
-- privado e o controle fino de negócio fica nas tabelas de documentos.
DROP POLICY IF EXISTS "documentos_storage_rw" ON storage.objects;
CREATE POLICY "documentos_storage_rw" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'documentos')
  WITH CHECK (bucket_id = 'documentos');

-- ============ etapa-anexos (anexos das etapas dos equipamentos) ============
DROP POLICY IF EXISTS "etapa_anexos_storage_rw" ON storage.objects;
CREATE POLICY "etapa_anexos_storage_rw" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'etapa-anexos')
  WITH CHECK (bucket_id = 'etapa-anexos');
