
-- Enum de categoria de perda
DO $$ BEGIN
  CREATE TYPE public.lost_category AS ENUM (
    'preco','prazo','concorrente','escopo','cliente_desistiu','tecnico','outro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Colunas de Lost / Restore
ALTER TABLE public.processos
  ADD COLUMN IF NOT EXISTS lost_at timestamptz,
  ADD COLUMN IF NOT EXISTS lost_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lost_reason text,
  ADD COLUMN IF NOT EXISTS lost_category public.lost_category,
  ADD COLUMN IF NOT EXISTS restored_at timestamptz,
  ADD COLUMN IF NOT EXISTS restored_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lost_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_processos_lost_at ON public.processos (lost_at) WHERE lost_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_processos_restored_at ON public.processos (restored_at) WHERE restored_at IS NOT NULL;

-- Bloqueia mudanças de stage/progresso/risco enquanto arquivado.
CREATE OR REPLACE FUNCTION public.tg_processos_block_when_lost()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.lost_at IS NOT NULL AND NEW.lost_at IS NOT NULL THEN
    IF NEW.stage IS DISTINCT FROM OLD.stage
       OR NEW.progresso IS DISTINCT FROM OLD.progresso
       OR NEW.risco IS DISTINCT FROM OLD.risco THEN
      RAISE EXCEPTION 'Processo arquivado: restaure antes de alterar estágio, progresso ou risco.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tg_processos_block_when_lost ON public.processos;
CREATE TRIGGER tg_processos_block_when_lost
BEFORE UPDATE ON public.processos
FOR EACH ROW EXECUTE FUNCTION public.tg_processos_block_when_lost();

-- Auditoria estendida (substitui função existente preservando comportamento + novos campos)
CREATE OR REPLACE FUNCTION public.tg_processos_audit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  col text;
  cols text[] := ARRAY[
    'titulo','cliente_id','pilar_id','stage','progresso','risco','valor','previsao','deleted_at',
    'lost_at','lost_by','lost_reason','lost_category','restored_at','restored_by','lost_count'
  ];
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (user_id, table_name, record_id, action, new_value)
    VALUES (auth.uid(), 'processos', NEW.id::text, 'INSERT', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    FOREACH col IN ARRAY cols LOOP
      IF to_jsonb(NEW) -> col IS DISTINCT FROM to_jsonb(OLD) -> col THEN
        INSERT INTO public.audit_log (user_id, table_name, record_id, action, field_changed, old_value, new_value)
        VALUES (auth.uid(), 'processos', NEW.id::text, 'UPDATE', col, to_jsonb(OLD) -> col, to_jsonb(NEW) -> col);
      END IF;
    END LOOP;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (user_id, table_name, record_id, action, old_value)
    VALUES (auth.uid(), 'processos', OLD.id::text, 'DELETE', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
