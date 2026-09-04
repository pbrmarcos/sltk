---
title: Entendendo papéis e permissões
description: Quais papéis existem no Solutek Hub e o que cada um pode fazer.
category: conta
slug: papeis-e-permissoes
tipo: conceito
nivel: iniciante
tags: [papel, permissao, seguranca]
papeis: [admin, manager, sales, engineer, quality, purchasing, production, support]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Papéis vivem em `user_roles` — nunca no perfil — e são verificados por `has_role()` no banco.
- Um usuário pode ter **mais de um papel** e enxerga a união dos módulos.
- A matriz papel × módulo controla o menu; a segurança final é a RLS no Postgres.
- Só um `admin` cria outro `admin`; `manager` cobre operacional sem tocar em auditoria/permissões.
:::

## Papéis disponíveis

| Papel        | Acessa principalmente                                                  |
| ------------ | ---------------------------------------------------------------------- |
| `admin`      | Tudo, incluindo Administração, Auditoria e Permissões.                 |
| `manager`    | Operacional com aprovações; parte da Administração.                    |
| `sales`      | Comercial (pipeline, orçamentos, Checklist), leitura de Clientes/Engenharia. |
| `engineer`   | Engenharia (ETP, mecânico, elétrico, etapas, H/H).                     |
| `quality`    | Qualidade (revisões, FAT).                                             |
| `purchasing` | Compras (solicitação, cotações, ordens) e Fornecedores.                |
| `production` | Produção (montagem, kanban de etapas).                                 |
| `support`    | Pós-vendas (chamados, SAT).                                            |
| `user`       | Papel neutro — apenas Conta; usado antes de definir função.            |

:::nota
A tabela completa **papel × módulo** vive em `docs/mapa-sistema.md` e reflete a matriz de `/admin/permissoes`.
:::

## Como o acesso é aplicado

- **Sidebar** — itens sem permissão somem do menu automaticamente.
- **Rotas** — o middleware bloqueia navegação direta por URL e mostra tela **Acesso restrito**.
- **Dados** — RLS no Postgres filtra a consulta ainda no banco; papel na UI sem RLS correspondente não vaza registro.

:::erro{title="Tela em branco após entrar"}
Usuário sem papel atribuído. Peça ao `admin` para vincular pelo menos um papel operacional em `/admin/usuarios`.
:::

## Como pedir um papel novo

Fale com um `admin` ou `manager`. Papéis são atribuídos em `/admin/usuarios` — ver [Gerenciar usuários](/ajuda/documentacao/admin/gerenciar-usuarios).

## Ver também

- [Navegação e atalhos do sidebar](/ajuda/documentacao/conta/navegacao-e-atalhos)
- [Permissões por papel × módulo](/ajuda/documentacao/admin/permissoes-por-papel)
