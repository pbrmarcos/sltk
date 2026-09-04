---
question: Quem pode homologar (encerrar) um FAT?
category: qualidade
tags: [fat, homologacao, encerramento, permissao]
---

Somente `manager` ou `admin`. O usuário `quality` executa o FAT, coleta evidências e assinatura do cliente, mas o botão **Homologar** em `/qualidade/fat/$id` exige alçada superior. Reabrir uma homologação só é permitido a `admin`, com motivo obrigatório e registro em `/admin/auditoria`.
