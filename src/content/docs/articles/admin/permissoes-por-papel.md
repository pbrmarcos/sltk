---
title: Permissões por papel × módulo
description: Como funciona a matriz de permissões, quais regras de combinação são validadas e como aplicar mudanças com segurança.
category: admin
slug: permissoes-por-papel
tipo: passo-a-passo
nivel: intermediario
tags: [admin, permissoes, papeis, modulos, rls]
papeis: [admin]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Matriz **papel × módulo** em `/admin/permissoes` — a role `admin` **não aparece** (acesso total por definição).
- Controla sidebar e roteamento — **não** substitui RLS; a segurança final é no Postgres.
- Regras de combinação são validadas no servidor antes do salvamento.
- Alteração é transacional e escreve em `audit_log`; usuários veem o efeito no próximo carregamento de rota.
:::

## O que a matriz controla

- **Presença na sidebar** — módulo desmarcado some do menu.
- **Acesso às rotas** — navegação direta por URL retorna **Acesso restrito**.
- **Não** filtra dados — RLS do Postgres continua sendo a última linha de defesa.

## Regras validadas antes de salvar

- **Dashboard obrigatório** — se qualquer outro módulo estiver ativo, `dashboard` também precisa estar.
- **Administração só para `manager`** — o módulo `admin` só pode ser marcado para `manager`, nunca para operacionais.
- **Qualidade depende de Processos** — FAT/revisões pertencem a um processo.
- **Pós-venda depende de Clientes** — chamados e base instalada são escopados por cliente.
- **Comercial depende de Clientes** — orçamentos e OCs partem de um cliente cadastrado.

Se uma regra é violada, a célula fica destacada com **motivo** e um botão **Aplicar sugestão** corrige em um clique.

:::step{n="1" title="Escolher a linha do papel"}
Selecione o papel a ajustar (ex.: `sales`) e marque/desmarque as colunas de módulos.
:::

:::step{n="2" title="Resolver violações"}
Se surgir célula destacada, clique em **Aplicar sugestão** ou ajuste manualmente o módulo dependente.
:::

:::step{n="3" title="Salvar em transação"}
**Salvar** grava tudo em uma transação e escreve linha em `audit_log`. Usuários com aquele papel veem o efeito ao carregar a próxima rota — sem deslogar.
:::

:::atencao
**Múltiplos papéis** — se o usuário tem `engineer` + `sales`, ele enxerga a **união** dos módulos. Reduzir permissões de um papel não afeta módulos concedidos pelo outro.
:::

:::erro{title="Não achei o papel admin na matriz"}
Correto — `admin` é acesso total por definição e **não pode ser reduzido** pela matriz. Para revogar o acesso, remova o papel `admin` do usuário em `/admin/usuarios`.
:::

:::dica
Antes de remover módulo com pendências, a UI avisa quantos cards abertos daquele módulo estão atribuídos a usuários que perderão o acesso. Reatribua primeiro.
:::

## Ver também

- [Gerenciar usuários](/ajuda/documentacao/admin/gerenciar-usuarios)
- [Trilha de auditoria](/ajuda/documentacao/admin/auditoria)
