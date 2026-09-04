-- ============================================================
-- Templates de e-mail — Etapa 5: Pós-vendas, Qualidade, Produção,
-- Administração e Site público (22 eventos)
-- ============================================================
-- Aplica corpo padronizado (intro → dados → motivo → próximos passos)
UPDATE email_event_config SET
  subject_template = '[SLTK] Chamado #{{numero}} aberto — {{titulo}}',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>Um novo chamado foi registrado no pós-vendas e precisa ser triado.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Chamado</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{numero}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Título</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{titulo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Cliente</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{cliente_nome}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Prioridade</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{prioridade}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Categoria</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{categoria}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Aberto por</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{usuario}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Aberto em</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data}}</td></tr>
    </table>
  </td></tr>
</table><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0;">
  <tr><td style="padding:10px 14px;border-left:3px solid #0f172a;background:#f1f5f9;border-radius:0 6px 6px 0;">
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#334155;">Descrição</div>
    <div style="margin-top:4px;font-size:14px;color:#0f172a;">{{descricao}}</div>
  </td></tr>
</table><p style="margin:4px 0 0 0;color:#64748b;font-size:13px;">Atribua um responsável e responda ao cliente respeitando o SLA de resposta.</p>'
WHERE event_key = 'chamado.aberto';

UPDATE email_event_config SET
  subject_template = '[SLTK] Chamado #{{numero}} atribuído a você',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>Você foi designado responsável pelo chamado abaixo.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Chamado</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{numero}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Título</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{titulo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Cliente</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{cliente_nome}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Prioridade</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{prioridade}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Atribuído por</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{usuario}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">SLA resposta</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{sla_resposta}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">SLA resolução</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{sla_resolucao}}</td></tr>
    </table>
  </td></tr>
</table><p style="margin:4px 0 0 0;color:#64748b;font-size:13px;">Acesse o chamado, revise o histórico e envie o primeiro retorno ao cliente.</p>'
WHERE event_key = 'chamado.atribuido';

UPDATE email_event_config SET
  subject_template = '[SLTK] Nova resposta no chamado #{{numero}}',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>Uma nova mensagem foi registrada no chamado <strong>#{{numero}}</strong>.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Chamado</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{numero}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Título</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{titulo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Cliente</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{cliente_nome}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Autor</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{usuario}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Enviado em</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data}}</td></tr>
    </table>
  </td></tr>
</table><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0;">
  <tr><td style="padding:10px 14px;border-left:3px solid #0f172a;background:#f1f5f9;border-radius:0 6px 6px 0;">
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#334155;">Mensagem</div>
    <div style="margin-top:4px;font-size:14px;color:#0f172a;">{{mensagem}}</div>
  </td></tr>
</table><p style="margin:4px 0 0 0;color:#64748b;font-size:13px;">Responda para manter o SLA em dia e feche o loop com o cliente.</p>'
WHERE event_key = 'chamado.resposta';

UPDATE email_event_config SET
  subject_template = '[SLTK] Chamado #{{numero}} resolvido',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>O chamado <strong>#{{numero}}</strong> foi marcado como resolvido.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Chamado</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{numero}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Título</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{titulo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Cliente</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{cliente_nome}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Resolvido por</td><td style="padding:4px 0;font-size:14px;font-weight:500;color:#065f46;">{{usuario}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Resolvido em</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Tempo total</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{tempo_total}}</td></tr>
    </table>
  </td></tr>
</table><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0;">
  <tr><td style="padding:10px 14px;border-left:3px solid #0f172a;background:#f1f5f9;border-radius:0 6px 6px 0;">
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#334155;">Solução aplicada</div>
    <div style="margin-top:4px;font-size:14px;color:#0f172a;">{{solucao}}</div>
  </td></tr>
</table><p style="margin:4px 0 0 0;color:#64748b;font-size:13px;">Aguarde a confirmação do cliente antes do encerramento definitivo.</p>'
WHERE event_key = 'chamado.resolvido';

