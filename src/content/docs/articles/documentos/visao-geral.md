---
title: Visão geral da Central de Documentos
description: O que é a Central de Documentos, quais tipos vivem lá e como estão indexados por cliente, projeto e etapa.
category: documentos
slug: visao-geral
tipo: conceito
nivel: iniciante
tags: [documentos, central, evidencias, anexos]
papeis: [admin, manager, engineer, quality, purchasing, sales, production, support]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Repositório único em `/documentos` — todo arquivo gerado ou recebido vive aqui.
- Cada documento é indexado por **cliente + projeto + tipo** e aparece em várias rotas ao mesmo tempo.
- Anexar no contexto (etapa, checklist, chamado) preserva a indexação — upload livre exige apontar cliente.
- Templates versionados garantem que o PDF antigo continua fiel ao layout da época.
:::

## O que vive aqui

Orçamentos, ETPs, ordens de compra, cotações (Checklist), laudos FAT/SAT, evidências de etapa, RNCs, contratos e anexos livres. Tudo com hash SHA-256, autor e trilha de auditoria.

:::step{n="1" title="Índice global da Central" img="documentos-central.png" alt="Lista global de documentos com filtros por tipo, cliente, projeto, período e autor"}
Em `/documentos` você vê a lista unificada com busca por texto e filtros combinados. Use para relatórios, exportações em ZIP/CSV e auditoria transversal.
:::

:::step{n="2" title="Detalhe do documento" img="documentos-detalhe.png" alt="Página de detalhe de um documento com aba de compartilhamentos, histórico e metadados"}
Cada documento tem página própria com metadados (cliente, projeto, tipo, versão do template), aba **Compartilhamentos** (links públicos), **Histórico** (visualizações e downloads) e **Auditoria**.
:::

## Três visões do mesmo arquivo

- **Ficha do cliente** → aba Documentos: tudo relacionado ao cliente.
- **Página do projeto** → Documentos & evidências: apenas o que o equipamento produziu.
- **Central global**: busca transversal com filtros.

:::dica
Anexe sempre no contexto que gerou o arquivo (card da etapa, item do FAT, timeline do chamado). A indexação vira automática — cliente, projeto e etapa já vêm preenchidos.
:::

## Entrevistas técnicas na Central

Os PDFs gerados a partir das entrevistas respondidas aparecem na aba **Entrevistas** da Central, com segmento, código e data. A ação **Arquivar no Drive** sincroniza o arquivo em `Comercial / Entrevistas / {segmento} / ENT-{codigo}`, mantendo a mesma indexação por cliente e oportunidade dos demais documentos.

## Ver também

- [Indexação por cliente e projeto](/ajuda/documentacao/documentos/indexacao-por-cliente-e-projeto)
- [Anexar evidências por etapa](/ajuda/documentacao/documentos/anexar-evidencias-por-etapa)
- [Permissões e compartilhamento](/ajuda/documentacao/documentos/permissoes-e-compartilhamento)
- [Templates e versionamento](/ajuda/documentacao/documentos/templates-e-versionamento)
