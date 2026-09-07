-- Permite ao dono (responsavel_id) de uma oportunidade convidar outro
-- "pilar" pra ver/comentar aquela oportunidade especifica, sem abrir mao da
-- privacidade padrao (dono unico). Reversivel (revogar) e auditavel (toda
-- mutacao passa por logAuditServer no lado da aplicacao).

CREATE TABLE IF NOT EXISTS public.oportunidade_colaboradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  oportunidade_id uuid NOT NULL REFERENCES public.oportunidades(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  convidado_por uuid,
  convidado_em timestamptz NOT NULL DEFAULT now(),
  revogado_em timestamptz,
  revogado_por uuid,
  UNIQUE (oportunidade_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_op_colab_oportunidade
  ON public.oportunidade_colaboradores(oportunidade_id) WHERE revogado_em IS NULL;
CREATE INDEX IF NOT EXISTS idx_op_colab_user
  ON public.oportunidade_colaboradores(user_id) WHERE revogado_em IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.oportunidade_colaboradores TO authenticated;
GRANT ALL ON public.oportunidade_colaboradores TO service_role;

ALTER TABLE public.oportunidade_colaboradores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "op_colab_select" ON public.oportunidade_colaboradores
  FOR SELECT TO authenticated
  USING (public.can_access_oportunidade(oportunidade_id) OR user_id = auth.uid());

CREATE POLICY "op_colab_insert" ON public.oportunidade_colaboradores
  FOR INSERT TO authenticated
  WITH CHECK (
    convidado_por = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.oportunidades o
      WHERE o.id = oportunidade_id
        AND (
          o.responsavel_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin'::app_role)
          OR public.has_role(auth.uid(), 'manager'::app_role)
        )
    )
  );

CREATE POLICY "op_colab_update" ON public.oportunidade_colaboradores
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.oportunidades o
      WHERE o.id = oportunidade_id
        AND (
          o.responsavel_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin'::app_role)
          OR public.has_role(auth.uid(), 'manager'::app_role)
        )
    )
  );

-- can_access_oportunidade() passa a reconhecer colaborador convidado (e nao
-- revogado), alem de admin/manager/dono como ja era.
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
        OR EXISTS (
          SELECT 1 FROM public.oportunidade_colaboradores oc
          WHERE oc.oportunidade_id = o.id
            AND oc.user_id = auth.uid()
            AND oc.revogado_em IS NULL
        )
      )
  )
$$;
