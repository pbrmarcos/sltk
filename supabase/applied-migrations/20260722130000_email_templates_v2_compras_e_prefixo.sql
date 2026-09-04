-- ============================================================
-- Templates de e-mail — troca de prefixo global + Etapa 2: COMPRAS
-- ============================================================
-- 1) Substitui prefixo "[Solutek]" por "[SLTK]" em TODOS os subjects.
-- 2) Reescreve corpo rico (intro → dados → motivo → próximos passos)
--    para os 8 eventos do módulo COMPRAS.
-- Layout global (header/rodapé/CTA) vem do wrapEmailHtml no dispatch.

-- 1) Prefixo global
UPDATE email_event_config
SET subject_template = REPLACE(subject_template, '[Solutek]', '[SLTK]')
WHERE subject_template LIKE '[Solutek]%';

-- 2) COMPRAS — corpos ricos

-- OC aguardando aprovação
UPDATE email_event_config SET
  subject_template = '[SLTK] OC {{codigo}} aguardando aprovação — {{valor}}',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>A ordem de compra <strong>{{codigo}}</strong> foi criada por <strong>{{usuario}}</strong> e depende da sua aprovação.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Ordem</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{codigo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Fornecedor</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{fornecedor}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Valor</td><td style="padding:4px 0;font-size:14px;font-weight:600;color:#0f172a;">{{valor}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Solicitante</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{usuario}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Criada em</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data}}</td></tr>
    </table>
  </td></tr>
</table>
<div style="margin:12px 0;font-size:12px;font-weight:600;color:#334155;">O que verificar antes de aprovar</div>
<ul style="margin:0;padding-left:18px;font-size:14px;color:#0f172a;">
  <li>Coerência do valor com a cotação vinculada.</li>
  <li>Homologação do fornecedor e condições comerciais.</li>
  <li>Impacto no orçamento do projeto/ETP de origem.</li>
</ul>'
WHERE event_key = 'oc.aguardando_aprovacao';

-- OC aprovada
UPDATE email_event_config SET
  subject_template = '[SLTK] OC {{codigo}} aprovada — {{fornecedor}}',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>A ordem de compra <strong>{{codigo}}</strong> foi <strong style="color:#065f46;">aprovada</strong> e está liberada para emissão ao fornecedor.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Ordem</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{codigo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Fornecedor</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{fornecedor}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Valor</td><td style="padding:4px 0;font-size:14px;font-weight:600;color:#065f46;">{{valor}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Aprovado por</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{usuario}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Quando</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data}}</td></tr>
    </table>
  </td></tr>
</table>
<div style="margin:12px 0;font-size:12px;font-weight:600;color:#334155;">Próximos passos</div>
<ul style="margin:0;padding-left:18px;font-size:14px;color:#0f172a;">
  <li>Emitir o pedido oficial ao fornecedor.</li>
  <li>Confirmar prazo de entrega e enviar para a Logística.</li>
  <li>Atualizar a expectativa de chegada no projeto vinculado.</li>
</ul>'
WHERE event_key = 'oc.aprovada';

-- OC reprovada
UPDATE email_event_config SET
  subject_template = '[SLTK] OC {{codigo}} reprovada — {{fornecedor}}',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>A ordem de compra <strong>{{codigo}}</strong> foi <strong style="color:#991b1b;">reprovada</strong>. Ajuste os pontos indicados antes de submeter novamente.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Ordem</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{codigo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Fornecedor</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{fornecedor}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Valor</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{valor}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Reprovada por</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{usuario}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Quando</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data}}</td></tr>
    </table>
  </td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0;">
  <tr><td style="padding:10px 14px;border-left:3px solid #991b1b;background:#fef2f2;border-radius:0 6px 6px 0;">
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#7f1d1d;">Motivo da reprovação</div>
    <div style="margin-top:4px;font-size:14px;color:#0f172a;">{{motivo}}</div>
  </td></tr>
</table>
<p style="margin:8px 0 0 0;color:#64748b;font-size:13px;">Revise os itens apontados e reenvie a OC para nova análise.</p>'
WHERE event_key = 'oc.reprovada';

