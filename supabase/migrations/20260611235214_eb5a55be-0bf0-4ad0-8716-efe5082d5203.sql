
create policy "fat_evid_read" on storage.objects for select to authenticated
  using (bucket_id = 'fat-evidencias' and (
    public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
    or public.can_access_module(auth.uid(),'qualidade'::public.app_module)
  ));
create policy "fat_evid_write" on storage.objects for insert to authenticated
  with check (bucket_id = 'fat-evidencias' and (
    public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
    or public.can_access_module(auth.uid(),'qualidade'::public.app_module)
  ));
create policy "fat_evid_update" on storage.objects for update to authenticated
  using (bucket_id = 'fat-evidencias' and (
    public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
    or public.can_access_module(auth.uid(),'qualidade'::public.app_module)
  ))
  with check (bucket_id = 'fat-evidencias' and (
    public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
    or public.can_access_module(auth.uid(),'qualidade'::public.app_module)
  ));
create policy "fat_evid_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'fat-evidencias' and (
    public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
  ));
