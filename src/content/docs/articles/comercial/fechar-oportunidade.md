---
title: Fechar oportunidade — Ganho ou Perdido
description: Como fechar uma oportunidade com o motivo correto, o que acontece após Ganho e como registrar Perdido de forma útil.
category: comercial
slug: fechar-oportunidade
tipo: passo-a-passo
nivel: iniciante
tags: [comercial, oportunidade, ganho, perdido, motivo]
papeis: [admin, manager, sales]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- **Ganho** dispara projeto, libera BOM e notifica engenharia/produção.
- **Perdido** exige motivo obrigatório e é lançado direto no card.
- Reversão de **Ganho** só é possível em ≤24h e sem movimentação em Engenharia.
- Oportunidade Perdida pode ser reaberta em até 12 meses.
:::

## Fechar como Ganho

:::step{n="1" title="Abrir a oportunidade" img="07-marcar-ganho-dialog.png" alt="Painel de edição da oportunidade em cliente ativo com botões Save, Save & Close, Cancel, Ficha do cliente e Marcar como perdida"}
Clique no card na coluna **Negociação** ou **Proposta**. Confirme se dados de empresa, contato, valor e fechamento estão corretos.
:::

:::step{n="2" title="Marcar como ganho"}
Arraste o card para a coluna **Ganho** ou use o botão **Gerar orçamento / Marcar ganho** direto no card. O sistema abre o wizard de conversão para escolher o orçamento vigente aceito e a data prevista de faturamento.
:::

:::step{n="3" title="Anexar o pedido do cliente"}
No wizard, informe **condição de pagamento** e **anexe** o PDF ou OC do cliente. Isso cria a "prova de fechamento" — importante para auditoria e para o time financeiro.
:::

## O que acontece após Ganho

Ao confirmar, automaticamente:

- É criado o **projeto** vinculado (se envolve engenharia/produção).
- O cliente vai para status **Ativo** (se estava como Prospect).
- A **BOM inicial** é liberada para o time de Engenharia refinar.
- `manager` e `engineer` responsáveis são notificados.

:::atencao
Depois de Ganho, mudanças de escopo passam a valer como **aditivo** (nova revisão de orçamento ligada ao mesmo projeto), não como orçamento novo. Ver [Corrigir orçamento](/ajuda/documentacao/comercial/corrigir-orcamento).
:::

## Fechar como Perdido

:::step{n="1" title="Escolher o motivo" img="07-marcar-ganho-dialog.png" alt="Botão Marcar como perdida em destaque no painel da oportunidade"}
Arraste o card para **Perdido** ou clique **Marcar como perdida** no painel da oportunidade.
:::

:::step{n="2" title="Preencher motivo (obrigatório)"}
Escolha da lista:

- **Preço** — proposta acima da alçada do cliente.
- **Prazo** — não conseguimos atender o prazo pedido.
- **Concorrente** — se marcar essa, informe **qual concorrente** (alimenta relatório de competitividade).
- **Escopo/Técnico** — solução não atende os requisitos.
- **Timing do cliente** — projeto adiado, cliente sem budget agora.
- **Sem retorno** — cliente sumiu depois da proposta.
- **Outro** — descreva no comentário.
:::

:::step{n="3" title="Comentário livre (opcional, mas recomendado)"}
Explique o "porquê" em 2-3 linhas. Alimenta a revisão trimestral do pipeline e ajuda no aprendizado do time.
:::

:::dica
Feche o card **na hora** que souber do resultado. Cards "zumbis" (Proposta há 90+ dias sem interação) distorcem previsão. O relatório de saúde do pipeline em [Previsão e saúde](/ajuda/documentacao/comercial/previsao-e-saude) marca em vermelho oportunidades paradas.
:::

## Reabrir uma oportunidade perdida

Oportunidade Perdida **pode ser reaberta** em até 12 meses na aba **Perdidas** → botão **Restaurar**. Após esse prazo, crie uma nova oportunidade referenciando a antiga no campo "Origem".

## Erros comuns

:::erro{title="Fechei como Ganho pelo card errado"}
Se foi há menos de **24h** e ainda não há ETP criado nem etapa de engenharia iniciada, `manager`/`admin` pode reverter em **Ações → Reverter fechamento**. Depois disso, feche como Perdido com motivo "Erro operacional" e crie a oportunidade correta. **Nunca** edite direto no banco.
:::

:::erro{title="Motivo 'Concorrente' sem nome do concorrente"}
O campo obrigatório só aparece depois de escolher **Concorrente**. Se você não sabe qual foi, escolha **Outro** e descreva no comentário — deixar em branco falseia o relatório de competitividade.
:::

## Ver também

- [Nova revisão vs. nova oportunidade](/ajuda/faq) (FAQ Comercial)
- [Pipeline de oportunidades](/ajuda/documentacao/comercial/pipeline-de-oportunidades)
- [Converter oportunidade em orçamento](/ajuda/documentacao/comercial/converter-oportunidade-em-orcamento)
