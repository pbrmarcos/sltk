---
title: Trilha de auditoria
description: Onde ficam os registros imutáveis de mudanças sensíveis, o que é auditado e como investigar um incidente.
category: admin
slug: auditoria
tipo: conceito
nivel: intermediario
tags: [admin, auditoria, audit-log, seguranca, lgpd]
papeis: [admin]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- `/admin/auditoria` é **append-only** — nem `admin` edita ou apaga linhas pela UI.
- Cada linha carrega autor, timestamp UTC, tabela, ação, campo e valor antigo/novo.
- Filtros por usuário, período, tabela e ação; exportação em CSV é ela própria auditada.
- Sem expurgo automático: a trilha é mantida integralmente enquanto o projeto existir.
- Linhas sem autor (seed inicial, gatilhos de sistema, formulário público) aparecem como **Sistema**.
:::

:::step{n="1" title="Abrir a trilha" img="admin-auditoria.png" alt="Auditoria mostrando 424 registros com filtros por usuário/ação/período e tabela detalhada por linha"}
Em `/admin/auditoria` você vê a lista completa ordenada por data. Use os filtros de topo para reduzir escopo antes de exportar.
:::

## O que é auditado

- **Permissões por módulo** (`role_module_permissions`) — mudança na matriz.
- **Marca e site** (`brand_settings`) — logotipo, cores, textos.
- **Chamados** — mudança de status, reatribuição, prioridade e cada mensagem trocada.
- **Ordens de compra** (`ordens_compra`) — criação, status, aprovador, fornecedor e alteração de valor **depois** de aprovada (`valor_total_pos_aprovacao`).
- **Vínculo usuário × papel** (`user_roles`) — concessão e remoção de papel.
- **Usuários** (`profiles`, `auth.users`) — criação, desativação e troca de papel pelo painel Admin.
- **Oportunidades, processos, FAT e SAT** — criação, mudanças de estágio/status e exclusão.

:::nota
Não é auditado o **conteúdo bruto** (arquivo em si) nem a simples **leitura** de um registro — apenas escritas: quem, quando, o quê, valor antigo, valor novo.
:::

## Estrutura de cada linha

- `created_at` — timestamp UTC.
- `user_id` + `user_email` — autor (nulo apenas para gatilhos internos).
- `table_name` + `record_id` — recurso afetado.
- `action` — `INSERT`, `UPDATE`, `DELETE`.
- `field_changed` (para UPDATE) — nome do campo.
- `old_value` / `new_value` — JSON com o valor antes/depois.

## Investigar um incidente

:::step{n="1" title="Delimitar escopo"}
Ajuste os filtros para o **período** e a **tabela** afetada (ex.: `role_module_permissions` no dia X).
:::

:::step{n="2" title="Comparar valores"}
Ordene por `created_at` decrescente e abra a linha para ver `old_value` × `new_value` completos.
:::

:::step{n="3" title="Reverter, se necessário"}
Faça a **operação inversa** pela UI original — nunca edite a linha de auditoria. A reversão também será auditada.
:::

:::atencao
Exportação CSV em `/admin/auditoria` → **Exportar** é liberada para `admin` e `manager`, exporta **todos** os registros dos filtros atuais (até 5.000, não só a página visível) e o próprio download entra no log. Não circule esse CSV fora de canais seguros.
:::

## Ver também

- [Permissões por papel × módulo](/ajuda/documentacao/admin/permissoes-por-papel)
- [Configurações do sistema](/ajuda/documentacao/admin/configuracoes)

<!-- SHOTS:AUTO -->

## Imagens da tela

:::step{n="1" title="Acesso restrito" img="auditoria-1.png" alt="Acesso restrito"}
Acesso restrito
:::

<!-- /SHOTS:AUTO -->