UPDATE email_event_config SET
  subject_template = '[SLTK] Chamado #{{numero}} reaberto',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>O chamado <strong>#{{numero}}</strong> foi reaberto e precisa de nova análise.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Chamado</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{numero}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Título</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{titulo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Cliente</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{cliente_nome}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Reaberto por</td><td style="padding:4px 0;font-size:14px;font-weight:500;color:#b45309;">{{usuario}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Reaberto em</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data}}</td></tr>
    </table>
  </td></tr>
</table><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0;">
  <tr><td style="padding:10px 14px;border-left:3px solid #0f172a;background:#f1f5f9;border-radius:0 6px 6px 0;">
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#334155;">Motivo da reabertura</div>
    <div style="margin-top:4px;font-size:14px;color:#0f172a;">{{motivo}}</div>
  </td></tr>
</table><div style="margin:12px 0;font-size:12px;font-weight:600;color:#334155;">Ação necessária</div>
<ul style="margin:0;padding-left:18px;font-size:14px;color:#0f172a;">
  <li>Revisar histórico do atendimento anterior.</li>
  <li>Diagnosticar a causa remanescente.</li>
  <li>Retornar ao cliente com plano de ação.</li>
</ul>'
WHERE event_key = 'chamado.reaberto';

UPDATE email_event_config SET
  subject_template = '[SLTK] SLA de resposta ESTOURADO — Chamado #{{numero}}',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>O SLA de primeira resposta do chamado <strong>#{{numero}}</strong> foi ultrapassado.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #fecaca;border-radius:8px;background:#fef2f2;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Chamado</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{numero}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Título</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{titulo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Cliente</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{cliente_nome}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Prioridade</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{prioridade}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Responsável</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{responsavel}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">SLA previsto</td><td style="padding:4px 0;font-size:14px;font-weight:500;color:#b91c1c;">{{sla_previsto}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Tempo decorrido</td><td style="padding:4px 0;font-size:14px;font-weight:500;color:#b91c1c;">{{tempo_decorrido}}</td></tr>
    </table>
  </td></tr>
</table><div style="margin:12px 0;font-size:12px;font-weight:600;color:#334155;">Ação necessária</div>
<ul style="margin:0;padding-left:18px;font-size:14px;color:#0f172a;">
  <li>Entrar em contato com o cliente imediatamente.</li>
  <li>Reavaliar prioridade e reatribuir se necessário.</li>
  <li>Registrar causa do atraso para revisão do processo.</li>
</ul>'
WHERE event_key = 'chamado.sla_resposta_estourado';

UPDATE email_event_config SET
  subject_template = '[SLTK] SLA de resolução ESTOURADO — Chamado #{{numero}}',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>O SLA de resolução do chamado <strong>#{{numero}}</strong> foi ultrapassado. Ação urgente.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #fecaca;border-radius:8px;background:#fef2f2;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Chamado</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{numero}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Título</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{titulo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Cliente</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{cliente_nome}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Prioridade</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{prioridade}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Responsável</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{responsavel}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">SLA previsto</td><td style="padding:4px 0;font-size:14px;font-weight:500;color:#b91c1c;">{{sla_previsto}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Em atraso há</td><td style="padding:4px 0;font-size:14px;font-weight:500;color:#b91c1c;">{{tempo_atraso}}</td></tr>
    </table>
  </td></tr>
</table><div style="margin:12px 0;font-size:12px;font-weight:600;color:#334155;">Ação necessária</div>
<ul style="margin:0;padding-left:18px;font-size:14px;color:#0f172a;">
  <li>Escalar internamente e alinhar plano de solução.</li>
  <li>Comunicar cliente com novo prazo realista.</li>
  <li>Registrar impacto no relatório de SLA.</li>
</ul>'
WHERE event_key = 'chamado.sla_resolucao_estourado';

