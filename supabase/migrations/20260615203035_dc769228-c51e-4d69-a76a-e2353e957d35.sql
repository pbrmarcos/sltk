
-- ============ ENUMS ============
CREATE TYPE public.lifecycle_stage AS ENUM ('suspect','prospect','cliente');
CREATE TYPE public.pipeline_stage AS ENUM ('novo','qualificado','proposta','negociacao','ganho','perdido');

-- ============ SEQUENCE ============
CREATE SEQUENCE public.oportunidades_codigo_seq START 1;

-- ============ TABLE: oportunidades ============
CREATE TABLE public.oportunidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text UNIQUE,
  titulo text NOT NULL,
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  nome_lead text,
  empresa_lead text,
  email text,
  telefone text,
  origem_id uuid REFERENCES public.lead_origens(id) ON DELETE SET NULL,
  segmento_id uuid REFERENCES public.segmentos(id) ON DELETE SET NULL,
  responsavel_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  valor_estimado numeric(14,2),
  probabilidade int NOT NULL DEFAULT 10 CHECK (probabilidade BETWEEN 0 AND 100),
  expected_close_date date,
  lifecycle_stage public.lifecycle_stage NOT NULL DEFAULT 'suspect',
  pipeline_stage public.pipeline_stage NOT NULL DEFAULT 'novo',
  stage_entered_at timestamptz NOT NULL DEFAULT now(),
  lost_reason text,
  processo_id uuid REFERENCES public.processos(id) ON DELETE SET NULL,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id),
  updated_by uuid REFERENCES public.profiles(id),
  deleted_at timestamptz
);

CREATE INDEX idx_oportunidades_pipeline_stage ON public.oportunidades(pipeline_stage) WHERE deleted_at IS NULL;
CREATE INDEX idx_oportunidades_lifecycle ON public.oportunidades(lifecycle_stage) WHERE deleted_at IS NULL;
CREATE INDEX idx_oportunidades_responsavel ON public.oportunidades(responsavel_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_oportunidades_cliente ON public.oportunidades(cliente_id) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.oportunidades TO authenticated;
GRANT ALL ON public.oportunidades TO service_role;
GRANT USAGE ON SEQUENCE public.oportunidades_codigo_seq TO authenticated, service_role;

-- ============ TABLE: oportunidade_stage_history ============
CREATE TABLE public.oportunidade_stage_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oportunidade_id uuid NOT NULL REFERENCES public.oportunidades(id) ON DELETE CASCADE,
  from_lifecycle public.lifecycle_stage,
  to_lifecycle public.lifecycle_stage NOT NULL,
  from_pipeline public.pipeline_stage,
  to_pipeline public.pipeline_stage NOT NULL,
  changed_by uuid REFERENCES public.profiles(id),
  changed_at timestamptz NOT NULL DEFAULT now(),
  duration_seconds bigint
);

CREATE INDEX idx_opp_history_opp ON public.oportunidade_stage_history(oportunidade_id);

GRANT SELECT, INSERT ON public.oportunidade_stage_history TO authenticated;
GRANT ALL ON public.oportunidade_stage_history TO service_role;

-- ============ FUNCTIONS / TRIGGERS ============

-- Derive lifecycle_stage from pipeline_stage
CREATE OR REPLACE FUNCTION public.derive_lifecycle(_stage public.pipeline_stage)
RETURNS public.lifecycle_stage
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE _stage
    WHEN 'novo' THEN 'suspect'::public.lifecycle_stage
    WHEN 'qualificado' THEN 'prospect'::public.lifecycle_stage
    WHEN 'proposta' THEN 'prospect'::public.lifecycle_stage
    WHEN 'negociacao' THEN 'prospect'::public.lifecycle_stage
    WHEN 'ganho' THEN 'cliente'::public.lifecycle_stage
    WHEN 'perdido' THEN 'prospect'::public.lifecycle_stage
  END
$$;

-- Codigo + defaults
CREATE OR REPLACE FUNCTION public.tg_oportunidades_set_codigo()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'OPP-' || to_char(now(),'YYYY') || '-'
      || lpad(nextval('public.oportunidades_codigo_seq')::text, 4, '0');
  END IF;
  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  NEW.lifecycle_stage := public.derive_lifecycle(NEW.pipeline_stage);
  RETURN NEW;
