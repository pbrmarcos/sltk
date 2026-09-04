---
title: Visão geral da Produção
description: Como o módulo conduz a montagem física do equipamento após a liberação da Engenharia.
category: producao
slug: visao-geral
tipo: conceito
nivel: iniciante
tags: [producao, montagem, kanban, fluxo]
papeis: [admin, manager, production]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- **Fluxo:** ETP Liberado → Montagem → Testes internos → Liberação para FAT.
- Menu único: **PRODUÇÃO → Montagem** (`/producao/montagem`).
- Uma linha por equipamento, com progresso e status (Não iniciada / Em andamento / Concluída / Bloqueada).
- Bloqueio de linha exige **motivo + evidência** — nada de "esperando peça" solto.
:::

## O que o módulo entrega

Produção transforma o projeto liberado pela Engenharia em equipamento montado, testado e pronto para o FAT da Qualidade. Toda etapa é registrada, toda peça consumida é rastreada e cada bloqueio tem causa auditável.

## Estrutura do fluxo

```text
Engenharia         Produção                       Qualidade
──────────         ────────────────────           ─────────
ETP Liberado  ──►  Montagem (kanban)  ──►  Testes  ──►  Liberação p/ FAT
                        │
                        ├─► Retrabalho / NC interna
                        └─► Bloqueio (motivo + evidência)
```

:::step{n="1" title="Tela única de acompanhamento" img="01-montagem-kanban.png" alt="Tela Montagem com KPIs Não iniciada, Em andamento, Concluída, Bloqueada e lista de equipamentos"}
Menu **PRODUÇÃO → Montagem**. No topo, 4 KPIs mostram a situação global:

- **Não iniciada** — projetos liberados aguardando começar.
- **Em andamento** — em execução no chão de fábrica.
- **Concluída** — montagem terminada, pronta para FAT.
- **Bloqueada** — parada por causa registrada (peça, retrabalho, etc.).
:::

:::step{n="2" title="Cada linha é um equipamento" img="01-montagem-kanban.png" alt="Linha da lista com código do equipamento, cliente, prazo, barra de progresso e botão Iniciar"}
Cada linha traz: **código do equipamento**, **cliente**, **janela de execução** (início → fim), **progresso %** e botão de ação (`Iniciar`, `Continuar`, `Bloquear`, `Liberar p/ FAT`).
:::

:::step{n="3" title="Filtros"}
Busca por equipamento/cliente + filtro por status. Use para ver só o que está bloqueado (fila do supervisor) ou só o que está pronto p/ FAT (fila da Qualidade).
:::

:::dica
A regra de ouro: **só entra em Montagem projeto com ETP Liberado**. Se apareceu na sua fila é porque Compras e Engenharia terminaram o dever de casa.
:::

:::atencao
Bloqueio sem motivo cadastrado desaparece do relatório de causas — e ninguém aprende com o erro. Todo bloqueio pede motivo estruturado (peça faltante, projeto ambíguo, retrabalho externo, etc.).
:::

## Papéis

- `production` — inicia, executa, bloqueia e libera montagens que participa.
- `manager` / `admin` — veem todas, desbloqueiam, redistribuem.
- `quality` — só recebe quando a linha vira **Liberada p/ FAT**.

## Ver também

- [Executar etapa de montagem](/ajuda/documentacao/producao/executar-etapa)
- [Kanban de montagem](/ajuda/documentacao/producao/kanban-montagem)
- [Retrabalho e NC interna](/ajuda/documentacao/producao/retrabalho-e-nc-interna)
- [Liberar para FAT](/ajuda/documentacao/producao/liberar-para-fat)
