---
title: Converter oportunidade em orçamento
description: Como usar o wizard de conversão para transformar uma oportunidade ganha em orçamento e projeto.
category: comercial
slug: converter-oportunidade-em-orcamento
tipo: guia
nivel: intermediario
tags: [oportunidade, orcamento, wizard, etp]
papeis: [admin, manager, sales]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Ao marcar **Ganho**, o wizard pré-preenche cliente, escopo e itens iniciais no orçamento.
- Você pode gerar orçamento, ETP na Engenharia, ou os dois em um clique.
- Reversão só é possível em ≤24h e sem movimentação em Engenharia.
:::

## Antes de começar

- A oportunidade precisa estar em **Proposta** ou **Negociação**.
- Cliente precisa ter CNPJ/RUT cadastrado.
- Papel `sales` (dono), `manager` ou `admin`.

## Passo a passo

:::step{n="1" title="Marcar como ganho" img="01-pipeline.png" alt="Kanban do pipeline com coluna Ganho à direita e cards com botão Gerar orçamento"}
No pipeline, arraste o card até a coluna **Ganho** ou clique **Gerar orçamento / Marcar ganho** direto no card.
:::

:::step{n="2" title="Revisar o wizard de conversão"}
O wizard abre com três blocos pré-preenchidos:

- **Cliente e escopo** — herdados da oportunidade (empresa, contato, escopo técnico).
- **Itens iniciais** — sugestões baseadas no equipamento e na BOM padrão do cliente.
- **Próximos passos** — três opções:
  - Gerar apenas orçamento.
  - Gerar orçamento + abrir ETP.
  - Concluir apenas (útil quando o orçamento já existe).
:::

:::step{n="3" title="Ajustar itens e condições preliminares"}
Você pode remover/adicionar itens antes de gerar. Confirme moeda, prazo estimado e observações. Este é o ponto para alinhar diferenças entre o que foi negociado e o que foi originalmente proposto.
:::

:::step{n="4" title="Concluir"}
Clique **Concluir**. Você é levado à tela do orçamento em rascunho para revisar e gerar PDF.
:::

## O que o sistema faz automaticamente

- Cria o orçamento em **rascunho** em `/comercial/orcamento/$id` com os itens sugeridos.
- (Opcional) Cria um **ETP** em Engenharia vinculado à oportunidade.
- Move o card do pipeline para **Ganho** e trava o valor estimado original (agora existe valor real via orçamento).
- Cliente passa de **Prospect** → **Ativo** (se aplicável).
- Notifica `manager` e `engineer` responsáveis.

## Erros comuns

:::erro{title='Sem opção "Marcar ganho"'}
O card precisa estar em **Proposta** ou **Negociação**. Se está em **Novo** ou **Qualificado**, mova antes.
:::

:::erro{title="Wizard não sugere itens"}
O cliente ainda não tem BOM importada. Você pode adicionar itens manualmente ou pular esta etapa e preencher direto no orçamento.
:::

## Reabrir oportunidade convertida por engano

:::atencao
Se a conversão foi por engano e faz **menos de 24h** sem movimentação em Engenharia, `manager`/`admin` pode usar **Ações → Reverter fechamento**. Após 24h, o caminho é fechar como Perdido com motivo "Erro operacional" e criar a oportunidade correta. Ver [Fechar oportunidade](/ajuda/documentacao/comercial/fechar-oportunidade).
:::

## Ver também

- [Fechar oportunidade — Ganho ou Perdido](/ajuda/documentacao/comercial/fechar-oportunidade)
- [Pipeline de oportunidades](/ajuda/documentacao/comercial/pipeline-de-oportunidades)
- [Novo orçamento passo a passo](/ajuda/documentacao/comercial/novo-orcamento)
