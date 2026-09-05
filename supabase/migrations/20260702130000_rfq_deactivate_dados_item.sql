-- Desativa o bloco "Dados do Item" do template RFQ por padrão.
-- A "Descrição do produto" consolidada já cobre esse conteúdo.
-- Para reativar, alterne ativo=true em Central de Documentos → Solicitação
-- de Cotação → Blocos → Dados do Item.

UPDATE public.documento_blocos
SET ativo = false,
    updated_at = now()
WHERE tipo_codigo = 'solicitacao_cotacao'
  AND (
    lower(codigo) IN ('dados_item', 'dados_do_item', 'identificacao_item', 'identificacao_do_item')
    OR lower(nome) LIKE '%dados do item%'
    OR lower(nome) LIKE '%identifica__o do item%'
  );
