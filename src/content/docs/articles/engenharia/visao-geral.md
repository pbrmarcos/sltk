---
title: Visão geral da Engenharia
description: Como o módulo transforma orçamento aprovado em projeto executável (ETP, mecânico/elétrico, etapas e H/H).
category: engenharia
slug: visao-geral
tipo: conceito
nivel: iniciante
tags: [engenharia, etp, projeto, fluxo]
papeis: [admin, manager, engineer]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- **Fluxo:** Orçamento ganho → **ETP** → Kanban de **etapas** por disciplina → **BOM** → Liberação.
- Disciplinas nativas: **Mecânica** e **Elétrica** (elétrica cobre automação).
- **H/H** apontado por etapa dá margem real do projeto.
- Toda evidência (desenho, memorial, cálculo) fica anexada à etapa.
:::

## O que o módulo entrega

Engenharia transforma o "vendido" em "executável": estrutura o projeto em etapas por disciplina, gera o BOM de compras, controla H/H e libera para produção quando tudo está pronto.

## Estrutura do fluxo

```text
Comercial               Engenharia                       Produção/Compras
─────────         ─────────────────────────────          ─────────────────
Ganho  ──►  ETP  ──►  Etapas (Mecânico / Elétrico)  ──►  BOM ──► Compras
                       │                              │
                       ▼                              ▼
                    H/H apontado                   Liberação
```

:::step{n="1" title="Projetos ativos" img="01-projetos.png" alt="Lista de projetos de engenharia com disciplinas, progresso e responsável"}
Menu **OPERAÇÕES → Projetos** — lista todos os projetos ativos com progresso por disciplina, engenheiro responsável e status geral. Filtro por disciplina (Mecânico/Elétrico) no topo.
:::

:::step{n="2" title="ETP como âncora" img="02-etp-lista.png" alt="Lista de ETPs com número, cliente, orçamento origem, status"}
O **ETP (Especificação Técnica do Produto)** é o documento-âncora. Nasce do orçamento aprovado e concentra escopo, memoriais, revisões e anexos. Todo projeto tem um ETP.
:::

:::step{n="3" title="Kanban de etapas" img="03-etapas-kanban.png" alt="Kanban de etapas por coluna: Planejado, Em execução, Revisão, Concluído"}
As etapas do projeto são organizadas em kanban por disciplina (**Mecânico**, **Elétrico**). Você move cards conforme avança, anexa desenhos e aponta H/H direto no card.
:::

:::dica
Não crie "etapa gigante". Quebre em blocos de 8-40 h — apontamento fica mais fiel e conclusão fica visível.
:::

:::atencao
Nada é liberado para **Produção** ou **Compras** enquanto o ETP não estiver **Liberado**. Isso evita compra de item que ainda pode mudar.
:::

## Papéis

- `engineer` — cria/edita ETPs, etapas, aponta H/H no que participa.
- `manager` / `admin` — liberam ETP, veem todos os relatórios.

## Ver também

- [Criar ETP a partir do orçamento](/ajuda/documentacao/engenharia/criar-etp)
- [Etapas e kanban](/ajuda/documentacao/engenharia/etapas-e-kanban)
- [Liberação para produção](/ajuda/documentacao/engenharia/liberacao-para-producao)

