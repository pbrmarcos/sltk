ALTER TABLE public.oportunidades ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS oportunidades_idempotency_key_uidx ON public.oportunidades (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_oportunidades_dup_check ON public.oportunidades (created_at DESC) WHERE deleted_at IS NULL;
COMMENT ON COLUMN public.oportunidades.idempotency_key IS 'Chave de idempotencia enviada pelo cliente na criacao. Impede que duplo submit/retry crie duas oportunidades.';
