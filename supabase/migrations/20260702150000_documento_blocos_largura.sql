-- Adiciona campo largura (50 ou 100) nos blocos de documento para permitir
-- blocos lado-a-lado no PDF.
ALTER TABLE public.documento_blocos
  ADD COLUMN IF NOT EXISTS largura smallint NOT NULL DEFAULT 100;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'documento_blocos_largura_chk'
  ) THEN
    ALTER TABLE public.documento_blocos
      ADD CONSTRAINT documento_blocos_largura_chk CHECK (largura IN (50, 100));
  END IF;
END $$;
