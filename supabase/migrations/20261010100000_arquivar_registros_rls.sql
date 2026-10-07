-- Arquivar (soft delete) falhava para todos, inclusive o admin, com
-- "new row violates row-level security policy". As políticas de leitura
-- escondem linhas com deleted_at preenchido, e o Postgres confere a linha
-- nova de um UPDATE também contra as políticas de leitura. Resultado: a linha
-- arquivada "sumia" para quem arquivava e o banco recusava a gravação.
--
-- Correção: quem pode editar a linha continua podendo lê-la depois de
-- arquivada (mesma regra da política de edição da tabela). As listas seguem
-- filtrando deleted_at is null, então nada arquivado volta a aparecer nelas.

drop policy if exists "cliente_contatos_select_arquivados" on public.cliente_contatos;
create policy "cliente_contatos_select_arquivados" on public.cliente_contatos for select to authenticated
  using (deleted_at is not null and (((can_access_cliente(cliente_id) AND can_access_module(auth.uid(), 'clientes'::app_module)))));

drop policy if exists "cliente_documentos_select_arquivados" on public.cliente_documentos;
create policy "cliente_documentos_select_arquivados" on public.cliente_documentos for select to authenticated
  using (deleted_at is not null and (((can_access_cliente(cliente_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR (user_id = auth.uid()))))));

drop policy if exists "cliente_equipamento_documentos_select_arquivados" on public.cliente_equipamento_documentos;
create policy "cliente_equipamento_documentos_select_arquivados" on public.cliente_equipamento_documentos for select to authenticated
  using (deleted_at is not null and ((can_access_cliente(cliente_id))));

drop policy if exists "cliente_equipamentos_select_arquivados" on public.cliente_equipamentos;
create policy "cliente_equipamentos_select_arquivados" on public.cliente_equipamentos for select to authenticated
  using (deleted_at is not null and ((can_access_cliente(cliente_id))));

drop policy if exists "cliente_interacoes_select_arquivados" on public.cliente_interacoes;
create policy "cliente_interacoes_select_arquivados" on public.cliente_interacoes for select to authenticated
  using (deleted_at is not null and (((can_access_cliente(cliente_id) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR (user_id = auth.uid()))))));

drop policy if exists "cliente_socios_select_arquivados" on public.cliente_socios;
create policy "cliente_socios_select_arquivados" on public.cliente_socios for select to authenticated
  using (deleted_at is not null and (((can_access_cliente(cliente_id) AND can_access_module(auth.uid(), 'clientes'::app_module)))));

drop policy if exists "clientes_select_arquivados" on public.clientes;
create policy "clientes_select_arquivados" on public.clientes for select to authenticated
  using (deleted_at is not null and (((can_access_module(auth.uid(), 'clientes'::app_module) AND can_access_cliente(id)))));

drop policy if exists "cotacoes_select_arquivados" on public.cotacoes;
create policy "cotacoes_select_arquivados" on public.cotacoes for select to authenticated
  using (deleted_at is not null and ((user_pode_compras(auth.uid()))));

drop policy if exists "equipamento_disciplina_etapas_select_arquivados" on public.equipamento_disciplina_etapas;
create policy "equipamento_disciplina_etapas_select_arquivados" on public.equipamento_disciplina_etapas for select to authenticated
  using (deleted_at is not null and ((((EXISTS ( SELECT 1
   FROM cliente_equipamentos ce
  WHERE ((ce.id = equipamento_disciplina_etapas.equipamento_id) AND (ce.deleted_at IS NULL) AND can_access_cliente(ce.cliente_id)))) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR (responsavel_id = auth.uid()) OR (created_by = auth.uid()))))));

drop policy if exists "equipamento_etapa_anexos_select_arquivados" on public.equipamento_etapa_anexos;
create policy "equipamento_etapa_anexos_select_arquivados" on public.equipamento_etapa_anexos for select to authenticated
  using (deleted_at is not null and (((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'engineer'::app_role)))));

drop policy if exists "equipamento_etapas_select_arquivados" on public.equipamento_etapas;
create policy "equipamento_etapas_select_arquivados" on public.equipamento_etapas for select to authenticated
  using (deleted_at is not null and ((can_access_cliente(cliente_id))));

drop policy if exists "equipamento_etps_select_arquivados" on public.equipamento_etps;
create policy "equipamento_etps_select_arquivados" on public.equipamento_etps for select to authenticated
  using (deleted_at is not null and ((can_access_cliente(cliente_id))));

drop policy if exists "equipamento_montagens_select_arquivados" on public.equipamento_montagens;
create policy "equipamento_montagens_select_arquivados" on public.equipamento_montagens for select to authenticated
  using (deleted_at is not null and ((can_access_cliente(cliente_id))));

