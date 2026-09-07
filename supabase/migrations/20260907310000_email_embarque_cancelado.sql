-- "Cancelar embarque" existia no modelo de dados (LOGISTICA_STATUS,
-- validarMotivo ja tratava a transicao como critica) mas era inacessivel
-- pela UI e setStatus nunca disparava e-mail nenhum pra essa transicao
-- (eventKey ficava null). Mesmo padrao dos outros eventos de embarque.

INSERT INTO public.email_event_config
  (event_key, module, label, description, enabled, subject_template, body_template, create_calendar_event, calendar_duration_min, required_vars)
VALUES
  ('embarque.cancelado', 'logistica', 'Embarque cancelado',
   'Embarque foi cancelado após ter sido criado ou programado.',
   true, '[Solutek] Embarque {{codigo}} cancelado',
   '<p>Olá {{destinatario_nome}},</p>
<p>O embarque <strong>{{codigo}}</strong> foi cancelado.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #fecaca;border-radius:8px;background:#fef2f2;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Embarque</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{codigo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Projeto</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{projeto}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Cliente</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{cliente_nome}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Destino</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{destino}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Motivo</td><td style="padding:4px 0;font-size:14px;font-weight:600;color:#b91c1c;">{{motivo}}</td></tr>
    </table>
  </td></tr>
</table>
<p style="margin:4px 0 0 0;color:#64748b;font-size:13px;"><a href="{{link}}">Ver embarque</a></p>',
   false, null, ARRAY['codigo']::text[])
ON CONFLICT (event_key) DO NOTHING;

INSERT INTO public.email_event_recipients (event_key, role, mode)
VALUES
  ('embarque.cancelado', 'manager', 'to'),
  ('embarque.cancelado', 'sales', 'cc')
ON CONFLICT DO NOTHING;
