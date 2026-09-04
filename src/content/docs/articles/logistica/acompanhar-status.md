---
title: Acompanhar status do embarque
description: Como avançar a timeline (Preparando → Coletado → Em trânsito → Entregue → Instalado), anexar comprovantes e alertar o cliente.
category: logistica
slug: acompanhar-status
tipo: guia
nivel: iniciante
tags: [logistica, status, timeline, entrega]
papeis: [admin, manager, purchasing, production, field]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Abra o embarque em `/logistica/embarques/$id`. A **timeline** fica no topo.
- Cada mudança de status pede **comentário + anexo** e fica registrada (autor, data/hora).
- **Entregue** dispara notificação automática para o time comercial e o responsável do cliente.
- **Instalado** encerra o embarque; para reabrir, só `manager`/`admin`.
:::

## A timeline de status

| Status | Quem marca | Anexo obrigatório |
|---|---|---|
| **Preparando** | automático ao criar | — |
| **Coletado** | production/purchasing | Foto do carregamento + NF |
| **Em trânsito** | purchasing | CT-e ou ordem de coleta |
| **Entregue** | field | Canhoto assinado ou foto no cliente |
| **Instalado** | field | Termo de instalação assinado |

:::step{n="1" title="Mudar de status"}
Clique no próximo passo da timeline. Abre um dialog com:

- Comentário obrigatório (mín. 10 caracteres).
- Upload de anexos (PDF, JPG, PNG, XML).
- Data/hora do evento (default: agora, editável).

Salve para avançar.
:::

:::step{n="2" title="Anexar comprovantes por evento"}
Cada evento aceita **múltiplos anexos**. Bom padrão:

- **Coletado**: foto da carreta, NF-e (PDF).
- **Em trânsito**: CT-e, protocolo do rastreamento.
- **Entregue**: canhoto assinado + foto do equipamento no site do cliente.
- **Instalado**: termo de aceite + checklist de instalação (do módulo SAT).
:::

:::step{n="3" title="Reabrir um evento"}
Um evento errado pode ser **desfeito** por `manager`/`admin` clicando no bloco da timeline e usando **Desfazer último status**. A ação fica registrada em `/admin/auditoria`.
:::

## Notificações automáticas

- **Coletado** → alerta o responsável comercial.
- **Em trânsito** → e-mail para o contato do cliente com previsão de entrega.
- **Entregue** → cria automaticamente uma **pendência de instalação** no módulo Pós-vendas.
- **Instalado** → abre janela de garantia (SLA de chamados começa a contar).

:::atencao
Se o cliente reportar problema antes do status **Instalado**, abra um chamado em Pós-vendas — não use a timeline do embarque para tratar defeitos. A timeline é log operacional, não canal de chamado.
:::

## Ver também

- [Criar um embarque](/ajuda/documentacao/logistica/criar-embarque)
- [Abrir chamado após entrega](/ajuda/documentacao/pos-vendas/abrir-chamado)
