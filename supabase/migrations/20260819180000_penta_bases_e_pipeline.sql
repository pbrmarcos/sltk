CREATE TABLE IF NOT EXISTS public.penta_bases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_country text NOT NULL,
  pais text,
  key_operation text NOT NULL,
  key_version integer NOT NULL,
  title text NOT NULL DEFAULT '',
  has_tariff_codes boolean NOT NULL DEFAULT false,
  has_companies boolean NOT NULL DEFAULT false,
  start_date text,
  updated_date text,
  active boolean NOT NULL DEFAULT true,
  under_maintenance boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  query_limit integer NOT NULL DEFAULT 0,
  parameters jsonb NOT NULL DEFAULT '[]'::jsonb,
  columns jsonb NOT NULL DEFAULT '[]'::jsonb,
  synced_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (key_country, key_operation, key_version)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.penta_bases TO authenticated;
GRANT ALL ON public.penta_bases TO service_role;
ALTER TABLE public.penta_bases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "penta_bases_select_auth" ON public.penta_bases;
CREATE POLICY "penta_bases_select_auth" ON public.penta_bases FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "penta_bases_write_comercial" ON public.penta_bases;
CREATE POLICY "penta_bases_write_comercial" ON public.penta_bases FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'sales'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'sales'));
ALTER TABLE public.mineracao_resultados ADD COLUMN IF NOT EXISTS enviado_para_pipeline boolean NOT NULL DEFAULT false;
UPDATE public.mineracao_resultados SET enviado_para_pipeline = true WHERE convertido_oportunidade_id IS NOT NULL AND enviado_para_pipeline = false;
