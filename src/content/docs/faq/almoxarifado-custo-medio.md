---
question: Como o sistema calcula o custo médio de um item do almoxarifado?
category: compras
tags: [almoxarifado, custo-medio, valorizacao]
---

Por **média ponderada**, recalculada a cada entrada valorizada: `(saldo × custo médio atual + quantidade recebida × custo da entrada) ÷ (saldo + quantidade recebida)`. Saídas, devoluções e transferências **não** alteram a média — a devolução volta pelo custo da saída correspondente. O custo médio é global por item (o endereço diz onde a peça está, não quanto vale) e fica gravado em cada movimento, então a ficha do item mostra qual era a média depois de cada lançamento. Entrada avulsa sem custo informado entra pelo custo médio vigente.
