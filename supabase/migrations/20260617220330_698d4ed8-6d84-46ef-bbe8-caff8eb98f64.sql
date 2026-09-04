
DO $$ BEGIN
  CREATE TYPE public.cliente_lifecycle AS ENUM ('suspect','prospect','cliente','inativo');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS lifecycle_stage public.cliente_lifecycle NOT NULL DEFAULT 'prospect',
  ADD COLUMN IF NOT EXISTS tornou_cliente_em timestamptz,
  ADD COLUMN IF NOT EXISTS oportunidades_abertas integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processos_ativos integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processos_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_ganho_total numeric(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ultimo_contato_em timestamptz;

CREATE INDEX IF NOT EXISTS clientes_lifecycle_idx
  ON public.clientes(lifecycle_stage) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.cliente_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  categoria text NOT NULL DEFAULT 'outro'
    CHECK (categoria IN ('contrato_social','cartao_cnpj','comprovante_endereco','certidao','procuracao','outro')),
  drive_file_id text NOT NULL,
  drive_view_url text,
  nome_final text NOT NULL,
  nome_original text,
  mime text,
  size_bytes bigint,
  user_id uuid REFERENCES auth.users(id),
  user_nome text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS cliente_documentos_cliente_idx
  ON public.cliente_documentos(cliente_id) WHERE deleted_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_documentos TO authenticated;
GRANT ALL ON public.cliente_documentos TO service_role;
ALTER TABLE public.cliente_documentos ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.cliente_interacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo text NOT NULL
    CHECK (tipo IN ('nota','email','ligacao','reuniao','tarefa','evento_sistema')),
  descricao text NOT NULL,
  payload jsonb,
  user_id uuid REFERENCES auth.users(id),
  user_nome text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS cliente_interacoes_cliente_idx
  ON public.cliente_interacoes(cliente_id, created_at DESC) WHERE deleted_at IS NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cliente_interacoes TO authenticated;
GRANT ALL ON public.cliente_interacoes TO service_role;
ALTER TABLE public.cliente_interacoes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_cliente(_cliente_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = _cliente_id
      AND c.deleted_at IS NULL
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'manager'::app_role)
        OR EXISTS (
          SELECT 1 FROM public.oportunidades o
          WHERE o.cliente_id = c.id AND o.deleted_at IS NULL
            AND (o.responsavel_id = auth.uid() OR o.created_by = auth.uid())
        )
        OR EXISTS (
          SELECT 1 FROM public.processos p
          WHERE p.cliente_id = c.id AND p.deleted_at IS NULL
            AND (p.pilar_id = auth.uid() OR p.created_by = auth.uid())
        )
      )
  )
$$;

DROP POLICY IF EXISTS "cliente_documentos_select" ON public.cliente_documentos;
CREATE POLICY "cliente_documentos_select" ON public.cliente_documentos
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.can_access_cliente(cliente_id));
DROP POLICY IF EXISTS "cliente_documentos_insert" ON public.cliente_documentos;
CREATE POLICY "cliente_documentos_insert" ON public.cliente_documentos
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_cliente(cliente_id) AND user_id = auth.uid());
DROP POLICY IF EXISTS "cliente_documentos_update" ON public.cliente_documentos;
CREATE POLICY "cliente_documentos_update" ON public.cliente_documentos
  FOR UPDATE TO authenticated
  USING (
    public.can_access_cliente(cliente_id)
    AND (public.has_role(auth.uid(),'admin'::app_role)
      OR public.has_role(auth.uid(),'manager'::app_role)
      OR user_id = auth.uid())
  );
DROP POLICY IF EXISTS "cliente_documentos_delete" ON public.cliente_documentos;
CREATE POLICY "cliente_documentos_delete" ON public.cliente_documentos
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'manager'::app_role)
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "cliente_interacoes_select" ON public.cliente_interacoes;
CREATE POLICY "cliente_interacoes_select" ON public.cliente_interacoes
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.can_access_cliente(cliente_id));
DROP POLICY IF EXISTS "cliente_interacoes_insert" ON public.cliente_interacoes;
CREATE POLICY "cliente_interacoes_insert" ON public.cliente_interacoes
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_cliente(cliente_id));
DROP POLICY IF EXISTS "cliente_interacoes_update" ON public.cliente_interacoes;
CREATE POLICY "cliente_interacoes_update" ON public.cliente_interacoes
  FOR UPDATE TO authenticated
  USING (
    public.can_access_cliente(cliente_id)
    AND (public.has_role(auth.uid(),'admin'::app_role)
      OR public.has_role(auth.uid(),'manager'::app_role)
      OR user_id = auth.uid())
  );
