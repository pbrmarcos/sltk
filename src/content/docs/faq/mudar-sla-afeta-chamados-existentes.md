---
question: Mudei o SLA em /admin/sla-chamados. Vale para os chamados que já estão abertos?
category: admin
tags: [admin, sla, chamados, configuracao]
---

Não. O SLA é **fotografado no momento em que o chamado é criado** — a alteração em `/admin/sla-chamados` só vale para chamados novos. Chamados abertos antes continuam com os prazos originais (visíveis no card, aba SLA). Isso evita que uma revisão de política reprove ou aprove chamados retroativamente. Se precisar reajustar o prazo de um chamado específico já aberto, use **Ajustar SLA** no próprio card (só `manager`/`admin`, com justificativa registrada em auditoria).
