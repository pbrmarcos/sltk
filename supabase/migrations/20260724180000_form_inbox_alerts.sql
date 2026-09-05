-- Alertas automáticos in-app (+ evento de e-mail opcional) para admin/manager
-- quando um novo formulário do site é recebido: Contato, Entrevista, RFQ.
--
-- 1) Helper que insere 1 notificação por admin/manager ativo.
-- 2) Triggers em chamados (contato_site), entrevistas (respondida) e rfq_submissao.
-- 3) Registra 2 eventos de e-mail novos (contato/rfq) em email_event_config,
--    desabilitados por default. O admin ativa em /admin/emails se quiser.
--    Entrevista já usa o evento existente "entrevista.respondida".

-- ─────────────────────────────────────────────────────────────
-- Helper
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_admins_managers_form(
  p_titulo text,
  p_mensagem text,
  p_origem text,
  p_origem_id uuid,
  p_link text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notificacoes_usuario (user_id, origem, origem_id, titulo, mensagem, link)
  SELECT DISTINCT ur.user_id, p_origem, p_origem_id, p_titulo, p_mensagem, p_link
    FROM public.user_roles ur
   WHERE ur.role IN ('admin','manager');
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- Chamados: origem contato_site
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_notify_form_contato()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.origem = 'contato_site' THEN
    PERFORM public.notify_admins_managers_form(
      'Novo contato do site',
      COALESCE(NEW.visitante_nome,'Visitante') ||
        CASE WHEN NEW.assunto IS NOT NULL THEN ' — ' || NEW.assunto ELSE '' END,
      'form_contato',
      NEW.id,
      '/admin/formularios-recebidos'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_form_contato ON public.chamados;
CREATE TRIGGER trg_notify_form_contato
AFTER INSERT ON public.chamados
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_form_contato();

-- ─────────────────────────────────────────────────────────────
-- Entrevistas: quando respondida_em passa de NULL → NOT NULL
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_notify_form_entrevista()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.respondida_em IS NOT NULL AND OLD.respondida_em IS NULL THEN
    PERFORM public.notify_admins_managers_form(
      'Entrevista respondida',
      COALESCE(NEW.lead_nome, NEW.lead_empresa, NEW.codigo, 'Entrevista') ||
        ' concluiu o questionário',
      'form_entrevista',
      NEW.id,
      '/admin/formularios-recebidos'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_form_entrevista ON public.entrevistas;
CREATE TRIGGER trg_notify_form_entrevista
AFTER UPDATE OF respondida_em ON public.entrevistas
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_form_entrevista();

-- ─────────────────────────────────────────────────────────────
-- RFQ: nova submissão
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.tg_notify_form_rfq()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.notify_admins_managers_form(
    'Nova submissão de RFQ',
    COALESCE(NEW.preenchido_por_nome, NEW.preenchido_por_email, 'Cliente') ||
      ' enviou uma RFQ',
    'form_rfq',
    NEW.id,
    '/admin/formularios-recebidos'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_form_rfq ON public.rfq_submissao;
CREATE TRIGGER trg_notify_form_rfq
AFTER INSERT ON public.rfq_submissao
FOR EACH ROW EXECUTE FUNCTION public.tg_notify_form_rfq();

-- ─────────────────────────────────────────────────────────────
-- E-mails opcionais (desabilitados por padrão) — admin ativa em /admin/emails
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.email_event_config
  (event_key, module, label, description, enabled, subject_template, body_template)
VALUES
  (
    'form.contato.recebido',
    'admin',
    'Formulário de contato recebido',
    'Alerta para admin/manager quando o formulário público de contato é enviado.',
    false,
    'Novo contato: {{nome}}',
    'Novo contato recebido no site.\n\nNome: {{nome}}\nE-mail: {{email}}\nAssunto: {{assunto}}\n\nAbra em: {{link}}'
  ),
  (
    'form.rfq.recebida',
    'admin',
    'RFQ recebida',
    'Alerta para admin/manager quando um cliente envia uma submissão de RFQ.',
    false,
    'Nova RFQ: {{cliente}}',
    'Nova submissão de RFQ recebida.\n\nCliente: {{cliente}}\nContato: {{nome}} <{{email}}>\nTipo: {{tipo}}\n\nAbra em: {{link}}'
  )
ON CONFLICT (event_key) DO NOTHING;

INSERT INTO public.email_event_recipients (event_key, role, mode) VALUES
  ('form.contato.recebido', 'admin',   'to'),
  ('form.contato.recebido', 'manager', 'cc'),
  ('form.rfq.recebida',     'admin',   'to'),
  ('form.rfq.recebida',     'manager', 'cc')
ON CONFLICT (event_key, role) DO NOTHING;
