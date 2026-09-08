---
title: Busca e organização
description: Como encontrar itens em Know-how, filtrar por coleção, tag ou papel-alvo — e como usar favoritos e histórico.
category: know-how
slug: busca-e-organizacao
tipo: guia
nivel: iniciante
tags: [know-how, busca, filtro, tag, favorito]
papeis: [admin, manager, engineer, production, assembly, field, sales, purchasing]
atualizado_em: 2026-09-07
app_version: "0.99.4"
---

:::tldr
- A busca em `/know-how` procura por palavra no **título, resumo e corpo** do item.
- Filtros disponíveis: **coleção, tags, status e papel-alvo**.
- **Favoritos** ficam numa aba própria, pessoal por usuário.
- **Histórico** guarda os últimos itens que você abriu.
- O atalho global **Ctrl+K** (⌘K no Mac) busca páginas, clientes, equipamentos e projetos — não busca dentro do conteúdo de Know-how.
:::

## Buscar

:::step{n="1" title="Campo de busca da lista"}
Em `/know-how`, o campo de busca no topo aceita palavras-chave e procura por correspondência parcial em título, resumo e corpo do item.
:::

:::step{n="2" title="Filtros"}
Use os seletores de **coleção** (Montagem, Elétrica, Comissionamento, FAT/SAT, Comercial, Compras, Segurança…), **tags** e **papel-alvo** para restringir a lista. Os filtros se combinam com a busca por palavra.
:::

## Abas: Todos, Favoritos, Histórico

| Aba | O que mostra |
|---|---|
| **Todos** | Itens publicados, agrupados por coleção, com os filtros aplicados |
| **Favoritos** | Itens que você marcou com a estrela — pessoal, não afeta outros usuários |
| **Histórico** | Itens que você abriu recentemente |

:::atencao
Se uma coleção for desativada por um admin, os itens dela somem da aba "Todos" — mas continuam aparecendo em Favoritos e Histórico, já que essas abas não dependem da coleção estar ativa.
:::

## Marcar favorito

:::step{n="1" title="Abrir o item"}
Em `/know-how/$slug`, clique na estrela ao lado do título para favoritar ou desfavoritar.
:::

## Organização

| Recurso | Onde é definido | Uso |
|---|---|---|
| **Coleção** | Escolhida na criação do item | Agrupa por família de equipamento/área |
| **Tag** | Autor adiciona ao criar/editar | Livre — `troubleshooting`, `start-up`, `seguranca` |
| **Papel-alvo** | Opcional, na criação | Etiqueta de navegação — não restringe quem vê o item publicado |

:::dica
Alinhe com seu `manager` uma lista mínima de tags, evitando variações (`seguranca` vs `segurança`, `start-up` vs `startup`) — tag sem padrão dificulta achar o conteúdo depois.
:::

## Buscar de qualquer tela

**Ctrl+K** (ou **⌘K** no Mac) abre a busca global do sistema, que cobre páginas de navegação, clientes, equipamentos e projetos. Ela não indexa o conteúdo de Know-how — para achar um artigo, vídeo, PDF ou checklist, use a busca dentro de `/know-how`.

## Ver também

- [Visão geral do Know-how](/ajuda/documentacao/know-how/visao-geral)
- [Publicar conteúdo](/ajuda/documentacao/know-how/publicar-conteudo)
