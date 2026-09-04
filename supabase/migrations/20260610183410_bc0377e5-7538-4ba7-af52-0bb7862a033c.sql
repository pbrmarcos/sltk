
INSERT INTO public.integracoes_config
  (provider, pais, nome, descricao, ativo, requer_chave, disponivel, secret_name, ordem)
VALUES
  ('hacienda_cr_cedula','CR','Hacienda Costa Rica · Cédula Jurídica',
   'API REST pública (api.hacienda.go.cr) — sem chave necessária.',
   true,  false, true, NULL, 30),
  ('sri_ec_ruc','EC','SRI Equador · RUC',
   'API pública do SRI (srienlinea.sri.gob.ec) — sem chave necessária.',
   true,  false, true, NULL, 31),
  ('sii_cl_rut','CL','SII Chile · RUT (scraping)',
   'Consulta pública do SII via Firecrawl. Pode falhar por captcha — desativado por padrão.',
   false, false, true, NULL, 32),
  ('dgi_pa_ruc','PA','DGI Panamá · RUC (scraping)',
   'Consulta pública DGI/MEF via Firecrawl. Desativado por padrão até validação.',
   false, false, true, NULL, 33),
  ('rues_co_nit','CO','RUES Colômbia · NIT (scraping)',
   'Consulta RUES via Firecrawl. Captcha pode bloquear — desativado por padrão.',
   false, false, true, NULL, 34)
ON CONFLICT (provider) DO UPDATE SET
  pais         = EXCLUDED.pais,
  nome         = EXCLUDED.nome,
  descricao    = EXCLUDED.descricao,
  disponivel   = EXCLUDED.disponivel,
  requer_chave = EXCLUDED.requer_chave,
  secret_name  = EXCLUDED.secret_name,
  ordem        = EXCLUDED.ordem;
