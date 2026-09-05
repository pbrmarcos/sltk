-- Aprovação de OC baseada em insumo (manager / engenheiro / admin autorizam;
-- compras emite). Retenção: histórico permanente para auditoria.

CREATE TABLE IF NOT EXISTS public.insumo_aprovacoes_oc (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insumo_id uuid NOT NULL REFERENCES public.projeto_insumos(id) ON DELETE CASCADE,
  solicitado_por uuid NOT NULL,
  solicitado_em timestamptz NOT NULL DEFAULT now(),
  solicitacao_nota text,
  fornecedor_id_sugerido uuid REFERENCES public.fornecedores(id),
  decidido_por uuid,
  decidido_em timestamptz,
  decisao text CHECK (decisao IN ('aprovado','recusado')),
  decisao_nota text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_insumo_aprov_oc_insumo ON public.insumo_aprovacoes_oc(insumo_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insumo_aprov_oc_pendente ON public.insumo_aprovacoes_oc(insumo_id) WHERE decidido_em IS NULL;

ALTER TABLE public.insumo_aprovacoes_oc ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aprov_oc_select" ON public.insumo_aprovacoes_oc;
CREATE POLICY "aprov_oc_select" ON public.insumo_aprovacoes_oc
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'purchasing')
    OR public.has_role(auth.uid(), 'engineer')
  );

DROP POLICY IF EXISTS "aprov_oc_insert" ON public.insumo_aprovacoes_oc;
CREATE POLICY "aprov_oc_insert" ON public.insumo_aprovacoes_oc
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'purchasing')
    OR public.has_role(auth.uid(), 'engineer')
  );

-- Só manager / engenheiro / admin podem decidir (approve/refuse).
DROP POLICY IF EXISTS "aprov_oc_update" ON public.insumo_aprovacoes_oc;
CREATE POLICY "aprov_oc_update" ON public.insumo_aprovacoes_oc
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'engineer')
  );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.tg_insumo_aprov_oc_touch() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;$$;

DROP TRIGGER IF EXISTS trg_insumo_aprov_oc_touch ON public.insumo_aprovacoes_oc;
CREATE TRIGGER trg_insumo_aprov_oc_touch BEFORE UPDATE ON public.insumo_aprovacoes_oc
  FOR EACH ROW EXECUTE FUNCTION public.tg_insumo_aprov_oc_touch();

NOTIFY pgrst, 'reload schema';
