---
title: Indexação por cliente e projeto
description: Como um mesmo documento aparece na ficha do cliente, na página do projeto e no índice global — e como filtrar por tipo, período e autor.
category: documentos
slug: indexacao-por-cliente-e-projeto
tipo: conceito
nivel: intermediario
tags: [indexacao, cliente, projeto, filtros]
papeis: [admin, manager, engineer, quality, sales, purchasing, support]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Cada arquivo tem 3 chaves: **cliente**, **projeto/equipamento** e **tipo**.
- Anexo no contexto (etapa, FAT, chamado) preenche as chaves automaticamente.
- Upload livre exige apontar cliente — sem cliente, o arquivo fica **órfão** (visível só a admin).
- `manager`/`admin` reclassificam metadados; anexos vindos de checklist só migram removendo do item original.
:::

## As três visões

:::step{n="1" title="Central global" img="documentos-central.png" alt="Central de documentos com filtros por cliente, projeto, tipo, período e autor"}
Em `/documentos`, use filtros combinados: tipo (orçamento, ETP, OC, FAT, SAT, evidência, RNC, contrato), cliente, projeto, período (30/90/365 dias ou custom) e autor. Ideal para relatórios e auditoria transversal.
:::

**Ficha do cliente** (`/clientes/:id` → Documentos) mostra tudo do cliente. **Página do projeto** (`/engenharia/projetos/:id`) mostra apenas o que o equipamento produziu (ETP, revisões, BOM, evidências, laudos FAT/SAT).

## Regras de indexação por origem

| Origem                          | cliente_id | projeto_id | etapa/item | Aparece em                       |
| ------------------------------- | ---------- | ---------- | ---------- | -------------------------------- |
| Kanban de produção (checklist)  | auto       | auto       | sim        | Cliente, projeto, etapa          |
| FAT / SAT (item)                | auto       | auto       | sim        | Cliente, projeto, laudo          |
| ETP / revisão                   | auto       | auto       | —          | Cliente, projeto                 |
| OC / cotação                    | auto       | auto       | —          | Cliente, projeto, Compras        |
| Chamado                         | auto       | —          | —          | Cliente, chamado                 |
| Upload direto na Central        | manual     | manual     | —          | Onde você indicar                |

:::atencao
Uploads livres sem cliente ficam **órfãos** e só aparecem em `/documentos` com filtro **Órfãos** (admin). Reclassifique arrastando para o cliente correto.
:::

## Filtros úteis

- **Evidências dos últimos 90 dias**: aba do cliente → tipo Evidência + período 90 dias. Bom para auditoria externa.
- **Laudos FAT homologados**: Central → tipo Laudo FAT + status Homologado.
- **Anexos órfãos**: Central → filtro Órfãos (admin apenas).

## Exportação

`manager`/`admin` exportam **ZIP** (respeita filtros) e **CSV** de metadados (nome, tipo, tamanho, autor, data, cliente, projeto, hash). O ZIP é gerado em background — você recebe notificação quando pronto.

## Reclassificar

1. Abra o arquivo → **Editar metadados**.
2. Ajuste cliente, projeto, tipo. O histórico registra.

:::erro{title="Não consigo mover anexo de etapa para outro cliente"}
Arquivos vindos de checklist ficam presos ao contexto. Remova a evidência do item original (o hash fica na auditoria) e envie de novo no cliente/projeto correto.
:::

## Ver também

- [Visão geral](/ajuda/documentacao/documentos/visao-geral)
- [Anexar evidências por etapa](/ajuda/documentacao/documentos/anexar-evidencias-por-etapa)
