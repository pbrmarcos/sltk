
drop policy if exists "fat_relatorios_update" on public.fat_relatorios;
create policy "fat_relatorios_update" on public.fat_relatorios
  for update to authenticated
  using (
    public.has_role(auth.uid(),'admin') or
    public.has_role(auth.uid(),'manager') or
    public.can_access_module(auth.uid(),'qualidade'::public.app_module)
  )
  with check (
    public.has_role(auth.uid(),'admin') or
    public.has_role(auth.uid(),'manager') or
    public.can_access_module(auth.uid(),'qualidade'::public.app_module)
  );
