UPDATE public.brand_settings
SET logo_url = COALESCE(logo_url, logo_url_collapsed, logo_url_dark, logo_url_collapsed_dark),
    logo_url_dark = COALESCE(logo_url_dark, logo_url_collapsed_dark, logo_url, logo_url_collapsed)
WHERE logo_url IS NULL OR logo_url_dark IS NULL;