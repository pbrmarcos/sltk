---
title: Almoxarifado — estoque, reserva e custo médio
description: Como cadastrar itens, consultar saldo por endereço, reservar material para um projeto e entender o custo médio ponderado.
category: compras
slug: almoxarifado
tipo: guia
nivel: intermediario
tags: [almoxarifado, estoque, reserva, custo-medio, compras, engenharia]
papeis: [admin, manager, purchasing, production, engineer]
atualizado_em: 2026-09-04
app_version: "1.1.2"
---

:::tldr
- Menu **COMPRAS → Almoxarifado** (`/compras/almoxarifado`): catálogo único de peças com saldo, reservado, disponível e valor imobilizado.
- O saldo **nunca é digitado**: ele é o resultado dos movimentos (entrada, saída, devolução, ajuste), que são imutáveis.
- **Reserva por projeto** garante o material para a Engenharia; ninguém retira o que está empenhado para outro projeto.
- **Custo médio ponderado** é recalculado a cada entrada e fica gravado em cada movimento.
- Correção de erro se faz com **movimento de estorno**, nunca editando o histórico.
:::

## Conceitos em uma linha

| Termo | O que é |
|---|---|
| Item (`ALM-#####`) | A peça física no catálogo da empresa — existe independentemente de projeto. |
| Local | Endereço interno (rua/prateleira/posição) onde a peça está. |
| Movimento | Evento imutável que soma ou subtrai saldo. Fonte de verdade. |
| Reserva | Empenho de quantidade para um projeto, com validade. |
| Disponível | Total menos as reservas vigentes de outros projetos. |
| Custo médio | Média ponderada de todas as entradas valorizadas do item. |

## Cadastrar um item

:::step{n="1" title="Abrir o almoxarifado"}
**COMPRAS → Almoxarifado**. O painel mostra itens ativos, itens com saldo, itens abaixo do mínimo e o valor total imobilizado. Use a busca por código ou descrição e os filtros de saldo/mínimo.
:::

:::step{n="2" title="Novo item"}
Informe descrição, unidade de estoque (lista fechada), categoria, estoque mínimo e, quando houver, part number e código do fabricante. O código `ALM-#####` é gerado pelo sistema.
:::

:::step{n="3" title="Confirmar itens semelhantes"}
Antes de salvar, o sistema mostra itens de descrição parecida. Part number e código do fabricante repetidos (ignorando acento e maiúsculas) são **bloqueados** — é assim que o catálogo não duplica o mesmo parafuso.
:::

## Entrada por ordem de compra

O material entra pelo recebimento da OC, e não por digitação de saldo.

1. **COMPRAS → Almoxarifado → Ordens de compra** mostra cada OC com barra de progresso do recebido, o que falta receber e o custo por item.
2. No recebimento, informe por linha a quantidade recebida, o endereço de destino e o custo unitário.
3. Se a unidade da OC for diferente da unidade de estoque (ex.: caixa com 50), o sistema exige o **fator de conversão** e o guarda no item para as próximas vezes.
4. O status da OC (`recebida_parcial` / `recebida`) é recalculado sozinho a partir da soma dos movimentos.

:::dica{title="Duplo clique não duplica estoque"}
Cada recebimento tem uma chave de evento. Reenviar o mesmo recebimento (duplo clique, retry de rede) devolve o recebimento já registrado, sem lançar entrada de novo.
:::

## Entrada avulsa, retirada, devolução e ajuste

Na **ficha do item** (`/compras/almoxarifado/<código>`) você tem abas de movimentos, saldo por local e reservas, com as ações:

- **Entrada avulsa** — material sem OC; sem custo informado, entra pelo custo médio vigente.
- **Retirada** — exige projeto. Consome primeiro a reserva daquele projeto; o excedente sai do saldo livre.
- **Devolução** — volta pelo custo da saída correspondente, sem distorcer a média.
- **Ajuste de inventário** — ajuste negativo exige justificativa, que fica gravada no movimento.

## Reserva para projeto

- Reserva é criada em **Compras → Almoxarifado** ou direto no painel de insumos do projeto (Engenharia).
- Tem validade (padrão 90 dias). **Reserva vencida deixa de bloquear na hora**, sem depender de rotina agendada.
- Projeto cancelado ou concluído libera automaticamente o empenho.
- Retirada de projeto sem reserva só pode consumir o que está livre.

## Como o custo médio é calculado

A cada entrada valorizada:

```text
custo_medio_novo = (saldo_anterior × custo_medio_anterior + qtd_entrada × custo_entrada)
                   ÷ (saldo_anterior + qtd_entrada)
```

Saídas e devoluções **não** alteram a média. O custo médio é **global por item** — o endereço diz onde a peça está, não quanto ela vale. Cada movimento grava o custo médio resultante, então o histórico é auditável linha a linha.

## Integração com a Engenharia

No painel de insumos do projeto, cada linha mostra o item vinculado, o disponível convertido para a unidade da linha e o quanto já está reservado, com as ações **Reservar do estoque** e **Criar item de almoxarifado a partir desta linha**. Detalhes em [Insumos do projeto](/ajuda/documentacao/engenharia/visao-geral).

## Quem pode o quê

| Ação | Papéis |
|---|---|
| Cadastrar/editar item, unidade, local | admin, manager, purchasing |
| Lançar entrada (OC ou avulsa) | admin, purchasing |
| Retirada, devolução, transferência | admin, purchasing, production |
| Ajuste de inventário | admin, manager |
| Criar/cancelar reserva | admin, manager, engineer, purchasing |
| Somente consulta | quem tem acesso a Compras ou Engenharia |

## Relacionados

- [Emitir e aprovar OC](/ajuda/documentacao/compras/emitir-e-aprovar-oc)
- [Auditoria de compras](/ajuda/documentacao/compras/auditoria-de-compras)
- [Visão geral de Compras](/ajuda/documentacao/compras/visao-geral)
