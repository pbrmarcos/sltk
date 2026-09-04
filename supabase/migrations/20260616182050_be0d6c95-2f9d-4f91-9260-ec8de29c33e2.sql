
-- helper: access check for oportunidades
CREATE OR REPLACE FUNCTION public.can_access_oportunidade(_op_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.oportunidades o
    WHERE o.id = _op_id
      AND o.deleted_at IS NULL
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR public.has_role(auth.uid(), 'manager'::app_role)
        OR o.responsavel_id = auth.uid()
      )
  )
$$;

-- =============== NOTAS ===============
CREATE TABLE public.oportunidade_notas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oportunidade_id uuid NOT NULL REFERENCES public.oportunidades(id) ON DELETE CASCADE,
  texto text NOT NULL CHECK (length(btrim(texto)) > 0),
  user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  user_nome text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES auth.users(id)
);
CREATE INDEX idx_op_notas_oportunidade ON public.oportunidade_notas(oportunidade_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.oportunidade_notas TO authenticated;
GRANT ALL ON public.oportunidade_notas TO service_role;

ALTER TABLE public.oportunidade_notas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "op_notas_select" ON public.oportunidade_notas
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.can_access_oportunidade(oportunidade_id));

CREATE POLICY "op_notas_insert" ON public.oportunidade_notas
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_oportunidade(oportunidade_id) AND user_id = auth.uid());

CREATE POLICY "op_notas_update_own" ON public.oportunidade_notas
  FOR UPDATE TO authenticated
  USING (public.can_access_oportunidade(oportunidade_id) AND (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'manager'::app_role)))
  WITH CHECK (public.can_access_oportunidade(oportunidade_id));

CREATE TRIGGER trg_op_notas_updated_at BEFORE UPDATE ON public.oportunidade_notas
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- =============== ANEXOS ===============
CREATE TABLE public.oportunidade_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oportunidade_id uuid NOT NULL REFERENCES public.oportunidades(id) ON DELETE CASCADE,
  drive_file_id text NOT NULL,
  drive_view_url text,
  drive_folder_id text,
  nome_final text NOT NULL,
  nome_original text NOT NULL,
  mime_type text NOT NULL,
  tamanho_bytes bigint NOT NULL,
  sugestoes_ia jsonb,
  user_id uuid REFERENCES auth.users(id) DEFAULT auth.uid(),
  user_nome text,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES auth.users(id)
);
CREATE INDEX idx_op_anexos_oportunidade ON public.oportunidade_anexos(oportunidade_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.oportunidade_anexos TO authenticated;
GRANT ALL ON public.oportunidade_anexos TO service_role;

ALTER TABLE public.oportunidade_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "op_anexos_select" ON public.oportunidade_anexos
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL AND public.can_access_oportunidade(oportunidade_id));

CREATE POLICY "op_anexos_insert" ON public.oportunidade_anexos
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_oportunidade(oportunidade_id) AND user_id = auth.uid());

CREATE POLICY "op_anexos_soft_delete" ON public.oportunidade_anexos
  FOR UPDATE TO authenticated
  USING (public.can_access_oportunidade(oportunidade_id))
  WITH CHECK (public.can_access_oportunidade(oportunidade_id));