drop policy if exists "equipamento_projetos_select_arquivados" on public.equipamento_projetos;
create policy "equipamento_projetos_select_arquivados" on public.equipamento_projetos for select to authenticated
  using (deleted_at is not null and ((can_access_cliente(cliente_id))));

drop policy if exists "equipamento_revisoes_select_arquivados" on public.equipamento_revisoes;
create policy "equipamento_revisoes_select_arquivados" on public.equipamento_revisoes for select to authenticated
  using (deleted_at is not null and ((can_access_cliente(cliente_id))));

drop policy if exists "etapa_template_bom_item_select_arquivados" on public.etapa_template_bom_item;
create policy "etapa_template_bom_item_select_arquivados" on public.etapa_template_bom_item for select to authenticated
  using (deleted_at is not null and ((can_manage_etapa_template())));

drop policy if exists "etapa_template_item_select_arquivados" on public.etapa_template_item;
create policy "etapa_template_item_select_arquivados" on public.etapa_template_item for select to authenticated
  using (deleted_at is not null and ((can_manage_etapa_template())));

drop policy if exists "etapa_template_select_arquivados" on public.etapa_template;
create policy "etapa_template_select_arquivados" on public.etapa_template for select to authenticated
  using (deleted_at is not null and ((can_manage_etapa_template())));

drop policy if exists "fat_anexo_select_arquivados" on public.fat_anexo;
create policy "fat_anexo_select_arquivados" on public.fat_anexo for select to authenticated
  using (deleted_at is not null and ((((EXISTS ( SELECT 1
   FROM fat_relatorios f
  WHERE ((f.id = fat_anexo.fat_id) AND (f.deleted_at IS NULL)))) AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR can_access_module(auth.uid(), 'qualidade'::app_module))))));

drop policy if exists "fat_relatorios_select_arquivados" on public.fat_relatorios;
create policy "fat_relatorios_select_arquivados" on public.fat_relatorios for select to authenticated
  using (deleted_at is not null and (((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR can_access_module(auth.uid(), 'qualidade'::app_module)))));

drop policy if exists "fornecedores_select_arquivados" on public.fornecedores;
create policy "fornecedores_select_arquivados" on public.fornecedores for select to authenticated
  using (deleted_at is not null and ((can_access_module(auth.uid(), 'fornecedores'::app_module))));

drop policy if exists "montagem_etapa_evidencias_select_arquivados" on public.montagem_etapa_evidencias;
create policy "montagem_etapa_evidencias_select_arquivados" on public.montagem_etapa_evidencias for select to authenticated
  using (deleted_at is not null and (((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)))));

drop policy if exists "oportunidade_anexos_select_arquivados" on public.oportunidade_anexos;
create policy "oportunidade_anexos_select_arquivados" on public.oportunidade_anexos for select to authenticated
  using (deleted_at is not null and ((can_access_oportunidade(oportunidade_id))));

drop policy if exists "oportunidade_notas_select_arquivados" on public.oportunidade_notas;
create policy "oportunidade_notas_select_arquivados" on public.oportunidade_notas for select to authenticated
  using (deleted_at is not null and (((can_access_oportunidade(oportunidade_id) AND ((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role))))));

drop policy if exists "oportunidades_select_arquivados" on public.oportunidades;
create policy "oportunidades_select_arquivados" on public.oportunidades for select to authenticated
  using (deleted_at is not null and ((((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)))) OR ((can_access_module(auth.uid(), 'comercial'::app_module) AND (responsavel_id = auth.uid())))));

drop policy if exists "processo_anexos_select_arquivados" on public.processo_anexos;
create policy "processo_anexos_select_arquivados" on public.processo_anexos for select to authenticated
  using (deleted_at is not null and ((can_access_processo(processo_id))));

drop policy if exists "processo_templates_select_arquivados" on public.processo_templates;
create policy "processo_templates_select_arquivados" on public.processo_templates for select to authenticated
  using (deleted_at is not null and (((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'engineer'::app_role)))));

drop policy if exists "processos_select_arquivados" on public.processos;
create policy "processos_select_arquivados" on public.processos for select to authenticated
  using (deleted_at is not null and ((((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR (pilar_id = auth.uid()))))));

drop policy if exists "sat_relatorio_anexo_select_arquivados" on public.sat_relatorio_anexo;
create policy "sat_relatorio_anexo_select_arquivados" on public.sat_relatorio_anexo for select to authenticated
  using (deleted_at is not null and ((can_access_sat_relatorio(relatorio_id))));

drop policy if exists "sat_relatorio_select_arquivados" on public.sat_relatorio;
create policy "sat_relatorio_select_arquivados" on public.sat_relatorio for select to authenticated
  using (deleted_at is not null and (((has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR (created_by = auth.uid()) OR (auth.uid() = ANY (tecnico_ids))))));

