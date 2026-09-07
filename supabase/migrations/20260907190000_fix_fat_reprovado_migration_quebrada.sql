-- A migration 20260906120000_fat_reprovado.sql tinha um erro de digitação:
-- o INSERT em email_event_recipients usava a coluna "kind", mas a tabela
-- real tem "mode" (toda outra migration do repo usa "mode" corretamente).
-- Migrations do Supabase rodam em transação por arquivo, então esse erro
-- de SQL muito provavelmente reverteu a migration inteira -- incluindo o
-- ALTER TABLE que adiciona reprovado_em/reprovado_por/motivo_reprovacao,
-- que vem ANTES do INSERT quebrado no mesmo arquivo. Confirmado: essas 3
-- colunas não aparecem em src/integrations/supabase/types.ts (schema real).
-- Resultado prático: reprovarFat() grava direto nessas colunas inexistentes
-- -- todo clique em "Reprovar" um FAT falha com erro do Postgres hoje.
--
-- Esta migration não edita a antiga (nunca editar uma migration já
-- aplicada) -- ela refaz o trabalho de forma idempotente.

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

INSERT INTO public.email_event_recipients (event_key, role, mode) VALUES
  ('fat.reprovado', 'engineer', 'to'),
  ('fat.reprovado', 'manager', 'cc'),
  ('fat.reprovado', 'assembly', 'cc')
ON CONFLICT DO NOTHING;

-- Reconstrói tg_fat_audit() a partir da definição atual (7 colunas rastreadas
-- + public.audit_actor() no lugar de auth.uid(), já aplicado a esta função
-- em 20260820200000_auditoria_autor_e_cobertura.sql) acrescentando as 3
-- colunas novas à lista rastreada.
CREATE OR REPLACE FUNCTION public.tg_fat_audit()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE col text;
  cols text[] := ARRAY['status','progresso','homologado_em','observacoes_gerais','inspetor_id','testemunha_nome','deleted_at','reprovado_em','reprovado_por','motivo_reprovacao'];
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (user_id, table_name, record_id, action, new_value)
    VALUES (public.audit_actor(), 'fat_relatorios', NEW.id::text, 'INSERT', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    FOREACH col IN ARRAY cols LOOP
      IF to_jsonb(NEW) -> col IS DISTINCT FROM to_jsonb(OLD) -> col THEN
        INSERT INTO public.audit_log (user_id, table_name, record_id, action, field_changed, old_value, new_value)
        VALUES (public.audit_actor(), 'fat_relatorios', NEW.id::text, 'UPDATE', col, to_jsonb(OLD) -> col, to_jsonb(NEW) -> col);
      END IF;
    END LOOP;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (user_id, table_name, record_id, action, old_value)
    VALUES (public.audit_actor(), 'fat_relatorios', OLD.id::text, 'DELETE', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
