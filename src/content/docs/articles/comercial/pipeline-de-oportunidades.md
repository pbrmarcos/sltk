---
title: Pipeline de oportunidades
description: Como usar o kanban de oportunidades para conduzir do primeiro contato ao fechamento.
category: comercial
slug: pipeline-de-oportunidades
tipo: guia
nivel: iniciante
tags: [pipeline, oportunidade, crm]
papeis: [admin, manager, sales]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Acesse em `/comercial/pipeline`. Cada card é uma oportunidade.
- **Arraste** cards entre colunas para mudar de estágio.
- **Nova oportunidade** → botão no canto superior direito.
- **Perdidas** → aba lateral para reabrir ou consultar motivos.
:::

## Antes de começar

Você precisa de papel `sales`, `manager` ou `admin`. Engenharia tem leitura para dimensionar antecipadamente, mas não move cards.

## Passo a passo

:::step{n="1" title="Abrir o pipeline" img="01-pipeline.png" alt="Kanban do pipeline comercial com 5 colunas: Novo, Qualificado, Proposta, Negociação, Ganho"}
No menu lateral, em **COMERCIAL → Pipeline**. Você vê 5 colunas (Novo, Qualificado, Proposta, Negociação, Ganho) e os KPIs no topo. Aba **Perdidas** aparece à direita.
:::

:::step{n="2" title="Criar uma oportunidade" img="06-nova-oportunidade-dialog.png" alt="Diálogo de nova oportunidade com campos Título, Empresa, Contato, Email, Telefone, Valor estimado e Probabilidade"}
Clique em **+ Nova oportunidade**. Preencha:

- **Título** (obrigatório) — resumo curto do escopo (ex: "Linha de produção — Aurora Foods").
- **Empresa / Contato / Email / Telefone** — dados iniciais do lead.
- **Valor estimado** e **Probabilidade** — alimentam o "Valor ponderado" no topo.

Clique **Criar**. O card aparece na coluna **Novo**.
:::

:::step{n="3" title="Avançar o estágio" img="01-pipeline.png" alt="Cards arrastáveis entre colunas do pipeline"}
Arraste o card para a próxima coluna conforme a negociação evolui. Cada mudança fica registrada na auditoria com autor, data e transição.
:::

:::step{n="4" title="Editar detalhes do card" img="07-marcar-ganho-dialog.png" alt="Painel de edição da oportunidade com dados, anotações, anexos e botão Marcar como perdida"}
Clique no card para abrir o painel de edição. Nele você:

- Atualiza empresa/contato/valor/probabilidade.
- Adiciona **Anotações** (histórico da conversa).
- Anexa arquivos (proposta, e-mails, ata).
- Acessa a **Ficha do cliente** com um clique.
- Marca a oportunidade como perdida.
:::

## Estágios padrão

| Estágio | Quando usar |
|---|---|
| **Novo** | Contato inicial, ainda sem qualificação. |
| **Qualificado** | Necessidade confirmada, escopo mínimo mapeado. |
| **Proposta** | Orçamento enviado ao cliente. |
| **Negociação** | Ajustes finais de preço/prazo. |
| **Ganho / Perdido** | Encerramento. |

:::dica
Use a coluna **Novo** como caixa de entrada — não deixe um card mais de 5 dias lá. Ou qualifica ou descarta.
:::

:::atencao
Cards com "Idade no estágio" alta aparecem em vermelho nos indicadores. São **cards zumbis** — resolva antes que distorçam previsão e conversão.
:::

## Permissões

- `sales` — cria e move as próprias oportunidades.
- `manager` / `admin` — veem e movem todas.
- `engineer` — leitura para dimensionar antecipadamente.

## Ver também

- [Fechar oportunidade — Ganho ou Perdido](/ajuda/documentacao/comercial/fechar-oportunidade)
- [Converter oportunidade em orçamento](/ajuda/documentacao/comercial/converter-oportunidade-em-orcamento)
- [Previsão e saúde do pipeline](/ajuda/documentacao/comercial/previsao-e-saude)

<!-- SHOTS:AUTO -->

## Imagens da tela

:::step{n="1" title="Pipeline Comercial" img="pipeline-de-oportunidades-1.png" alt="Pipeline Comercial"}
Pipeline Comercial
:::

<!-- /SHOTS:AUTO -->
