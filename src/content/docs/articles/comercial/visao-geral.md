---
title: Visão geral do Comercial
description: O que o módulo Comercial cobre, quem participa e como oportunidade, orçamento, Checklist e ordem de compra se conectam.
category: comercial
slug: visao-geral
tipo: conceito
nivel: iniciante
tags: [comercial, pipeline, orcamento, checklist, oc]
papeis: [admin, manager, sales, engineer]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- **Pipeline** organiza oportunidades por estágio (Novo → Qualificado → Proposta → Negociação → Ganho/Perdido).
- **Orçamento** é sempre versionado (rev 1, 2, 3…). Nunca se apaga uma revisão.
- **Checklist público** entra automaticamente como oportunidade no pipeline.
- **OC** só é emitida a partir de um orçamento vigente e passa por aprovação por alçada.
:::

## Quem participa

- **sales** — dona da oportunidade, cria orçamentos, negocia condições.
- **engineer** — apoia no dimensionamento técnico e assina o ETP quando o orçamento exige.
- **manager** — aprova orçamentos acima do limite comercial e ordens de compra.
- **admin** — auditoria, templates e políticas de desconto.

## O fluxo em uma imagem

:::step{title="O pipeline é o coração do módulo" img="01-pipeline.png" alt="Kanban de oportunidades do módulo Comercial"}
Cada card é uma oportunidade com cliente, valor estimado e probabilidade. Arraste entre colunas para avançar o estágio. Os KPIs no topo (Pipeline ativo, Valor total, Valor ponderado, Taxa de conversão) atualizam em tempo real.
:::

```text
Lead / Checklist  →  Oportunidade  →  Orçamento (rev 1..N)  →  Ganha  →  OC assinada
                                                     ↘  Perdida (motivo obrigatório)
```

## Como se conecta com o resto do sistema

- **Clientes** — toda oportunidade tem cliente vinculado. Para emitir OC, o cadastro precisa estar completo.
- **Engenharia** — orçamentos com engenharia sob demanda geram ETP automaticamente após o ganho.
- **Compras** — os insumos da BOM entram no fluxo de Checklist/cotação assim que o projeto é liberado.
- **Documentos** — PDFs de orçamento e OC ficam indexados na Central por cliente + oportunidade.

:::dica
Use a aba **Tabela** (canto superior direito do pipeline) para exportar dados rapidamente ou filtrar por múltiplos critérios. O Kanban é para operar; a Tabela é para analisar.
:::

## O que este módulo NÃO faz

:::atencao
- **Não emite nota fiscal** — o ERP externo cuida disso; o comercial só sinaliza "faturamento liberado".
- **Não gerencia comissão** — planilha externa por enquanto; roadmap para 2027.
- **Não é CRM de marketing** — não há automação de e-mail marketing ou lead scoring; usa-se ferramenta externa integrada por webhook.
:::

## Ver também

- [Pipeline de oportunidades](/ajuda/documentacao/comercial/pipeline-de-oportunidades)
- [Novo orçamento passo a passo](/ajuda/documentacao/comercial/novo-orcamento)
- [Fechar oportunidade — Ganho ou Perdido](/ajuda/documentacao/comercial/fechar-oportunidade)
- [Checklist público e formulários](/ajuda/documentacao/comercial/checklist-publico-e-formularios)
- [Mineração de leads](/ajuda/documentacao/comercial/mineracao-de-leads)
