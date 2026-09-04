-- Audit table for admin edits on the interview catalog (segmentos/perguntas/opcoes).
CREATE TABLE IF NOT EXISTS public.entrevista_catalog_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('segmento','pergunta','opcao')),
  entity_id uuid NOT NULL,
  segmento_id uuid,
  action text NOT NULL CHECK (action IN ('create','update','delete','reorder','translate','toggle')),
  actor_id uuid,
  actor_email text,
  before jsonb,
  after jsonb,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entrevista_catalog_audit_seg ON public.entrevista_catalog_audit(segmento_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_entrevista_catalog_audit_ent ON public.entrevista_catalog_audit(entity_type, entity_id, created_at DESC);

GRANT SELECT, INSERT ON public.entrevista_catalog_audit TO authenticated;
GRANT ALL ON public.entrevista_catalog_audit TO service_role;

ALTER TABLE public.entrevista_catalog_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catalog audit admin/manager read"
  ON public.entrevista_catalog_audit FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));

CREATE POLICY "catalog audit admin/manager insert"
  ON public.entrevista_catalog_audit FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager'));
