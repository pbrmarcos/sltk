---
title: SLA e alertas de chamados
description: Como os prazos de resposta, resolução e estagnação são calculados e cobrados.
category: pos-vendas
slug: sla-e-alertas
tipo: conceito
nivel: intermediario
tags: [sla, alertas, prioridade, escalonamento]
papeis: [admin, manager, support]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Três relógios: **Resposta**, **Resolução** e **Estagnado**.
- Configuração por **origem × prioridade** em `/admin/sla-chamados`.
- SLA é calculado **na criação** — mudanças de tabela não afetam chamados existentes.
- Alertas por e-mail para atendente e `manager`; escalonamento automático quando resolução estoura.
:::

## Três relógios

- **Resposta** — tempo entre abertura e primeira mensagem do atendente.
- **Resolução** — tempo entre abertura e mudança para "Resolvido".
- **Estagnado** — tempo sem interação, usado para cobrar chamados esquecidos.

:::step{n="1" title="Abrir a configuração" img="03-sla-config.png" alt="Tela de configuração de SLA de chamados com prazos por origem e prioridade"}
Em **Admin → SLA de chamados** (`/admin/sla-chamados`) você vê a matriz de prazos: para cada **origem** (site público / contato / interno) e cada **prioridade** (Crítica / Alta / Média / Baixa), define horas de Resposta, Resolução e Estagnação.
:::

:::step{n="2" title="Definir prazos por prioridade"}
Sugestão inicial (ajuste ao seu SLA contratual):

| Prioridade | Resposta | Resolução | Estagnado |
|---|---|---|---|
| Crítica | 1h | 4h | 2h |
| Alta | 4h | 24h | 12h |
| Média | 12h | 72h | 48h |
| Baixa | 24h | 168h | 96h |

Somente chamados **novos** usam a tabela atualizada.
:::

:::step{n="3" title="Deixar os alertas trabalharem"}
- **Estagnação** — cron periódico dispara e-mail ao atendente e ao `manager` quando o relógio de estagnação estoura.
- **Resposta estourada** — badge vermelho na lista + resumo diário para `manager`.
- **Resolução estourada** — o chamado sobe automaticamente para `manager` como escalonamento.
:::

:::dica
Ajuste **Estagnado** para um pouco menos que a **Resolução** — o alerta chega antes do estouro, dando chance de agir.
:::

:::atencao
Reserve **Crítica** só para linha parada. SLA agressivo consome equipe; use com parcimônia para não banalizar o alerta.
:::

## Boas práticas

- Revise a tabela **trimestralmente** com base no relatório de SLA cumprido × estourado.
- Documente no contrato de suporte quais prioridades cabem em cada tipo de ocorrência.
- Automatize a triagem: chamados vindos do site público podem entrar em **Média** por padrão e ser reclassificados na primeira análise.

## Ver também

- [Abrir um chamado](/ajuda/documentacao/pos-vendas/abrir-chamado)
- [Atender chamado](/ajuda/documentacao/pos-vendas/atender-chamado)
