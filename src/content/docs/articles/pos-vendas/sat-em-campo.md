---
title: SAT em campo
description: Criar, executar e encerrar uma ordem de serviço de assistência técnica no cliente.
category: pos-vendas
slug: sat-em-campo
tipo: guia
nivel: intermediario
tags: [sat, campo, assistencia, os]
papeis: [admin, manager, support, quality]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- SAT = ordem de serviço em campo (corretiva, preventiva, treinamento, visita).
- Nasce **automática** de FAT com ressalvas ou **manual** em `/pos-vendas/sat` → Nova SAT.
- Técnico executa no celular com checklist + fotos + assinatura.
- Encerra gerando laudo PDF e envia à Central de Documentos + cliente.
:::

:::step{n="1" title="Localizar ou criar a SAT" img="02-sat-lista.png" alt="Lista de SATs com equipamento, cliente, tipo e status"}
Em **Pós-venda → Relatórios SAT** (`/pos-vendas/sat`) você vê todas as SATs. Para uma nova:
1. Clique em **Nova SAT**.
2. Escolha **cliente**, **equipamento** (nº de série) e **tipo** (Corretiva / Preventiva / Treinamento / Visita).
3. Preencha **data prevista**, **técnico responsável** e endereço de atendimento.
:::

:::step{n="2" title="Preparar antes de ir a campo"}
Antes do atendimento:
1. Confirme **contato local** no cliente.
2. Anexe orientações, listas de verificação, material do cliente.
3. Se precisar de peça, gere **solicitação de compra** direto pela SAT (link para `/compras/solicitacao`).
:::

:::step{n="3" title="Executar em campo"}
No celular, o técnico:
1. Abre a SAT e clica em **Iniciar atendimento** (hora e localização, se autorizada, ficam registradas).
2. Marca cada item do checklist como **Conforme**, **Não conforme** ou **N/A**, com foto e observação.
3. Registra **peças usadas** (baixa de estoque quando integrado ao módulo de insumos).
4. Coleta a **assinatura do cliente** no dispositivo ao final.
:::

:::step{n="4" title="Encerrar e gerar laudo"}
De volta ao sistema:
1. Clique em **Encerrar**.
2. Confira o resumo e finalize — o **laudo PDF** é gerado com fotos, checklist e assinatura.
3. O PDF vai automaticamente para o cliente e para a Central de Documentos.
:::

:::dica
Se algum item ficou pendente, encerre como **Parcial**. O sistema sugere criar uma nova SAT para tratar o restante — sem perder rastro.
:::

:::atencao
Reabertura de SAT encerrada exige `manager`/`admin` com justificativa — a ação vai para `/admin/auditoria`.
:::

## Ver também

- [Visão geral do Pós-vendas](/ajuda/documentacao/pos-vendas/visao-geral)
- [Executar FAT](/ajuda/documentacao/qualidade/executar-fat)
