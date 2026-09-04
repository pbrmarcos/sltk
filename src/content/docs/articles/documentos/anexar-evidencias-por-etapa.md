---
title: Anexar evidências por etapa (produção e qualidade)
description: Como enviar fotos, vídeos e PDFs no card da etapa e nos checklists de FAT/SAT — e como isso se propaga por cliente, projeto e auditoria.
category: documentos
slug: anexar-evidencias-por-etapa
tipo: passo-a-passo
nivel: iniciante
tags: [evidencia, anexo, etapa, producao, fat]
papeis: [production, quality, engineer, manager, admin]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Sempre anexe **no contexto que gerou** — card da etapa, item do FAT/SAT, timeline do chamado.
- Assim a evidência aparece automaticamente no cliente, no projeto e na auditoria.
- Limite: 5 arquivos por item, 50 MB cada, vídeo até 3 min.
- Anexo direto na Central perde indexação por etapa — evite.
:::

## De onde anexar

:::step{n="1" title="Kanban de produção" img="01-montagem-kanban.png" alt="Card de etapa aberto com checklist e botão para anexar evidência"}
Abra o card em `/producao/montagem` → aba **Checklist** → no item, clique em **Adicionar evidência**. Itens marcados como **evidência obrigatória** não aceitam Conforme sem anexo.
:::

:::step{n="2" title="FAT — execução" img="templates-fat.png" alt="Template de FAT com item de checklist exigindo evidência"}
Em `/qualidade/fat/:id/executar`, selecione o item → **Anexar**. Para medições, o sistema pede a evidência **junto com** o valor medido (ex.: foto do torquímetro).
:::

**SAT em campo** (`/pos-vendas/sat/:id/executar`): mesmo fluxo, otimizado para celular — câmera em tela cheia, upload em background.

**Chamado** (`/pos-vendas/chamados/:id`): anexe na timeline — fica no chamado e cliente, mas **não** no projeto.

## Como o sistema indexa

Quando você anexa no contexto, o sistema herda: `cliente_id`, `projeto_id`, `etapa_id`/`item_id`, `origem` (producao/fat/sat/chamado/engenharia), `autor_id` e `criado_em`.

Resultado: o mesmo arquivo aparece na ficha do cliente, no projeto, na timeline da etapa e na Central com filtro por origem.

## Limites

| Regra                              | Valor                                     |
| ---------------------------------- | ----------------------------------------- |
| Tamanho por arquivo                | 50 MB                                     |
| Arquivos por item                  | 5                                         |
| Formatos                           | JPG, PNG, WebP, MP4, MOV, PDF, XLSX, DOCX |
| Duração máx. de vídeo              | 3 min                                     |
| Remoção após homologação           | Somente `manager`/`admin` + justificativa |

:::atencao
Não use WhatsApp/Drive e cole link no comentário — se a etapa for auditada depois, o link pode expirar e a evidência some.
:::

:::erro{title="Foto não aparece na ficha do cliente"}
Provavelmente subiu como "anexo livre" na Central sem apontar cliente. Reclassifique em **Editar metadados** ou reenvie a partir do card da etapa.
:::

## Auditoria

`manager`/`admin` veem em cada anexo: autor, dispositivo (mobile/desktop), IP, hash SHA-256. Usado para contestação de FAT, retrabalho e inspeção externa.

## Ver também

- [Indexação por cliente e projeto](/ajuda/documentacao/documentos/indexacao-por-cliente-e-projeto)
- [Executar etapa](/ajuda/documentacao/producao/executar-etapa)
- [Executar FAT](/ajuda/documentacao/qualidade/executar-fat)
