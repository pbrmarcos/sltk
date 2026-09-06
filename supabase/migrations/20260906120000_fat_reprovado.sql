-- Fluxo de reprovação de FAT: o status "reprovado" já existia no enum e no
-- rótulo da UI, mas nenhuma função de servidor conseguia de fato atribuí-lo.
-- Adiciona os campos de rastreio (quem, quando, por quê) e reativa o
-- template de e-mail "fat.reprovado" (existia desde 20260721120000/
-- 20260722160000, foi removido em 20260905120000_email_events_cleanup.sql
-- por estar órfão na época — agora tem dispatch de verdade em fat.functions.ts).

ALTER TABLE public.fat_relatorios
  ADD COLUMN IF NOT EXISTS reprovado_em timestamptz,
  ADD COLUMN IF NOT EXISTS reprovado_por uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS motivo_reprovacao text;

INSERT INTO public.email_event_config (
  event_key, module, label, description, subject_template, body_template,
  create_calendar_event, calendar_duration_min
) VALUES (
  'fat.reprovado',
  'qualidade',
  'FAT reprovado',
  'Não conformidade impede a homologação.',
  '[SLTK] FAT reprovado — {{equipamento}} (ajustes necessários)',
  '<p>Olá {{destinatario_nome}},</p>
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
</ul>',
  false,
  null
)
ON CONFLICT (event_key) DO UPDATE SET
  module = EXCLUDED.module,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  subject_template = EXCLUDED.subject_template,
  body_template = EXCLUDED.body_template,
  create_calendar_event = EXCLUDED.create_calendar_event,
  calendar_duration_min = EXCLUDED.calendar_duration_min;

INSERT INTO public.email_event_recipients (event_key, role, kind) VALUES
  ('fat.reprovado', 'engineer', 'to'),
  ('fat.reprovado', 'manager', 'cc'),
  ('fat.reprovado', 'assembly', 'cc')
ON CONFLICT DO NOTHING;
