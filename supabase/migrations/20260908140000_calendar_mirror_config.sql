-- Configuração de espelhamento de agenda: quais categorias de agendamento
-- (entrevista, kickoff, ...) copiam o evento pra agenda de um admin
-- designado, e quem é esse admin. Mesmo molde de brand_settings (singleton)
-- e email_event_config (uma linha por categoria, extensível).

CREATE TABLE IF NOT EXISTS public.calendar_mirror_categories (
  categoria text PRIMARY KEY,
  label text NOT NULL,
  mirror_enabled boolean NOT NULL DEFAULT false,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.calendar_mirror_categories TO authenticated;
GRANT ALL ON public.calendar_mirror_categories TO service_role;
ALTER TABLE public.calendar_mirror_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_mirror_categories select all" ON public.calendar_mirror_categories
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "calendar_mirror_categories write admin" ON public.calendar_mirror_categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP TRIGGER IF EXISTS calendar_mirror_categories_touch ON public.calendar_mirror_categories;
CREATE TRIGGER calendar_mirror_categories_touch
  BEFORE UPDATE ON public.calendar_mirror_categories
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.calendar_mirror_categories (categoria, label) VALUES
  ('entrevista', 'Entrevistas técnicas'),
  ('kickoff', 'Kickoff de projeto')
ON CONFLICT (categoria) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.calendar_mirror_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  mirror_admin_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.calendar_mirror_settings TO authenticated;
GRANT ALL ON public.calendar_mirror_settings TO service_role;
ALTER TABLE public.calendar_mirror_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_mirror_settings select all" ON public.calendar_mirror_settings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "calendar_mirror_settings write admin" ON public.calendar_mirror_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP TRIGGER IF EXISTS calendar_mirror_settings_touch ON public.calendar_mirror_settings;
CREATE TRIGGER calendar_mirror_settings_touch
  BEFORE UPDATE ON public.calendar_mirror_settings
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

INSERT INTO public.calendar_mirror_settings (singleton) VALUES (true)
ON CONFLICT (singleton) DO NOTHING;
