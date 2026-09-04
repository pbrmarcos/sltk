-- Concede ao role anon SELECT nas colunas de contato/redes adicionadas em 20260702180000_site_contato.sql.
-- Sem isso, a leitura pública de brand_settings falha com "permission denied for table"
-- porque brand_settings usa grants por coluna para anon (ver 20260610060122_...sql).

GRANT SELECT (
  contact_address,
  contact_phone,
  contact_whatsapp,
  contact_email,
  contact_hours,
  social_instagram,
  social_linkedin,
  social_youtube
) ON public.brand_settings TO anon;
