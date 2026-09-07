-- A transicao que a tela de Producao realmente usa (Concluir) nunca
-- disparou e-mail nenhum -- so responsavel_id mudar (montagem.card_atribuido)
-- ou status virar bloqueada (montagem.card_bloqueado) disparavam algo, e
-- nenhum dos dois tem UI pra acionar hoje. Quem deveria saber que o
-- equipamento esta pronto pro proximo passo (abrir FAT) so descobre
-- entrando manualmente na tela.

INSERT INTO public.email_event_config
  (event_key, module, label, description, enabled, subject_template, body_template, create_calendar_event, calendar_duration_min, required_vars)
VALUES
  ('montagem.concluida', 'producao', 'Montagem concluída',
   'Equipamento pronto -- próximo passo costuma ser abrir o FAT.',
   true, '[Solutek] Montagem concluída: {{card}}',
   '<p>A montagem de <strong>{{card}}</strong> foi concluída.</p><p><a href="{{link}}">Ver em Produção</a></p>',
   false, null, ARRAY['card']::text[])
ON CONFLICT (event_key) DO NOTHING;

INSERT INTO public.email_event_recipients (event_key, role, mode)
VALUES
  ('montagem.concluida', 'engineer', 'to'),
  ('montagem.concluida', 'manager', 'cc')
ON CONFLICT DO NOTHING;
