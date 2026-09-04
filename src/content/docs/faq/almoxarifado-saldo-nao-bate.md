---
question: O saldo do almoxarifado está errado. Posso corrigir a quantidade na mão?
category: compras
tags: [almoxarifado, estoque, ajuste, movimentos]
---

Não — o saldo é sempre o resultado dos movimentos, que são imutáveis. Para corrigir, abra a ficha do item em **Compras → Almoxarifado** e lance um **Ajuste de inventário** com a diferença e a justificativa (obrigatória quando o ajuste é negativo). O histórico continua mostrando o que aconteceu, quem lançou e o custo médio depois de cada movimento. Se o erro foi num recebimento de OC, use o **estorno** daquela linha: ele entra como quantidade negativa no mesmo item da OC e o status `recebida_parcial`/`recebida` se recalcula sozinho.
