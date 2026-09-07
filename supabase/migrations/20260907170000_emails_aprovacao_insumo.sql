-- solicitarAprovacaoOC/decidirAprovacaoOC (insumo-aprovacoes.functions.ts)
-- nunca dispararam e-mail nenhum — quem solicitava só descobria a decisão
-- consultando a tela manualmente. Sem essas linhas de config, o dispatch
-- feito pelo código nem chega a gravar em email_send_log (event_key
-- inexistente = só console.error).

INSERT INTO public.email_event_config
  (event_key, module, label, description, enabled, subject_template, body_template, create_calendar_event, calendar_duration_min, required_vars)
VALUES
  ('insumo.aprovacao_solicitada', 'compras', 'Aprovação de OC solicitada',
   'Compras/engenharia pediu aprovação pra emitir OC de um insumo.',
   true, '[Solutek] Aprovação de compra pendente — {{insumo}}',
   '<p>Olá,</p><p><strong>{{solicitante}}</strong> pediu aprovação para emitir uma Ordem de Compra do insumo <strong>{{insumo}}</strong>.</p><p>{{nota}}</p><p><a href="{{link}}">Ver solicitação</a></p>',
   false, null, ARRAY['insumo','solicitante']::text[]),
  ('insumo.aprovacao_decidida', 'compras', 'Aprovação de OC decidida',
   'Engenharia/gestão decidiu (aprovou ou recusou) um pedido de emissão de OC.',
   true, '[Solutek] {{decisao}}: aprovação de compra — {{insumo}}',
   '<p>Olá,</p><p>Sua solicitação de aprovação para o insumo <strong>{{insumo}}</strong> foi <strong>{{decisao}}</strong>.</p><p>{{nota}}</p><p><a href="{{link}}">Ver detalhes</a></p>',
   false, null, ARRAY['insumo','decisao']::text[])
ON CONFLICT (event_key) DO NOTHING;

INSERT INTO public.email_event_recipients (event_key, role, mode)
VALUES
  ('insumo.aprovacao_solicitada', 'engineer', 'to'),
  ('insumo.aprovacao_solicitada', 'manager', 'cc'),
  ('insumo.aprovacao_solicitada', 'admin', 'cc'),
  ('insumo.aprovacao_decidida', 'manager', 'cc')
ON CONFLICT DO NOTHING;
