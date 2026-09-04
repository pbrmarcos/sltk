
CREATE TABLE public.enrich_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  pais char(2) NOT NULL,
  documento text NOT NULL,
  provider text,
  success boolean NOT NULL,
  cached boolean NOT NULL DEFAULT false,
  source text,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.enrich_log TO authenticated;
GRANT ALL ON public.enrich_log TO service_role;

ALTER TABLE public.enrich_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enrich_log_admin_manager_select" ON public.enrich_log
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'manager'::app_role));

CREATE INDEX enrich_log_created_idx ON public.enrich_log (created_at DESC);
CREATE INDEX enrich_log_pais_idx ON public.enrich_log (pais, created_at DESC);
