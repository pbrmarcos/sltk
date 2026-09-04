---
title: Categorias de fornecedor e homologação
description: Como as categorias organizam o cadastro e o que muda quando um fornecedor é homologado.
category: clientes-fornecedores
slug: categorias-e-homologacao
tipo: conceito
nivel: intermediario
tags: [fornecedor, categorias, homologacao, qualidade]
papeis: [admin, manager, purchasing, quality]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- **Categoria** define em que família de insumo/serviço o fornecedor atua.
- **Homologação** define se ele está apto a receber OC.
- Cotações filtram por categoria; OC verifica homologação.
- `manager`/`admin` gerenciam status; ações ficam em `/admin/auditoria`.
:::

## Categorias

- Cadastradas em `/admin/banco` (aba **Categorias de fornecedor**).
- Um fornecedor pode ter múltiplas categorias.
- Nas cotações, o filtro **Categoria** só sugere fornecedores marcados — evita convidar quem não atua no ramo.

:::step{n="1" title="Ver a lista com filtros de categoria e status" img="06-fornecedores-lista.png" alt="Lista de fornecedores com filtros de país, status, categoria, ranking e incoterm"}
Em `/fornecedores` você filtra por **status** (homologado / não homologado / suspenso), **categoria**, **país** e **ranking**. O ícone de estrela nas linhas indica fornecedor destacado no ranking interno.
:::

:::step{n="2" title="Homologar um fornecedor"}
1. Abra o fornecedor em `/fornecedores/$id`.
2. Confirme os anexos (CNPJ, certidões, ISO, contrato).
3. Altere status para **Homologado** — a mudança e o autor ficam na auditoria.
:::

:::step{n="3" title="Suspender quando necessário"}
Reprovações repetidas, atraso grave ou perda de certidão → mova para **Suspenso**. O sistema bloqueia novas OC até `admin` reativar.
:::

## O que muda em cada tela

- **Cotações** (`/compras/cotacoes`): suspensos ficam ocultos; não homologados aparecem com aviso.
- **Ordens de compra** (`/compras/ordens`): OC para não homologado exige justificativa e aprovação de `manager`.
- **Homologação em massa**: `admin` pode reprocessar via `/admin/banco` (auditado).

:::dica
Registre em **Notas** (`/fornecedores/$id`) avaliações de entrega e qualidade. Elas alimentam o ranking usado no filtro da cotação.
:::

:::atencao
Revise a homologação a cada **12 meses**. Certidões expiradas invalidam a homologação — vale automatizar lembretes em `/admin/auditoria`.
:::

## Ver também

- [Cadastrar fornecedor](/ajuda/documentacao/clientes-fornecedores/cadastrar-fornecedor)
- [Emitir e aprovar OC](/ajuda/documentacao/compras/emitir-e-aprovar-oc)
