-- Storage RLS para bucket logistica-embarques (privado)
create policy "logistica_embarques_objects_select" on storage.objects
  for select to authenticated using (bucket_id = 'logistica-embarques');

create policy "logistica_embarques_objects_insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'logistica-embarques' and (
      public.has_role(auth.uid(), 'admin'::app_role)
      or public.has_role(auth.uid(), 'manager'::app_role)
      or public.has_role(auth.uid(), 'field'::app_role)
    )
  );

create policy "logistica_embarques_objects_delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'logistica-embarques' and (
      public.has_role(auth.uid(), 'admin'::app_role)
      or public.has_role(auth.uid(), 'manager'::app_role)
      or auth.uid() = owner
    )
  );
