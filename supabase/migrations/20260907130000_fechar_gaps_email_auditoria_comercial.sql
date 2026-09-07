-- Fecha gaps de e-mail/auditoria encontrados na auditoria do ciclo Comercial:
-- 1) form.checklist.recebida nunca foi ativado (herdou enabled=false de
--    form.rfq.recebida desde que foi criado) — o código que dispara esse
--    e-mail já está correto, só faltava ligar.
-- 2) checklist_submissao_id (vínculo checklist -> oportunidade) não estava
--    na lista de colunas rastreadas pelo trigger de auditoria de
--    oportunidades — reconstituído a partir da definição viva atual da
--    função (15 colunas + public.audit_actor(), aplicado por
--    20260820200000_auditoria_autor_e_cobertura.sql), só adicionando a
--    coluna nova ao array.
-- 3) Dois e-mails novos usados pelo código desta rodada precisam existir em
--    email_event_config antes do primeiro disparo — se o event_key não
--    existe, dispatchEmail() só faz console.error e nem grava em
--    email_send_log (falha totalmente invisível pro admin).

UPDATE public.email_event_config SET enabled = true WHERE event_key = 'form.checklist.recebida';

CREATE OR REPLACE FUNCTION public.tg_oportunidades_audit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  col text;
  cols text[] := ARRAY['titulo','cliente_id','responsavel_id','pipeline_stage','lifecycle_stage','probabilidade','valor_estimado','lost_reason','lost_at','lost_by','restored_at','restored_by','lost_count','processo_id','deleted_at','checklist_submissao_id'];
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (user_id, table_name, record_id, action, new_value)
    VALUES (public.audit_actor(), 'oportunidades', NEW.id::text, 'INSERT', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    FOREACH col IN ARRAY cols LOOP
      IF to_jsonb(NEW)->col IS DISTINCT FROM to_jsonb(OLD)->col THEN
        INSERT INTO public.audit_log (user_id, table_name, record_id, action, field_changed, old_value, new_value)
        VALUES (public.audit_actor(), 'oportunidades', NEW.id::text, 'UPDATE', col, to_jsonb(OLD)->col, to_jsonb(NEW)->col);
      END IF;
    END LOOP;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (user_id, table_name, record_id, action, old_value)
    VALUES (public.audit_actor(), 'oportunidades', OLD.id::text, 'DELETE', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END $function$;

INSERT INTO public.email_event_config
  (event_key, module, label, description, enabled, subject_template, body_template, create_calendar_event, calendar_duration_min, required_vars)
VALUES
  ('checklist.link_enviado', 'comercial', 'Checklist enviado por e-mail', 'Sales enviou o link do checklist técnico direto pro contato do cliente.',
   true, '[Solutek] Checklist técnico — {{cliente_nome}}',
   '<p>Olá {{destinatario_nome}},</p><p>Segue o link do checklist técnico para preenchimento:</p><p><a href="{{link}}">Preencher checklist</a></p><p>Enviado por {{usuario}}.</p>',
   false, null, ARRAY['cliente_nome','link','usuario']::text[]),
  ('cliente.promovido_ativo', 'comercial', 'Cliente promovido a ativo', 'Um prospect virou cliente ativo pela conversão de oportunidade.',
   true, '[Solutek] {{cliente_nome}} agora é cliente ativo',
   '<p>O cadastro de <strong>{{cliente_nome}}</strong> foi promovido para <strong>ativo</strong> ao converter uma oportunidade.</p><p><a href="{{link}}">Ver ficha do cliente</a></p>',
   false, null, ARRAY['cliente_nome','link']::text[])
ON CONFLICT (event_key) DO NOTHING;

INSERT INTO public.email_event_recipients (event_key, role, mode)
VALUES
  ('checklist.link_enviado', 'sales', 'to'),
  ('checklist.link_enviado', 'manager', 'cc'),
  ('cliente.promovido_ativo', 'sales', 'to'),
  ('cliente.promovido_ativo', 'manager', 'cc'),
  ('cliente.promovido_ativo', 'admin', 'cc')
ON CONFLICT DO NOTHING;
