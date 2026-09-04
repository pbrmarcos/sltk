---
title: Contato público e captação comercial
description: Como tratar mensagens recebidas pela página /contato e transformar solicitações qualificadas em oportunidades.
category: site-publico
slug: contato-e-captacao
tipo: passo-a-passo
nivel: iniciante
tags: [contato, captacao, lead, comercial]
papeis: [admin, manager, sales]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- `/contato` capta demandas gerais e institucionais — nem toda mensagem vira oportunidade.
- Respostas em até **1 dia útil**; toda mensagem tratada precisa registro no Hub.
- Cliente sem checklist definido → `/contato`. Cliente sabendo o equipamento → `/checklist/$slug`.
- Mensagens entram no fluxo de Chamados unificados com origem **Contato do site**.
:::

:::step{n="1" title="Formulário público" img="site-contato.png" alt="Página /contato com canais diretos à esquerda e formulário 'Send us a message' à direita"}
Em `/contato` o visitante encontra canais diretos (endereço, telefone, WhatsApp, e-mail, horário) e um formulário com nome, e-mail comercial, telefone opcional, assunto e mensagem.
:::

:::step{n="2" title="Triagem em /admin/contato" img="admin-chamados.png" alt="Caixa unificada de chamados filtrada por origem 'Contato do site' com contador zero"}
Revise novas mensagens em `/admin/contato` — a caixa unificada mostra origem, prioridade, atendente e SLA de resposta. Classifique origem/prioridade antes de responder.
:::

:::step{n="3" title="Qualificar comercialmente"}
Se houver potencial, **crie ou vincule uma oportunidade no pipeline**. Quando faltar dado técnico, envie o Checklist público adequado. Registre o follow-up no Comercial para preservar histórico.
:::

## Contato vs. Checklist

| Situação                                | Melhor caminho                     |
| --------------------------------------- | ---------------------------------- |
| Cliente ainda explorando solução        | `/contato`                         |
| Cliente já sabe o equipamento desejado  | `/checklist/$slug`                       |
| Pedido veio de campanha ou feira        | `/contato` + qualificação comercial|
| Necessidade técnica detalhada           | Checklist público específico             |

:::atencao
Nunca deixe mensagem tratada apenas por e-mail direto — se não entrou no Hub, não existe para o restante da equipe.
:::

:::dica
Use tags/campos de origem para medir campanhas e canais. Se a mensagem for de cliente existente pedindo suporte, direcione para o fluxo de chamado de pós-venda.
:::

## Ver também

- [Formulários públicos de Checklist](/ajuda/documentacao/site-publico/checklists-publicos)
- [SLA e alertas](/ajuda/documentacao/pos-vendas/sla-e-alertas)
