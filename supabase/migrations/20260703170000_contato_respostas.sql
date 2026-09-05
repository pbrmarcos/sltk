-- Respostas às mensagens de contato + campos de leitura/atendimento.
-- Depende de 20260702180000_site_contato.sql (contato_mensagens).

ALTER TABLE public.contato_mensagens
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS read_by uuid,
  ADD COLUMN IF NOT EXISTS atendente_id uuid,
  ADD COLUMN IF NOT EXISTS atendente_nome text,
  ADD COLUMN IF NOT EXISTS last_reply_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_contato_msg_read_at ON public.contato_mensagens(read_at);

CREATE TABLE IF NOT EXISTS public.contato_respostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mensagem_id uuid NOT NULL REFERENCES public.contato_mensagens(id) ON DELETE CASCADE,
  autor_id uuid,
  autor_nome text NOT NULL,
  autor_email text,
  canal text NOT NULL DEFAULT 'interno',
  conteudo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contato_respostas_msg ON public.contato_respostas(mensagem_id, created_at);

GRANT SELECT, INSERT ON public.contato_respostas TO authenticated;
GRANT ALL ON public.contato_respostas TO service_role;

ALTER TABLE public.contato_respostas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contato_resp_admin_read" ON public.contato_respostas;
CREATE POLICY "contato_resp_admin_read" ON public.contato_respostas
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
  );

DROP POLICY IF EXISTS "contato_resp_admin_insert" ON public.contato_respostas;
CREATE POLICY "contato_resp_admin_insert" ON public.contato_respostas
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'manager')
  );

-- Trigger: ao inserir resposta, atualiza last_reply_at + status da mensagem.
CREATE OR REPLACE FUNCTION public.tg_contato_resposta_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.contato_mensagens
     SET last_reply_at = NEW.created_at,
         updated_at = now(),
         status = CASE WHEN status IN ('novo','lido') THEN 'respondido' ELSE status END,
         atendente_id = COALESCE(atendente_id, NEW.autor_id),
         atendente_nome = COALESCE(atendente_nome, NEW.autor_nome),
         read_at = COALESCE(read_at, now()),
         read_by = COALESCE(read_by, NEW.autor_id)
   WHERE id = NEW.mensagem_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_contato_resposta_after_insert ON public.contato_respostas;
CREATE TRIGGER trg_contato_resposta_after_insert
AFTER INSERT ON public.contato_respostas
FOR EACH ROW EXECUTE FUNCTION public.tg_contato_resposta_after_insert();
