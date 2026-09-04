ALTER TABLE public.oportunidades
  ADD COLUMN IF NOT EXISTS lost_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS lost_by uuid,
  ADD COLUMN IF NOT EXISTS restored_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS restored_by uuid,
  ADD COLUMN IF NOT EXISTS lost_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.tg_oportunidades_before_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();

  IF NEW.pipeline_stage IS DISTINCT FROM OLD.pipeline_stage THEN
    NEW.lifecycle_stage := public.derive_lifecycle(NEW.pipeline_stage);
    NEW.stage_entered_at := now();
  END IF;

  IF NEW.pipeline_stage = 'perdido'::pipeline_stage
     AND OLD.pipeline_stage IS DISTINCT FROM 'perdido'::pipeline_stage THEN
    NEW.lost_at := now();
    NEW.lost_by := auth.uid();
    NEW.lost_count := COALESCE(OLD.lost_count, 0) + 1;
    NEW.restored_at := NULL;
    NEW.restored_by := NULL;
  END IF;

  IF OLD.pipeline_stage = 'perdido'::pipeline_stage
     AND NEW.pipeline_stage IS DISTINCT FROM 'perdido'::pipeline_stage THEN
    NEW.restored_at := now();
    NEW.restored_by := auth.uid();
  END IF;

  RETURN NEW;
END $function$;

CREATE OR REPLACE FUNCTION public.tg_oportunidades_audit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  col text;
  cols text[] := ARRAY['titulo','cliente_id','responsavel_id','pipeline_stage','lifecycle_stage','probabilidade','valor_estimado','lost_reason','lost_at','lost_by','restored_at','restored_by','lost_count','processo_id','deleted_at'];
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (user_id, table_name, record_id, action, new_value)
    VALUES (auth.uid(), 'oportunidades', NEW.id::text, 'INSERT', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    FOREACH col IN ARRAY cols LOOP
      IF to_jsonb(NEW)->col IS DISTINCT FROM to_jsonb(OLD)->col THEN
        INSERT INTO public.audit_log (user_id, table_name, record_id, action, field_changed, old_value, new_value)
        VALUES (auth.uid(), 'oportunidades', NEW.id::text, 'UPDATE', col, to_jsonb(OLD)->col, to_jsonb(NEW)->col);
      END IF;
    END LOOP;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (user_id, table_name, record_id, action, old_value)
    VALUES (auth.uid(), 'oportunidades', OLD.id::text, 'DELETE', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END $function$;