UPDATE email_event_config SET
  subject_template = '[SLTK] Visita técnica agendada — Chamado #{{numero}}',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>Uma visita técnica foi agendada para o chamado <strong>#{{numero}}</strong>.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Chamado</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{numero}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Cliente</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{cliente_nome}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Local</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{local}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Data/hora</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Técnico responsável</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{tecnico}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Agendado por</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{usuario}}</td></tr>
    </table>
  </td></tr>
</table><div style="margin:12px 0;font-size:12px;font-weight:600;color:#334155;">Preparação</div>
<ul style="margin:0;padding-left:18px;font-size:14px;color:#0f172a;">
  <li>Confirmar acesso e contato no local.</li>
  <li>Levar peças e ferramentas necessárias.</li>
  <li>Registrar SAT/relatório ao final da visita.</li>
</ul>'
WHERE event_key = 'chamado.visita_tecnica_agendada';

UPDATE email_event_config SET
  subject_template = '[SLTK] FAT agendado — {{equipamento}} ({{data}})',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>O FAT do equipamento <strong>{{equipamento}}</strong> foi agendado.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Equipamento</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{equipamento}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Projeto</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{projeto}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Cliente</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{cliente_nome}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Data/hora</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Local</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{local}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Responsável técnico</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{responsavel}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Agendado por</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{usuario}}</td></tr>
    </table>
  </td></tr>
</table><div style="margin:12px 0;font-size:12px;font-weight:600;color:#334155;">Preparação</div>
<ul style="margin:0;padding-left:18px;font-size:14px;color:#0f172a;">
  <li>Confirmar checklist de qualidade e insumos de teste.</li>
  <li>Alinhar presença de cliente e equipe SLTK.</li>
  <li>Reservar bancada de testes e instrumentos calibrados.</li>
</ul>'
WHERE event_key = 'fat.agendado';

UPDATE email_event_config SET
  subject_template = '[SLTK] FAT reagendado — {{equipamento}} ({{data}})',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>O FAT do equipamento <strong>{{equipamento}}</strong> foi reagendado para uma nova data.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Equipamento</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{equipamento}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Projeto</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{projeto}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Cliente</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{cliente_nome}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Nova data</td><td style="padding:4px 0;font-size:14px;font-weight:500;color:#b45309;">{{data}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Local</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{local}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Reagendado por</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{usuario}}</td></tr>
    </table>
  </td></tr>
</table><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0;">
  <tr><td style="padding:10px 14px;border-left:3px solid #0f172a;background:#f1f5f9;border-radius:0 6px 6px 0;">
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#334155;">Motivo do reagendamento</div>
    <div style="margin-top:4px;font-size:14px;color:#0f172a;">{{motivo}}</div>
  </td></tr>
</table><p style="margin:4px 0 0 0;color:#64748b;font-size:13px;">Atualize a agenda do cliente e reprograme a preparação da bancada de testes.</p>'
WHERE event_key = 'fat.reagendado';

UPDATE email_event_config SET
  subject_template = '[SLTK] FAT HOMOLOGADO — {{equipamento}}',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>🎉 O FAT do equipamento <strong>{{equipamento}}</strong> foi homologado. Equipamento aprovado para expedição.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Equipamento</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{equipamento}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Projeto</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{projeto}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Cliente</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{cliente_nome}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Homologado por</td><td style="padding:4px 0;font-size:14px;font-weight:500;color:#065f46;">{{usuario}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Homologado em</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data}}</td></tr>
    </table>
  </td></tr>
</table><div style="margin:12px 0;font-size:12px;font-weight:600;color:#334155;">Próximos passos</div>
<ul style="margin:0;padding-left:18px;font-size:14px;color:#0f172a;">
  <li>Emitir relatório final e assinatura do cliente.</li>
  <li>Liberar equipamento para embalagem e logística.</li>
  <li>Encerrar etapas de Qualidade no projeto.</li>
</ul>'
WHERE event_key = 'fat.homologado';

