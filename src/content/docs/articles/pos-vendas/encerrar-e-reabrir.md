---
title: Encerrar e reabrir chamado
description: Regras de resolução, arquivamento e reabertura por cliente ou equipe.
category: pos-vendas
slug: encerrar-e-reabrir
tipo: guia
nivel: intermediario
tags: [chamados, encerramento, reabertura, arquivamento]
papeis: [admin, manager, support]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Todo chamado termina em **Resolvido** ou **Arquivado**.
- Resolver exige **resumo da solução** (obrigatório).
- Cliente tem **7 dias** para reabrir pelo e-mail; depois disso é arquivado.
- Reabertura por equipe: só `manager`/`admin`, com justificativa auditada.
:::

:::step{n="1" title="Resolver com resumo" img="01-chamados-lista.png" alt="Lista de chamados destacando ação Marcar como resolvido"}
No detalhe do chamado, envie a solução no chat e clique em **Marcar como resolvido**. Preencha o **resumo da solução** — ele vai para a timeline e para o e-mail do cliente com o link de reabertura.
:::

:::step{n="2" title="Aguardar prazo de reabertura"}
Após resolvido:
- Cliente tem **7 dias** para responder pelo link do e-mail.
- Se responder, o status volta para **Reaberto** e o atendente original é notificado.
- Sem resposta em 7 dias → **Arquivado** automaticamente.
:::

:::step{n="3" title="Reabrir manualmente (interno)"}
Chamados arquivados podem ser reabertos por `manager`/`admin`:
1. Abra o chamado arquivado.
2. Clique em **Reabrir** e informe a justificativa.
3. A ação fica em `/admin/auditoria`.
:::

## Arquivamento automático

- **Resolvidos** sem resposta em 7 dias → **Arquivado**.
- **Aguardando cliente** por muito tempo (config em `/admin/sla-chamados` → Estagnado) recebem alerta; podem ser arquivados manualmente por `manager`/`admin`.

:::dica
Antes de resolver, revise se o resumo responde: *"O que era o problema? O que foi feito? Como o cliente confirma que está resolvido?"* — reduz reabertura por mal-entendido.
:::

:::atencao
Reabertura **reinicia** o relógio de estagnação, mas o **SLA de resolução original** não é reiniciado. Isso é proposital — evita mascarar atrasos.
:::

## Métricas no dashboard

- Quantidade por status, SLA cumprido, tempo médio de resposta/resolução, reincidência (% de reabertos).
- Exportação CSV em `/pos-vendas/chamados` respeita os filtros ativos.

## Ver também

- [Atender chamado](/ajuda/documentacao/pos-vendas/atender-chamado)
- [SLA e alertas](/ajuda/documentacao/pos-vendas/sla-e-alertas)
