GRANT SELECT ON public.brand_settings TO anon;
GRANT SELECT ON public.brand_settings TO authenticated;
GRANT ALL ON public.brand_settings TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policy
    WHERE polrelid = 'public.brand_settings'::regclass
      AND polname = 'brand_settings_select_anon'
  ) THEN
    CREATE POLICY "brand_settings_select_anon"
    ON public.brand_settings
    FOR SELECT
    TO anon
    USING (true);
  END IF;
END $$;