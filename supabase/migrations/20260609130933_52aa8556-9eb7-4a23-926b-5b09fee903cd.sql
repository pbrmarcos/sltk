
CREATE TABLE public.brand_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  logo_url text,
  favicon_url text,
  system_name text NOT NULL DEFAULT 'Operations Suite',
  primary_color text NOT NULL DEFAULT '#3B82F6',
  default_theme text NOT NULL DEFAULT 'system' CHECK (default_theme IN ('light','dark','system')),
  support_email text,
  footer_text text,
  meta_title text,
  meta_description text,
  allow_indexing boolean NOT NULL DEFAULT true,
  canonical_base_url text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT, INSERT, UPDATE ON public.brand_settings TO authenticated;
GRANT ALL ON public.brand_settings TO service_role;

ALTER TABLE public.brand_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY brand_settings_select_authenticated ON public.brand_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY brand_settings_insert_admin ON public.brand_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY brand_settings_update_admin ON public.brand_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER brand_settings_set_updated_at
  BEFORE UPDATE ON public.brand_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.brand_settings (singleton) VALUES (true)
  ON CONFLICT (singleton) DO NOTHING;
