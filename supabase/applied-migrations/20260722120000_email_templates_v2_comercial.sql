-- ============================================================
-- Reescrita rica dos templates de e-mail — Etapa 1: COMERCIAL
-- ============================================================
-- Aplica corpo padronizado (intro → dados → motivo → próximos passos)
-- para os 7 eventos do módulo comercial. Idempotente via UPDATE por chave.
-- Assunto máximo ~90 chars com prefixo [Solutek].
-- Layout global (header com logo, rodapé, CTA) é aplicado pelo wrapEmailHtml
-- no dispatch — não repetir aqui.

-- Cotação enviada ao cliente
UPDATE email_event_config SET
  subject_template = '[Solutek] Cotação {{codigo}} enviada para {{cliente_nome}}',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>A cotação <strong>{{codigo}}</strong> foi enviada ao cliente <strong>{{cliente_nome}}</strong> e agora aguarda retorno.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Cotação</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{codigo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Cliente</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{cliente_nome}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Valor</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{valor}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Validade</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{prazo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Enviado por</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{usuario}}</td></tr>
    </table>
  </td></tr>
</table>
<p style="margin:4px 0 0 0;color:#64748b;font-size:13px;">Acompanhe o retorno pelo painel comercial e registre qualquer negociação diretamente na oportunidade.</p>'
WHERE event_key = 'cotacao.enviada_cliente';

-- Cotação aceita
UPDATE email_event_config SET
  subject_template = '[Solutek] Cotação {{codigo}} aceita — {{cliente_nome}}',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>Boa notícia — o cliente <strong>{{cliente_nome}}</strong> aceitou a cotação <strong>{{codigo}}</strong>. Já podemos abrir a oportunidade e mobilizar a engenharia.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Cotação</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{codigo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Cliente</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{cliente_nome}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Valor</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{valor}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Aceite em</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data}}</td></tr>
    </table>
  </td></tr>
</table>
<div style="margin:12px 0;font-size:12px;font-weight:600;color:#334155;">Próximos passos</div>
<ul style="margin:0 0 0 0;padding-left:18px;font-size:14px;color:#0f172a;">
  <li>Converter a cotação em ordem de venda e criar o projeto.</li>
  <li>Notificar Engenharia para iniciar o ETP.</li>
  <li>Confirmar condições comerciais e prazo com o cliente.</li>
</ul>'
WHERE event_key = 'cotacao.aceita';

-- Cotação expirando em 3 dias
UPDATE email_event_config SET
  subject_template = '[Solutek] Cotação {{codigo}} expira em 3 dias — {{cliente_nome}}',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>A cotação <strong>{{codigo}}</strong> enviada para <strong>{{cliente_nome}}</strong> expira em <strong>{{prazo}}</strong>. Vale um follow-up para não perder o timing.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Cotação</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{codigo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Cliente</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{cliente_nome}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Valor</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{valor}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Expira em</td><td style="padding:4px 0;font-size:14px;font-weight:500;color:#b45309;">{{prazo}}</td></tr>
    </table>
  </td></tr>
</table>
<div style="margin:12px 0;font-size:12px;font-weight:600;color:#334155;">Sugestões</div>
<ul style="margin:0;padding-left:18px;font-size:14px;color:#0f172a;">
  <li>Entrar em contato com o cliente para revalidar a proposta.</li>
  <li>Registrar o retorno como nota na oportunidade.</li>
  <li>Se necessário, prorrogar a validade e reenviar.</li>
</ul>'
WHERE event_key = 'cotacao.expirando_3d';

-- Oportunidade criada
UPDATE email_event_config SET
  subject_template = '[Solutek] Nova oportunidade — {{titulo}} ({{cliente_nome}})',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>Uma nova oportunidade foi criada e entrou no funil comercial.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Título</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{titulo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Cliente</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{cliente_nome}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Etapa atual</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{stage_novo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Valor estimado</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{valor}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Criada por</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{usuario}}</td></tr>
    </table>
  </td></tr>
</table>
<p style="margin:4px 0 0 0;color:#64748b;font-size:13px;">Atribua a oportunidade a um responsável e registre a primeira ação de qualificação.</p>'
WHERE event_key = 'oportunidade.criada';

-- Oportunidade mudou de etapa
UPDATE email_event_config SET
  subject_template = '[Solutek] {{titulo}}: {{stage_anterior}} → {{stage_novo}}',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>A oportunidade <strong>{{titulo}}</strong> ({{cliente_nome}}) avançou no funil.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Cliente</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{cliente_nome}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">De</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{stage_anterior}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Para</td><td style="padding:4px 0;font-size:14px;font-weight:500;color:#065f46;">{{stage_novo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Alterado por</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{usuario}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Quando</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data}}</td></tr>
    </table>
  </td></tr>
</table>
<p style="margin:4px 0 0 0;color:#64748b;font-size:13px;">Confirme os próximos passos previstos para a etapa atual e mantenha o histórico atualizado.</p>'
WHERE event_key = 'oportunidade.stage_alterado';

-- Oportunidade ganha
UPDATE email_event_config SET
  subject_template = '[Solutek] Oportunidade GANHA — {{titulo}} ({{cliente_nome}})',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>🎉 A oportunidade <strong>{{titulo}}</strong> foi fechada como <strong>GANHA</strong> com o cliente <strong>{{cliente_nome}}</strong>.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Cliente</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{cliente_nome}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Valor fechado</td><td style="padding:4px 0;font-size:14px;font-weight:600;color:#065f46;">{{valor}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Fechado por</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{usuario}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Quando</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data}}</td></tr>
    </table>
  </td></tr>
</table>
<div style="margin:12px 0;font-size:12px;font-weight:600;color:#334155;">Próximos passos</div>
<ul style="margin:0;padding-left:18px;font-size:14px;color:#0f172a;">
  <li>Abrir o projeto e informar Engenharia + Produção.</li>
  <li>Enviar contrato/pedido oficial ao cliente.</li>
  <li>Confirmar condições de pagamento e cronograma.</li>
</ul>'
WHERE event_key = 'oportunidade.ganha';

-- Oportunidade perdida
UPDATE email_event_config SET
  subject_template = '[Solutek] Oportunidade PERDIDA — {{titulo}} ({{cliente_nome}})',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>A oportunidade <strong>{{titulo}}</strong> com <strong>{{cliente_nome}}</strong> foi encerrada como perdida. Registro do motivo abaixo para aprendizado do time.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Cliente</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{cliente_nome}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Valor estimado</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{valor}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Encerrado por</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{usuario}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Quando</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data}}</td></tr>
    </table>
  </td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0;">
  <tr><td style="padding:10px 14px;border-left:3px solid #0f172a;background:#f1f5f9;border-radius:0 6px 6px 0;">
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#334155;">Motivo</div>
    <div style="margin-top:4px;font-size:14px;color:#0f172a;">{{motivo}}</div>
  </td></tr>
</table>
<p style="margin:4px 0 0 0;color:#64748b;font-size:13px;">Considere reaproveitar a proposta em oportunidades futuras e agendar re-engajamento em 3-6 meses.</p>'
WHERE event_key = 'oportunidade.perdida';
