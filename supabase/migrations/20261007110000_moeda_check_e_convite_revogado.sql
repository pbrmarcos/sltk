-- 1) clientes.moeda: o CHECK existia só no banco de produção (não estava em
--    migration). O app trabalha só com USD/EUR/BRL/PYG (src/lib/moedas.ts);
--    países com moeda local fora disso usam USD. Versionado aqui de forma
--    idempotente para um banco novo subir com a mesma regra.
ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_moeda_iso_chk;
ALTER TABLE public.clientes
  ADD CONSTRAINT clientes_moeda_iso_chk
  CHECK (moeda = ANY (ARRAY['USD'::bpchar, 'EUR'::bpchar, 'BRL'::bpchar, 'PYG'::bpchar]));

-- 2) Convite de cotação revogável: o link público (token) deixa de valer
--    quando o comprador revoga. Validade por prazo é checada no servidor.
ALTER TABLE public.cotacao_fornecedores
  ADD COLUMN IF NOT EXISTS revogado_em timestamptz;

NOTIFY pgrst, 'reload schema';
