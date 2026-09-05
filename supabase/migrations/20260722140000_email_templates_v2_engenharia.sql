-- ============================================================
-- Templates de e-mail — Etapa 3: ENGENHARIA
-- ============================================================
-- Reescreve 8 eventos do módulo engenharia com layout rico
-- (intro → dados → motivo/próximos passos). Prefixo [SLTK].

-- ETP criado
UPDATE email_event_config SET
  subject_template = '[SLTK] Novo ETP {{codigo}} criado',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>Um novo ETP foi cadastrado e está disponível para elaboração no módulo de Engenharia.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">ETP</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{codigo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Projeto</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{projeto}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Cliente</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{cliente_nome}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Criado por</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{usuario}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Criado em</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data}}</td></tr>
    </table>
  </td></tr>
</table>
<p style="margin:4px 0 0 0;color:#64748b;font-size:13px;">Atribua o responsável técnico e inicie o preenchimento das seções obrigatórias.</p>'
WHERE event_key = 'etp.criado';

-- ETP enviado para aprovação
UPDATE email_event_config SET
  subject_template = '[SLTK] ETP {{codigo}} aguardando sua aprovação',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>O ETP <strong>{{codigo}}</strong> foi finalizado por {{usuario}} e está aguardando aprovação técnica.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">ETP</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{codigo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Projeto</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{projeto}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Cliente</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{cliente_nome}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Enviado por</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{usuario}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Enviado em</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data}}</td></tr>
    </table>
  </td></tr>
</table>
<div style="margin:12px 0;font-size:12px;font-weight:600;color:#334155;">Checklist de revisão</div>
<ul style="margin:0;padding-left:18px;font-size:14px;color:#0f172a;">
  <li>Confirmar escopo mecânico, elétrico e de automação.</li>
  <li>Validar BOM preliminar e prazos estimados.</li>
  <li>Aprovar ou reprovar com justificativa objetiva.</li>
</ul>'
WHERE event_key = 'etp.enviado_aprovacao';

-- ETP aprovado
UPDATE email_event_config SET
  subject_template = '[SLTK] ETP {{codigo}} aprovado — liberado para produção',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>O ETP <strong>{{codigo}}</strong> foi <strong>aprovado</strong> e está liberado para as próximas etapas do projeto.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">ETP</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{codigo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Projeto</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{projeto}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Cliente</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{cliente_nome}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Aprovado por</td><td style="padding:4px 0;font-size:14px;font-weight:500;color:#065f46;">{{usuario}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Aprovado em</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data}}</td></tr>
    </table>
  </td></tr>
</table>
<div style="margin:12px 0;font-size:12px;font-weight:600;color:#334155;">Próximos passos</div>
<ul style="margin:0;padding-left:18px;font-size:14px;color:#0f172a;">
  <li>Consolidar BOM final e liberar RFQs para Compras.</li>
  <li>Distribuir etapas de engenharia mecânica e elétrica.</li>
  <li>Sincronizar cronograma com Produção.</li>
</ul>'
WHERE event_key = 'etp.aprovado';

-- ETP reprovado
UPDATE email_event_config SET
  subject_template = '[SLTK] ETP {{codigo}} reprovado — ajustes necessários',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>O ETP <strong>{{codigo}}</strong> foi reprovado na revisão técnica. Ajuste os pontos abaixo e reenvie para aprovação.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">ETP</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{codigo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Projeto</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{projeto}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Reprovado por</td><td style="padding:4px 0;font-size:14px;font-weight:500;color:#b91c1c;">{{usuario}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Reprovado em</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data}}</td></tr>
    </table>
  </td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0;">
  <tr><td style="padding:10px 14px;border-left:3px solid #0f172a;background:#f1f5f9;border-radius:0 6px 6px 0;">
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#334155;">Motivo da reprovação</div>
    <div style="margin-top:4px;font-size:14px;color:#0f172a;">{{motivo}}</div>
  </td></tr>
</table>
<p style="margin:4px 0 0 0;color:#64748b;font-size:13px;">Após corrigir os pontos indicados, reenvie o ETP para nova aprovação.</p>'
WHERE event_key = 'etp.reprovado';

-- Etapa atribuída
UPDATE email_event_config SET
  subject_template = '[SLTK] Nova etapa atribuída: {{etapa_nome}}',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>Você foi designado como responsável por uma nova etapa de engenharia.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Etapa</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{etapa_nome}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Projeto</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{projeto}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Disciplina</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{disciplina}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Prazo</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{prazo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Atribuído por</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{usuario}}</td></tr>
    </table>
  </td></tr>
</table>
<p style="margin:4px 0 0 0;color:#64748b;font-size:13px;">Confirme o entendimento do escopo e registre o início da atividade no kanban.</p>'
WHERE event_key = 'etapa.atribuida';

-- Etapa prazo (aproximando)
UPDATE email_event_config SET
  subject_template = '[SLTK] Prazo se aproximando: {{etapa_nome}}',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>A etapa <strong>{{etapa_nome}}</strong> tem prazo em <strong>{{prazo}}</strong>. Confirme o andamento para evitar atraso na entrega do projeto.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Etapa</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{etapa_nome}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Projeto</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{projeto}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Responsável</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{responsavel}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Prazo</td><td style="padding:4px 0;font-size:14px;font-weight:500;color:#b45309;">{{prazo}}</td></tr>
    </table>
  </td></tr>
</table>
<p style="margin:4px 0 0 0;color:#64748b;font-size:13px;">Se identificar risco de atraso, sinalize à coordenação de engenharia agora.</p>'
WHERE event_key = 'etapa.prazo';

-- Etapa atrasada
UPDATE email_event_config SET
  subject_template = '[SLTK] Etapa ATRASADA: {{etapa_nome}} ({{projeto}})',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>A etapa <strong>{{etapa_nome}}</strong> passou do prazo previsto e precisa de replanejamento imediato.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #fecaca;border-radius:8px;background:#fef2f2;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Etapa</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{etapa_nome}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Projeto</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{projeto}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Responsável</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{responsavel}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Prazo original</td><td style="padding:4px 0;font-size:14px;font-weight:600;color:#b91c1c;">{{prazo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Dias em atraso</td><td style="padding:4px 0;font-size:14px;font-weight:600;color:#b91c1c;">{{dias_atraso}}</td></tr>
    </table>
  </td></tr>
</table>
<div style="margin:12px 0;font-size:12px;font-weight:600;color:#334155;">Ação necessária</div>
<ul style="margin:0;padding-left:18px;font-size:14px;color:#0f172a;">
  <li>Reavaliar escopo e replanejar entrega no kanban.</li>
  <li>Registrar causa raiz do atraso.</li>
  <li>Comunicar impacto ao PM e ao cliente, se aplicável.</li>
</ul>'
WHERE event_key = 'etapa.atrasada';

-- Etapa concluída
UPDATE email_event_config SET
  subject_template = '[SLTK] Etapa concluída: {{etapa_nome}} ({{projeto}})',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>A etapa <strong>{{etapa_nome}}</strong> foi concluída e o próximo estágio do projeto pode ser iniciado.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Etapa</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{etapa_nome}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Projeto</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{projeto}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Concluída por</td><td style="padding:4px 0;font-size:14px;font-weight:500;color:#065f46;">{{usuario}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Concluída em</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data}}</td></tr>
    </table>
  </td></tr>
</table>
<p style="margin:4px 0 0 0;color:#64748b;font-size:13px;">Confira o entregável no projeto e libere a próxima etapa dependente.</p>'
WHERE event_key = 'etapa.concluida';
