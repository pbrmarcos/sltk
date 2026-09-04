-- Fundação de e-mails transacionais + agenda Google Workspace.
-- Tabelas:
--   email_event_config       — 1 linha por evento (chave estável), com templates + toggles
--   email_event_recipients   — matriz papel × modo (to/cc) por evento
--   email_send_log           — auditoria dedicada de cada disparo
--
-- Envio final: system@sltkamericas.com via Gmail API + DWD.
-- Regras: RLS estrita — só admin edita config; admin/manager leem logs;
-- só service_role escreve logs.

CREATE TABLE IF NOT EXISTS public.email_event_config (
  event_key text PRIMARY KEY,
  module text NOT NULL,
  label text NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT true,
  subject_template text NOT NULL,
  body_template text NOT NULL,
  create_calendar_event boolean NOT NULL DEFAULT false,
  calendar_duration_min int,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_event_config TO authenticated;
GRANT ALL ON public.email_event_config TO service_role;
ALTER TABLE public.email_event_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_event_config select admin/manager"
  ON public.email_event_config FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "email_event_config write admin"
  ON public.email_event_config FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.email_event_recipients (
  event_key text NOT NULL REFERENCES public.email_event_config(event_key) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  mode text NOT NULL CHECK (mode IN ('to','cc')),
  PRIMARY KEY (event_key, role)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_event_recipients TO authenticated;
GRANT ALL ON public.email_event_recipients TO service_role;
ALTER TABLE public.email_event_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_event_recipients select admin/manager"
  ON public.email_event_recipients FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));
CREATE POLICY "email_event_recipients write admin"
  ON public.email_event_recipients FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.email_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL,
  triggered_by uuid,
  triggered_by_kind text NOT NULL CHECK (triggered_by_kind IN ('user','automation','cron','test')),
  entity_table text,
  entity_id text,
  to_addresses text[] NOT NULL DEFAULT '{}',
  cc_addresses text[] NOT NULL DEFAULT '{}',
  subject text NOT NULL,
  status text NOT NULL CHECK (status IN ('sent','failed','skipped_disabled','skipped_no_recipients','provider_not_configured')),
  gmail_message_id text,
  calendar_event_ids jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS email_send_log_event_key_idx ON public.email_send_log(event_key);
CREATE INDEX IF NOT EXISTS email_send_log_created_at_idx ON public.email_send_log(created_at DESC);

GRANT SELECT ON public.email_send_log TO authenticated;
GRANT ALL ON public.email_send_log TO service_role;
ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "email_send_log select admin/manager"
  ON public.email_send_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

-- Trigger para carimbar updated_by/updated_at automaticamente
CREATE OR REPLACE FUNCTION public.email_event_config_touch()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  NEW.updated_by := auth.uid();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS email_event_config_touch_tg ON public.email_event_config;
CREATE TRIGGER email_event_config_touch_tg BEFORE UPDATE ON public.email_event_config
  FOR EACH ROW EXECUTE FUNCTION public.email_event_config_touch();