DROP POLICY IF EXISTS "cliente_interacoes_delete" ON public.cliente_interacoes;
CREATE POLICY "cliente_interacoes_delete" ON public.cliente_interacoes
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.has_role(auth.uid(),'manager'::app_role)
    OR user_id = auth.uid()
  );

DROP TRIGGER IF EXISTS set_updated_at_cliente_documentos ON public.cliente_documentos;
CREATE TRIGGER set_updated_at_cliente_documentos
  BEFORE UPDATE ON public.cliente_documentos
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
DROP TRIGGER IF EXISTS set_updated_at_cliente_interacoes ON public.cliente_interacoes;
CREATE TRIGGER set_updated_at_cliente_interacoes
  BEFORE UPDATE ON public.cliente_interacoes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- "ativo" no enum processo_stage não existe; usamos lost_at IS NULL como proxy de ativo
CREATE OR REPLACE FUNCTION public.refresh_cliente_metrics(_cliente_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_op_abertas int;
  v_proc_ativos int;
  v_proc_total int;
  v_valor_ganho numeric(18,2);
  v_primeiro_ganho timestamptz;
  v_novo_lifecycle public.cliente_lifecycle;
  v_status_atual text;
BEGIN
  IF _cliente_id IS NULL THEN RETURN; END IF;

  SELECT COUNT(*) FILTER (WHERE o.pipeline_stage NOT IN ('ganho','perdido')),
         COALESCE(SUM(o.valor_estimado) FILTER (WHERE o.pipeline_stage = 'ganho'), 0),
         MIN(o.updated_at) FILTER (WHERE o.pipeline_stage = 'ganho')
    INTO v_op_abertas, v_valor_ganho, v_primeiro_ganho
  FROM public.oportunidades o
  WHERE o.cliente_id = _cliente_id AND o.deleted_at IS NULL;

  SELECT COUNT(*),
         COUNT(*) FILTER (WHERE p.lost_at IS NULL)
    INTO v_proc_total, v_proc_ativos
  FROM public.processos p
  WHERE p.cliente_id = _cliente_id AND p.deleted_at IS NULL;

  SELECT status INTO v_status_atual FROM public.clientes WHERE id = _cliente_id;

  v_novo_lifecycle := CASE
    WHEN v_status_atual = 'inativo' THEN 'inativo'::public.cliente_lifecycle
    WHEN v_proc_total > 0 THEN 'cliente'::public.cliente_lifecycle
    ELSE 'prospect'::public.cliente_lifecycle
  END;

  UPDATE public.clientes
     SET oportunidades_abertas = COALESCE(v_op_abertas,0),
         processos_ativos = COALESCE(v_proc_ativos,0),
         processos_total = COALESCE(v_proc_total,0),
         valor_ganho_total = COALESCE(v_valor_ganho,0),
         lifecycle_stage = v_novo_lifecycle,
         tornou_cliente_em = COALESCE(tornou_cliente_em, v_primeiro_ganho)
   WHERE id = _cliente_id;
END $$;

CREATE OR REPLACE FUNCTION public.tg_oportunidades_refresh_cliente()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_cliente_metrics(OLD.cliente_id);
    RETURN OLD;
  END IF;
  PERFORM public.refresh_cliente_metrics(NEW.cliente_id);
  IF TG_OP = 'UPDATE' AND OLD.cliente_id IS DISTINCT FROM NEW.cliente_id THEN
    PERFORM public.refresh_cliente_metrics(OLD.cliente_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS refresh_cliente_metrics_oportunidades ON public.oportunidades;
CREATE TRIGGER refresh_cliente_metrics_oportunidades
  AFTER INSERT OR UPDATE OR DELETE ON public.oportunidades
  FOR EACH ROW EXECUTE FUNCTION public.tg_oportunidades_refresh_cliente();

CREATE OR REPLACE FUNCTION public.tg_processos_refresh_cliente()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_cliente_metrics(OLD.cliente_id);
    RETURN OLD;
  END IF;
  PERFORM public.refresh_cliente_metrics(NEW.cliente_id);
  IF TG_OP = 'UPDATE' AND OLD.cliente_id IS DISTINCT FROM NEW.cliente_id THEN
    PERFORM public.refresh_cliente_metrics(OLD.cliente_id);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS refresh_cliente_metrics_processos ON public.processos;
CREATE TRIGGER refresh_cliente_metrics_processos
  AFTER INSERT OR UPDATE OR DELETE ON public.processos
  FOR EACH ROW EXECUTE FUNCTION public.tg_processos_refresh_cliente();

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.clientes WHERE deleted_at IS NULL LOOP
    PERFORM public.refresh_cliente_metrics(r.id);
  END LOOP;
END $$;
