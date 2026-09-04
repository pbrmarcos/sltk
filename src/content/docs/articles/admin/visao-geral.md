---
title: Visão geral da Administração
description: O que é o módulo de Administração, quem tem acesso e quais áreas ele cobre (usuários, papéis, permissões por módulo, auditoria e configurações).
category: admin
slug: visao-geral
tipo: conceito
nivel: iniciante
tags: [admin, usuarios, permissoes, auditoria, configuracoes]
papeis: [admin, manager]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- `/admin` concentra tudo que altera o comportamento do sistema para toda a organização.
- `admin` tem acesso total; `manager` cobre operacional sem tocar em permissões e auditoria.
- Papéis vivem em `user_roles` (nunca no perfil) e são checados por `has_role()` — não há como escalar privilégio pelo próprio profile.
- Toda mudança sensível grava linha em `audit_log` com autor, timestamp e valor antigo/novo.
:::

## Quem tem acesso

- **admin** — acesso total, inclusive `/admin/permissoes` e `/admin/auditoria`.
- **manager** — gerência delegada: usuários, papéis e algumas configurações; **não** promove outro a admin.
- Demais papéis não enxergam a seção Administração na sidebar.

## O que fica em Administração

- **Usuários** (`/admin/usuarios`) — convidar, desativar, resetar senha, atribuir papéis.
- **Permissões papel × módulo** (`/admin/permissoes`) — matriz com regras de combinação validadas.
- **SLA de chamados** (`/admin/sla-chamados`) — matriz origem × prioridade com tempos de resposta/resolução.
- **Templates de sistema** — projeto, FAT, SAT — versionados.
- **Marca e site** (`/admin/marca`) — logotipo, cores, textos institucionais.
- **Auditoria** (`/admin/auditoria`) — trilha imutável de mudanças sensíveis.

:::step{n="1" title="Trilha de auditoria imutável" img="admin-auditoria.png" alt="Tela de auditoria com filtros, contador de 424 registros e tabela de eventos por usuário/tabela/ação"}
Em `/admin/auditoria` você vê a lista completa (aqui, 424 eventos), com filtros por usuário, ação, período e busca por tabela ou registro. Nem `admin` edita ou apaga linhas pela UI.
:::

## Princípios de segurança

- **Papéis fora do profile** — `user_roles` + `has_role()` (SECURITY DEFINER) impedem escalonamento.
- **Toda ação sensível é auditada** — inclusive quando disparada por edge function.
- **Role `admin` não perde permissões** pela matriz — é acesso total por definição.

## Ver também

- [Gerenciar usuários](/ajuda/documentacao/admin/gerenciar-usuarios)
- [Permissões por papel × módulo](/ajuda/documentacao/admin/permissoes-por-papel)
- [Trilha de auditoria](/ajuda/documentacao/admin/auditoria)
- [Configurações do sistema](/ajuda/documentacao/admin/configuracoes)
- [E-mails automáticos](/ajuda/documentacao/admin/emails-automaticos)
- [Formulários recebidos](/ajuda/documentacao/admin/formularios-recebidos)
