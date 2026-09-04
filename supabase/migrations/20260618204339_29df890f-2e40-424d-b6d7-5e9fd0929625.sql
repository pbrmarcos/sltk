ALTER TABLE public.equipamento_etapas
  ADD COLUMN IF NOT EXISTS hh_mecanica_real numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hh_eletrica_real numeric(10,2) NOT NULL DEFAULT 0;