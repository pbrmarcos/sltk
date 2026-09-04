---
title: Criar ETP a partir do orçamento
description: Como gerar a Especificação Técnica do Produto (ETP) vinculada ao orçamento aprovado.
category: engenharia
slug: criar-etp
tipo: guia
nivel: iniciante
tags: [etp, projeto, orcamento]
papeis: [admin, manager, engineer]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- ETPs nascem de **orçamentos ganhos** (não de orçamentos abertos).
- Menu **OPERAÇÕES → ETPs** (`/engenharia/etp`).
- Cada ETP carrega escopo, memoriais e revisões versionadas.
- Só após ETP **Liberado** é que Compras e Produção começam.
:::

## Antes de começar

Você precisa do papel `engineer`, `manager` ou `admin`. O orçamento origem precisa estar em status **Ganho** e não pode já ter ETP associado.

## Passo a passo

:::step{n="1" title="Abrir a lista de ETPs" img="02-etp-lista.png" alt="Lista de ETPs com número, cliente, orçamento origem, engenheiro responsável e status"}
Menu **OPERAÇÕES → ETPs**. Você vê todos os ETPs (Rascunho, Em desenvolvimento, Em revisão, Liberado, Arquivado). Filtre por cliente, engenheiro ou status.
:::

:::step{n="2" title="Criar novo ETP"}
Clique **+ Novo ETP**. Escolha o **orçamento origem** — o sistema puxa cliente, escopo comercial e valor. Preencha:

- **Título técnico** (pode diferir do comercial).
- **Engenheiro responsável**.
- **Prazo previsto**.
- **Disciplinas envolvidas** (Mecânico, Elétrico).
:::

:::step{n="3" title="Elaborar o escopo técnico" img="07-etp-detalhe.png" alt="Detalhe do ETP com abas Escopo, Memoriais, Anexos, Revisões, BOM"}
No detalhe do ETP:

- **Escopo técnico** — descrição detalhada por disciplina (rich text).
- **Memoriais** — cálculos, dimensionamentos.
- **Anexos** — normas aplicáveis, referências, PDFs de cliente.
- **BOM** — lista de materiais/serviços (alimenta Compras).
:::

:::step{n="4" title="Revisões versionadas"}
Cada alteração relevante gera uma **Revisão** (Rev. A, Rev. B, …). Revisões congelam o snapshot; a aba mostra diff entre revisões — útil quando o cliente pede mudanças.
:::

:::step{n="5" title="Enviar para revisão interna"}
Mude o status para **Em revisão**. O `manager` recebe notificação. Comentários por seção ficam registrados. Aprovação técnica libera para o próximo passo (etapas e produção).
:::

:::dica
Copie textos-padrão de ETPs anteriores usando **Duplicar ETP**. Reduz drasticamente o tempo de elaboração de projetos recorrentes.
:::

:::atencao
Não avance para **Liberado** enquanto BOM estiver incompleto — Compras vai reclamar depois.
:::

:::erro
**"Não vejo o orçamento na lista de origem"** → o orçamento precisa estar em status **Ganho** e ainda não vinculado a um ETP. Confirme com o comercial.
:::

## Ver também

- [Etapas e kanban](/ajuda/documentacao/engenharia/etapas-e-kanban)
- [Liberação para produção](/ajuda/documentacao/engenharia/liberacao-para-producao)
- [Visão geral da Engenharia](/ajuda/documentacao/engenharia/visao-geral)

<!-- SHOTS:AUTO -->

## Imagens da tela

:::step{n="1" title="Lista de ETPs por status (rascunho, revisão, aprovado, obsoleto)" img="criar-etp-1.png" alt="Lista de ETPs por status (rascunho, revisão, aprovado, obsoleto)"}
Lista de ETPs por status (rascunho, revisão, aprovado, obsoleto)
:::

<!-- /SHOTS:AUTO -->
