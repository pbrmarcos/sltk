-- Conecta o ciclo de Cotação (wizard/portal público) com a aprovação de
-- emissão de OC. Hoje escolherVencedor() grava só em cotacao_escolhas, mas
-- decidirAprovacaoOC() (o gate que libera a emissão da OC) exige um
-- insumo_anexos.id de um anexo kind='orcamento' com fornecedor_id — nada no
-- fluxo do wizard cria essa linha, então a escolha de vencedor pelo portal
-- não servia pra aprovar a compra (era preciso subir um anexo manual
-- duplicando o que já veio pela cotação).
--
-- insumo_anexo_id rastreia qual anexo foi gerado a partir de qual escolha,
-- pra reescolher (trocar de vencedor) atualizar o mesmo anexo em vez de
-- duplicar.
ALTER TABLE public.cotacao_escolhas
  ADD COLUMN IF NOT EXISTS insumo_anexo_id uuid REFERENCES public.insumo_anexos(id) ON DELETE SET NULL;

-- insumo_cotacao_envios (renomeada de insumo_rfq_envios) é código morto
-- confirmado: nada no sistema insere nela hoje, só havia leituras em
-- projeto-insumos.functions.ts e ordens-compra.functions.ts (removidas
-- nesta mesma rodada). Remove a tabela e os enums que só ela usava.
DROP TABLE IF EXISTS public.insumo_cotacao_envios;
DROP TYPE IF EXISTS public.insumo_cotacao_canal;
DROP TYPE IF EXISTS public.insumo_cotacao_status;
