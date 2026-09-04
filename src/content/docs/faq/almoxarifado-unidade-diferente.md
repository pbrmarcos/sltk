---
question: A unidade da OC é "caixa" e a do estoque é "peça". Como recebo?
category: compras
tags: [almoxarifado, unidade, conversao, recebimento]
---

No recebimento, quando a unidade da ordem de compra é diferente da unidade de estoque do item, o sistema pede o **fator de conversão** (ex.: 1 caixa = 50 peças) e só então libera o lançamento. O fator fica gravado no item e é reaproveitado nos próximos recebimentos, e o fator aplicado também fica registrado no movimento. A mesma regra vale ao vincular uma linha de insumo do projeto a um item do almoxarifado: sem o fator, o vínculo é bloqueado — melhor não vincular do que comparar quantidades em unidades diferentes em silêncio.
