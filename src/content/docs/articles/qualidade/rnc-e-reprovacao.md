---
title: RNC e reprovação em FAT
description: Como abrir uma Registro de Não Conformidade (RNC), tratar retrabalho e reagendar o FAT.
category: qualidade
slug: rnc-e-reprovacao
tipo: guia
nivel: intermediario
tags: [rnc, nao-conformidade, reprovacao, fat]
papeis: [admin, manager, quality, engineer, production]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Item reprovado no FAT abre uma **RNC** automaticamente.
- RNC exige **classificação**, **causa raiz**, **plano de ação** e **responsável**.
- FAT com RNC **crítica** aberta trava encerramento.
- Retrabalho corrigido → **retest** só nos itens afetados (não refaz FAT inteiro).
:::

## Passo a passo

:::step{n="1" title="Marcar item como Reprovado" img="05-fat-detalhe.png" alt="Item do checklist do FAT marcado como Reprovado com formulário de abertura de RNC"}
Durante a execução, marque o item como **Reprovado**. O formulário de RNC abre automaticamente:

- **Descrição** — o que foi observado.
- **Evidência** — foto/medição obrigatória.
- **Classificação** — Menor / Maior / Crítica.
:::

:::step{n="2" title="Classificar gravidade"}
- **Menor** — não impede embarque; ajustável pós-venda com combinado.
- **Maior** — atinge função/estética; embarque só após correção.
- **Crítica** — inviabiliza operação ou segurança; equipamento não sai da fábrica.

Só `quality` e `manager` classificam como Crítica.
:::

:::step{n="3" title="Análise de causa raiz"}
Para Maior e Crítica, preencha **5 porquês** ou **espinha de peixe** simplificada. Origem pode ser:

- **Projeto** (Engenharia) — vira revisão de ETP.
- **Execução** (Produção) — vira [NC interna](/ajuda/documentacao/producao/retrabalho-e-nc-interna).
- **Fornecedor** — notifica Compras/homologação.
- **Processo/Insumo** — melhoria contínua.
:::

:::step{n="4" title="Plano de ação"}
Preencha:

- **O que fazer**.
- **Responsável** (engenheiro/produção/comprador).
- **Prazo**.
- **Como validar** — critério para aceitar o retrabalho.
:::

:::step{n="5" title="Retrabalho e retest"}
Executor conclui o retrabalho e anexa evidência. O FAT reabre **só o item afetado** (retest), não o FAT inteiro. Aprovado no retest → RNC fecha. Reprovado → novo ciclo.
:::

:::step{n="6" title="Encerrar RNC e FAT"}
Todas as RNCs Críticas e Maiores precisam estar **fechadas ou com plano acordado com cliente** para o FAT ser encerrado como **Aprovado com ressalvas**.
:::

:::dica
RNC repetida entre projetos indica **causa sistêmica** — encaminhe para o comitê de qualidade e vire ação de melhoria contínua.
:::

:::atencao
Nunca "reclassifique Crítica → Maior" para desbloquear encerramento. Isso invalida a auditoria e expõe a empresa em SAT posterior.
:::

## Ver também

- [Executar FAT](/ajuda/documentacao/qualidade/executar-fat)
- [Encerrar FAT](/ajuda/documentacao/qualidade/encerrar-fat)
- [Retrabalho e NC interna](/ajuda/documentacao/producao/retrabalho-e-nc-interna)
