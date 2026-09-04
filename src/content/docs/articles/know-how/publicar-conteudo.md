---
title: Publicar conteúdo (fluxo rascunho → revisão → publicado)
description: Como criar um artigo, submeter a revisão, incorporar comentários e publicar — com a política de aprovação obrigatória.
category: know-how
slug: publicar-conteudo
tipo: passo-a-passo
nivel: intermediario
tags: [know-how, publicacao, revisao, aprovacao]
papeis: [admin, manager, engineer, quality]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Autoria: `engineer`, `quality`, `manager`, `admin` criam rascunho.
- Publicar exige aprovação de **revisor** (`manager` ou dono da coleção) — imposto por RLS.
- Blocos suportados: texto rich, imagem, vídeo (upload ou embed), checklist, anexo, código.
- Edições em artigo publicado geram nova revisão — a versão anterior continua acessível pelo histórico.
:::

## Criar rascunho

:::step{n="1" title="Novo artigo" img="know-how-novo.png" alt="Editor de novo artigo do Know-how com título, coleção, tags e blocos"}
Em `/know-how/novo`, informe título, coleção e tags. Selecione papéis-alvo (quem verá o artigo publicado). Adicione blocos: texto, imagem, vídeo, checklist, anexo, código.
:::

## Submeter a revisão

Ao terminar o rascunho, clique em **Enviar para revisão**. O sistema notifica o dono da coleção e os `manager`. O rascunho vira estado **Em revisão** e você não pode mais editar até receber feedback.

:::step{n="2" title="Fila de revisão" img="know-how-revisar.png" alt="Lista de artigos aguardando revisão com autor, coleção e data"}
Revisores acessam `/know-how/revisar`, abrem o artigo, comentam trecho a trecho e escolhem **Aprovar** ou **Devolver para ajustes**. O autor recebe notificação com os comentários.
:::

## Publicar

O botão **Publicar** só habilita depois da aprovação registrada. Após publicar:

- O artigo aparece para os papéis-alvo.
- Notificação é enviada aos usuários que seguem a coleção.
- Contadores de leitura, favoritos e comentários começam a rodar.

:::dica
Antes de submeter, releia com o olhar do operacional (`production`/`assembly`): frases curtas, imagem por passo, checklist final. O quiz da trilha depende disso.
:::

## Editar depois de publicado

Edições geram **nova revisão** — a anterior continua acessível pelo botão **Histórico**. Se a mudança altera procedimento (não só ortografia), marque **Requer relerão** — todos os certificados dessa trilha voltam a "pendente".

:::atencao
`production`, `assembly`, `field`, `support`, `sales`, `purchasing` **não** criam item. Se um operador tem sugestão, ele comenta em artigo existente ou abre chamado interno para autoria produzir.
:::

:::erro{title="Botão Publicar está desabilitado"}
Falta aprovação registrada — verifique em **Histórico de revisão** se o revisor aprovou ou apenas comentou. Reenvie se necessário.
:::

## Imprimir ou exportar em PDF

Todo material publicado tem a ação **Imprimir / PDF**, que abre uma versão limpa da página (sem menu lateral nem barras do app) pronta para "Salvar como PDF" no diálogo de impressão do navegador. Use para levar checklists ao chão de fábrica ou anexar um procedimento a um chamado.

## Ver também

- [Visão geral](/ajuda/documentacao/know-how/visao-geral)
- [Trilhas](/ajuda/documentacao/know-how/trilhas)
- [Certificações](/ajuda/documentacao/know-how/certificacoes)
