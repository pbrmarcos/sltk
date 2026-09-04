ALTER TABLE public.mineracao_resultados
  ADD COLUMN IF NOT EXISTS contraparte text,
  ADD COLUMN IF NOT EXISTS parceiros jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.mineracao_campanhas
  ADD COLUMN IF NOT EXISTS modo text NOT NULL DEFAULT 'empresas',
  ADD COLUMN IF NOT EXISTS filtro_empresa text,
  ADD COLUMN IF NOT EXISTS filtro_contraparte text;