UPDATE email_event_config SET
  subject_template = '[SLTK] FAT reprovado — {{equipamento}} (ajustes necessários)',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>O FAT do equipamento <strong>{{equipamento}}</strong> foi reprovado. Correções são necessárias antes de novo teste.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #fecaca;border-radius:8px;background:#fef2f2;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Equipamento</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{equipamento}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Projeto</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{projeto}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Cliente</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{cliente_nome}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Reprovado por</td><td style="padding:4px 0;font-size:14px;font-weight:500;color:#b91c1c;">{{usuario}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Reprovado em</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data}}</td></tr>
    </table>
  </td></tr>
</table><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0;">
  <tr><td style="padding:10px 14px;border-left:3px solid #0f172a;background:#f1f5f9;border-radius:0 6px 6px 0;">
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#334155;">Não-conformidades</div>
    <div style="margin-top:4px;font-size:14px;color:#0f172a;">{{motivo}}</div>
  </td></tr>
</table><div style="margin:12px 0;font-size:12px;font-weight:600;color:#334155;">Ação necessária</div>
<ul style="margin:0;padding-left:18px;font-size:14px;color:#0f172a;">
  <li>Registrar RNC e distribuir para as equipes responsáveis.</li>
  <li>Corrigir pontos indicados e reagendar novo FAT.</li>
  <li>Notificar cliente sobre novo prazo estimado.</li>
</ul>'
WHERE event_key = 'fat.reprovado';

UPDATE email_event_config SET
  subject_template = '[SLTK] SAT aberto — {{equipamento}} ({{cliente_nome}})',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>Um novo SAT foi aberto no cliente <strong>{{cliente_nome}}</strong>.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Equipamento</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{equipamento}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Cliente</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{cliente_nome}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Local</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{local}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Técnico</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{tecnico}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Aberto em</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Aberto por</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{usuario}}</td></tr>
    </table>
  </td></tr>
</table><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0;">
  <tr><td style="padding:10px 14px;border-left:3px solid #0f172a;background:#f1f5f9;border-radius:0 6px 6px 0;">
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#334155;">Descrição inicial</div>
    <div style="margin-top:4px;font-size:14px;color:#0f172a;">{{descricao}}</div>
  </td></tr>
</table><p style="margin:4px 0 0 0;color:#64748b;font-size:13px;">Acompanhe a execução do SAT no módulo de Pós-vendas até homologação em campo.</p>'
WHERE event_key = 'sat.aberto';

UPDATE email_event_config SET
  subject_template = '[SLTK] SAT encerrado — {{equipamento}} ({{cliente_nome}})',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>O SAT do equipamento <strong>{{equipamento}}</strong> foi encerrado no cliente <strong>{{cliente_nome}}</strong>.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Equipamento</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{equipamento}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Cliente</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{cliente_nome}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Local</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{local}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Encerrado por</td><td style="padding:4px 0;font-size:14px;font-weight:500;color:#065f46;">{{usuario}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Encerrado em</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Duração</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{duracao}}</td></tr>
    </table>
  </td></tr>
</table><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0;">
  <tr><td style="padding:10px 14px;border-left:3px solid #0f172a;background:#f1f5f9;border-radius:0 6px 6px 0;">
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#334155;">Conclusão</div>
    <div style="margin-top:4px;font-size:14px;color:#0f172a;">{{conclusao}}</div>
  </td></tr>
</table><p style="margin:4px 0 0 0;color:#64748b;font-size:13px;">Anexe o relatório assinado e feche as pendências de garantia no projeto.</p>'
WHERE event_key = 'sat.encerrado';

UPDATE email_event_config SET
  subject_template = '[SLTK] Novo card de montagem: {{card}}',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>Um novo card de montagem foi atribuído a você.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Card</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{card}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Equipamento</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{equipamento}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Projeto</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{projeto}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Coluna</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{coluna}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Prazo</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{prazo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Atribuído por</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{usuario}}</td></tr>
    </table>
  </td></tr>
</table><p style="margin:4px 0 0 0;color:#64748b;font-size:13px;">Acesse o kanban de montagem, revise o checklist e inicie a atividade.</p>'
WHERE event_key = 'montagem.card_atribuido';

