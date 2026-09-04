---
question: Comprei direto do fornecedor sem cotação, é permitido?
category: compras
tags: [compra-spot, cotacao, alcada]
---

Sim, para valores dentro da alçada de compra spot definida em `/admin/configuracoes` — normalmente itens de baixo valor (MRO, consumíveis). Basta criar a OC diretamente em `/compras/ordens/nova` sem vincular cotação, informar justificativa e submeter à aprovação. Acima da alçada spot, o sistema exige cotação com ≥2 fornecedores antes de gerar OC.
