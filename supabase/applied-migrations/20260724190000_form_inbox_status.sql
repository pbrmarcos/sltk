-- Estado de leitura (pendente/lido) para formulários recebidos.
-- entity_type = 'contato' | 'entrevista' | 'rfq'; entity_id = uuid da linha original.

CREATE TABLE IF NOT EXISTS public.form_inbox_status (
  entity_type text NOT NULL CHECK (entity_type IN ('contato','entrevista','rfq')),
  entity_id   uuid NOT NULL,
  status      text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','lido')),
  updated_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entity_type, entity_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_inbox_status TO authenticated;
GRANT ALL ON public.form_inbox_status TO service_role;

ALTER TABLE public.form_inbox_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS form_inbox_status_admin_manager_all ON public.form_inbox_status;
CREATE POLICY form_inbox_status_admin_manager_all
  ON public.form_inbox_status
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

CREATE INDEX IF NOT EXISTS idx_form_inbox_status_status
  ON public.form_inbox_status (entity_type, status);
