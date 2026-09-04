-- Complementa 20260623115900_documento_tipos_blocos_base.sql: o tipo
-- "orcamento" também nunca foi capturado em migration (mesma causa —
-- criado direto em produção). Arquivo separado porque, neste ambiente,
-- a migration base já havia sido marcada como aplicada antes de o
-- gap ser identificado.
INSERT INTO public.documento_tipos (codigo, nome, prefixo_codigo, ativo)
VALUES ('orcamento', 'Orçamento', 'ORC', true)
ON CONFLICT (codigo) DO NOTHING;
