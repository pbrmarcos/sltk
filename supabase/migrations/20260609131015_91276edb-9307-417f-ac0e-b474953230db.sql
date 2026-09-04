
CREATE POLICY brand_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'brand');

CREATE POLICY brand_storage_insert_admin ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'brand' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY brand_storage_update_admin ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'brand' AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'brand' AND public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY brand_storage_delete_admin ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'brand' AND public.has_role(auth.uid(), 'admin'::app_role));
