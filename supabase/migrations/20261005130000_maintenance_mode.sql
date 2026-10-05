-- Modo manutenção: configuração em linha única, legível publicamente
-- (a página de manutenção renderiza antes do login), editável só por admin.
-- Mesmo padrão de grants/policies da brand_settings.

CREATE TABLE public.maintenance_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT false,
  message text,
  ends_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

INSERT INTO public.maintenance_config (id, enabled) VALUES (1, false);

GRANT SELECT ON public.maintenance_config TO anon, authenticated;
GRANT UPDATE ON public.maintenance_config TO authenticated;
GRANT ALL ON public.maintenance_config TO service_role;

ALTER TABLE public.maintenance_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY maintenance_config_select_all ON public.maintenance_config
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY maintenance_config_update_admin ON public.maintenance_config
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

NOTIFY pgrst, 'reload schema';
