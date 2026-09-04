---
title: Criar um embarque
description: Passo a passo para criar o embarque em /logistica/embarques/novo, com volumes, transportadora e documentos.
category: logistica
slug: criar-embarque
tipo: guia
nivel: iniciante
tags: [logistica, embarque, novo, transporte]
papeis: [admin, manager, purchasing, production]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Menu **LOGÍSTICA → Embarques → + Novo embarque** (`/logistica/embarques/novo`).
- Vincule o **projeto** (obrigatório) — traz cliente, endereço e responsável comercial automaticamente.
- Informe **volumes** (qtd, dimensões, peso), **transportadora** e **modalidade** (CIF/FOB).
- Ao salvar, o embarque nasce em status **Preparando** e aparece na lista.
:::

:::step{n="1" title="Abrir a tela de novo embarque"}
Em **Logística → Embarques**, clique em **+ Novo embarque**. O formulário abre com o projeto em branco.
:::

:::step{n="2" title="Vincular projeto e cliente"}
No campo **Projeto**, busque pelo código do equipamento (ex.: `ENV-1014`). Ao selecionar, o sistema preenche automaticamente:

- Cliente e razão social.
- Endereço de entrega (endereço fiscal do cliente).
- Responsável comercial e engenheiro do projeto.

Se o cliente tiver **endereço de entrega diferente do fiscal**, edite manualmente antes de salvar.
:::

:::step{n="3" title="Cadastrar volumes"}
Adicione um **volume** por engradado/caixa/palete. Para cada um informe:

| Campo | Exemplo |
|---|---|
| Descrição | Estrutura principal envasadora |
| Dimensões (cm) | 220 x 90 x 180 |
| Peso (kg) | 850 |
| Empilhável | Sim/Não |
| NF vinculada | 000.123.456 |

O peso total e a cubagem aparecem no rodapé automaticamente.
:::

:::step{n="4" title="Escolher transportadora e modalidade"}
Selecione a **transportadora** (cadastro rápido inline se ainda não existir). Informe:

- **Modalidade**: CIF (nós pagamos e organizamos) ou FOB (cliente organiza).
- **Data prevista de coleta** e **data prevista de entrega**.
- **Valor do frete** e **valor declarado** (para seguro).
- **Veículo/placa** e **motorista** (quando já definido).
:::

:::step{n="5" title="Anexar documentos e salvar"}
Envie NF-e (XML e PDF), packing list, ordem de coleta e apólice de seguro. Clique em **Salvar embarque**.

O embarque abre em `/logistica/embarques/$id` já em status **Preparando**.
:::

:::dica
Deixe as **fotos do carregamento** para o passo "Coletado" na timeline — assim ficam datadas e vinculadas ao evento, não ao cadastro.
:::

:::atencao
Sem NF-e anexada não é possível avançar o status para **Coletado**. O sistema bloqueia e mostra o motivo.
:::

## Ver também

- [Acompanhar status e anexar comprovantes](/ajuda/documentacao/logistica/acompanhar-status)
- [Encerramento do FAT](/ajuda/documentacao/qualidade/encerrar-fat)

<!-- SHOTS:AUTO -->

## Imagens da tela

:::step{n="1" title="Novo embarque" img="criar-embarque-1.png" alt="Novo embarque"}
Novo embarque
:::

<!-- /SHOTS:AUTO -->
