---
title: Criar solicitação de compra
description: Como abrir uma solicitação de compra a partir do BOM do projeto ou de forma avulsa.
category: compras
slug: criar-solicitacao
tipo: guia
nivel: iniciante
tags: [solicitacao, requisicao, compras, bom]
papeis: [admin, manager, purchasing, engineer]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Vá em **COMPRAS → Solicitações de Compra** (`/compras/solicitacao`).
- Solicitações **automáticas** vêm dos BOMs de projetos liberados.
- Para itens fora do BOM, use **Nova solicitação avulsa**.
- Defina **criticidade** e **disciplina** — elas determinam prioridade e fluxo.
:::

## Antes de começar

Você precisa do papel `engineer`, `purchasing`, `manager` ou `admin`. Solicitações vinculadas a projeto exigem que o ETP esteja liberado.

## Passo a passo

:::step{n="1" title="Abrir a tela de solicitações" img="01-solicitacao.png" alt="Tela Solicitações de Compra com KPIs de Itens listados, Críticos/Alta e Categorias com demanda, e lista abaixo"}
Menu **COMPRAS → Solicitações de Compra**. No topo você vê:

- **Itens listados** — total consolidado.
- **Críticos / Alta** — atenção imediata.
- **Categorias com demanda** — agrupamento por família.

A aba **Auditoria** mostra o histórico de mudanças. A lista traz descrição, origem (aba EQP / avulso), disciplina, quantidade, criticidade e status.
:::

:::step{n="2" title="Filtrar e localizar" img="01-solicitacao.png" alt="Barra de filtros com busca por descrição, status, criticidade e disciplina"}
Use a barra de filtros:

- **Buscar** por descrição, código ou part number.
- **Status** — Rascunho, Pronto p/ aprovação, Aprovado, Em cotação, etc.
- **Criticidade** — Crítica / Alta / Normal.
- **Disciplina** — Elétrica / Mecânica / Automação / etc.
:::

:::step{n="3" title="Solicitação vinda do BOM" img="01-solicitacao.png" alt="Item listado com origem Aba EQP indicando que veio do BOM do projeto ENV-1014"}
Itens com origem **Aba EQP** (ex.: `ENV-1014 · eletrico`) foram gerados automaticamente pelo BOM da engenharia. Você apenas revisa quantidade, criticidade e envia para cotação.
:::

:::step{n="4" title="Nova solicitação avulsa"}
Para itens fora do BOM (ferramenta, consumível, serviço), clique em **+ Nova solicitação** e preencha:

- **Descrição** clara (marca, modelo, especificação técnica).
- **Quantidade e unidade** (un / cj / m / kg).
- **Disciplina** e **Categoria**.
- **Criticidade** — Crítica trava produção; Alta ameaça prazo; Normal é planejável.
- **Necessidade em** — data-alvo do recebimento.
- **Projeto** (opcional) — se estiver ligado a um ETP.
:::

:::step{n="5" title="Enviar para aprovação/cotação"}
Salve como **Rascunho** para continuar depois, ou mude o status para **Pronto p/ aprovação**. Após aprovação, o item entra na fila de **Cotação**.
:::

:::dica
Descrição ruim = cotação ruim. Sempre inclua fabricante, modelo, tensão, faixa, material — quanto mais específico, menos ida-e-volta com fornecedor.
:::

:::atencao
Marcar **Crítica** sem necessidade real desgasta o processo. Reserve para itens que efetivamente param linha ou embarque.
:::

:::erro
**"Não consigo salvar — projeto obrigatório"** → alguns tipos de item exigem vínculo com projeto. Ou selecione o projeto, ou mude a categoria para uma que aceite avulso.
:::

## Ver também

- [Cotação com múltiplos fornecedores](/ajuda/documentacao/compras/cotacao-multiplos-fornecedores)
- [Emitir e aprovar OC](/ajuda/documentacao/compras/emitir-e-aprovar-oc)
- [Visão geral de Compras](/ajuda/documentacao/compras/visao-geral)

<!-- SHOTS:AUTO -->

## Imagens da tela

:::step{n="1" title="Formulário de nova solicitação de compra" img="criar-solicitacao-1.png" alt="Formulário de nova solicitação de compra"}
Formulário de nova solicitação de compra
:::

<!-- /SHOTS:AUTO -->
