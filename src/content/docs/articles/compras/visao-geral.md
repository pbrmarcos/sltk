---
title: Visão geral de Compras
description: Como o módulo conduz solicitação → cotação → ordem de compra com aprovação e auditoria.
category: compras
slug: visao-geral
tipo: conceito
nivel: iniciante
tags: [compras, fluxo, solicitacao, cotacao, oc]
papeis: [admin, manager, purchasing]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- **Fluxo:** Solicitação → Cotação → Ordem de Compra (OC) → Recebimento.
- Cada passo é auditado (quem, quando, o quê).
- Solicitações nascem do **BOM** do projeto ou de forma **avulsa**.
- OCs passam por **alçada de aprovação** antes de serem enviadas.
:::

## O que o módulo entrega

O módulo Compras transforma necessidades técnicas (materiais e serviços) em pedidos formais, rastreáveis, com preço negociado e prazo firmado. Nada é "comprado no WhatsApp" — cada item vira registro.

## Estrutura do fluxo

```text
Engenharia/Produção          Compras                      Fornecedor
─────────────────────        ───────────────────          ────────────
BOM / avulso  ──►  Solicitação  ──►  Cotação (Checklist)  ──►  Propostas
                                       │
                                       ▼
                              Escolha vencedora
                                       │
                                       ▼
                                Ordem de Compra  ──►  Envio
                                       │
                                       ▼
                                Aprovação (alçada)
                                       │
                                       ▼
                                 Recebimento
```

:::step{n="1" title="Onde vive cada etapa" img="01-solicitacao.png" alt="Tela de solicitações de compra com filtros por status, criticidade e disciplina"}
Cada etapa tem sua própria tela no menu **COMPRAS**:

- **Solicitações de Compra** — insumos pedidos pelos projetos, por disciplina.
- **Cotações** — Checklists enviadas para múltiplos fornecedores.
- **Ordens de Compra** — pedidos formais gerados a partir da cotação vencedora.
- **Fornecedores** — cadastro e homologação.
:::

:::step{n="2" title="Cotações concorrenciais" img="02-cotacoes-lista.png" alt="Lista de cotações mostrando fornecedores convidados, propostas recebidas e status"}
Toda solicitação relevante passa por cotação com pelo menos 3 fornecedores. A tela lista cotações em andamento, encerradas e vencedoras com resumo de valores.
:::

:::step{n="3" title="OC com aprovação por alçada" img="03-ordens-lista.png" alt="Lista de ordens de compra com colunas de valor, aprovador, status e fornecedor"}
A Ordem de Compra herda os dados da cotação escolhida e entra em fila de aprovação. Alçadas são configuradas em **Administração → Configurações**.
:::

:::dica
Use os filtros de **criticidade** (Crítica / Alta / Normal) para priorizar compras que travam produção.
:::

:::atencao
Nunca crie OC direto sem cotação, exceto em casos formalmente autorizados (emergência, contrato guarda-chuva). Todos os desvios ficam registrados na auditoria.
:::

## Papéis

- `purchasing` — cria/edita solicitações, cotações e OCs; envia para aprovação.
- `manager` — aprova OCs até sua alçada; vê tudo.
- `admin` — aprova qualquer valor, configura alçadas e fornecedores.
- `engineer` — cria solicitações a partir do BOM, sem aprovar OC.

## Ver também

- [Criar solicitação de compra](/ajuda/documentacao/compras/criar-solicitacao)
- [Cotação com múltiplos fornecedores](/ajuda/documentacao/compras/cotacao-multiplos-fornecedores)
- [Emitir e aprovar ordem de compra](/ajuda/documentacao/compras/emitir-e-aprovar-oc)
- [Auditoria de compras](/ajuda/documentacao/compras/auditoria-de-compras)