-- ============================================================
-- SEED de eventos
-- ============================================================
INSERT INTO public.email_event_config (event_key, module, label, description, subject_template, body_template, create_calendar_event, calendar_duration_min) VALUES
-- Comercial
('oportunidade.criada','comercial','Oportunidade criada','Novo card entrou no pipeline.','[Solutek] Nova oportunidade: {{titulo}}','<p>Olá {{destinatario_nome}},</p><p>Uma nova oportunidade foi criada: <strong>{{titulo}}</strong> ({{cliente_nome}}).</p><p><a href="{{link}}">Abrir no sistema</a></p>',false,null),
('oportunidade.stage_alterado','comercial','Oportunidade mudou de etapa','Movimentação no pipeline.','[Solutek] {{titulo}} — {{stage_de}} → {{stage_para}}','<p>A oportunidade <strong>{{titulo}}</strong> avançou de <em>{{stage_de}}</em> para <strong>{{stage_para}}</strong>.</p><p><a href="{{link}}">Ver detalhes</a></p>',false,null),
('oportunidade.ganha','comercial','Oportunidade ganha','Fechamento positivo.','[Solutek] 🎉 Ganhamos: {{titulo}}','<p>Oportunidade <strong>{{titulo}}</strong> foi marcada como ganha. Valor: {{valor}}.</p>',false,null),
('oportunidade.perdida','comercial','Oportunidade perdida','Fechamento negativo.','[Solutek] Oportunidade perdida: {{titulo}}','<p>A oportunidade <strong>{{titulo}}</strong> foi encerrada como perdida. Motivo: {{motivo}}.</p>',false,null),
('cotacao.enviada_cliente','comercial','Cotação enviada ao cliente','Proposta comercial enviada.','[Solutek] Cotação {{codigo}} enviada','<p>Cotação <strong>{{codigo}}</strong> enviada para {{cliente_nome}}. Validade: {{validade}}.</p>',false,null),
('cotacao.aceita','comercial','Cotação aceita','Cliente aceitou.','[Solutek] Cotação {{codigo}} aceita','<p>Cliente aceitou a cotação <strong>{{codigo}}</strong>.</p>',false,null),
('cotacao.expirando_3d','comercial','Cotação expira em 3 dias','Lembrete automático.','[Solutek] Cotação {{codigo}} expira em 3 dias','<p>A cotação <strong>{{codigo}}</strong> expira em {{validade}}.</p>',true,null),
-- Engenharia
('etp.criado','engenharia','ETP criado','Nova especificação técnica.','[Solutek] Novo ETP: {{codigo}}','<p>Um novo ETP foi criado: <strong>{{codigo}}</strong>.</p>',false,null),
('etp.enviado_aprovacao','engenharia','ETP enviado para aprovação','Aguardando revisão.','[Solutek] ETP {{codigo}} aguardando aprovação','<p>ETP <strong>{{codigo}}</strong> foi enviado para aprovação.</p>',false,null),
('etp.aprovado','engenharia','ETP aprovado','Aprovação concluída.','[Solutek] ETP {{codigo}} aprovado','<p>O ETP <strong>{{codigo}}</strong> foi aprovado.</p>',false,null),
('etp.reprovado','engenharia','ETP reprovado','Precisa de ajuste.','[Solutek] ETP {{codigo}} reprovado','<p>O ETP <strong>{{codigo}}</strong> foi reprovado. Motivo: {{motivo}}.</p>',false,null),
('etapa.atribuida','engenharia','Etapa atribuída','Nova etapa no seu quadro.','[Solutek] Etapa atribuída: {{etapa_nome}}','<p>Você recebeu a etapa <strong>{{etapa_nome}}</strong> do projeto {{projeto}}. Prazo: {{prazo}}.</p>',false,null),
('etapa.concluida','engenharia','Etapa concluída','Card fechado.','[Solutek] Etapa concluída: {{etapa_nome}}','<p>A etapa <strong>{{etapa_nome}}</strong> foi concluída.</p>',false,null),
('etapa.atrasada','engenharia','Etapa atrasada','Passou do prazo.','[Solutek] ⚠ Etapa atrasada: {{etapa_nome}}','<p>A etapa <strong>{{etapa_nome}}</strong> está atrasada (prazo era {{prazo}}).</p>',false,null),
('etapa.prazo','engenharia','Etapa — data de prazo','Compromisso na agenda.','[Solutek] Prazo da etapa {{etapa_nome}}','<p>Prazo de entrega: {{prazo}}.</p>',true,null),
-- Compras
('rfq.enviada_fornecedor','compras','RFQ enviada ao fornecedor','Cotação aberta.','[Solutek] RFQ {{codigo}} — {{item}}','<p>Enviamos uma RFQ para <strong>{{fornecedor}}</strong>.</p>',false,null),
('rfq.resposta_recebida','compras','Resposta de RFQ recebida','Fornecedor respondeu.','[Solutek] Resposta de RFQ {{codigo}}','<p>{{fornecedor}} respondeu a RFQ <strong>{{codigo}}</strong>.</p>',false,null),
('oc.aguardando_aprovacao','compras','OC aguardando aprovação','Requer aprovador.','[Solutek] OC {{codigo}} aguardando aprovação — R$ {{valor}}','<p>A OC <strong>{{codigo}}</strong> ({{fornecedor}}) está aguardando aprovação.</p>',false,null),
('oc.aprovada','compras','OC aprovada','Pronta para emissão.','[Solutek] OC {{codigo}} aprovada','<p>A OC <strong>{{codigo}}</strong> foi aprovada.</p>',false,null),
('oc.reprovada','compras','OC reprovada','Aprovador reprovou.','[Solutek] OC {{codigo}} reprovada','<p>A OC <strong>{{codigo}}</strong> foi reprovada. Motivo: {{motivo}}.</p>',false,null),
('oc.emitida_fornecedor','compras','OC emitida ao fornecedor','Pedido enviado.','[Solutek] Pedido de compra {{codigo}}','<p>Segue o pedido de compra <strong>{{codigo}}</strong>. Entrega prevista: {{entrega}}.</p>',false,null),
('oc.entrega_prevista','compras','Data prevista de entrega da OC','Compromisso na agenda.','[Solutek] Entrega prevista OC {{codigo}}','<p>Entrega prevista para {{entrega}}.</p>',true,null),
('oc.entrega_atrasada','compras','Entrega de OC atrasada','Passou da data prometida.','[Solutek] ⚠ Entrega atrasada — OC {{codigo}}','<p>OC <strong>{{codigo}}</strong> está atrasada.</p>',false,null),
-- Produção
('montagem.card_atribuido','producao','Card de montagem atribuído','Novo trabalho no chão de fábrica.','[Solutek] Card atribuído: {{card}}','<p>Novo card de montagem: <strong>{{card}}</strong>.</p>',false,null),
('montagem.card_bloqueado','producao','Card de montagem bloqueado','Impedimento na linha.','[Solutek] ⚠ Card bloqueado: {{card}}','<p>Card <strong>{{card}}</strong> está bloqueado. Motivo: {{motivo}}.</p>',false,null),
-- Qualidade / FAT / SAT
('fat.agendado','qualidade','FAT agendado','Teste agendado.','[Solutek] FAT agendado — {{equipamento}}','<p>FAT do equipamento <strong>{{equipamento}}</strong> agendado para {{data}}.</p><p>Local: {{local}}.</p>',true,240),
('fat.reagendado','qualidade','FAT reagendado','Data mudou.','[Solutek] FAT reagendado — {{equipamento}}','<p>O FAT foi reagendado para {{data}}.</p>',true,240),
('fat.homologado','qualidade','FAT homologado','Aprovação final.','[Solutek] ✅ FAT homologado — {{equipamento}}','<p>FAT do equipamento <strong>{{equipamento}}</strong> homologado.</p>',false,null),
('fat.reprovado','qualidade','FAT reprovado','Não conformidade.','[Solutek] ❌ FAT reprovado — {{equipamento}}','<p>FAT <strong>{{equipamento}}</strong> reprovado. Motivo: {{motivo}}.</p>',false,null),
('sat.aberto','qualidade','SAT aberto','Serviço no cliente.','[Solutek] SAT aberto — {{cliente_nome}}','<p>SAT aberto para {{cliente_nome}} — {{descricao}}.</p>',false,null),
('sat.encerrado','qualidade','SAT encerrado','Serviço concluído.','[Solutek] SAT encerrado — {{cliente_nome}}','<p>SAT encerrado.</p>',false,null),
-- Logística
('embarque.criado','logistica','Embarque criado','Novo embarque planejado.','[Solutek] Embarque {{codigo}} criado','<p>Embarque <strong>{{codigo}}</strong> criado. Destino: {{destino}}.</p>',false,null),
('embarque.despacho_previsto','logistica','Despacho previsto','Compromisso na agenda.','[Solutek] Despacho previsto — {{codigo}}','<p>Despacho previsto para {{data}}.</p>',true,null),
('embarque.despachado','logistica','Embarque despachado','Saiu da fábrica.','[Solutek] Embarque {{codigo}} despachado','<p>Embarque <strong>{{codigo}}</strong> saiu para {{destino}}.</p>',false,null),
('embarque.entrega_prevista','logistica','Entrega prevista','Compromisso na agenda.','[Solutek] Entrega prevista — {{codigo}}','<p>Entrega prevista para {{data}}.</p>',true,null),
('embarque.entregue','logistica','Embarque entregue','Recebido pelo cliente.','[Solutek] Embarque {{codigo}} entregue','<p>Embarque <strong>{{codigo}}</strong> entregue em {{destino}}.</p>',false,null),
('embarque.atrasado','logistica','Embarque atrasado','Fora do prazo.','[Solutek] ⚠ Embarque atrasado — {{codigo}}','<p>Embarque <strong>{{codigo}}</strong> está atrasado.</p>',false,null),
-- Pós-vendas / Chamados
('chamado.aberto','pos-vendas','Chamado aberto','Nova ocorrência.','[Solutek] Chamado #{{numero}}: {{titulo}}','<p>Chamado aberto: <strong>{{titulo}}</strong> (prioridade {{prioridade}}).</p>',false,null),
('chamado.atribuido','pos-vendas','Chamado atribuído','Card veio para você.','[Solutek] Chamado atribuído: #{{numero}}','<p>Você foi atribuído ao chamado <strong>#{{numero}}</strong>.</p>',false,null),
('chamado.resposta','pos-vendas','Nova resposta em chamado','Nova mensagem.','[Solutek] Nova resposta — Chamado #{{numero}}','<p>Nova resposta em <strong>#{{numero}}</strong>.</p>',false,null),
('chamado.sla_resposta_estourado','pos-vendas','SLA de resposta estourado','Prazo perdido.','[Solutek] ⚠ SLA de resposta — Chamado #{{numero}}','<p>O SLA de resposta do chamado <strong>#{{numero}}</strong> foi estourado.</p>',false,null),
('chamado.sla_resolucao_estourado','pos-vendas','SLA de resolução estourado','Escalonamento.','[Solutek] ⚠ SLA de resolução — Chamado #{{numero}}','<p>O SLA de resolução do chamado <strong>#{{numero}}</strong> foi estourado.</p>',false,null),
('chamado.visita_tecnica_agendada','pos-vendas','Visita técnica agendada','Compromisso na agenda.','[Solutek] Visita técnica — Chamado #{{numero}}','<p>Visita técnica agendada para {{data}} em {{local}}.</p>',true,180),
('chamado.resolvido','pos-vendas','Chamado resolvido','Fechamento.','[Solutek] Chamado #{{numero}} resolvido','<p>Chamado <strong>#{{numero}}</strong> resolvido.</p>',false,null),
('chamado.reaberto','pos-vendas','Chamado reaberto','Cliente retomou.','[Solutek] Chamado #{{numero}} reaberto','<p>Chamado <strong>#{{numero}}</strong> foi reaberto.</p>',false,null),
-- Admin / segurança
('usuario.convite_enviado','admin','Convite de usuário enviado','Novo membro convidado.','[Solutek] Convite enviado para {{email}}','<p>Convite enviado para {{email}}.</p>',false,null),
('usuario.senha_redefinida','admin','Senha do usuário redefinida','Reset de senha.','[Solutek] Senha redefinida — {{email}}','<p>A senha de <strong>{{email}}</strong> foi redefinida.</p>',false,null),
('usuario.papel_alterado','admin','Papel do usuário alterado','Mudança de acesso.','[Solutek] Papel alterado — {{email}}','<p>Papel de <strong>{{email}}</strong>: {{de}} → {{para}}.</p>',false,null),
('usuario.desativado','admin','Usuário desativado','Acesso bloqueado.','[Solutek] Usuário desativado: {{email}}','<p>O usuário <strong>{{email}}</strong> foi desativado.</p>',false,null),
('admin.permissao_alterada','admin','Permissão de módulo alterada','Matriz papel × módulo.','[Solutek] Permissão alterada','<p>{{ator}} alterou permissão em {{modulo}}.</p>',false,null),
('audit.export_csv','admin','Export de auditoria (CSV)','Exportação sensível.','[Solutek] Auditoria exportada em CSV','<p>{{ator}} exportou o CSV da trilha de auditoria em {{data}}.</p>',false,null),
-- Site público
('contato.mensagem_recebida','site-publico','Mensagem de contato recebida','Formulário /contato.','[Solutek] Nova mensagem — {{assunto}}','<p>Nova mensagem de {{nome}} ({{email}}):</p><blockquote>{{mensagem}}</blockquote>',false,null),
('rfq_publico.submissao_recebida','site-publico','Submissão de RFQ pública','Formulário público.','[Solutek] Nova RFQ pública — {{tipo}}','<p>Nova submissão de RFQ pública.</p>',false,null)
ON CONFLICT (event_key) DO NOTHING;

