-- Comercial/Clientes: gravação liberada pelo MÓDULO (matriz de permissões),
-- não pelo papel "sales" fixo. Antes, um papel com os módulos Comercial e
-- Clientes liberados na matriz (ex.: Compras) via o menu, mas o banco recusava
-- criar cliente, oportunidade, processo, entrevista, segmento e origem de lead.
-- O vendedor continua só com as próprias oportunidades (responsavel_id).

-- clientes
drop policy if exists clientes_insert_roles on public.clientes;
create policy clientes_insert_roles on public.clientes for insert to authenticated
  with check (public.can_access_module(auth.uid(), 'clientes'::public.app_module));

drop policy if exists clientes_update_roles on public.clientes;
create policy clientes_update_roles on public.clientes for update to authenticated
  using (public.can_access_module(auth.uid(), 'clientes'::public.app_module) and public.can_access_cliente(id))
  with check (public.can_access_module(auth.uid(), 'clientes'::public.app_module) and public.can_access_cliente(id));

-- segmentos (cadastro de cliente e oportunidade)
drop policy if exists segmentos_insert_roles on public.segmentos;
create policy segmentos_insert_roles on public.segmentos for insert to authenticated
  with check (
    public.can_access_module(auth.uid(), 'clientes'::public.app_module)
    or public.can_access_module(auth.uid(), 'comercial'::public.app_module)
  );

-- oportunidades: dono da oportunidade com o módulo Comercial
drop policy if exists "opp sales own" on public.oportunidades;
create policy "opp sales own" on public.oportunidades for all to authenticated
  using (
    deleted_at is null
    and public.can_access_module(auth.uid(), 'comercial'::public.app_module)
    and responsavel_id = auth.uid()
  )
  with check (
    public.can_access_module(auth.uid(), 'comercial'::public.app_module)
    and responsavel_id = auth.uid()
  );

-- processos (conversão da oportunidade)
drop policy if exists processos_insert on public.processos;
create policy processos_insert on public.processos for insert to authenticated
  with check (public.can_access_module(auth.uid(), 'comercial'::public.app_module));

-- entrevistas técnicas
drop policy if exists entrev_insert_sales on public.entrevistas;
create policy entrev_insert_sales on public.entrevistas for insert to authenticated
  with check (
    criado_por = auth.uid()
    and public.can_access_module(auth.uid(), 'comercial'::public.app_module)
  );

-- origens de lead
drop policy if exists lead_origens_insert_roles on public.lead_origens;
create policy lead_origens_insert_roles on public.lead_origens for insert to authenticated
  with check (public.can_access_module(auth.uid(), 'comercial'::public.app_module));

-- bases da Penta (mineração)
drop policy if exists penta_bases_write_comercial on public.penta_bases;
create policy penta_bases_write_comercial on public.penta_bases for all to authenticated
  using (public.can_access_module(auth.uid(), 'comercial'::public.app_module))
  with check (public.can_access_module(auth.uid(), 'comercial'::public.app_module));
