-- O banco de produção foi reconstruído a partir de um snapshot só de schema:
-- a linha única de mineracao_config (seed de 20260818120000_mineracao_leads)
-- nunca foi criada, então a tela Provedor de Mineração abria vazia e salvar
-- as credenciais não tinha linha para atualizar. Restaura com os valores
-- originais do contrato Penta (endereço do serviço, país padrão e limites).
-- Usuário e senha da Penta nunca foram versionados: redigitar pela tela.
INSERT INTO public.mineracao_config (
  singleton, api_base_url, pais_padrao, delay_ms,
  limite_consultas_dia, limite_bases, limite_bases_premium, limite_rubros, limite_empresas
) VALUES (
  true, 'https://app.penta-transaction.com/PentaApi/api-v2', 'BR', 600,
  1000, 25, 15, 30, 1000
)
ON CONFLICT (singleton) DO NOTHING;
