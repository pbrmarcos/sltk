
revoke select on public.brand_settings from anon;
grant select
  (id, singleton, system_name, primary_color, default_theme,
   logo_url, logo_url_dark, logo_url_collapsed, logo_url_collapsed_dark,
   favicon_url, footer_text, meta_title, meta_description,
   allow_indexing, canonical_base_url, updated_at)
  on public.brand_settings to anon;