-- OC emitida ao fornecedor
UPDATE email_event_config SET
  subject_template = '[SLTK] Pedido de compra {{codigo}} — {{fornecedor}}',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>Segue o pedido de compra <strong>{{codigo}}</strong> emitido pela SLTK Americas. Favor confirmar recebimento e prazo de entrega.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Pedido</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{codigo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Valor total</td><td style="padding:4px 0;font-size:14px;font-weight:600;">{{valor}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Entrega prevista</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{prazo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Comprador</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{usuario}}</td></tr>
    </table>
  </td></tr>
</table>
<p style="margin:8px 0 0 0;color:#64748b;font-size:13px;">Em caso de divergência de preço, prazo ou especificação, responda a esta mensagem informando os ajustes necessários.</p>'
WHERE event_key = 'oc.emitida_fornecedor';

-- OC entrega prevista
UPDATE email_event_config SET
  subject_template = '[SLTK] Entrega prevista — OC {{codigo}} em {{prazo}}',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>Lembrete: a entrega da OC <strong>{{codigo}}</strong> está prevista para <strong>{{prazo}}</strong>.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Ordem</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{codigo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Fornecedor</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{fornecedor}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Entrega prevista</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{prazo}}</td></tr>
    </table>
  </td></tr>
</table>
<p style="margin:4px 0 0 0;color:#64748b;font-size:13px;">Confirme o recebimento com o fornecedor e prepare a Logística para conferência e entrada no estoque.</p>'
WHERE event_key = 'oc.entrega_prevista';

-- OC entrega atrasada
UPDATE email_event_config SET
  subject_template = '[SLTK] ⚠ Entrega atrasada — OC {{codigo}} ({{fornecedor}})',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>A OC <strong>{{codigo}}</strong> com o fornecedor <strong>{{fornecedor}}</strong> ultrapassou a data prevista de entrega. É necessário abrir tratativa imediata.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Ordem</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{codigo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Fornecedor</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{fornecedor}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Prazo original</td><td style="padding:4px 0;font-size:14px;font-weight:500;color:#b45309;">{{prazo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Valor</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{valor}}</td></tr>
    </table>
  </td></tr>
</table>
<div style="margin:12px 0;font-size:12px;font-weight:600;color:#334155;">Ações recomendadas</div>
<ul style="margin:0;padding-left:18px;font-size:14px;color:#0f172a;">
  <li>Contatar o fornecedor e registrar nova data prometida.</li>
  <li>Avaliar impacto no cronograma do projeto/ETP vinculado.</li>
  <li>Se necessário, escalar para o responsável comercial do fornecedor.</li>
</ul>'
WHERE event_key = 'oc.entrega_atrasada';

-- RFQ enviada ao fornecedor
UPDATE email_event_config SET
  subject_template = '[SLTK] RFQ {{codigo}} — solicitação de cotação',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>A SLTK Americas está solicitando cotação para o item abaixo. Agradecemos o retorno até <strong>{{prazo}}</strong>.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">RFQ</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{codigo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Item</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{titulo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Prazo para resposta</td><td style="padding:4px 0;font-size:14px;font-weight:500;color:#b45309;">{{prazo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Comprador</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{usuario}}</td></tr>
    </table>
  </td></tr>
</table>
<div style="margin:12px 0;font-size:12px;font-weight:600;color:#334155;">Informações desejadas na proposta</div>
<ul style="margin:0;padding-left:18px;font-size:14px;color:#0f172a;">
  <li>Preço unitário e condições de pagamento.</li>
  <li>Prazo de entrega e condições de frete.</li>
  <li>Validade da proposta e observações técnicas.</li>
</ul>
<p style="margin:8px 0 0 0;color:#64748b;font-size:13px;">Utilize o link abaixo para responder diretamente pelo portal, sem necessidade de cadastro.</p>'
WHERE event_key = 'rfq.enviada_fornecedor';

-- RFQ resposta recebida
UPDATE email_event_config SET
  subject_template = '[SLTK] Resposta de RFQ {{codigo}} — {{fornecedor}}',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>O fornecedor <strong>{{fornecedor}}</strong> respondeu à RFQ <strong>{{codigo}}</strong>. Já é possível comparar propostas no portal.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">RFQ</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{codigo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Fornecedor</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{fornecedor}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Valor proposto</td><td style="padding:4px 0;font-size:14px;font-weight:600;">{{valor}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Recebida em</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data}}</td></tr>
    </table>
  </td></tr>
</table>
<div style="margin:12px 0;font-size:12px;font-weight:600;color:#334155;">Próximos passos</div>
<ul style="margin:0;padding-left:18px;font-size:14px;color:#0f172a;">
  <li>Comparar com outras propostas da mesma RFQ.</li>
  <li>Validar condições técnicas com a Engenharia, se necessário.</li>
  <li>Selecionar o fornecedor e gerar a OC vinculada.</li>
</ul>'
WHERE event_key = 'rfq.resposta_recebida';
