---
title: Liberação para produção
description: O que precisa estar pronto na Engenharia para liberar o projeto para Compras e Produção.
category: engenharia
slug: liberacao-para-producao
tipo: guia
nivel: intermediario
tags: [liberacao, producao, compras, bom]
papeis: [admin, manager, engineer]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Liberação só ocorre com **ETP aprovado**, **BOM completo** e **etapas críticas concluídas**.
- No **detalhe do ETP** (`/engenharia/etp/:id`) use o botão **Liberar para produção**.
- A liberação abre solicitações de compra automaticamente para o BOM.
- Não é possível liberar parcialmente sem justificativa registrada.
:::

## Pré-requisitos

Antes de liberar:

1. ETP em status **Em revisão** ou superior, com todas as revisões aprovadas.
2. **BOM** com todos os itens preenchidos (código, quantidade, fornecedor sugerido opcional).
3. Etapas do caminho crítico com **entregável anexado**.
4. Aprovação técnica do `manager`.

## Passo a passo

:::step{n="1" title="Conferir checklist de liberação" img="07-etp-detalhe.png" alt="Detalhe do ETP com aba Liberação mostrando checklist de pré-requisitos"}
No **detalhe do ETP**, aba **Liberação**. O sistema mostra o checklist automático:

- ETP em revisão/aprovado ✓
- BOM completo ✓
- Etapas críticas concluídas ✓
- Aprovação técnica ✓

Itens pendentes aparecem em vermelho.
:::

:::step{n="2" title="Revisar BOM"}
Clique na aba **BOM**. Confira que todo item tem descrição, quantidade, unidade, disciplina. Itens sem `part number` viram cotação genérica — não bloqueiam, mas geram mais idas com o fornecedor.
:::

:::step{n="3" title="Liberar"}
Clique **Liberar para produção**. Confirme o resumo:

- N itens do BOM → geram N solicitações de compra automaticamente.
- N etapas passam para status **Liberadas para execução**.
- O status do ETP muda para **Liberado**.
:::

:::step{n="4" title="Acompanhar cadeia disparada"}
Após liberar, acompanhe:

- **Compras → Solicitações** — itens novos com origem "Aba EQP".
- **Produção → Kanban** — etapas de produção liberadas.
:::

:::dica
Use **Liberação parcial** quando parte do projeto ainda depende de aprovação do cliente, mas Compras já pode comprar itens de longo prazo. Sempre justifique.
:::

:::atencao
Depois de liberar, mudanças no BOM não voltam automaticamente para Compras. Alterações posteriores geram **aditivos manuais** — evite retrabalho fazendo BOM completo antes.
:::

:::erro
**"Botão Liberar está desabilitado"** → um dos pré-requisitos do checklist não foi atendido. Passe o mouse sobre o item vermelho para ver o motivo exato.
:::

## Ver também

- [Criar ETP](/ajuda/documentacao/engenharia/criar-etp)
- [Etapas e kanban](/ajuda/documentacao/engenharia/etapas-e-kanban)
- [Criar solicitação (compras)](/ajuda/documentacao/compras/criar-solicitacao)
