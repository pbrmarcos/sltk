---
title: Atender e acompanhar chamado
description: Fluxo de trabalho na fila, chat com o cliente e mudanças de status.
category: pos-vendas
slug: atender-chamado
tipo: guia
nivel: intermediario
tags: [chamados, atendimento, chat, status]
papeis: [admin, manager, support]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Fila em `/pos-vendas/chamados` com filtros por status, origem, prioridade, atendente, SLA estourado e período.
- **Assumir** vira você em atendente; **Chat** conversa com o cliente por e-mail seguro.
- Enviar resposta muda status para **Aguardando cliente**.
- **Alterar atendente** e **prioridade** ficam na timeline.
:::

:::step{n="1" title="Escolher o chamado na fila" img="01-chamados-lista.png" alt="Lista de chamados com filtros no topo e colunas de status, prioridade, atendente e SLA"}
Abra `/pos-vendas/chamados` e filtre por **Sem atendente**, **SLA estourado** ou **Aguardando cliente** para priorizar. Clique no código (`CHM-…`) para abrir o detalhe.
:::

:::step{n="2" title="Assumir e responder no chat"}
No detalhe:
1. Clique em **Assumir** para virar atendente (fica na timeline).
2. Digite a resposta no **chat**. O cliente recebe por e-mail com link seguro (sem login).
3. Anexos (fotos, PDFs, vídeos até 50 MB) ficam disponíveis para os dois lados.
4. Ao enviar, o status muda automaticamente para **Aguardando cliente**.
:::

:::step{n="3" title="Reatribuir ou escalar quando precisar"}
- **Alterar atendente** — passa para outro técnico, com motivo registrado.
- **Alterar prioridade** — `manager`/`admin`; a mudança entra na timeline (não recalcula SLA).
- **SLA estourado** — a linha fica vermelha e entra no alerta periódico do `manager`.
:::

## Status possíveis

| Status | Quando |
|---|---|
| **Aberto** | Recém-criado, sem atendente / sem primeira resposta |
| **Em análise** | Atendente assumiu e está apurando |
| **Aguardando cliente** | Resposta enviada; contando estagnação |
| **Resolvido** | Solução entregue; cliente tem 7 dias para reabrir |
| **Reaberto** | Cliente respondeu após "Resolvido" |
| **Arquivado** | Sem interação após o prazo de reabertura |

:::dica
Quando o cliente responde após um chamado **Resolvido**, o sistema muda para **Reaberto** e reinicia o relógio de estagnação — não perca o e-mail.
:::

:::atencao
Não altere prioridade só para "zerar" o SLA vermelho. A alteração fica na timeline e o SLA original continua estourado no relatório.
:::

## Ver também

- [Abrir um chamado](/ajuda/documentacao/pos-vendas/abrir-chamado)
- [Encerrar e reabrir](/ajuda/documentacao/pos-vendas/encerrar-e-reabrir)
- [SLA e alertas](/ajuda/documentacao/pos-vendas/sla-e-alertas)

<!-- SHOTS:AUTO -->

## Imagens da tela

:::step{n="1" title="Fila de chamados com SLA e prioridade" img="atender-chamado-1.png" alt="Fila de chamados com SLA e prioridade"}
Fila de chamados com SLA e prioridade
:::

<!-- /SHOTS:AUTO -->
