-- Handoff Engenharia -> Producao/Qualidade era 100% silencioso: o trigger
-- tg_projeto_liberacao_ciclo ja cria equipamento_revisoes/equipamento_montagens
-- quando um projeto vira liberado_producao, mas nenhum e-mail avisava ninguem.
-- Tambem faltava aviso de decisao de revisao (aprovada/reprovada) e de
-- reabertura de um ETP ja aprovado (o gap de e-mail mais significativo
-- encontrado na auditoria de Engenharia).

INSERT INTO public.email_event_config
  (event_key, module, label, description, enabled, subject_template, body_template, create_calendar_event, calendar_duration_min, required_vars)
VALUES
  ('projeto.liberado_producao', 'engenharia', 'Projeto liberado para produção',
   'Equipamento liberado — revisão e montagem novas foram criadas automaticamente.',
   true, '[Solutek] Liberado para produção — {{codigo}}',
   '<p>O equipamento <strong>{{codigo}}</strong> ({{modelo}}) foi liberado para produção.</p><p>{{observacoes}}</p><p><a href="{{link}}">Ver montagem</a></p>',
   false, null, ARRAY['codigo']::text[]),
  ('revisao.decidida', 'qualidade', 'Revisão de projeto decidida',
   'Revisão de projeto (mecânica/elétrica) foi aprovada, aprovada com ressalvas ou reprovada.',
   true, '[Solutek] Revisão {{decisao}} — {{codigo}}',
   '<p>A revisão do projeto de <strong>{{codigo}}</strong> ({{modelo}}) foi <strong>{{decisao}}</strong>.</p><p><a href="{{link}}">Ver revisão</a></p>',
   false, null, ARRAY['codigo','decisao']::text[]),
  ('etp.reaberto', 'engenharia', 'ETP reaberto',
   'Um ETP já aprovado foi reaberto para revisão — reverte a aprovação anterior.',
   true, '[Solutek] ETP {{codigo}} reaberto',
   '<p>O ETP <strong>{{codigo}}</strong>, já aprovado, foi reaberto para revisão.</p><p>Justificativa: {{justificativa}}</p><p><a href="{{link}}">Abrir ETP</a></p>',
   false, null, ARRAY['codigo','justificativa']::text[])
ON CONFLICT (event_key) DO NOTHING;

INSERT INTO public.email_event_recipients (event_key, role, mode)
VALUES
  ('projeto.liberado_producao', 'production', 'to'),
  ('projeto.liberado_producao', 'assembly', 'cc'),
  ('projeto.liberado_producao', 'manager', 'cc'),
  ('revisao.decidida', 'engineer', 'to'),
  ('revisao.decidida', 'assembly', 'cc'),
  ('revisao.decidida', 'manager', 'cc'),
  ('etp.reaberto', 'engineer', 'to'),
  ('etp.reaberto', 'manager', 'cc')
ON CONFLICT DO NOTHING;
