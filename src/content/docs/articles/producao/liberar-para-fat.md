---
title: Liberar para FAT
description: O que precisa estar pronto na Produção para liberar o equipamento para a inspeção final (FAT).
category: producao
slug: liberar-para-fat
tipo: guia
nivel: intermediario
tags: [fat, liberacao, producao, qualidade]
papeis: [admin, manager, production, quality]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Só libera quando todas as sub-etapas fecham e não há NC aberta.
- Na linha da montagem em **Concluída**, botão **Liberar p/ FAT**.
- Liberar cria automaticamente um **FAT** em rascunho na Qualidade.
- Devolvida pelo FAT? A montagem volta para **Em andamento** com o motivo.
:::

## Pré-requisitos

Antes de liberar:

1. Todas as sub-etapas em **Concluída**, com checklist e evidências.
2. Zero **NC interna aberta**. Se sobrou algo, ou fecha ou é justificado como fora do escopo do FAT.
3. **Testes internos** aplicáveis rodados (elétrico, hidráulico, funcional).
4. **Dossiê montado** (fotos, laudos, torque, teste de estanqueidade se aplicável).

## Passo a passo

:::step{n="1" title="Conferir progresso 100%" img="01-montagem-kanban.png" alt="Linha da montagem com progresso 100% e status Concluída"}
Na tela **PRODUÇÃO → Montagem**, a linha deve estar em **Concluída** com barra de progresso cheia. Se não estiver, abra o detalhe e feche o que falta.
:::

:::step{n="2" title="Rodar checklist final"}
No detalhe do equipamento, aba **Liberação para FAT**. O sistema mostra o checklist automático:

- Todas as sub-etapas ✓
- Zero NC aberta ✓
- Testes internos ✓
- Dossiê anexado ✓

Itens vermelhos aparecem no topo com motivo.
:::

:::step{n="3" title="Liberar"}
Botão **Liberar para FAT**. Confirme o resumo (equipamento, cliente, agenda proposta). Ao confirmar:

- Um **FAT em rascunho** é criado automaticamente em **QUALIDADE → FAT**.
- Times de qualidade e comercial recebem notificação.
- A linha da montagem sai da fila operacional e vai para o histórico.
:::

:::step{n="4" title="Se o FAT devolver"}
Se a Qualidade reprovar (RNC de FAT), a montagem retorna para **Em andamento** com a lista de itens a corrigir. Trate como um novo ciclo de execução: [Retrabalho e NC](/ajuda/documentacao/producao/retrabalho-e-nc-interna).
:::

:::dica
Antes de clicar **Liberar**, faça um "FAT interno" — a Produção simula os testes que a Qualidade fará. Reduz devolução drasticamente.
:::

:::atencao
Liberar com NC aberta "esquecida" é o erro mais comum. O sistema bloqueia, mas ainda vale a inspeção visual da lista.
:::

## Ver também

- [Executar FAT](/ajuda/documentacao/qualidade/executar-fat)
- [Agendar e preparar FAT](/ajuda/documentacao/qualidade/agendar-e-preparar-fat)
- [Retrabalho e NC interna](/ajuda/documentacao/producao/retrabalho-e-nc-interna)
