---
title: Previsão e saúde do pipeline
description: Como ler os indicadores do dashboard comercial — ticket médio, taxa de conversão por estágio, forecast ponderado e oportunidades estagnadas.
category: comercial
slug: previsao-e-saude
tipo: conceito
nivel: intermediario
tags: [comercial, previsao, forecast, dashboard, kpi]
papeis: [admin, manager, sales]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- **Valor ponderado** é o forecast realista (não o otimismo).
- **Amarelo/Vermelho** = card estagnado — plano de ação ou fecha como Perdido.
- Reunião semanal de pipeline: 30 minutos, foco em amarelos/vermelhos e Top 5 por valor ponderado.
- Concentração >30% do forecast em um cliente = risco. Diversifique.
:::

## Onde encontrar

:::step{n="1" title="Dashboard comercial (visão gerencial)" img="05-dashboard.png" alt="Dashboard com KPIs de pipeline, gráficos de tendência de receita e lista de oportunidades quentes"}
Em `/dashboard` (visão do manager). Concentra os KPIs de forecast, funil e tendências. É a tela de "leitura estratégica".
:::

:::step{n="2" title="Pipeline (visão operacional)" img="01-pipeline.png" alt="Pipeline comercial com KPIs no topo: Pipeline ativo, Valor total, Valor ponderado, Taxa de conversão"}
Em `/comercial/pipeline`. Os KPIs no topo (Pipeline ativo, Valor total, Valor ponderado, Taxa de conversão) atualizam em tempo real conforme cards se movem.
:::

## Indicadores principais

| Indicador | O que significa | Como ler |
|---|---|---|
| **Valor em pipeline** | Soma dos valores de todos os orçamentos vigentes de oportunidades **abertas** | Sinaliza tamanho da fila, não expectativa. |
| **Valor ponderado** | Cada estágio × sua probabilidade padrão | Expectativa realista de fechamento no período. |
| **Ticket médio** | Valor médio dos orçamentos **ganhos** nos últimos 90 dias | Base para dimensionar meta. |
| **Taxa de conversão por estágio** | % que passa de um estágio ao próximo | Queda >20% abaixo da média = investigar. |
| **Ciclo médio** | Dias entre criação e fechamento | Aumento súbito = gargalo (aprovação lenta, engenharia sobrecarregada). |

### Probabilidades padrão por estágio

| Estágio | Probabilidade |
|---|---|
| Novo | 5% |
| Qualificado | 20% |
| Proposta | 50% |
| Negociação | 75% |
| Ganho | 100% |

:::dica
Probabilidade pode ser customizada em **Administração → Configurações → Pipeline** (`/admin/configuracoes`). **Rode 6 meses com o padrão** antes de calibrar — histórico curto engana mais do que ajuda.
:::

## Sinais de alerta

:::atencao
Cards estagnados aparecem coloridos no kanban conforme tempo sem interação (comentário, mudança de estágio, upload):

- **Amarelo**: parou há mais de N dias no estágio.
  - Novo: 7d · Qualificado: 14d · Proposta: 21d · Negociação: 30d
- **Vermelho**: passou o dobro do tempo. Ação urgente ou feche como Perdido.
:::

Outros sinais:

- **Sem próxima ação** — cards sem tarefa agendada. Sales sem lista de próximos passos = pipeline sem plano.
- **Concentração** — se um único cliente representa >30% do forecast do trimestre, aparece badge de risco. Diversifique.

## Reunião semanal (roteiro de 30 min)

Prática recomendada:

1. **Amarelos e vermelhos** (10 min) — plano de ação ou fechar como Perdido.
2. **Top 5 por valor ponderado** (10 min) — quais próximas ações destravam?
3. **Ganhos da semana** (5 min) — o que funcionou? Replicar.
4. **Bloqueios** (5 min) — o que depende de outra área (engenharia, financeiro)?

:::dica
Registre decisões **no comentário do card**, não em ata paralela. Assim o histórico fica onde a informação vive e todo mundo consulta.
:::

## Erros comuns

:::erro{title="Forecast otimista sem base"}
Se você sobe probabilidade de "Proposta" para 70% porque "o cliente vai fechar", o forecast fica inflado. O padrão 50% na Proposta reflete média real de mercado.
:::

:::erro{title="Cards zumbis distorcem tudo"}
Oportunidade em Proposta há 90d sem interação continua contando no valor total e no ponderado, mas quase certamente vai virar Perdido. Feche na hora que souber — ver [Fechar oportunidade](/ajuda/documentacao/comercial/fechar-oportunidade).
:::

## Ver também

- [Pipeline de oportunidades](/ajuda/documentacao/comercial/pipeline-de-oportunidades)
- [Fechar oportunidade — Ganho ou Perdido](/ajuda/documentacao/comercial/fechar-oportunidade)
- [Visão geral do Comercial](/ajuda/documentacao/comercial/visao-geral)
