---
question: Cliente pediu desconto acima da minha alçada. Como funciona?
category: comercial
tags: [comercial, desconto, alcada, aprovacao]
---

O wizard de orçamento tem faixa de desconto por papel: `sales` até X%, `manager` até Y%, acima disso só `admin` (valores em `/admin/politicas-comerciais`). Ao aplicar desconto acima da sua alçada, o orçamento fica em status **Aguardando aprovação** — o próximo nível recebe notificação com o motivo obrigatório do desconto. Antes de aprovar, o aprovador vê o **margem estimada resultante** calculada em cima da BOM/H-H. Aprovação e recusa ficam auditadas junto ao orçamento; PDF só é emitido depois de aprovado.