UPDATE email_event_config SET
  subject_template = '[SLTK] Card bloqueado: {{card}}',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>O card <strong>{{card}}</strong> foi bloqueado e precisa de desimpedimento.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #fecaca;border-radius:8px;background:#fef2f2;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Card</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{card}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Equipamento</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{equipamento}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Projeto</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{projeto}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Bloqueado por</td><td style="padding:4px 0;font-size:14px;font-weight:500;color:#b45309;">{{usuario}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Bloqueado em</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data}}</td></tr>
    </table>
  </td></tr>
</table><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0;">
  <tr><td style="padding:10px 14px;border-left:3px solid #0f172a;background:#f1f5f9;border-radius:0 6px 6px 0;">
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#334155;">Motivo do bloqueio</div>
    <div style="margin-top:4px;font-size:14px;color:#0f172a;">{{motivo}}</div>
  </td></tr>
</table><div style="margin:12px 0;font-size:12px;font-weight:600;color:#334155;">Ação necessária</div>
<ul style="margin:0;padding-left:18px;font-size:14px;color:#0f172a;">
  <li>Escalar dependência com Compras ou Engenharia.</li>
  <li>Registrar previsão de desbloqueio no card.</li>
  <li>Comunicar impacto ao PM do projeto.</li>
</ul>'
WHERE event_key = 'montagem.card_bloqueado';

UPDATE email_event_config SET
  subject_template = '[SLTK] Convite enviado para {{email}}',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>Um convite de acesso ao sistema foi enviado.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">E-mail</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{email}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Papel inicial</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{papel}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Enviado por</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{usuario}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Enviado em</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data}}</td></tr>
    </table>
  </td></tr>
</table><p style="margin:4px 0 0 0;color:#64748b;font-size:13px;">Acompanhe a ativação do usuário no painel de administração.</p>'
WHERE event_key = 'usuario.convite_enviado';

UPDATE email_event_config SET
  subject_template = '[SLTK] Papel alterado — {{email}} ({{de}} → {{para}})',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>O papel de um usuário foi alterado no sistema.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Usuário</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{email}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">De</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{de}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Para</td><td style="padding:4px 0;font-size:14px;font-weight:500;color:#065f46;">{{para}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Alterado por</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{usuario}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Alterado em</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data}}</td></tr>
    </table>
  </td></tr>
</table><p style="margin:4px 0 0 0;color:#64748b;font-size:13px;">Verifique se as permissões efetivas condizem com a função do usuário.</p>'
WHERE event_key = 'usuario.papel_alterado';

UPDATE email_event_config SET
  subject_template = '[SLTK] Usuário desativado — {{email}}',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>O usuário <strong>{{email}}</strong> foi desativado e não pode mais acessar o sistema.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Usuário</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{email}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Papel</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{papel}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Desativado por</td><td style="padding:4px 0;font-size:14px;font-weight:500;color:#b91c1c;">{{usuario}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Desativado em</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data}}</td></tr>
    </table>
  </td></tr>
</table><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0;">
  <tr><td style="padding:10px 14px;border-left:3px solid #0f172a;background:#f1f5f9;border-radius:0 6px 6px 0;">
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#334155;">Motivo</div>
    <div style="margin-top:4px;font-size:14px;color:#0f172a;">{{motivo}}</div>
  </td></tr>
</table><p style="margin:4px 0 0 0;color:#64748b;font-size:13px;">Reatribua chamados, projetos e pendências que estavam sob responsabilidade dele.</p>'
WHERE event_key = 'usuario.desativado';

UPDATE email_event_config SET
  subject_template = '[SLTK] Senha redefinida — {{email}}',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>A senha do usuário <strong>{{email}}</strong> foi redefinida por um administrador.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Usuário</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{email}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Redefinida por</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{usuario}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Data</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data}}</td></tr>
    </table>
  </td></tr>
