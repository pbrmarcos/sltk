---
title: Cotação com múltiplos fornecedores
description: Como convidar fornecedores, receber propostas e escolher a vencedora.
category: compras
slug: cotacao-multiplos-fornecedores
tipo: guia
nivel: intermediario
tags: [cotacao, checklist, fornecedores, propostas]
papeis: [admin, manager, purchasing]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Vá em **COMPRAS → Cotações** (`/compras/cotacoes`).
- Crie uma cotação a partir de uma ou mais **solicitações aprovadas**.
- Convide no mínimo **3 fornecedores homologados**.
- Ao receber propostas, escolha a vencedora — vira base da **OC**.
:::

## Passo a passo

:::step{n="1" title="Abrir a lista de cotações" img="02-cotacoes-lista.png" alt="Tela Cotações mostrando cotações em andamento com fornecedores convidados e propostas recebidas"}
Menu **COMPRAS → Cotações**. Você vê cotações **Em andamento**, **Encerradas** e **Canceladas**. Cada linha mostra número, título, número de fornecedores convidados, propostas recebidas e prazo.
:::

:::step{n="2" title="Criar nova cotação"}
Clique **+ Nova cotação**. Escolha entre:

- **A partir de solicitações** — selecione uma ou várias solicitações aprovadas (podem ser combinadas por fornecedor/família).
- **Avulsa** — para negociação de contrato ou item sem solicitação prévia.

Preencha:

- **Título** e **descrição do escopo**.
- **Data limite de resposta**.
- **Condições comerciais** (prazo de pagamento, incoterm, frete).
:::

:::step{n="3" title="Selecionar fornecedores" img="06-cotacao-detalhe.png" alt="Detalhe da cotação com abas de fornecedores convidados, propostas e comparativo"}
Na aba **Fornecedores**, adicione pelo menos 3 fornecedores **homologados** para a categoria. O sistema bloqueia fornecedores não homologados para itens críticos.
:::

:::step{n="4" title="Enviar convites"}
Clique **Enviar convites**. Cada fornecedor recebe um link público seguro para preencher a proposta. Você acompanha o status individual (Enviado / Visualizado / Respondido).
:::

:::step{n="5" title="Receber e comparar propostas" img="06-cotacao-detalhe.png" alt="Comparativo de propostas por fornecedor com preço, prazo, condição de pagamento"}
Na aba **Comparativo** as propostas chegam lado a lado: preço unitário, total, prazo de entrega, condição de pagamento. Colunas ordenáveis destacam a melhor oferta em cada critério.
:::

:::step{n="6" title="Escolher vencedora"}
Selecione a proposta vencedora e clique **Marcar como vencedora**. Registre a **justificativa** (obrigatória quando não é a mais barata). A cotação vira **base para uma OC**.
:::

:::dica
"Melhor" nem sempre é "mais barato". Considere prazo, homologação, histórico de qualidade e condições de pagamento. A justificativa protege a decisão em auditoria.
:::

:::atencao
Cotações abaixo de 3 fornecedores só devem ser aceitas em casos excepcionais (fornecedor exclusivo, urgência declarada). Toda exceção fica visível na auditoria.
:::

:::erro
**"Fornecedor não aparece na lista"** → verifique **Fornecedores → Homologação**. Fornecedor precisa estar `Ativo` e homologado na categoria do item.
:::

## Ver também

- [Emitir e aprovar OC](/ajuda/documentacao/compras/emitir-e-aprovar-oc)
- [Homologação de fornecedores](/ajuda/documentacao/clientes-fornecedores/categorias-e-homologacao)
- [Criar solicitação](/ajuda/documentacao/compras/criar-solicitacao)

<!-- SHOTS:AUTO -->

## Imagens da tela

:::step{n="1" title="Cotação com múltiplos fornecedores lado a lado" img="cotacao-multiplos-fornecedores-1.png" alt="Cotação com múltiplos fornecedores lado a lado"}
Cotação com múltiplos fornecedores lado a lado
:::

<!-- /SHOTS:AUTO -->
