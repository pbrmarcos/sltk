---
title: Formulários de Entrevista (catálogo)
description: Editar perguntas, opções e gatilhos de "Descreva" por segmento — o catálogo que alimenta as entrevistas comerciais.
category: admin
slug: formularios-entrevista
tipo: passo-a-passo
nivel: intermediario
tags: [entrevista, catalogo, segmentos, admin]
papeis: [admin, manager]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::resumo
- `/admin/entrevistas` lista os **segmentos** (Trigo, Amendoim, Café…) — cada um tem seu próprio conjunto de perguntas.
- Cada pergunta guarda enunciado em **PT/ES/EN**; use o assistente de tradução para preencher ES/EN em massa.
- Opções podem ter **"Descreva"** habilitado; se o label da opção termina com `:`, ele vira o rótulo do campo (ex.: "Descreva o fluxo atual:").
- Alterações valem para **entrevistas novas** — as já criadas mantêm o snapshot de perguntas vigente na criação.
:::

## Estrutura

- **Segmento** — agrupador (equivalente a "tipo de equipamento/produto").
- **Pergunta** — enunciado + formato (`text`, `textarea`, `single_choice`, `multi_choice`, `number`, `country`).
- **Opção** — apenas em perguntas de escolha; tem flag `tem_descricao`.
- **Matriz de contato** — sequência de perguntas de Nome/E-mail/WhatsApp por papel (Gerente de Produção, Manutenção…) é agrupada automaticamente numa **grade** no formulário público.

## Passo a passo

:::step{n="1" title="Abrir o catálogo" img="formularios-entrevista-1.png" alt="Tela /admin/entrevistas listando os segmentos disponíveis com contadores de perguntas"}
Em `/admin/entrevistas`, clique no segmento que deseja editar. O editor abre com a lista de perguntas ordenadas.
:::

:::step{n="2" title="Editar uma pergunta"}
Cada linha permite editar enunciado em PT/ES/EN, marcar como **obrigatória**, mudar formato e reordenar por drag-and-drop. Para escolhas, adicione/remova opções e marque **"tem Descreva"** onde o cliente deve justificar.
:::

:::dica
Use o botão **Traduzir com IA** para preencher automaticamente ES e EN a partir do PT. Revise antes de salvar — o modelo pode encurtar frases muito longas.
:::

:::step{n="3" title="Salvar"}
Toda edição gera **auditoria** (quem, quando, o quê). Entrevistas já geradas antes da edição continuam com o layout antigo — abra uma nova entrevista para o cliente responder o catálogo atualizado.
:::

## Regras úteis

- **Sim/Não** dispara automaticamente um campo **Descreva** — não precisa modelar duas perguntas.
- Perguntas de contato com padrão `Nome do <papel>`, `E-mail do <papel>`, `WhatsApp do <papel>` viram uma matriz por linha no formulário público.
- O idioma default de uma entrevista nova vem de `entrevistas.idioma_default`; o cliente pode trocar a qualquer momento.

## Ver também

- [Entrevistas técnicas por segmento (comercial)](/ajuda/documentacao/comercial/entrevistas)
- [Trilha de auditoria](/ajuda/documentacao/admin/auditoria)

<!-- SHOTS:AUTO -->

## Imagens da tela

:::step{n="1" title="Acesso restrito" img="formularios-entrevista-1.png" alt="Acesso restrito"}
Acesso restrito
:::

<!-- /SHOTS:AUTO -->
