-- Auditoria do sistema de e-mail: email_event_config foi populada de uma
-- vez, especulativamente, cobrindo praticamente todo evento de negócio
-- imaginável — mas só uma fração pequena foi de fato conectada ao código
-- que dispara e-mail. Levantamento cruzando os 63 event_key existentes
-- contra o código real (src/lib/*.functions.ts) encontrou:
--   - 20 eventos especulativos: o status/conceito não existe em código
--     nenhum, nem em cron (ex. oc.reprovada — esse status nem existe no
--     enum de OC; chamado.visita_tecnica_agendada — "visita técnica"
--     não aparece em lugar nenhum do código).
--   - 2 duplicatas órfãs de um rename: contato.mensagem_recebida e
--     rfq_publico.submissao_recebida foram os nomes originais (migration
--     de 21/07); 3 dias depois form.contato.recebido/form.rfq.recebida
--     foram criados com os nomes reais que o código usa hoje (migration
--     20260724180000_form_inbox_alerts.sql) — a linha antiga nunca foi
--     removida.
--   - 2 eventos que o código JÁ dispara (ordens-compra.functions.ts,
--     setStatus) sem nenhuma config existir — falha 100% silenciosa, nem
--     loga: oc.enviada, oc.cancelada.

-- ============================================================
-- Remove os 22 event_key especulativos/órfãos (email_event_recipients
-- tem ON DELETE CASCADE em event_key, não precisa DELETE separado ali).
-- ============================================================
DELETE FROM public.email_event_config WHERE event_key IN (
  'cotacao.enviada_cliente',
  'cotacao.aceita',
  'cotacao.expirando_3d',
  'etapa.atrasada',
  'etapa.prazo',
  'oc.reprovada',
  'oc.emitida_fornecedor',
  'oc.entrega_prevista',
  'oc.entrega_atrasada',
  'fat.agendado',
  'fat.reagendado',
  'fat.reprovado',
  'sat.aberto',
  'sat.encerrado',
  'embarque.despacho_previsto',
  'embarque.entrega_prevista',
  'embarque.atrasado',
  'chamado.visita_tecnica_agendada',
  'usuario.convite_enviado',
  'contato.mensagem_recebida',
  'rfq_publico.submissao_recebida'
);

-- ============================================================
-- Cria as 2 configs que faltam pros disparos que ordens-compra.functions.ts
-- já faz hoje (setStatus, linhas ~673-711) — mesmo estilo visual e mesmas
-- vars do template de oc.aprovada (migration
-- 20260722130000_email_templates_v2_compras_e_prefixo.sql).
-- ============================================================
INSERT INTO public.email_event_config
  (event_key, module, label, description, subject_template, body_template)
VALUES
  (
    'oc.enviada',
    'compras',
    'OC enviada ao fornecedor',
    'Pedido de compra emitido/enviado ao fornecedor.',
    '[SLTK] OC {{codigo}} enviada — {{fornecedor}}',
    '<p>Olá {{destinatario_nome}},</p>
<p>A ordem de compra <strong>{{codigo}}</strong> foi <strong style="color:#1d4ed8;">enviada</strong> ao fornecedor <strong>{{fornecedor}}</strong>.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Ordem</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{codigo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Fornecedor</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{fornecedor}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Valor</td><td style="padding:4px 0;font-size:14px;font-weight:600;color:#1d4ed8;">{{valor}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Enviado por</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{usuario}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Quando</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data}}</td></tr>
    </table>
  </td></tr>
</table>
<div style="margin:12px 0;font-size:12px;font-weight:600;color:#334155;">Próximos passos</div>
<ul style="margin:0;padding-left:18px;font-size:14px;color:#0f172a;">
  <li>Acompanhar a confirmação de recebimento do fornecedor.</li>
  <li>Confirmar prazo de entrega e repassar para a Logística.</li>
</ul>'
  ),
  (
    'oc.cancelada',
    'compras',
    'OC cancelada',
    'Ordem de compra cancelada.',
    '[SLTK] OC {{codigo}} cancelada — {{fornecedor}}',
    '<p>Olá {{destinatario_nome}},</p>
<p>A ordem de compra <strong>{{codigo}}</strong> ({{fornecedor}}) foi <strong style="color:#b91c1c;">cancelada</strong>.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #fecaca;border-radius:8px;background:#fef2f2;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Ordem</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{codigo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Fornecedor</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{fornecedor}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Valor</td><td style="padding:4px 0;font-size:14px;font-weight:600;">{{valor}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Cancelado por</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{usuario}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;">Quando</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data}}</td></tr>
    </table>
  </td></tr>
</table>
<div style="margin-top:4px;font-size:12px;color:#64748b;">Motivo</div>
<div style="margin-top:2px;font-size:14px;color:#0f172a;">{{motivo}}</div>'
  )
ON CONFLICT (event_key) DO NOTHING;

INSERT INTO public.email_event_recipients (event_key, role, mode) VALUES
  ('oc.enviada', 'purchasing', 'to'),
  ('oc.enviada', 'manager', 'cc'),
  ('oc.cancelada', 'purchasing', 'to'),
  ('oc.cancelada', 'manager', 'cc')
ON CONFLICT (event_key, role) DO NOTHING;