</table><p style="margin:4px 0 0 0;color:#64748b;font-size:13px;">O usuário receberá as instruções de acesso separadamente. Se esta ação não foi solicitada, contate o time de segurança.</p>'
WHERE event_key = 'usuario.senha_redefinida';

UPDATE email_event_config SET
  subject_template = '[SLTK] Permissão alterada — {{modulo}}',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>Uma configuração de permissão foi ajustada no painel administrativo.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Módulo</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{modulo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Papel</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{papel}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Alteração</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{alteracao}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Alterado por</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{ator}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Alterado em</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data}}</td></tr>
    </table>
  </td></tr>
</table><p style="margin:4px 0 0 0;color:#64748b;font-size:13px;">Confira a matriz de permissões e valide o comportamento efetivo com um usuário de teste.</p>'
WHERE event_key = 'admin.permissao_alterada';

UPDATE email_event_config SET
  subject_template = '[SLTK] Auditoria exportada em CSV',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>O log de auditoria foi exportado em CSV.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Exportado por</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{ator}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Filtro aplicado</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{filtro}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Linhas exportadas</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{linhas}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Data</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data}}</td></tr>
    </table>
  </td></tr>
</table><p style="margin:4px 0 0 0;color:#64748b;font-size:13px;">Guarde o arquivo em local seguro — o conteúdo pode incluir dados sensíveis do sistema.</p>'
WHERE event_key = 'audit.export_csv';

UPDATE email_event_config SET
  subject_template = '[SLTK] Nova mensagem de contato — {{assunto}}',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>Uma nova mensagem chegou pelo formulário público do site.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Nome</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{nome}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">E-mail</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{email}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Empresa</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{empresa}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Telefone</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{telefone}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Assunto</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{assunto}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Recebida em</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data}}</td></tr>
    </table>
  </td></tr>
</table><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0;">
  <tr><td style="padding:10px 14px;border-left:3px solid #0f172a;background:#f1f5f9;border-radius:0 6px 6px 0;">
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#334155;">Mensagem</div>
    <div style="margin-top:4px;font-size:14px;color:#0f172a;">{{mensagem}}</div>
  </td></tr>
</table><p style="margin:4px 0 0 0;color:#64748b;font-size:13px;">Responda ao lead o quanto antes e registre a interação como oportunidade no comercial se aplicável.</p>'
WHERE event_key = 'contato.mensagem_recebida';

UPDATE email_event_config SET
  subject_template = '[SLTK] Nova RFQ pública — {{tipo}} ({{empresa}})',
  body_template = '<p>Olá {{destinatario_nome}},</p>
<p>Uma nova solicitação de cotação foi recebida pelo site público.</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:12px 0;border:1px solid #e2e8f0;border-radius:8px;background:#f8fafc;">
  <tr><td style="padding:10px 14px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Tipo</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{tipo}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Empresa</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{empresa}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Contato</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{nome}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">E-mail</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{email}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Telefone</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{telefone}}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;font-size:12px;color:#64748b;width:32%;">Recebida em</td><td style="padding:4px 0;font-size:14px;font-weight:500;">{{data}}</td></tr>
    </table>
  </td></tr>
</table><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0;">
  <tr><td style="padding:10px 14px;border-left:3px solid #0f172a;background:#f1f5f9;border-radius:0 6px 6px 0;">
    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#334155;">Resumo do pedido</div>
    <div style="margin-top:4px;font-size:14px;color:#0f172a;">{{resumo}}</div>
  </td></tr>
</table><div style="margin:12px 0;font-size:12px;font-weight:600;color:#334155;">Próximos passos</div>
<ul style="margin:0;padding-left:18px;font-size:14px;color:#0f172a;">
  <li>Triar a solicitação e criar oportunidade no comercial.</li>
  <li>Enviar retorno de recebimento ao contato em até 24h.</li>
  <li>Anexar documentos e especificações ao dossiê da RFQ.</li>
</ul>'
WHERE event_key = 'rfq_publico.submissao_recebida';
