
-- 1) Snapshots/versions of templates
CREATE TABLE IF NOT EXISTS public.processo_template_versoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.processo_templates(id) ON DELETE CASCADE,
  versao integer NOT NULL,
  motivo text,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  created_by_nome text,
  UNIQUE (template_id, versao)
);

CREATE INDEX IF NOT EXISTS idx_tpl_versoes_template ON public.processo_template_versoes(template_id, versao DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.processo_template_versoes TO authenticated;
GRANT ALL ON public.processo_template_versoes TO service_role;

ALTER TABLE public.processo_template_versoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY tpl_versoes_select ON public.processo_template_versoes
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'engineer'::app_role)
  );

CREATE POLICY tpl_versoes_write ON public.processo_template_versoes
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'engineer'::app_role)
  ) WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'engineer'::app_role)
  );

-- 2) Allow managers to see archived templates for restore
DROP POLICY IF EXISTS tpl_select ON public.processo_templates;
CREATE POLICY tpl_select ON public.processo_templates
  FOR SELECT TO authenticated USING (
    deleted_at IS NULL
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'manager'::app_role)
    OR public.has_role(auth.uid(), 'engineer'::app_role)
  );
