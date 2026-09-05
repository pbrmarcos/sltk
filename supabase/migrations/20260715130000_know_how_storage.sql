-- Storage RLS for know-how-media bucket
create policy "kh_media authenticated read"
  on storage.objects for select to authenticated
  using (bucket_id = 'know-how-media');

create policy "kh_media authenticated insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'know-how-media' and owner = auth.uid());

create policy "kh_media owner update"
  on storage.objects for update to authenticated
  using (bucket_id = 'know-how-media' and owner = auth.uid());

create policy "kh_media owner or manager delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'know-how-media' and (
      owner = auth.uid()
      or public.has_role(auth.uid(), 'admin'::app_role)
      or public.has_role(auth.uid(), 'manager'::app_role)
    )
  );
