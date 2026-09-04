---
title: Cadastrar cliente
description: Como cadastrar um cliente manualmente com dados fiscais, endereço e contatos.
category: clientes-fornecedores
slug: cadastrar-cliente
tipo: guia
nivel: iniciante
tags: [cliente, cadastro, cnpj, rut]
papeis: [admin, manager, sales]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Cadastro em `/clientes/novo`; aceita BR, AR, CL, CO, CR, PE e PY.
- **Enriquecer** traz razão social e endereço automáticos por documento fiscal.
- Contatos (comprador, técnico, financeiro) na aba **Contatos**.
- Duplicados são detectados por `país + documento`.
:::

:::step{n="1" title="Abrir o formulário" img="04-cliente-novo.png" alt="Tela Novo cliente com campos país, documento fiscal, razão social e nome fantasia"}
Em **CRM → Clientes** clique em **Novo cliente** (ou vá direto em `/clientes/novo`). Selecione o **país** — isso ajusta as máscaras e a validação do documento fiscal.
:::

:::step{n="2" title="Enriquecer dados fiscais"}
1. Digite o **documento fiscal** (CNPJ / CUIT / RUT / NIT / RUC…).
2. Clique em **Enriquecer** — o sistema busca razão social, endereço e situação cadastral nas bases públicas.
3. Confira / edite os campos, complete e-mail e telefones corporativos.
:::

:::step{n="3" title="Endereço, segmento e responsável"}
Preencha endereço, segmento e responsável comercial. Esses campos alimentam o pipeline, o dashboard e a segmentação de Checklist.
:::

:::step{n="4" title="Adicionar contatos"}
Aba **Contatos**: adicione comprador, técnico e financeiro. Cada contato pode receber e-mails de orçamento, cotação e chamados.
:::

## Fontes de enriquecimento por país

- **BR** — Receita Federal (CNPJ).
- **AR** — CUIT Online.
- **CL** — busca web validada por RUT.
- **CO** — busca web validada por NIT.
- **CR** — Ministerio de Hacienda (API oficial).
- **PE** — apis.net.pe (SUNAT).
- **PY** — busca web validada por RUC.

Se a fonte falhar, os campos ficam livres para preenchimento manual.

:::dica
Cadastre pelo menos **um contato com e-mail válido** antes de salvar — sem ele, o cliente não recebe orçamento nem notificação de chamado.
:::

:::atencao
Se aparecer alerta de **cliente duplicado** ao salvar, revise o cadastro antes de forçar — verifique CNPJ e razão social para evitar históricos separados.
:::

## Permissões

- `sales` / `manager` / `admin` podem criar e editar.
- `engineer` / `quality` têm apenas leitura.

## Ver também

- [Importar clientes em lote](/ajuda/documentacao/clientes-fornecedores/importar-clientes-em-lote)

<!-- SHOTS:AUTO -->

## Imagens da tela

:::step{n="1" title="Lista de clientes com filtros por país, status e categoria" img="cadastrar-cliente-1.png" alt="Lista de clientes com filtros por país, status e categoria"}
Lista de clientes com filtros por país, status e categoria
:::

:::step{n="2" title="Formulário Novo cliente com scan automático e enriquecimento" img="cadastrar-cliente-2.png" alt="Formulário Novo cliente com scan automático e enriquecimento"}
Formulário Novo cliente com scan automático e enriquecimento
:::

<!-- /SHOTS:AUTO -->
