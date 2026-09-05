-- Sub-fase 3.3: B.O.M. rico
-- Adiciona colunas para agrupamento por sub-conjunto, custos estimado/real
-- e fornecedor sugerido em projeto_insumos.

ALTER TABLE public.projeto_insumos
  ADD COLUMN IF NOT EXISTS sub_conjunto text,
  ADD COLUMN IF NOT EXISTS custo_estimado_unit numeric(14,2),
  ADD COLUMN IF NOT EXISTS custo_real_unit numeric(14,2),
  ADD COLUMN IF NOT EXISTS fornecedor_sugerido_id uuid
    REFERENCES public.fornecedores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_projeto_insumos_sub_conjunto
  ON public.projeto_insumos (projeto_id, sub_conjunto)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_projeto_insumos_fornecedor_sugerido
  ON public.projeto_insumos (fornecedor_sugerido_id)
  WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.projeto_insumos.sub_conjunto IS
  'Sub-conjunto/módulo do equipamento (ex.: "Transportador de entrada"). Usado para agrupar o B.O.M.';
COMMENT ON COLUMN public.projeto_insumos.custo_estimado_unit IS
  'Custo unitário estimado (moeda do projeto). Total estimado = quantidade * custo_estimado_unit.';
COMMENT ON COLUMN public.projeto_insumos.custo_real_unit IS
  'Custo unitário real após compra. Preenchido pela integração com OC.';
COMMENT ON COLUMN public.projeto_insumos.fornecedor_sugerido_id IS
  'Fornecedor sugerido pelo projetista (não obrigatório). Compras pode substituir na cotação.';
