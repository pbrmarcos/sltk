-- SAT nunca disparou e-mail nenhum -- sat.aberto/sat.encerrado chegaram a
-- existir em email_event_config mas foram removidos no cleanup de orfaos
-- (20260905120000_email_events_cleanup.sql) por nunca terem codigo
-- associado. Nem a assinatura final (publicSubmitAssinatura, que fecha o
-- SAT) avisava ninguem.

INSERT INTO public.email_event_config
  (event_key, module, label, description, enabled, subject_template, body_template, create_calendar_event, calendar_duration_min, required_vars)
VALUES
  ('sat.assinado', 'pos_vendas', 'SAT assinado',
   'Relatório de serviço em campo foi assinado (técnico e/ou cliente) e o atendimento foi concluído.',
   true, '[Solutek] SAT assinado — {{codigo}}',
   '<p>Olá,</p><p>O relatório <strong>{{codigo}}</strong> ({{cliente_nome}}) foi assinado e o atendimento foi concluído.</p><p><a href="{{link}}">Ver relatório</a></p>',
   false, null, ARRAY['codigo']::text[])
ON CONFLICT (event_key) DO NOTHING;

INSERT INTO public.email_event_recipients (event_key, role, mode)
VALUES
  ('sat.assinado', 'manager', 'cc')
ON CONFLICT DO NOTHING;
