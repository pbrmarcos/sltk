---
title: Etapas do projeto e kanban
description: Como usar o kanban de etapas por disciplina, mover cards e anexar evidências.
category: engenharia
slug: etapas-e-kanban
tipo: guia
nivel: intermediario
tags: [etapas, kanban, mecanico, eletrico]
papeis: [admin, manager, engineer]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Menu **OPERAÇÕES → Planejamento** (`/engenharia/etapas`) — kanban por projeto.
- Colunas padrão: **Planejado → Em execução → Revisão → Concluído**.
- Arraste o card para mudar de estágio. Toda transição é auditada.
- Cada card aceita **anexos, H/H, checklist e comentários**.
:::

## Passo a passo

:::step{n="1" title="Abrir o kanban" img="03-etapas-kanban.png" alt="Kanban de etapas com colunas Planejado, Em execução, Revisão, Concluído"}
Menu **OPERAÇÕES → Planejamento**. Filtre por **projeto**, **disciplina** (Mecânico/Elétrico) e **engenheiro**. As colunas mostram totais de etapas e H/H estimado vs. apontado.
:::

:::step{n="2" title="Kanban por disciplina" img="04-mecanico.png" alt="Kanban específico da disciplina Mecânica com cards por engenheiro"}
Alternativamente, acesse **Engenharia → Mecânico** ou **Elétrico** — mesma lógica de kanban, filtrado por disciplina.
:::

:::step{n="3" title="Criar etapa"}
Clique **+ Nova etapa** ou dentro do card do projeto. Preencha:

- **Título** curto (ex.: "Diagrama unifilar QDC-01").
- **Disciplina**.
- **Responsável**.
- **H/H estimado**.
- **Depende de** (opcional, cria vínculo entre etapas).
:::

:::step{n="4" title="Mover cards" img="03-etapas-kanban.png" alt="Card sendo arrastado da coluna Em execução para Revisão"}
Arraste o card para a próxima coluna:

- **Planejado → Em execução** — o cronômetro de H/H começa a valer.
- **Em execução → Revisão** — obriga anexar entregável (desenho, memorial).
- **Revisão → Concluído** — precisa de aprovação do manager/engenheiro sênior.
:::

:::step{n="5" title="Detalhar o card"}
Clique no card para abrir o painel lateral:

- **Descrição técnica**.
- **Anexos** — DWG, PDF, XLSX.
- **Checklist** — subtarefas.
- **H/H** — aponte direto na aba "H/H Estimado vs Real" do Planejamento.
- **Comentários** — discussão técnica com engenheiros.
:::

:::dica
Use cores/tags para marcar etapas críticas do caminho crítico. Etapas com dependência não resolvida aparecem em vermelho.
:::

:::atencao
Não pule direto de **Planejado** para **Concluído** — quebra o rastreio de H/H e evidência. Sempre passe pelas colunas intermediárias.
:::

:::erro
**"Não consigo mover para Concluído"** → falta o entregável anexado ou aprovação do revisor. O card mostra qual condição está pendente.
:::

## Ver também

- [Liberação para produção](/ajuda/documentacao/engenharia/liberacao-para-producao)

<!-- SHOTS:AUTO -->

## Imagens da tela

:::step{n="1" title="Kanban de etapas de engenharia por projeto" img="etapas-e-kanban-1.png" alt="Kanban de etapas de engenharia por projeto"}
Kanban de etapas de engenharia por projeto
:::

<!-- /SHOTS:AUTO -->
