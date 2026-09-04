---
title: Auditoria de compras
description: Onde ver o histórico de mudanças em solicitações, cotações, OCs e homologações — com filtros e exportação.
category: compras
slug: auditoria-de-compras
tipo: referencia
nivel: intermediario
tags: [auditoria, historico, compras, oc, seguranca]
papeis: [admin, manager]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Cada solicitação, cotação e OC tem **linha do tempo completa** dentro do próprio registro.
- **Administração → Auditoria** (`/admin/auditoria`) traz visão consolidada e cruzada entre módulos.
- Filtros: **período, usuário, tipo de entidade, ação** (`create`, `update`, `approve`, `cancel`, `status_change`).
- Toda mudança grava **antes/depois** dos campos afetados, com autor e timestamp.
- Exportação em CSV para investigações e conformidade.
:::

## O que é auditado

| Entidade | Eventos registrados |
|---|---|
| Solicitação de compra | criação, edição de itens, envio, aprovação, cancelamento |
| Cotação | criação, adição/remoção de fornecedores, upload de propostas, seleção |
| Ordem de compra (OC) | rascunho, submissão, aprovação, emissão, cancelamento, entrega |
| Fornecedor | mudanças de status (homologação/suspensão), edição de anexos |
| Aprovações | quem aprovou, quando, com qual limite |

## Consultar a auditoria consolidada

:::step{n="1" title="Abrir /admin/auditoria"}
Menu **Administração → Auditoria**. Papel `admin` ou `manager` obrigatório.
:::

:::step{n="2" title="Aplicar filtros"}
Filtros disponíveis:

- **Período** — dia/semana/mês/personalizado.
- **Usuário** — quem executou a ação.
- **Entidade** — solicitação, cotação, OC, fornecedor.
- **Ação** — `create`, `update`, `approve`, `cancel`, `status_change`.
- **ID** — busca direta por número do documento.
:::

:::step{n="3" title="Ver o detalhe"}
Cada linha expande mostrando **diff** dos campos alterados (valor antes → depois). Anexos e comentários vinculados aparecem na mesma view.
:::

:::step{n="4" title="Exportar"}
Botão **Exportar CSV** no topo direito respeita os filtros atuais. Útil para SPED, ISO 9001, e-Social ou auditorias externas.
:::

## Consultar dentro do próprio registro

Em `/compras/ordens/$id`, `/compras/solicitacao/$id` ou `/fornecedores/$id`, a aba **Histórico** mostra a mesma auditoria filtrada só para aquele documento — mais rápido do que passar pelo painel global.

## Casos de uso

| Situação | Onde olhar |
|---|---|
| Quem aprovou a OC 4711? | `/compras/ordens/4711` → aba Histórico |
| Fornecedor foi suspenso quando e por quem? | `/fornecedores/$id` → aba Histórico |
| Movimentações do time no último mês | `/admin/auditoria` com filtro de período |
| Compradora saiu — o que ela liberou nos últimos 30 dias? | `/admin/auditoria` com filtro por usuário |

:::dica
Antes de reverter uma mudança suspeita, exporte o CSV com o filtro específico — você preserva evidência mesmo que o registro seja corrigido depois.
:::

:::atencao
A auditoria é **imutável**. Nem `admin` consegue editar linhas do log. Se um dado precisou ser corrigido, o correto é criar nova entrada de correção, não apagar histórico.
:::

## Ver também

- [Emitir e aprovar OC](/ajuda/documentacao/compras/emitir-e-aprovar-oc)
- [Visão geral de Compras](/ajuda/documentacao/compras/visao-geral)
- [Categorias e homologação de fornecedor](/ajuda/documentacao/clientes-fornecedores/categorias-e-homologacao)
