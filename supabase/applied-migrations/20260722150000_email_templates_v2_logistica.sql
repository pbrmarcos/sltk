-- ============================================================
-- Templates de e-mail — Etapa 4: LOGÍSTICA
-- ============================================================
-- Reescreve 6 eventos de embarque com layout rico e dados
-- padronizados (código, projeto, destino, transportadora, datas).

-- Embarque criado
UPDATE email_event_config SET
  subject_template = '[SLTK] Embarque {{codigo}} criado — destino {{destino}}',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>Um novo embarque foi registrado e entrou na fila de despacho.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Embarque</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{codigo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Projeto</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{projeto}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Cliente</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{cliente_nome}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Destino</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{destino}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Transportadora</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{transportadora}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Despacho previsto</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data_despacho}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Entrega prevista</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data_entrega}}</td></tr>
    </table>
  </td></tr>
</table>
<p style="margin:4px 0 0 0;color:#64748b;font-size:13px;">Confirme itens, embalagem e documentação antes da coleta.</p>'
WHERE event_key = 'embarque.criado';

-- Despacho previsto
UPDATE email_event_config SET
  subject_template = '[SLTK] Despacho previsto: {{codigo}} em {{data}}',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>O embarque <strong>{{codigo}}</strong> está com despacho programado para <strong>{{data}}</strong>. Verifique se toda a preparação estará concluída até lá.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Embarque</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{codigo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Projeto</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{projeto}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Destino</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{destino}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Transportadora</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{transportadora}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Despacho em</td><td style="padding:4px 0;font-size:14px;font-weight:500;color:#b45309;">{{data}}</td></tr>
    </table>
  </td></tr>
</table>
<div style="margin:12px 0;font-size:12px;font-weight:600;color:#334155;">Checklist pré-despacho</div>
<ul style="margin:0;padding-left:18px;font-size:14px;color:#0f172a;">
  <li>Nota fiscal e documentação anexadas.</li>
  <li>Embalagem e etiquetas conferidas.</li>
  <li>Cliente notificado sobre a janela de coleta.</li>
</ul>'
WHERE event_key = 'embarque.despacho_previsto';

-- Embarque despachado
UPDATE email_event_config SET
  subject_template = '[SLTK] Embarque {{codigo}} despachado — a caminho de {{destino}}',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>O embarque <strong>{{codigo}}</strong> foi despachado e está a caminho do destino.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Embarque</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{codigo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Projeto</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{projeto}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Destino</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{destino}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Transportadora</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{transportadora}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Rastreio</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{rastreio}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Entrega prevista</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data_entrega}}</td></tr>
    </table>
  </td></tr>
</table>
<p style="margin:4px 0 0 0;color:#64748b;font-size:13px;">Acompanhe o status pelo painel de Logística e mantenha o cliente informado.</p>'
WHERE event_key = 'embarque.despachado';

-- Entrega prevista
UPDATE email_event_config SET
  subject_template = '[SLTK] Entrega prevista {{codigo}} — {{data}} em {{destino}}',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>O embarque <strong>{{codigo}}</strong> tem entrega programada para <strong>{{data}}</strong> em {{destino}}.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Embarque</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{codigo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Projeto</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{projeto}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Cliente</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{cliente_nome}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Destino</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{destino}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Entrega em</td><td style="padding:4px 0;font-size:14px;font-weight:500;color:#b45309;">{{data}}</td></tr>
    </table>
  </td></tr>
</table>
<p style="margin:4px 0 0 0;color:#64748b;font-size:13px;">Confirme quem irá receber e prepare recepção + descarga com a equipe local.</p>'
WHERE event_key = 'embarque.entrega_prevista';

-- Embarque atrasado
UPDATE email_event_config SET
  subject_template = '[SLTK] Embarque ATRASADO — {{codigo}} ({{destino}})',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>O embarque <strong>{{codigo}}</strong> está atrasado em relação ao prazo previsto. É necessário acionar a transportadora e replanejar a entrega.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #fecaca;border-radius:8px;background:#fef2f2;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Embarque</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{codigo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Projeto</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{projeto}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Destino</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{destino}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Transportadora</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{transportadora}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Previsão original</td><td style="padding:4px 0;font-size:14px;font-weight:600;color:#b91c1c;">{{data_prevista}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Dias em atraso</td><td style="padding:4px 0;font-size:14px;font-weight:600;color:#b91c1c;">{{dias_atraso}}</td></tr>
    </table>
  </td></tr>
</table>
<div style="margin:12px 0;font-size:12px;font-weight:600;color:#334155;">Ação necessária</div>
<ul style="margin:0;padding-left:18px;font-size:14px;color:#0f172a;">
  <li>Contatar transportadora e atualizar rastreio.</li>
  <li>Informar cliente sobre novo prazo estimado.</li>
  <li>Registrar causa raiz do atraso no embarque.</li>
</ul>'
WHERE event_key = 'embarque.atrasado';

-- Embarque entregue
UPDATE email_event_config SET
  subject_template = '[SLTK] Embarque {{codigo}} entregue em {{destino}}',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>O embarque <strong>{{codigo}}</strong> foi entregue com sucesso. Fluxo de logística encerrado.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Embarque</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{codigo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Projeto</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{projeto}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Cliente</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{cliente_nome}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Destino</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{destino}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Entregue em</td><td style="padding:4px 0;font-size:14px;font-weight:500;color:#065f46;">{{data}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Recebido por</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{recebedor}}</td></tr>
    </table>
  </td></tr>
</table>
<div style="margin:12px 0;font-size:12px;font-weight:600;color:#334155;">Próximos passos</div>
<ul style="margin:0;padding-left:18px;font-size:14px;color:#0f172a;">
  <li>Anexar comprovante de entrega ao projeto.</li>
  <li>Agendar visita técnica ou start-up com o cliente.</li>
  <li>Encerrar embarque no painel de Logística.</li>
</ul>'
WHERE event_key = 'embarque.entregue';
