---
title: Agendar e preparar FAT
description: Como criar o FAT a partir da liberação, escolher template, marcar data e convidar participantes.
category: qualidade
slug: agendar-e-preparar-fat
tipo: guia
nivel: iniciante
tags: [fat, agendamento, preparacao, qualidade]
papeis: [admin, manager, quality]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- FAT em rascunho é criado automaticamente quando a Produção libera.
- Você **agenda a data**, **escolhe o template** e **convida participantes**.
- Comunicação com cliente é feita pelo próprio FAT (link seguro).
- Pré-FAT interno recomendado antes de convidar o cliente.
:::

## Passo a passo

:::step{n="1" title="Achar o FAT em rascunho" img="01-fat-lista.png" alt="Lista de FATs com filtro por status Rascunho"}
Menu **QUALIDADE → FAT**, filtro por **status = Rascunho**. FATs criados pela liberação da Produção aparecem aqui com equipamento e cliente já preenchidos.
:::

:::step{n="2" title="Abrir e escolher template" img="02-fat-novo.png" alt="Formulário do FAT com seleção de template, equipamento, cliente"}
Clique no FAT. Confirme o **equipamento** e escolha o **template** (por família). O checklist é carregado automaticamente. Confira que a versão do template é a mais recente.
:::

:::step{n="3" title="Agendar a data"}
Preencha:

- **Data e hora** da execução (com fuso do cliente se remoto).
- **Local** — fábrica SLTK ou vídeo (link gerado automaticamente).
- **Duração estimada** — usado para bloquear agenda interna.
:::

:::step{n="4" title="Convidar participantes"}
Adicione participantes:

- **Interno** — engenheiro responsável, operador da montagem, `manager`.
- **Cliente** — nome, e-mail, empresa. Receberá convite com link seguro.
- **Testemunha externa** (opcional) — certificadora, órgão regulatório.
:::

:::step{n="5" title="Anexar preparação" img="05-fat-detalhe.png" alt="Detalhe do FAT com aba de anexos e documentos de preparação"}
Na aba **Anexos**, suba: dossiê da produção, laudos, desenhos as-built, roteiro do FAT. O cliente vê pelo link, o que reduz surpresa no dia.
:::

:::step{n="6" title="Rodar pré-FAT interno"}
Antes de mandar convite ao cliente, marque um pré-FAT com o time interno usando o mesmo checklist. Corrija RNCs pequenas antes do cliente ver.
:::

:::dica
Enviar dossiê 5 dias antes do FAT é o padrão — cliente valida documental antes de gastar viagem.
:::

:::atencao
Nunca marque FAT com prazo apertado sem pré-FAT interno. Reprovação com cliente presente custa relacionamento.
:::

:::erro
**"Não vejo o FAT em rascunho"** → a produção ainda não liberou. Confirme na tela **PRODUÇÃO → Montagem** que a linha está **Concluída** e o botão **Liberar p/ FAT** foi acionado.
:::

## Ver também

- [Executar FAT](/ajuda/documentacao/qualidade/executar-fat)
- [Templates de FAT](/ajuda/documentacao/qualidade/templates-fat)

<!-- SHOTS:AUTO -->

## Imagens da tela

:::step{n="1" title="Lista de FATs agendados com checklist de preparação" img="agendar-e-preparar-fat-1.png" alt="Lista de FATs agendados com checklist de preparação"}
Lista de FATs agendados com checklist de preparação
:::

:::step{n="2" title="Formulário de novo FAT com template e itens de verificação" img="agendar-e-preparar-fat-2.png" alt="Formulário de novo FAT com template e itens de verificação"}
Formulário de novo FAT com template e itens de verificação
:::

<!-- /SHOTS:AUTO -->
