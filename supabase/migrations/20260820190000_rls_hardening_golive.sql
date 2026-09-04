-- Endurecimento de RLS apontado na varredura de prontidão (go-live)
drop policy if exists "oc_itens_select" on public.ordem_compra_itens;
create policy "oc_itens_select" on public.ordem_compra_itens
for select to authenticated
using (
  (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
   or public.has_role(auth.uid(),'purchasing') or public.has_role(auth.uid(),'engineer'))
  and exists (select 1 from public.ordens_compra oc where oc.id = ordem_compra_itens.ordem_compra_id)
);

drop policy if exists "insumo_anexos_select" on public.insumo_anexos;
drop policy if exists "insumo_anexos_all" on public.insumo_anexos;
drop policy if exists "insumo_anexos_write" on public.insumo_anexos;
create policy "insumo_anexos_rw" on public.insumo_anexos
for all to authenticated
using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
  or public.has_role(auth.uid(),'engineer') or public.has_role(auth.uid(),'purchasing'))
with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
  or public.has_role(auth.uid(),'engineer') or public.has_role(auth.uid(),'purchasing'));

drop policy if exists "insumo_atividades_select" on public.insumo_atividades;
drop policy if exists "insumo_atividades_insert" on public.insumo_atividades;
create policy "insumo_atividades_select" on public.insumo_atividades
for select to authenticated
using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
  or public.has_role(auth.uid(),'engineer') or public.has_role(auth.uid(),'purchasing'));
create policy "insumo_atividades_insert" on public.insumo_atividades
for insert to authenticated
with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
  or public.has_role(auth.uid(),'engineer') or public.has_role(auth.uid(),'purchasing'));

drop policy if exists "insumo_rfq_envios_select" on public.insumo_rfq_envios;
create policy "insumo_rfq_envios_select" on public.insumo_rfq_envios
for select to authenticated
using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
  or public.has_role(auth.uid(),'engineer') or public.has_role(auth.uid(),'purchasing'));

drop policy if exists "fornecedor_scan_submissoes_all" on public.fornecedor_scan_submissoes;
create policy "fornecedor_scan_submissoes_all" on public.fornecedor_scan_submissoes
for all to authenticated
using (public.can_access_module(auth.uid(), 'fornecedores'::public.app_module))
with check (public.can_access_module(auth.uid(), 'fornecedores'::public.app_module));

drop policy if exists "planej status escrita autenticada" on public.equipamento_planejamento_status;
create policy "planej status escrita por papel" on public.equipamento_planejamento_status
for all to authenticated
using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
  or public.has_role(auth.uid(),'engineer') or public.has_role(auth.uid(),'production')
  or public.has_role(auth.uid(),'assembly'))
with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'manager')
  or public.has_role(auth.uid(),'engineer') or public.has_role(auth.uid(),'production')
  or public.has_role(auth.uid(),'assembly'));
