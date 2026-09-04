-- Fase 3.5 — B.O.M. → RFQ de Compras
-- Rastreia a origem da cotação e vincula opcionalmente ao projeto de origem.

ALTER TABLE public.cotacoes
  ADD COLUMN IF NOT EXISTS origem text
    CHECK (origem IS NULL OR origem IN ('manual', 'bom')),
  ADD COLUMN IF NOT EXISTS projeto_id uuid
    REFERENCES public.equipamento_projetos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cotacoes_projeto
  ON public.cotacoes (projeto_id)
  WHERE projeto_id IS NOT NULL;

COMMENT ON COLUMN public.cotacoes.origem IS
  'De onde a cotação foi criada: manual (compras) ou bom (B.O.M. de um projeto).';
COMMENT ON COLUMN public.cotacoes.projeto_id IS
  'Projeto de equipamento de origem quando origem = bom. Permite rastreio bidirecional.';
