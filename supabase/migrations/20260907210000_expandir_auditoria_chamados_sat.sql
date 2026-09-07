-- tg_chamados_audit() só grava audit_log quando muda "status" -- mudança de
-- prioridade (ação de impacto real na operação) só ia pra chamado_eventos,
-- que a tela de Auditoria do admin não lê. tg_sat_relatorio_audit() não
-- rastreava tecnico_ids/assinatura_tecnico/assinatura_cliente -- a própria
-- assinatura final do SAT (que fecha o atendimento) não deixava rastro no
-- audit_log, só a mudança de status pra "assinado".
--
-- Reconstrói os dois triggers a partir da definição atual, usando
-- public.audit_actor() no lugar de auth.uid() (ambos já fazem parte do
-- batch de correção de autor de 20260820200000_auditoria_autor_e_cobertura.sql).

CREATE OR REPLACE FUNCTION public.tg_chamados_audit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (user_id, table_name, record_id, action, new_value)
    VALUES (public.audit_actor(), 'chamados', NEW.id::text, 'INSERT', to_jsonb(NEW));
    INSERT INTO public.chamado_eventos (chamado_id, tipo, to_status, autor_nome, meta)
    VALUES (NEW.id, 'criado', NEW.status, COALESCE(NEW.visitante_nome,'sistema'),
      jsonb_build_object('origem', NEW.origem));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      INSERT INTO public.audit_log (user_id, table_name, record_id, action, field_changed, old_value, new_value)
      VALUES (public.audit_actor(), 'chamados', NEW.id::text, 'UPDATE', 'status', to_jsonb(OLD.status), to_jsonb(NEW.status));
      INSERT INTO public.chamado_eventos (chamado_id, tipo, from_status, to_status, autor_id, autor_nome)
      VALUES (NEW.id, 'status_change', OLD.status, NEW.status, public.audit_actor(),
        (SELECT COALESCE(full_name, email, 'Sistema') FROM public.profiles WHERE id = public.audit_actor()));
    END IF;
    IF NEW.prioridade IS DISTINCT FROM OLD.prioridade THEN
      INSERT INTO public.audit_log (user_id, table_name, record_id, action, field_changed, old_value, new_value)
      VALUES (public.audit_actor(), 'chamados', NEW.id::text, 'UPDATE', 'prioridade', to_jsonb(OLD.prioridade), to_jsonb(NEW.prioridade));
    END IF;
    IF NEW.atendente_id IS DISTINCT FROM OLD.atendente_id AND NEW.atendente_id IS NOT NULL THEN
      INSERT INTO public.chamado_eventos (chamado_id, tipo, autor_id, autor_nome)
      VALUES (NEW.id, 'assumido', NEW.atendente_id, NEW.atendente_nome);
    END IF;
    IF NEW.equipamento_id IS DISTINCT FROM OLD.equipamento_id AND NEW.equipamento_id IS NOT NULL THEN
      INSERT INTO public.chamado_eventos (chamado_id, tipo, autor_id, autor_nome, meta)
      VALUES (NEW.id, 'vinculado_equipamento', public.audit_actor(),
        (SELECT COALESCE(full_name, email, 'Sistema') FROM public.profiles WHERE id = public.audit_actor()),
        jsonb_build_object('equipamento_id', NEW.equipamento_id));
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.tg_sat_relatorio_audit()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE col text;
  cols text[] := ARRAY['status','cliente_id','processo_id','periodo_de','periodo_ate','dados','pdf_drive_view_url','deleted_at','tecnico_ids','assinatura_tecnico','assinatura_cliente'];
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (user_id, table_name, record_id, action, new_value)
    VALUES (public.audit_actor(), 'sat_relatorio', NEW.id::text, 'INSERT', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    FOREACH col IN ARRAY cols LOOP
      IF to_jsonb(NEW)->col IS DISTINCT FROM to_jsonb(OLD)->col THEN
        INSERT INTO public.audit_log (user_id, table_name, record_id, action, field_changed, old_value, new_value)
        VALUES (public.audit_actor(), 'sat_relatorio', NEW.id::text, 'UPDATE', col, to_jsonb(OLD)->col, to_jsonb(NEW)->col);
      END IF;
    END LOOP;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (user_id, table_name, record_id, action, old_value)
    VALUES (public.audit_actor(), 'sat_relatorio', OLD.id::text, 'DELETE', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
