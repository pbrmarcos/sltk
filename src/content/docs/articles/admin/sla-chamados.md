---
title: Configurar SLA de chamados
description: Como definir prazos de resposta e resolução por prioridade em /admin/sla-chamados, e como afetam chamados novos vs existentes.
category: admin
slug: sla-chamados
tipo: guia
nivel: intermediario
tags: [admin, sla, chamados, pos-vendas]
papeis: [admin, manager]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Menu **ADMIN → SLA de Chamados** (`/admin/sla-chamados`).
- Configure prazo de **primeira resposta** e **resolução** para cada prioridade (Crítica/Alta/Média/Baixa).
- Prazos são em **horas úteis** (define-se dias e janela de expediente).
- Mudanças **não recalculam chamados já abertos** — só valem para os próximos.
:::

## Como o SLA é calculado

Cada chamado nasce com dois relógios:

| Relógio | Início | Fim | O que rompe |
|---|---|---|---|
| **Resposta** | criação do chamado | primeira mensagem do atendente | prazo estourou = alerta vermelho |
| **Resolução** | criação do chamado | mudança para **Resolvido** | prazo estourou = escalonamento |

Ambos contam apenas **horas úteis** definidas na janela de expediente.

## Passo a passo

:::step{n="1" title="Definir horário de expediente"}
No topo da página, informe:

- **Dias úteis** (seg-sex, ou seg-sab).
- **Início** (ex.: 08:00) e **fim** (ex.: 18:00).
- **Fuso horário** (America/Sao_Paulo).
- **Feriados** (upload CSV ou seleção manual).
:::

:::step{n="2" title="Ajustar prazos por prioridade"}
Para cada uma das 4 prioridades, informe **resposta** e **resolução**:

| Prioridade | Sugestão de resposta | Sugestão de resolução |
|---|---|---|
| **Crítica** | 1 h | 8 h |
| **Alta** | 4 h | 24 h |
| **Média** | 8 h | 72 h |
| **Baixa** | 24 h | 5 dias |

Os números são exemplos — ajuste conforme contrato com o cliente.
:::

:::step{n="3" title="Salvar"}
Clique em **Salvar SLA**. Todos os **novos** chamados a partir desse momento vão usar os prazos atualizados.
:::

## Prioridade e SLA em conjunto

**Como a prioridade é definida:** por padrão, quem abre o chamado escolhe; atendentes podem elevar/rebaixar depois da triagem.

| Prioridade | Uso típico |
|---|---|
| **Crítica** | Linha parada, equipamento inoperante |
| **Alta** | Impacto operacional relevante |
| **Média** | Dúvidas técnicas, ajustes |
| **Baixa** | Sugestões, dúvidas gerais |

:::atencao
Alterar a prioridade **depois** que o chamado foi criado **não recalcula o SLA original**. A alteração fica registrada na timeline e nova contagem começa daquele momento em diante.
:::

## Ver também

- [SLA e alertas nos chamados](/ajuda/documentacao/pos-vendas/sla-e-alertas)
- [Atender chamado](/ajuda/documentacao/pos-vendas/atender-chamado)

<!-- SHOTS:AUTO -->

## Imagens da tela

:::step{n="1" title="Acesso restrito" img="sla-chamados-1.png" alt="Acesso restrito"}
Acesso restrito
:::

<!-- /SHOTS:AUTO -->
