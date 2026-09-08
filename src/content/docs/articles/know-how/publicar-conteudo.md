---
title: Publicar conteúdo (fluxo rascunho → revisão → publicado)
description: Como criar um item, enviar para revisão e ver o que acontece quando é aprovado ou devolvido para ajuste.
category: know-how
slug: publicar-conteudo
tipo: passo-a-passo
nivel: intermediario
tags: [know-how, publicacao, revisao, aprovacao]
papeis: [admin, manager, engineer]
atualizado_em: 2026-09-07
app_version: "0.99.4"
---

:::tldr
- Autoria: `engineer`, `manager`, `admin` criam rascunhos em `/know-how/novo`.
- Publicar exige aprovação de `manager` ou `admin` na fila de revisão — não existe autopublicação.
- Enquanto o item não é publicado, o próprio autor pode editá-lo livremente.
- Depois de publicado, só `manager`/`admin` podem editar.
:::

## Criar rascunho

:::step{n="1" title="Novo item"}
Em `/know-how/novo`, escolha o tipo (artigo, vídeo, PDF ou checklist), a coleção, título, resumo, corpo e tags. Papéis-alvo é opcional e serve só como filtro de navegação — não restringe quem verá o item depois de publicado.
:::

:::step{n="2" title="Anexar mídia (opcional)"}
Para vídeo ou PDF, faça upload do arquivo. Ele fica em um bucket privado; o link de visualização é gerado sob demanda (expira depois de um tempo, então não compartilhe a URL diretamente).
:::

## Enviar para revisão

Ao terminar o rascunho, clique em **Enviar para revisão**. O item sai da lista de rascunhos e passa a aparecer em `/know-how/revisar`, visível para `manager`/`admin`.

:::step{n="1" title="Fila de revisão"}
Em `/know-how/revisar`, `manager`/`admin` veem todos os itens com status "em revisão", de qualquer autor.
:::

:::step{n="2" title="Aprovar ou devolver"}
O revisor escolhe **Aprovar** (publica o item imediatamente) ou **Solicitar ajuste** (devolve para rascunho, para o autor revisar e reenviar).
:::

## Depois de publicado

- O item aparece nas listagens e na busca de `/know-how` para todos os usuários autenticados.
- Uma cópia da versão anterior é salva internamente no momento da aprovação, mas hoje não há tela para consultá-la — trate a publicação como a versão vigente.
- Só `manager`/`admin` podem editar um item já publicado.

:::atencao
`production`, `assembly`, `field`, `sales`, `purchasing` não criam nem aprovam itens — só consomem (leem, favoritam, imprimem). Se alguém desses papéis tiver uma sugestão de conteúdo, peça para um `engineer`/`manager` criar o item.
:::

:::erro{title="Não consigo editar um item"}
Se o item já está publicado, só `manager`/`admin` editam. Se é um rascunho seu que já foi enviado para revisão, espere o retorno do revisor (aprovado ou devolvido) antes de editar de novo.
:::

## Imprimir ou exportar em PDF

Todo item tem a ação **Imprimir / PDF** em `/know-how/imprimir/$slug`, que abre uma versão limpa da página (sem menu lateral) pronta para "Salvar como PDF" no diálogo de impressão do navegador. Útil para levar checklists ao chão de fábrica.

## Ver também

- [Visão geral](/ajuda/documentacao/know-how/visao-geral)
- [Busca e organização](/ajuda/documentacao/know-how/busca-e-organizacao)
