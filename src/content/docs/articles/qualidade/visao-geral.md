---
title: Visão geral da Qualidade
description: Como o módulo conduz revisões de projeto e o ciclo de FAT antes da entrega ao cliente.
category: qualidade
slug: visao-geral
tipo: conceito
nivel: iniciante
tags: [qualidade, revisao, fat, fluxo]
papeis: [admin, manager, quality]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- **Duas frentes:** Revisões de projeto (Mecânica / Elétrica) + Ciclo de FAT.
- Menus: **Revisão Mecânica**, **Revisão Elétrica**, **FAT** (`/qualidade/fat`).
- FAT = **template escolhido → agendamento → execução → encerramento**.
- Reprovações viram **RNC** e voltam para Engenharia ou Produção.
:::

## O que o módulo entrega

Qualidade garante que o projeto foi revisado antes de comprar/produzir e que o equipamento está conforme antes de sair da fábrica. Tudo é registrado com evidência.

## Estrutura do fluxo

```text
Engenharia            Qualidade                    Produção
───────────           ────────────────             ─────────
ETP (mec/ele)  ──►  Revisão Mecânica  ──►  BOM liberado ──► Compras
                    Revisão Elétrica

Produção         Qualidade                       Cliente
──────────       ─────────────                   ────────
Liberado p/FAT ──►  FAT (template)  ──►  Encerra  ──►  Entrega
                          │
                          └─► RNC (retrabalho) ──► volta p/ Produção
```

:::step{n="1" title="Revisões antes de liberar o BOM" img="03-revisao-mecanica.png" alt="Tela Revisão Mecânica com lista de projetos aguardando revisão e checklist por item"}
Antes de Engenharia liberar o ETP, a Qualidade valida o projeto **mecânico** (`/qualidade/revisao-mecanica`) e **elétrico** (`/qualidade/revisao-eletrica`). Cada tela traz o checklist da disciplina.
:::

:::step{n="2" title="Fila de FAT" img="01-fat-lista.png" alt="Lista de FATs com número, equipamento, cliente, status e responsável"}
Menu **QUALIDADE → FAT**. Cada FAT nasce automaticamente quando a Produção libera o equipamento. Você agenda, executa, aprova/reprova, encerra.
:::

:::step{n="3" title="Detalhe do FAT" img="05-fat-detalhe.png" alt="Detalhe do FAT com abas Checklist, Anexos, Participantes, Encerramento"}
No detalhe você vê: checklist do template escolhido, participantes (cliente + interno), anexos, RNCs relacionadas, encerramento.
:::

:::dica
Antes de agendar com cliente, faça o **pré-FAT interno**. Reduz reprovação, ganha confiança do cliente.
:::

:::atencao
Nunca "encerrar FAT com pendências". Ou tudo passou, ou virou **RNC** com plano de tratamento.
:::

## Papéis

- `quality` — cria e executa FATs, aprova/reprova, valida revisões.
- `manager` / `admin` — aprovam templates, veem tudo.
- `engineer` — apoia revisões e trata RNCs de projeto.
- `production` — trata RNCs de execução.

## Ver também

- [Templates de FAT](/ajuda/documentacao/qualidade/templates-fat)
- [Agendar e preparar FAT](/ajuda/documentacao/qualidade/agendar-e-preparar-fat)
- [Executar FAT](/ajuda/documentacao/qualidade/executar-fat)
- [Encerrar FAT](/ajuda/documentacao/qualidade/encerrar-fat)
- [RNC e reprovação](/ajuda/documentacao/qualidade/rnc-e-reprovacao)
