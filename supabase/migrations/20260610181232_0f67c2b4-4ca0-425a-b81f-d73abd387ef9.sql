
-- 1) Cache de enrichment
CREATE TABLE public.enrich_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pais char(2) NOT NULL REFERENCES public.paises_config(codigo) ON DELETE CASCADE,
  documento text NOT NULL,
  provider text NOT NULL,
  payload jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pais, documento, provider)
);

GRANT SELECT ON public.enrich_cache TO authenticated;
GRANT ALL ON public.enrich_cache TO service_role;

ALTER TABLE public.enrich_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "enrich_cache_select_auth" ON public.enrich_cache
  FOR SELECT TO authenticated USING (true);

CREATE INDEX enrich_cache_lookup_idx ON public.enrich_cache (pais, documento);

-- 2) Adiciona providers PE e AR (PY/UY já existem)
INSERT INTO public.integracoes_config
  (provider, pais, nome, descricao, ativo, requer_chave, secret_name, disponivel, ordem)
VALUES
  ('apis_net_pe_ruc', 'PE', 'apis.net.pe · RUC',
   'Consulta RUC da SUNAT via apis.net.pe (token gratuito).',
   false, true, 'APIS_NET_PE_TOKEN', true, 20),
  ('cuitonline_ar', 'AR', 'CUIT Online · scraping',
   'Consulta pública de CUIT via cuitonline.com (scraping com Firecrawl).',
   false, false, NULL, true, 21)
ON CONFLICT (provider) DO UPDATE
  SET nome = EXCLUDED.nome,
      descricao = EXCLUDED.descricao,
      requer_chave = EXCLUDED.requer_chave,
      secret_name = EXCLUDED.secret_name,
      disponivel = EXCLUDED.disponivel;

-- 3) Marca providers PY e UY como disponíveis (já existiam como placeholders)
UPDATE public.integracoes_config
SET disponivel = true,
    descricao = CASE provider
      WHEN 'set_py_ruc' THEN 'Consulta pública de RUC da SET (Paraguai) via scraping com Firecrawl.'
      WHEN 'dgi_uy_rut' THEN 'Consulta pública de RUT da DGI (Uruguai) via scraping com Firecrawl.'
      ELSE descricao
    END
WHERE provider IN ('set_py_ruc', 'dgi_uy_rut');
