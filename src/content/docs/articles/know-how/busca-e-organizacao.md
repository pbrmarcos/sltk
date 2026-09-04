---
title: Busca e organização
description: Como encontrar rapidamente artigos, filtrar por coleção, tag ou papel — e como usar favoritos e histórico.
category: know-how
slug: busca-e-organizacao
tipo: guia
nivel: iniciante
tags: [know-how, busca, filtro, tag, favorito]
papeis: [admin, manager, engineer, quality, production, assembly, field, support, sales, purchasing]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Busca em `/know-how` cobre **título, corpo e legendas de vídeo** indexadas.
- Filtros: **coleção, tag, tipo** (artigo/vídeo/checklist), **papel-alvo, atualização**.
- **Favoritos** ficam fixados na sua home do Know-how.
- **Histórico** guarda os últimos 20 artigos que você abriu.
- Buscar de qualquer tela com **Ctrl+K** filtra globalmente incluindo Know-how.
:::

## Buscar

:::step{n="1" title="Barra de busca da home"}
Em `/know-how`, o campo do topo aceita palavras-chave. A busca casa por prefixo e por conteúdo (full-text) — não precisa termo exato.
:::

:::step{n="2" title="Usar operadores"}
- `"start-up envasadora"` — busca a frase exata entre aspas.
- `tag:seguranca` — restringe por tag.
- `tipo:video` — só vídeos.
- `atualizado:>2026-01-01` — publicados/atualizados depois da data.
:::

:::step{n="3" title="Filtros na barra lateral"}
Marque **coleção** (Envasadoras, Rotuladoras, Compras…), **tag**, **tipo**, **papel-alvo** e **período de atualização**. Os filtros se combinam.
:::

## Organização

| Recurso | Onde | Uso |
|---|---|---|
| **Coleção** | Definida na criação do artigo | Agrupa por família de equipamento/área |
| **Tag** | Autor adiciona no rodapé | Livre — `troubleshooting`, `start-up`, `seguranca` |
| **Papel-alvo** | Frontmatter do artigo | Aparece com destaque para o papel certo |
| **Favoritos** | ⭐ no artigo | Fixa na home pessoal |
| **Histórico** | Automático | Últimos 20 artigos abertos |

## Marcar favorito

:::step{n="1" title="Abrir o artigo"}
Em `/know-how/artigo/$slug`, clique no ⭐ ao lado do título.
:::

:::step{n="2" title="Reordenar"}
Na sua home, arraste os favoritos para a ordem que quiser. A ordem é pessoal, não afeta outros usuários.
:::

## Buscar de qualquer tela

**Ctrl+K** (ou **⌘K** no Mac) abre a busca global. Ela retorna resultados de páginas, projetos e **Know-how** juntos — quando o resultado for de Know-how, aparece com ícone de livro.

:::dica
Para dúvidas urgentes em campo, marque como favorito os checklists mais usados (start-up, LOTO, apresentação de FAT) — mesmo offline temporariamente o navegador serve o último cache.
:::

:::atencao
Tags sem padrão viram lixo. Alinhe com `manager` uma lista mínima de tags oficiais e evite variações (`seguranca` vs `segurança`, `start-up` vs `startup`).
:::

## Ver também

- [Visão geral do Know-how](/ajuda/documentacao/know-how/visao-geral)
- [Trilhas de aprendizado](/ajuda/documentacao/know-how/trilhas)
- [Certificações](/ajuda/documentacao/know-how/certificacoes)