END $$;

CREATE TRIGGER tg_oportunidades_set_codigo_biu
BEFORE INSERT ON public.oportunidades
FOR EACH ROW EXECUTE FUNCTION public.tg_oportunidades_set_codigo();

-- Update lifecycle + stage_entered_at + updated_by + history
CREATE OR REPLACE FUNCTION public.tg_oportunidades_before_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  IF NEW.pipeline_stage IS DISTINCT FROM OLD.pipeline_stage THEN
    NEW.lifecycle_stage := public.derive_lifecycle(NEW.pipeline_stage);
    NEW.stage_entered_at := now();
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER tg_oportunidades_before_update_bu
BEFORE UPDATE ON public.oportunidades
FOR EACH ROW EXECUTE FUNCTION public.tg_oportunidades_before_update();

-- History after stage change
CREATE OR REPLACE FUNCTION public.tg_oportunidades_after_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.pipeline_stage IS DISTINCT FROM OLD.pipeline_stage THEN
    INSERT INTO public.oportunidade_stage_history
      (oportunidade_id, from_lifecycle, to_lifecycle, from_pipeline, to_pipeline, changed_by, duration_seconds)
    VALUES
      (NEW.id, OLD.lifecycle_stage, NEW.lifecycle_stage, OLD.pipeline_stage, NEW.pipeline_stage,
       auth.uid(),
       EXTRACT(EPOCH FROM (now() - OLD.stage_entered_at))::bigint);
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER tg_oportunidades_after_update_au
AFTER UPDATE ON public.oportunidades
FOR EACH ROW EXECUTE FUNCTION public.tg_oportunidades_after_update();

-- Audit log
CREATE OR REPLACE FUNCTION public.tg_oportunidades_audit()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  col text;
  cols text[] := ARRAY['titulo','cliente_id','responsavel_id','pipeline_stage','lifecycle_stage','probabilidade','valor_estimado','lost_reason','processo_id','deleted_at'];
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
END $$;

CREATE TRIGGER tg_oportunidades_audit_aiud
AFTER INSERT OR UPDATE OR DELETE ON public.oportunidades
FOR EACH ROW EXECUTE FUNCTION public.tg_oportunidades_audit();

-- ============ RLS ============
ALTER TABLE public.oportunidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oportunidade_stage_history ENABLE ROW LEVEL SECURITY;

-- Admin/manager: tudo (não-deletado)
CREATE POLICY "opp admin/manager full" ON public.oportunidades
FOR ALL TO authenticated
USING (
  deleted_at IS NULL AND (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'manager'::app_role)
  )
)
WITH CHECK (
  public.has_role(auth.uid(),'admin'::app_role)
  OR public.has_role(auth.uid(),'manager'::app_role)
);

-- Sales: vê e edita suas próprias
CREATE POLICY "opp sales own" ON public.oportunidades
FOR ALL TO authenticated
USING (
  deleted_at IS NULL
  AND public.has_role(auth.uid(),'sales'::app_role)
  AND responsavel_id = auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(),'sales'::app_role)
  AND responsavel_id = auth.uid()
);

-- Engineer/Production: leitura de oportunidades ganhas convertidas
CREATE POLICY "opp engineer/production read won" ON public.oportunidades
FOR SELECT TO authenticated
USING (
  deleted_at IS NULL
  AND pipeline_stage = 'ganho'
  AND processo_id IS NOT NULL
  AND (
    public.has_role(auth.uid(),'engineer'::app_role)
    OR public.has_role(auth.uid(),'production'::app_role)
  )
);

-- History policies
CREATE POLICY "opp history admin/manager" ON public.oportunidade_stage_history
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR public.has_role(auth.uid(),'manager'::app_role)
);

CREATE POLICY "opp history sales own" ON public.oportunidade_stage_history
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'sales'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.oportunidades o
    WHERE o.id = oportunidade_id AND o.responsavel_id = auth.uid()
  )
);

CREATE POLICY "opp history insert system" ON public.oportunidade_stage_history
FOR INSERT TO authenticated
WITH CHECK (true);
