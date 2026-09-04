ALTER TABLE public.brand_settings
  ADD COLUMN IF NOT EXISTS logo_url_collapsed text,
  ADD COLUMN IF NOT EXISTS logo_url_collapsed_dark text;