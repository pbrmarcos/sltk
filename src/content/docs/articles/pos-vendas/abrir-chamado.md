---
title: Abrir um chamado
description: Como registrar um chamado interno ou receber via site público, com prioridade e SLA automáticos.
category: pos-vendas
slug: abrir-chamado
tipo: guia
nivel: iniciante
tags: [chamados, abertura, sla, prioridade]
papeis: [admin, manager, support]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Três origens: **Site público**, **Contato do site** e **Interno**.
- Todo chamado ganha código `CHM-…` e um SLA de resposta/resolução baseado na prioridade.
- Interno: `/pos-vendas/chamados` → **Novo chamado**.
- O cliente recebe e-mail com link para responder sem login.
:::

## Origens

- **Site público (`/suporte`)** — cliente envia via formulário com token. Chega com nome, e-mail e nº de série quando informado.
- **Contato do site** — mensagens do form de contato viram chamado automaticamente.
- **Interno** — a equipe abre pelo cliente que ligou / mandou WhatsApp.

:::step{n="1" title="Abrir a fila de chamados" img="01-chamados-lista.png" alt="Tela Chamados com botão Novo chamado no topo direito"}
Vá em **Pós-venda → Chamados** (`/pos-vendas/chamados`). Se ainda não há chamados para o filtro atual, use os filtros do topo (origem, status, prioridade) para localizar; para criar, use o botão **Novo chamado**.
:::

:::step{n="2" title="Preencher o chamado interno"}
No diálogo **Novo chamado**:
1. Selecione o **cliente** (busca por razão social, fantasia ou CNPJ).
2. Informe **assunto** e **descrição** do problema.
3. Se aplicável, informe **número de série** do equipamento — vincula ao histórico.
4. Defina a **prioridade** (Crítica / Alta / Média / Baixa). O SLA é calculado automaticamente.
5. Atribua **atendente** (opcional — pode ficar "Sem atendente" para alguém puxar).
:::

:::step{n="3" title="Salvar e acompanhar"}
Ao salvar, o chamado recebe código `CHM-…` e passa a aparecer na listagem. O cliente recebe e-mail com o código e link seguro para responder sem precisar de login.
:::

:::dica
Deixe **Sem atendente** quando não souber quem deve pegar. `support` e `manager` recebem alerta e o primeiro que assumir vira o dono.
:::

:::atencao
Alterar a prioridade **depois** que o chamado foi criado não recalcula o SLA original. A alteração fica registrada na timeline como evento.
:::

## Prioridade e SLA

- **Crítica** — linha parada. SLA agressivo (ex.: resposta em 1h).
- **Alta** — impacto operacional relevante.
- **Média** — dúvidas técnicas, ajustes.
- **Baixa** — sugestões, dúvidas gerais.

Os prazos exatos são configuráveis em [`/admin/sla-chamados`](/ajuda/documentacao/pos-vendas/sla-e-alertas).

## Ver também

- [Atender e acompanhar chamado](/ajuda/documentacao/pos-vendas/atender-chamado)
- [SLA e alertas](/ajuda/documentacao/pos-vendas/sla-e-alertas)
