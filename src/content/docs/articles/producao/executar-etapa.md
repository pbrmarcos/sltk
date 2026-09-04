---
title: Executar etapa de montagem
description: Como um montador roda uma sub-etapa da montagem: checklist, anexos e H/H.
category: producao
slug: executar-etapa
tipo: guia
nivel: iniciante
tags: [producao, execucao, checklist, hh]
papeis: [admin, manager, production]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Entre no **detalhe da montagem** (clique na linha da lista).
- Cada sub-etapa tem: **descrição, checklist, anexos, H/H**.
- Feche o checklist item por item — não em bloco.
- Anexe evidência (foto, medição, teste) antes de concluir a sub-etapa.
:::

## Passo a passo

:::step{n="1" title="Abrir a montagem do equipamento" img="01-montagem-kanban.png" alt="Lista de montagens com equipamento sendo aberto"}
Menu **PRODUÇÃO → Montagem**, clique na linha do equipamento. O detalhe traz a árvore de sub-etapas herdada do ETP.
:::

:::step{n="2" title="Selecionar uma sub-etapa"}
Clique na sub-etapa que você vai executar (ex.: "Montagem elétrica — QDC-01"). O painel lateral abre com:

- **Descrição técnica**.
- **Anexos de referência** (desenho, manual, POP).
- **Checklist** de execução.
- **Campo de H/H**.
:::

:::step{n="3" title="Rodar o checklist"}
Marque cada item conforme conclui. Itens obrigatórios exigem **evidência anexa** (foto, print de teste, planilha de aperto de torque). Não marque em lote — cada linha é um controle.
:::

:::step{n="4" title="Anexar evidências"}
Botão **+ Anexo** aceita imagens, PDFs e vídeos curtos. Nomeie com padrão (`torque-fixacao-eixo-01.jpg`) para facilitar auditoria e o FAT.
:::

:::step{n="5" title="Apontar H/H"}
No fim do dia (ou da sub-etapa), preencha horas trabalhadas. Regra igual à Engenharia: aponte diário, não deixe pra sexta. Rastreia margem e produtividade real.
:::

:::step{n="6" title="Concluir a sub-etapa"}
Quando checklist 100% + evidências ok, botão **Concluir sub-etapa** habilita. O progresso da montagem é recalculado.
:::

:::dica
Foto do "estado final" da sub-etapa (peça montada, conector fechado, cabo identificado) vale mais que 3 linhas de checklist — anexe sempre.
:::

:::atencao
Se detectar não conformidade durante a execução, **não avance**. Abra uma [NC interna](/ajuda/documentacao/producao/retrabalho-e-nc-interna) e mantenha a sub-etapa aberta com motivo.
:::

:::erro
**"Botão Concluir sub-etapa está desabilitado"** → passe o mouse sobre ele. O tooltip mostra qual item de checklist ou anexo obrigatório está pendente.
:::

## Ver também

- [Retrabalho e NC interna](/ajuda/documentacao/producao/retrabalho-e-nc-interna)
- [Kanban de montagem](/ajuda/documentacao/producao/kanban-montagem)
