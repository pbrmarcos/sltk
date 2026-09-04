-- ============================================================
-- Fornecedores: campos para cadastro completo (BR e demais países)
-- e países adicionais (CN, US) no paises_config para usar como
-- dropdown padrão no /fornecedores.
-- ============================================================

-- 1) Adiciona países que ainda não estavam no paises_config
INSERT INTO public.paises_config
  (codigo, nome, documento_nome, documento_regex, documento_mascara, moeda_padrao, idioma_padrao, usa_cep_lookup)
VALUES
  ('CN','China','USCC','^[A-Z0-9]{18}$','XXXXXXXXXXXXXXXXXX','CNY','zh',false),
  ('US','Estados Unidos','EIN','^[0-9]{2}-?[0-9]{7}$','XX-XXXXXXX','USD','en',false)
ON CONFLICT (codigo) DO NOTHING;

-- 2) Novas colunas em fornecedores (dados legais BR + genéricos)
ALTER TABLE public.fornecedores
  ADD COLUMN IF NOT EXISTS inscricao_estadual text,
  ADD COLUMN IF NOT EXISTS inscricao_municipal text,
  ADD COLUMN IF NOT EXISTS regime_tributario text,
  ADD COLUMN IF NOT EXISTS situacao_cadastral text,
  ADD COLUMN IF NOT EXISTS data_abertura date,
  ADD COLUMN IF NOT EXISTS capital_social numeric(18,2),
  ADD COLUMN IF NOT EXISTS natureza_juridica text,
  ADD COLUMN IF NOT EXISTS cnae_principal text,
  ADD COLUMN IF NOT EXISTS cnaes_secundarios text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.fornecedores.inscricao_estadual IS 'IE para fornecedores BR; livre para demais países.';
COMMENT ON COLUMN public.fornecedores.regime_tributario IS 'simples | lucro_presumido | lucro_real | mei (BR) ou texto livre.';
