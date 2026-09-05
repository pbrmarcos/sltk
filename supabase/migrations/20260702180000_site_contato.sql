-- Site público: campos de contato no brand_settings + tabela contato_mensagens.

ALTER TABLE public.brand_settings
  ADD COLUMN IF NOT EXISTS contact_address text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS contact_whatsapp text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_hours text,
  ADD COLUMN IF NOT EXISTS social_instagram text,
  ADD COLUMN IF NOT EXISTS social_linkedin text,
  ADD COLUMN IF NOT EXISTS social_youtube text;

CREATE TABLE IF NOT EXISTS public.contato_mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text NOT NULL,
  telefone text,
  assunto text,
  mensagem text NOT NULL,
  origem text NOT NULL DEFAULT 'site',
  ip text,
  user_agent text,
  status text NOT NULL DEFAULT 'novo',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contato_msg_created ON public.contato_mensagens(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contato_msg_status ON public.contato_mensagens(status);

GRANT SELECT, UPDATE ON public.contato_mensagens TO authenticated;
GRANT ALL ON public.contato_mensagens TO service_role;

ALTER TABLE public.contato_mensagens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contato_msg_admin_read" ON public.contato_mensagens;
CREATE POLICY "contato_msg_admin_read" ON public.contato_mensagens
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
  );

DROP POLICY IF EXISTS "contato_msg_admin_update" ON public.contato_mensagens;
CREATE POLICY "contato_msg_admin_update" ON public.contato_mensagens
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
  );
-- Inserts vão via server function com service_role (bypassa RLS).
