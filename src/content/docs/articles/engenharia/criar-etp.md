---
title: Criar ETP
description: Como criar e aprovar a Especificação Técnica do Produto (ETP) de um equipamento.
category: engenharia
slug: criar-etp
tipo: guia
nivel: iniciante
tags: [etp, projeto]
papeis: [admin, manager, engineer]
atualizado_em: 2026-09-07
app_version: "0.99.4"
---

:::tldr
- ETPs nascem de um **equipamento** (não de um orçamento) e são versionados por equipamento (v1, v2…).
- Menu **OPERAÇÕES → ETPs** (`/engenharia/etp`).
- Fluxo de status: **rascunho → em revisão → aprovado** (ou **rejeitado**, com retomada). Só `admin`/`manager` aprovam, rejeitam ou reabrem.
- Um ETP **aprovado** fica congelado para edição, mas ganha um botão **Gerar orçamento**.
:::

## Antes de começar

Você precisa do papel `engineer`, `manager` ou `admin` (acesso ao módulo Engenharia) para criar e editar. Aprovar, rejeitar ou reabrir um ETP já aprovado exige `manager` ou `admin`.

## Passo a passo

:::step{n="1" title="Abrir a lista de ETPs" img="02-etp-lista.png" alt="Lista de ETPs com equipamento, cliente, versão e status"}
Menu **OPERAÇÕES → ETPs**. Você vê todos os ETPs (Rascunho, Em revisão, Aprovado, Rejeitado, Obsoleto). Filtre por status ou busque por equipamento/cliente.
:::

:::step{n="2" title="Criar novo ETP"}
Clique **Novo ETP**, busque e selecione o **equipamento** do cliente. O sistema cria a próxima versão (v1, v2…) em **rascunho** — sem puxar dados de nenhum orçamento.
:::

:::step{n="3" title="Preencher o conteúdo técnico" img="07-etp-detalhe.png" alt="Detalhe do ETP com escopo, requisitos, critérios de aceite, riscos e anexos"}
Na página do ETP, preencha:

- **Escopo & premissas**.
- **Requisitos funcionais e técnicos**.
- **Critérios de aceite**.
- **Riscos** (técnicos, de prazo, de integração).
- **Anexos** — arquivos de referência, normas, PDFs do cliente.

Cada alteração relevante fica registrada no **Histórico de alterações**, no fim da página.
:::

:::step{n="4" title="Enviar para revisão e aprovar"}
Mude o status para **Em revisão** — `manager`/`admin` são notificados por e-mail. A partir daí, `manager`/`admin` pode **Aprovar versão** ou **Rejeitar** (com motivo). Um ETP aprovado congela os campos; versões anteriores do mesmo equipamento ficam **obsoletas** automaticamente.
:::

:::dica
Depois de aprovado, o ETP ganha o botão **Gerar orçamento**, que abre um novo orçamento em Comercial já com cliente e título pré-preenchidos a partir do ETP.
:::

:::atencao
O ETP não controla BOM/insumos — isso é feito à parte, em **Engenharia → Projetos** (por equipamento + disciplina), não dentro do próprio ETP.
:::

:::erro
**"Não consigo editar o ETP"** → ele está **aprovado** ou **obsoleto** (campos congelados). Peça a um `manager`/`admin` para **Reabrir para edição** (volta pra "em revisão") ou crie uma nova versão.
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