-- ============================================================
-- Destinatários padrão (matriz role × modo)
-- ============================================================
INSERT INTO public.email_event_recipients (event_key, role, mode) VALUES
-- Comercial
('oportunidade.criada','sales','to'),('oportunidade.criada','manager','cc'),
('oportunidade.stage_alterado','sales','to'),('oportunidade.stage_alterado','manager','cc'),
('oportunidade.ganha','sales','to'),('oportunidade.ganha','manager','cc'),('oportunidade.ganha','admin','cc'),
('oportunidade.perdida','sales','to'),('oportunidade.perdida','manager','cc'),
('cotacao.enviada_cliente','sales','to'),('cotacao.enviada_cliente','manager','cc'),
('cotacao.aceita','sales','to'),('cotacao.aceita','manager','cc'),
('cotacao.expirando_3d','sales','to'),
-- Engenharia
('etp.criado','engineer','to'),
('etp.enviado_aprovacao','manager','to'),('etp.enviado_aprovacao','engineer','cc'),
('etp.aprovado','engineer','to'),('etp.aprovado','manager','cc'),
('etp.reprovado','engineer','to'),('etp.reprovado','manager','cc'),
('etapa.atribuida','engineer','to'),
('etapa.concluida','engineer','to'),('etapa.concluida','manager','cc'),
('etapa.atrasada','engineer','to'),('etapa.atrasada','manager','cc'),
('etapa.prazo','engineer','to'),
-- Compras
('rfq.enviada_fornecedor','purchasing','to'),
('rfq.resposta_recebida','purchasing','to'),
('oc.aguardando_aprovacao','manager','to'),('oc.aguardando_aprovacao','admin','cc'),('oc.aguardando_aprovacao','purchasing','cc'),
('oc.aprovada','purchasing','to'),('oc.aprovada','manager','cc'),
('oc.reprovada','purchasing','to'),('oc.reprovada','manager','cc'),
('oc.emitida_fornecedor','purchasing','to'),
('oc.entrega_prevista','purchasing','to'),
('oc.entrega_atrasada','purchasing','to'),('oc.entrega_atrasada','manager','cc'),
-- Produção
('montagem.card_atribuido','assembly','to'),
('montagem.card_bloqueado','assembly','to'),('montagem.card_bloqueado','manager','cc'),
-- Qualidade
('fat.agendado','engineer','to'),('fat.agendado','assembly','cc'),('fat.agendado','manager','cc'),
('fat.reagendado','engineer','to'),('fat.reagendado','assembly','cc'),('fat.reagendado','manager','cc'),
('fat.homologado','engineer','to'),('fat.homologado','manager','cc'),('fat.homologado','sales','cc'),
('fat.reprovado','engineer','to'),('fat.reprovado','manager','cc'),('fat.reprovado','assembly','cc'),
('sat.aberto','field','to'),('sat.aberto','manager','cc'),
('sat.encerrado','field','to'),('sat.encerrado','manager','cc'),
-- Logística
('embarque.criado','manager','to'),
('embarque.despacho_previsto','manager','to'),
('embarque.despachado','manager','to'),('embarque.despachado','sales','cc'),
('embarque.entrega_prevista','manager','to'),
('embarque.entregue','manager','to'),('embarque.entregue','sales','cc'),
('embarque.atrasado','manager','to'),('embarque.atrasado','admin','cc'),
-- Pós-vendas
('chamado.aberto','field','to'),('chamado.aberto','manager','cc'),
('chamado.atribuido','field','to'),
('chamado.resposta','field','to'),
('chamado.sla_resposta_estourado','manager','to'),('chamado.sla_resposta_estourado','field','cc'),
('chamado.sla_resolucao_estourado','admin','to'),('chamado.sla_resolucao_estourado','manager','cc'),
('chamado.visita_tecnica_agendada','field','to'),('chamado.visita_tecnica_agendada','manager','cc'),
('chamado.resolvido','field','to'),('chamado.resolvido','manager','cc'),
('chamado.reaberto','field','to'),('chamado.reaberto','manager','cc'),
-- Admin
('usuario.convite_enviado','admin','to'),
('usuario.senha_redefinida','admin','to'),
('usuario.papel_alterado','admin','to'),
('usuario.desativado','admin','to'),
('admin.permissao_alterada','admin','to'),
('audit.export_csv','admin','to'),
-- Site público
('contato.mensagem_recebida','sales','to'),('contato.mensagem_recebida','manager','cc'),
('rfq_publico.submissao_recebida','sales','to'),('rfq_publico.submissao_recebida','purchasing','cc')
ON CONFLICT (event_key, role) DO NOTHING;
