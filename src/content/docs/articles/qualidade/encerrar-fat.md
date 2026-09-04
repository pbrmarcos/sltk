---
title: Encerrar FAT
description: Como encerrar o FAT após a inspeção: assinaturas, relatório final e liberação para embarque.
category: qualidade
slug: encerrar-fat
tipo: guia
nivel: intermediario
tags: [fat, encerramento, assinatura, relatorio]
papeis: [admin, manager, quality]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Só encerra com **100% do checklist** respondido (Aprovado / N.A. / Reprovado com RNC tratada).
- Botão **Encerrar FAT** gera o **Relatório final** em PDF.
- Colhe assinatura eletrônica de todos os participantes.
- FAT encerrado libera o equipamento para **embarque**.
:::

## Passo a passo

:::step{n="1" title="Conferir pendências" img="05-fat-detalhe.png" alt="Detalhe do FAT com aba Encerramento mostrando checklist de pré-encerramento"}
Aba **Encerramento**. O sistema mostra o checklist automático:

- Todos os itens respondidos ✓
- RNCs tratadas ou reagendadas ✓
- Anexos obrigatórios ✓

Pendências aparecem em vermelho com link para o item.
:::

:::step{n="2" title="Gerar relatório de pré-encerramento"}
Clique **Prévia do relatório** para ver o PDF antes de fechar. Confira cabeçalho (equipamento, cliente, participantes), sumário de resultados e anexos vinculados.
:::

:::step{n="3" title="Encerrar"}
Botão **Encerrar FAT**. Escolha o veredito:

- **Aprovado** — nada pendente. Segue direto para embarque.
- **Aprovado com ressalvas** — pendências não-bloqueantes documentadas.
- **Reprovado** — pelo menos uma RNC bloqueia embarque. Volta para Produção.
:::

:::step{n="4" title="Coletar assinaturas"}
Cada participante (interno e cliente) assina eletronicamente pelo link do FAT. O status muda para **Encerrado — aguardando assinaturas**. Quando todos assinam, vira **Encerrado**.
:::

:::step{n="5" title="Liberar para embarque"}
FAT **Aprovado** libera automaticamente o equipamento para **Logística → Embarque**. FAT reprovado devolve para Produção com a lista de RNCs.
:::

:::dica
Se o cliente demorou para assinar, o `manager` pode encerrar unilateralmente com **motivo do encerramento sem assinatura completa** — fica registrado.
:::

:::atencao
Aprovado com ressalvas é a zona cinzenta mais perigosa. Anote a **ressalva** com prazo e responsável — senão vira SAT depois de entregue.
:::

:::erro
**"Botão Encerrar está desabilitado"** → passe o mouse. Costuma ser (1) checklist incompleto, (2) RNC aberta ou (3) evidência faltante em item crítico.
:::

## Ver também

- [Executar FAT](/ajuda/documentacao/qualidade/executar-fat)
- [RNC e reprovação em FAT](/ajuda/documentacao/qualidade/rnc-e-reprovacao)
