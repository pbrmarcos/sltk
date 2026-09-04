---
title: Emitir e aprovar ordem de compra
description: Como gerar a OC a partir da cotação escolhida, passar pela aprovação e enviar ao fornecedor.
category: compras
slug: emitir-e-aprovar-oc
tipo: guia
nivel: intermediario
tags: [oc, ordem-compra, aprovacao, alcada]
papeis: [admin, manager, purchasing]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Vá em **COMPRAS → Ordens de Compra** (`/compras/ordens`).
- Toda OC nasce de uma **cotação com vencedora escolhida**.
- Passa por **alçada de aprovação** definida por valor.
- Após aprovada, é **enviada** ao fornecedor e libera para recebimento.
:::

## Passo a passo

:::step{n="1" title="Ver ordens abertas" img="03-ordens-lista.png" alt="Lista de Ordens de Compra com colunas número, fornecedor, valor total, status e aprovador"}
Menu **COMPRAS → Ordens de Compra**. Cada linha mostra número, fornecedor, valor total, status atual e aprovador responsável.
:::

:::step{n="2" title="Criar OC a partir da cotação" img="04-nova-oc.png" alt="Formulário Nova Ordem de Compra com dados do fornecedor, itens, valores e condições"}
Clique **+ Nova OC** ou, na cotação encerrada, use **Gerar OC**. O sistema copia automaticamente:

- Fornecedor vencedor.
- Itens, quantidades e preços da proposta.
- Condições comerciais e prazo.

Revise, ajuste **local de entrega**, **contato do faturamento**, **observações** e salve.
:::

:::step{n="3" title="Enviar para aprovação"}
Mude o status para **Pronto para aprovação**. O sistema identifica automaticamente o aprovador pela **alçada** configurada:

- Até R$ 10 mil → `manager`.
- Acima → `admin`.
- Valores acima do limite máximo → aprovação em duas etapas.
:::

:::step{n="4" title="Aprovar"}
O aprovador recebe notificação e vê a OC em sua fila. Ao aprovar, o status vira **Aprovada**. Reprovação pede motivo e volta a OC para o comprador.
:::

:::step{n="5" title="Enviar ao fornecedor"}
Com OC aprovada, clique **Enviar ao fornecedor**. É gerado o PDF (com anexos) e enviado por e-mail. Data e destinatário ficam auditados.
:::

:::step{n="6" title="Acompanhar recebimento"}
No detalhe da OC, aba **Recebimento**: registre entradas parciais/totais, NF, divergências e não conformidades. Isso alimenta o estoque e o inventário do projeto.
:::

:::dica
Antes de aprovar, confira o **comparativo da cotação origem**: se o preço da OC divergir da proposta vencedora, o sistema alerta. Sempre justifique a variação.
:::

:::atencao
OC não pode ser editada depois de **Enviada**. Para mudanças, use **Aditivo** ou **Cancelamento com nova OC** — ambos ficam auditados.
:::

:::erro
**"Não consigo aprovar — fora de alçada"** → o valor total da OC ultrapassa seu limite. Reencaminhe para um aprovador com alçada maior ou peça revisão do escopo.
:::

## Ver também

- [Cotação com múltiplos fornecedores](/ajuda/documentacao/compras/cotacao-multiplos-fornecedores)
- [Auditoria de compras](/ajuda/documentacao/compras/auditoria-de-compras)

<!-- SHOTS:AUTO -->

## Imagens da tela

:::step{n="1" title="Lista de ordens de compra com fila de aprovação" img="emitir-e-aprovar-oc-1.png" alt="Lista de ordens de compra com fila de aprovação"}
Lista de ordens de compra com fila de aprovação
:::

:::step{n="2" title="Wizard de nova ordem de compra" img="emitir-e-aprovar-oc-2.png" alt="Wizard de nova ordem de compra"}
Wizard de nova ordem de compra
:::

<!-- /SHOTS:AUTO -->
