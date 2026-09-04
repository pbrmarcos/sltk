---
question: Um e-mail automático não chegou ao cliente. Como descubro o motivo?
category: admin
tags: [admin, email, log, envio]
---

Abra `/admin/emails` → aba **Log de envio** e filtre pelo evento. O status explica o motivo: **Falhou** (recusa do provedor, com detalhe do erro), **Ignorado (desativado)**, **Ignorado (sem destinatários)**, **Ignorado (variáveis obrigatórias)** ou **Provider não configurado**. Clicando na linha você vê as variáveis usadas e o snapshot do template no momento do envio.
