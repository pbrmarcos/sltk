---
title: Retrabalho e não conformidade interna
description: Como registrar problemas identificados na montagem, gerar retrabalho e não conformidade interna (NC).
category: producao
slug: retrabalho-e-nc-interna
tipo: guia
nivel: intermediario
tags: [retrabalho, nc, nao-conformidade, producao]
papeis: [admin, manager, production, quality]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Toda anomalia durante a montagem vira **NC interna** — nunca "conserto silencioso".
- Abra no detalhe da sub-etapa, botão **Abrir NC**.
- Preencha **causa provável**, **evidência** e **plano de retrabalho**.
- NC ligada a fornecedor externo notifica o time de compras automaticamente.
:::

## Antes de começar

Você precisa do papel `production`, `quality`, `manager` ou `admin`. O montador abre; o inspetor de qualidade classifica; o manager valida o plano quando o custo/retrabalho é alto.

## Passo a passo

:::step{n="1" title="Detectar e parar" img="01-montagem-kanban.png" alt="Linha de montagem em status Bloqueada por NC"}
Ao identificar o problema, **não conclua a sub-etapa**. Se afetar produção adiante, bloqueie a linha inteira (motivo: **Retrabalho externo** ou **NC em análise**).
:::

:::step{n="2" title="Abrir a NC interna"}
Na sub-etapa afetada, clique **+ Abrir NC**. Preencha:

- **Descrição** curta e objetiva ("Solda com trinca no cordão do flange").
- **Causa provável** — Peça, Projeto, Execução, Fornecedor externo, Insumo.
- **Origem** — vincule à OC / fornecedor / etapa do ETP.
- **Evidência** — foto, medição, laudo. Obrigatória.
:::

:::step{n="3" title="Classificar"}
`quality` classifica gravidade:

- **Menor** — retrabalho pontual, sem impacto de prazo.
- **Maior** — atinge prazo ou custo relevante; exige RCA (análise de causa raiz).
- **Crítica** — inviabiliza o equipamento se não tratado.
:::

:::step{n="4" title="Plano de retrabalho"}
Escreva o plano:

- **O que fazer** — passo a passo.
- **Quem faz** — responsável.
- **Prazo**.
- **Como validar** — critério para aceitar o retrabalho como concluído.
:::

:::step{n="5" title="Executar e validar"}
Executor marca **Retrabalho concluído** e anexa evidência do estado final. Um segundo par de olhos (`quality`) valida ou reprova. Reprovação reabre com nova rodada.
:::

:::step{n="6" title="Encerrar"}
NC encerrada volta a liberar a sub-etapa/linha. O registro fica na aba **Não conformidades** do equipamento — vai para o dossiê do FAT.
:::

:::dica
Se a causa é **fornecedor**, o time de compras recebe automaticamente. Repetição gera alerta na **homologação** e pode desabilitar o fornecedor.
:::

:::atencao
"Corrigir e seguir sem abrir NC" é a maior fonte de recall no chão de fábrica. O tempo economizado hoje custa 10× no cliente.
:::

:::erro
**"Não consigo classificar como Crítica"** → só `quality` e `manager` fazem essa mudança. Solicite via comentário na NC.
:::

## Ver também

- [Executar etapa](/ajuda/documentacao/producao/executar-etapa)
- [RNC e reprovação em FAT](/ajuda/documentacao/qualidade/rnc-e-reprovacao)
- [Auditoria de compras](/ajuda/documentacao/compras/auditoria-de-compras)
