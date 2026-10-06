-- O portal do fornecedor envia moeda e condição de pagamento, mas
-- cotacao_propostas não tinha essas colunas (só as versões detectadas por IA).
-- Todo envio de proposta falhava com "Could not find column".
alter table public.cotacao_propostas
  add column if not exists moeda text,
  add column if not exists condicao_pagamento text;
