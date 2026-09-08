---
title: Visão geral do Know-how
description: Base de conhecimento interna com artigos, vídeos, PDFs e checklists — como o time captura, organiza e revisa saber técnico.
category: know-how
slug: visao-geral
tipo: conceito
nivel: iniciante
tags: [know-how, base, treinamento]
papeis: [admin, manager, engineer, production, assembly, field, sales, purchasing]
atualizado_em: 2026-09-07
app_version: "0.99.4"
---

:::tldr
- Base de conhecimento interna em `/know-how` — artigos, vídeos, PDFs e checklists.
- **Autoria**: `engineer`, `manager` e `admin`; **consumo**: todos os papéis autenticados.
- Todo conteúdo passa por **revisão** antes de publicar (rascunho → em revisão → publicado).
- **Aprovar/devolver para ajuste** é ação restrita a `manager`/`admin`.
- Favoritos e histórico de leitura são pessoais, por usuário.
:::

## Estrutura do módulo

| Rota | O que faz |
|---|---|
| `/know-how` | Lista de itens com abas Todos / Favoritos / Histórico, busca e filtros |
| `/know-how/$slug` | Leitura do item, com mídia anexa quando houver |
| `/know-how/novo` | Criar novo item (artigo, vídeo, PDF ou checklist) |
| `/know-how/revisar` | Fila de itens em revisão (só `manager`/`admin`) |
| `/know-how/imprimir/$slug` | Versão limpa para imprimir ou salvar como PDF |

## Tipos de conteúdo

| Tipo | Uso ideal |
|---|---|
| **Artigo** | Procedimento, referência técnica, troubleshooting |
| **Vídeo** | Passo-a-passo prático de montagem, ajuste, inspeção |
| **PDF** | Documento pronto (manual, desenho, ficha técnica) |
| **Checklist** | Verificação campo-a-campo (start-up, manutenção preventiva) |

Itens são organizados em **coleções** fixas (Montagem, Elétrica, Comissionamento, FAT/SAT, Comercial, Compras, Segurança) — a coleção é escolhida na criação e usada como filtro.

## Papéis e permissões

| Ação | Quem pode |
|---|---|
| Ver itens publicados | Qualquer usuário autenticado |
| Criar item (rascunho) | `engineer`, `manager`, `admin` |
| Editar um item | O próprio autor, enquanto o item não estiver publicado; ou `manager`/`admin` a qualquer momento |
| Enviar para revisão | O próprio autor (rascunho dele) ou `manager`/`admin` |
| Aprovar (publicar) ou devolver para ajuste | Só `manager`/`admin` |

O campo **"Papéis-alvo"** de um item é só uma etiqueta de navegação/filtro — não restringe quem consegue ver o conteúdo publicado. Veja [Busca e organização](/ajuda/documentacao/know-how/busca-e-organizacao).

## Ciclo de vida de um item

:::step{n="1" title="Rascunho"}
Autor cria em `/know-how/novo`: tipo, coleção, título, resumo, corpo, tags e, opcionalmente, mídia anexada. Pode editar livremente enquanto não publicar.
:::

:::step{n="2" title="Enviar para revisão"}
Autor clica em **Enviar para revisão**. O item passa a aparecer em `/know-how/revisar` para `manager`/`admin`.
:::

:::step{n="3" title="Revisão"}
Um `manager`/`admin` abre o item na fila de revisão e escolhe **Aprovar** (publica) ou **Solicitar ajuste** (devolve para rascunho, para o autor corrigir e reenviar).
:::

:::step{n="4" title="Publicado"}
Aparece nas listagens e na busca do módulo para todos os usuários autenticados. Só `manager`/`admin` (ou o autor, se por algum motivo o item voltar a rascunho) podem editar a partir daqui.
:::

:::atencao
Não existe hoje uma tela de histórico de versões nem exclusão pela interface — publicar é a etapa final visível ao usuário comum.
:::

## Ver também

- [Publicar conteúdo](/ajuda/documentacao/know-how/publicar-conteudo)
- [Busca e organização](/ajuda/documentacao/know-how/busca-e-organizacao)
