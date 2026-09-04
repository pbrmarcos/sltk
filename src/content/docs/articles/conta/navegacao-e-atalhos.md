---
title: Navegação e atalhos do sidebar
description: Como se orientar entre os módulos, usar a busca global e voltar rápido para telas frequentes.
category: conta
slug: navegacao-e-atalhos
tipo: guia
nivel: iniciante
tags: [navegacao, sidebar, atalhos, busca]
papeis: [admin, manager, sales, engineer, quality, purchasing, production, support]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- A sidebar agrupa módulos por área (**Visão geral**, **Comercial**, **Operações**, **Compras**, **Qualidade**, **Pós-venda**, **Logística**, **Administração**).
- Itens sem permissão somem sozinhos — o que você vê já corresponde ao seu papel.
- **Ctrl+K** (ou **⌘K** no Mac) abre a busca global de páginas, clientes, projetos e documentos.
- O botão **Ajuda desta tela** no topo direito leva ao artigo específico da rota atual.
- Notificações e pendências ficam no **sino** do topo, com contador em tempo real.
:::

## Mapa da sidebar por módulo

| Grupo | Rotas principais | Papéis típicos |
|---|---|---|
| **Visão geral** | `/dashboard` | todos |
| **Comercial** | `/comercial/pipeline`, `/comercial/orcamento`, `/comercial/checklists` | `sales`, `manager` |
| **Operações** | `/clientes`, `/projetos`, `/planejamento`, `/engenharia/etp`, `/engenharia/etapas` | `engineer`, `manager` |
| **Compras** | `/compras/solicitacao`, `/compras/cotacoes`, `/compras/ordens`, `/fornecedores` | `purchasing`, `manager` |
| **Qualidade** | `/qualidade/revisao-mecanica`, `/qualidade/revisao-eletrica`, `/qualidade/fat` | `quality` |
| **Pós-venda** | `/pos-vendas/chamados`, `/pos-vendas/sat` | `support`, `field` |
| **Logística** | `/logistica/embarques` | `logistics`, `manager` |
| **Administração** | `/admin/*`, `/central-documentos`, `/know-how` | `admin`, `manager` |

## Atalhos globais

:::step{n="1" title="Abrir a busca global (Ctrl+K)"}
Digite **Ctrl+K** de qualquer tela. A busca cobre nomes de páginas, clientes, projetos, ETPs, ordens e documentos. Setas ↑/↓ navegam, **Enter** abre.
:::

:::step{n="2" title="Colapsar/expandir a sidebar"}
Clique no ícone de duas setas no canto superior esquerdo da sidebar. O estado fica salvo por usuário — colapsado libera espaço para dashboards e Kanbans.
:::

:::step{n="3" title="Voltar rápido — breadcrumbs"}
Toda tela interna tem breadcrumbs no topo. Clique em qualquer nó (ex.: **Engenharia → ETPs**) para subir de nível sem passar pela home.
:::

:::step{n="4" title="Ajuda contextual"}
No canto superior direito, o botão **Ajuda desta tela** abre o artigo mapeado para a rota atual. Se não houver artigo, cai na Central de ajuda geral.
:::

## Tabela de atalhos

| Atalho | Ação |
|---|---|
| **Ctrl+K** / **⌘K** | Busca global |
| **Ctrl+/** | Alterna sidebar |
| **G** depois **D** | Ir para Dashboard |
| **G** depois **P** | Ir para Pipeline comercial |
| **?** | Lista de atalhos da tela atual |
| **Esc** | Fecha diálogo/drawer aberto |

:::dica
Fixe uma URL no navegador (ex.: `/pos-vendas/chamados?status=aberto`) para começar o dia já filtrado — os filtros são persistidos na querystring.
:::

:::atencao
Se um item da sidebar sumiu, provavelmente seu papel mudou. Confirme com o `admin` em `/admin/usuarios` antes de reportar bug.
:::

## Ver também

- [Papéis e permissões](/ajuda/documentacao/conta/papeis-e-permissoes)
- [Login e recuperação de senha](/ajuda/documentacao/conta/login-e-recuperacao-de-senha)
- [Editar perfil e avatar](/ajuda/documentacao/conta/editar-perfil-e-avatar)
