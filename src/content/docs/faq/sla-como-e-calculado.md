---
question: Como o SLA de um chamado é calculado?
category: pos-vendas
tags: [sla, prioridade, prazos]
---

O SLA é definido em `/admin/sla-chamados` por **origem × prioridade** em três relógios: **Resposta**, **Resolução** e **Estagnado**. Ao criar o chamado, o sistema fixa esses prazos. Alterar prioridade depois **não recalcula** o SLA original — a mudança fica na timeline.
