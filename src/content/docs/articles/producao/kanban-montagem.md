---
title: Kanban de montagem
description: Como usar o kanban para acompanhar a montagem de cada equipamento e mover pelo status.
category: producao
slug: kanban-montagem
tipo: guia
nivel: iniciante
tags: [producao, kanban, montagem]
papeis: [admin, manager, production]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Acesse em **PRODUÇÃO → Montagem** (`/producao/montagem`).
- Uma linha por equipamento; ação principal muda conforme o status.
- 4 status: **Não iniciada → Em andamento → Concluída** (ou → **Bloqueada** a qualquer momento).
- Cada transição fica auditada (autor, timestamp, motivo).
:::

## Passo a passo

:::step{n="1" title="Abrir a fila de montagem" img="01-montagem-kanban.png" alt="Tela Montagem com KPIs, filtros e lista de equipamentos"}
Menu **PRODUÇÃO → Montagem**. Os KPIs no topo funcionam como filtros rápidos — clique num deles para ver só aquele status.
:::

:::step{n="2" title="Iniciar a montagem" img="01-montagem-kanban.png" alt="Linha com botão Iniciar destacado"}
Na linha do equipamento em **Não iniciada**, clique **Iniciar**. O status muda para **Em andamento** e o cronômetro começa a valer para relatórios de tempo de ciclo.
:::

:::step{n="3" title="Abrir a montagem"}
Clique na linha (ou no código do equipamento) para abrir o detalhe. No detalhe você vê as **sub-etapas** herdadas do ETP: pré-montagem, montagem mecânica, elétrica, testes internos, embalagem. Cada uma tem responsável, prazo, checklist e anexos.
:::

:::step{n="4" title="Bloquear com motivo"}
Se algo trava a linha (peça em atraso, dúvida técnica, retrabalho externo), clique **Bloquear**. Selecione o motivo:

- **Peça faltante** — vincule à OC / solicitação pendente.
- **Projeto ambíguo** — retorna item para Engenharia revisar.
- **Retrabalho externo** — vincule ao fornecedor responsável.
- **Outro** — exige descrição livre + anexo.

Um bloqueio limpa o cronômetro produtivo mas mantém o histórico.
:::

:::step{n="5" title="Concluir a montagem"}
Quando todas as sub-etapas fecham (checklists ok, evidências anexadas), o botão **Concluir montagem** habilita. Ao concluir, a linha vira **Concluída**; o passo seguinte é [Liberar para FAT](/ajuda/documentacao/producao/liberar-para-fat).
:::

:::dica
Use o filtro por **prazo** para priorizar o que está mais perto do fim da janela. Bloqueadas na parte de cima da tela ajudam o supervisor a agir cedo.
:::

:::atencao
Nunca "concluir manualmente" pulando checklists — isso quebra rastreabilidade. Se falta uma evidência, anexe antes de fechar.
:::

## Ver também

- [Executar etapa](/ajuda/documentacao/producao/executar-etapa)
- [Retrabalho e NC interna](/ajuda/documentacao/producao/retrabalho-e-nc-interna)

<!-- SHOTS:AUTO -->

## Imagens da tela

:::step{n="1" title="Kanban de montagem por linha e etapa" img="kanban-montagem-1.png" alt="Kanban de montagem por linha e etapa"}
Kanban de montagem por linha e etapa
:::

<!-- /SHOTS:AUTO -->
