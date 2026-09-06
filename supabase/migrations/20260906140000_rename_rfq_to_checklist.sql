-- Rename completo do conceito "RFQ" (checklist técnico comercial) para
-- "Checklist" no banco. A UI já mostra "Checklist" há um tempo; esta
-- migration alinha os nomes reais de tabela/coluna/evento por baixo.
--
-- Não mexe no lado de Compras (cotação a fornecedor) — isso é o conceito
-- categoria 2, tratado em migration separada com o sufixo "cotacao".
--
-- Índices e políticas de RLS mantêm o nome antigo (Postgres não exige
-- renomear para continuar funcionando — são referenciados por OID, não por
-- nome) — puramente cosmético, fora de escopo desta migration.

-- 1) Tabelas
ALTER TABLE public.rfq_formulario_tipo RENAME TO checklist_formulario_tipo;
ALTER TABLE public.rfq_formulario_link RENAME TO checklist_formulario_link;
ALTER TABLE public.rfq_submissao RENAME TO checklist_submissao;
ALTER TABLE public.rfq_submissao_anexo RENAME TO checklist_submissao_anexo;

-- 2) Colunas FK que apontavam para elas
ALTER TABLE public.processo_templates RENAME COLUMN rfq_tipo_id TO checklist_tipo_id;
ALTER TABLE public.oportunidades RENAME COLUMN rfq_submissao_id TO checklist_submissao_id;

-- 3) Trigger de notificação (texto + nomes)
CREATE OR REPLACE FUNCTION public.tg_notify_form_checklist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_admins_managers_form(
    'Novo checklist técnico recebido',
    COALESCE(NEW.preenchido_por_nome, NEW.preenchido_por_email, 'Cliente') ||
      ' enviou um checklist técnico',
    'form_checklist',
    NEW.id,
    '/admin/formularios-recebidos'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_form_rfq ON public.checklist_submissao;
CREATE TRIGGER trg_notify_form_checklist
AFTER INSERT ON public.checklist_submissao
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_form_checklist();

DROP FUNCTION IF EXISTS public.tg_notify_form_rfq();

-- 4) Renomear o event_key do e-mail (é a PK de email_event_config, com FK
-- ON DELETE CASCADE em email_event_recipients — sem ON UPDATE CASCADE, então
-- um UPDATE direto na PK quebraria se houver linhas filhas. Copia para a
-- chave nova preservando o conteúdo configurado, depois remove a antiga.
INSERT INTO public.email_event_config
  (event_key, module, label, description, enabled, subject_template, body_template,
   create_calendar_event, calendar_duration_min, required_vars)
SELECT
  'form.checklist.recebida', module, label, description, enabled, subject_template, body_template,
  create_calendar_event, calendar_duration_min, required_vars
FROM public.email_event_config
WHERE event_key = 'form.rfq.recebida'
ON CONFLICT (event_key) DO NOTHING;

INSERT INTO public.email_event_recipients (event_key, role, mode)
SELECT 'form.checklist.recebida', role, mode
FROM public.email_event_recipients
WHERE event_key = 'form.rfq.recebida'
ON CONFLICT DO NOTHING;

DELETE FROM public.email_event_config WHERE event_key = 'form.rfq.recebida';
-- email_event_recipients das linhas antigas já caem junto (ON DELETE CASCADE).

-- 5) form_inbox_status.entity_type = 'rfq' -> 'checklist' (é parte da PK
-- composta (entity_type, entity_id) e tem CHECK constraint — solta a
-- constraint antiga antes do UPDATE, depois recria já com o valor novo.
ALTER TABLE public.form_inbox_status
  DROP CONSTRAINT IF EXISTS form_inbox_status_entity_type_check;

UPDATE public.form_inbox_status SET entity_type = 'checklist' WHERE entity_type = 'rfq';

ALTER TABLE public.form_inbox_status
  ADD CONSTRAINT form_inbox_status_entity_type_check
  CHECK (entity_type IN ('contato','entrevista','checklist'));
