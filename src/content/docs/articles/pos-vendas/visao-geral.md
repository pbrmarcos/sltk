---
title: Visão geral do Pós-vendas
description: SAT em campo, chamados com SLA e canal unificado de atendimento ao cliente.
category: pos-vendas
slug: visao-geral
tipo: conceito
nivel: iniciante
tags: [pos-vendas, sat, chamados, sla]
papeis: [admin, manager, support, quality]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- **Duas frentes:** Chamados (`/pos-vendas/chamados`) e SAT (`/pos-vendas/sat`).
- Chamados chegam por **Site público**, **Contato do site** ou **Interno** — todos na mesma caixa.
- SAT é ordem de serviço em campo, gerada por FAT com ressalvas ou manualmente.
- SLA por origem × prioridade em `/admin/sla-chamados`.
:::

## O que o módulo entrega

O Pós-vendas concentra tudo o que acontece **depois** que o equipamento sai da fábrica: dúvidas, correções, visitas técnicas e manutenções. Tudo com histórico auditável por número de série.

## Estrutura do fluxo

```text
Cliente / Site público                Solutek
──────────────────────                ──────────
Formulário público  ──────────►  Chamado (fila unificada)
Contato do site     ──────────►  Prioridade + SLA
Interno (equipe)    ──────────►

FAT com ressalvas   ──────────►  SAT em campo  ──►  Laudo + encerramento
Manutenção agendada ──────────►
```

:::step{n="1" title="Caixa unificada de chamados" img="01-chamados-lista.png" alt="Lista de chamados com filtros por origem, status, prioridade, atendente e SLA"}
Em **Pós-venda → Chamados** você vê a fila com filtros por origem, status, prioridade, atendente e SLA estourado. Cada linha traz código (`CHM-…`), cliente, assunto e o relógio de SLA de resposta.
:::

:::step{n="2" title="Fila de SATs em campo" img="02-sat-lista.png" alt="Lista de SATs com equipamento, cliente, tipo e status"}
Em **Pós-venda → Relatórios SAT** aparecem as ordens de serviço em campo — corretivas, preventivas, treinamentos e visitas. Cada SAT amarra cliente + número de série.
:::

:::dica
Configure a tabela de SLA logo no início (`/admin/sla-chamados`). Chamados criados antes usam o SLA da hora da criação — mudanças na tabela **não recalculam** históricos.
:::

## Papéis

- `support` — atende chamados, executa SAT em campo, registra evidências.
- `manager` — define prioridade, reatribui atendente, homologa encerramento.
- `admin` — configura SLA, reabre arquivados, audita.
- `quality` — participa quando o chamado/SAT vem de RNC de FAT.

## Integrações

- **Qualidade** — FAT com ressalvas cria SAT automaticamente.
- **Clientes** — cada chamado/SAT é vinculado ao cliente e ao número de série do equipamento.
- **Documentos** — laudos de SAT e histórico ficam disponíveis na Central de Documentos.

## Ver também

- [Abrir um chamado](/ajuda/documentacao/pos-vendas/abrir-chamado)
- [Atender chamado](/ajuda/documentacao/pos-vendas/atender-chamado)
- [SAT em campo](/ajuda/documentacao/pos-vendas/sat-em-campo)
- [SLA e alertas](/ajuda/documentacao/pos-vendas/sla-e-alertas)
