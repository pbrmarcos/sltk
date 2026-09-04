---
title: Corrigir orçamento (nova revisão)
description: Como duplicar um orçamento em nova revisão mantendo o histórico e marcando a versão vigente.
category: comercial
slug: corrigir-orcamento
tipo: guia
nivel: intermediario
tags: [orcamento, revisao, versionamento]
papeis: [admin, manager, sales]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- **Corrigir** cria uma nova revisão (v1.1.0, v1.2.0…) mantendo o histórico completo.
- Nunca se apaga a revisão anterior — ela fica em **Histórico**.
- O link público passa a apontar automaticamente para a versão vigente.
- Após **Ganho**, correções valem como **aditivo**, não como revisão.
:::

## Quando corrigir

- Cliente pediu ajuste de escopo, preço, prazo ou condição comercial.
- Erro identificado no PDF já enviado.
- Mudança de idioma para reemissão em outro país.
- Revisão de moeda ou impostos.

## Passo a passo

:::step{n="1" title="Abrir o orçamento" img="02-orcamento-lista.png" alt="Lista de orçamentos mostrando código, cliente, título, versão v1.0.0, idiomas PT/ES/EN, status Aprovado e botões de download"}
Acesse **Comercial → Orçamentos** e clique no código do orçamento que deseja corrigir. Você pode filtrar por código na busca.
:::

:::step{n="2" title="Clicar em Corrigir"}
No topo da tela do orçamento, clique **Corrigir**. O sistema abre uma cópia editável de todos os itens e condições, incrementando a versão (v1.0.0 → v1.1.0).
:::

:::step{n="3" title="Ajustar o que for necessário"}
Modifique quantidades, preços, condições, garantia, prazo. Você pode inclusive trocar o idioma ou a moeda. A prévia do PDF atualiza em tempo real.
:::

:::step{n="4" title="Gerar novo PDF"}
Clique **Gerar orçamento**. A nova revisão passa a ser a **vigente** automaticamente. A versão anterior é arquivada em **Histórico** dentro do próprio registro.
:::

## O que acontece com a versão anterior

- Continua acessível na aba **Histórico** do orçamento — nada é apagado.
- O link público (`/p/cotacao/$token`) enviado antes passa a apontar para a nova versão vigente. Isso é intencional: o cliente sempre vê a proposta mais recente.
- Cada revisão mantém seu próprio PDF nos 3 idiomas.

:::dica
Se precisar preservar o link antigo (ex.: cliente pediu para consultar uma versão histórica), gere um **novo compartilhamento** apontando explicitamente para uma revisão anterior, antes de corrigir.
:::

## Boas práticas

:::nota
- Registre o **motivo da correção** na descrição interna. Facilita a auditoria e ajuda no aprendizado do time.
- Prefira **poucas revisões grandes** a muitas pequenas. Cliente perde referência quando recebe v5, v6, v7 no mesmo dia.
- Se a mudança é pontual (só valor de 1 item), avalie se não vale mais um desconto negociado antes de gerar uma nova versão.
:::

:::atencao
Após a oportunidade ser **Ganha**, correções deixam de ser revisão de orçamento e passam a valer como **aditivo** — vinculado ao mesmo projeto, com sua própria numeração. Não use **Corrigir** nesse caso: abra a discussão em Engenharia/Compras.
:::

## Erros comuns

:::erro{title='"Corrigir" não aparece no topo'}
Você não tem permissão. Precisa de `sales` (dono da oportunidade), `manager` ou `admin`. Peça ao gerente para atribuir.
:::

:::erro{title="Cliente reclamou que o link mudou de conteúdo"}
Comportamento esperado — links públicos sempre apontam para a vigente. Explique ao cliente e, se necessário, envie um PDF da versão histórica direto de **Histórico**.
:::

## Ver também

- [Novo orçamento passo a passo](/ajuda/documentacao/comercial/novo-orcamento)
- [Nova revisão vs. nova oportunidade](/ajuda/faq) (FAQ)
- [Fechar oportunidade — Ganho ou Perdido](/ajuda/documentacao/comercial/fechar-oportunidade)
