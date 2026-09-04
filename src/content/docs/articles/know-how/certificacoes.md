---
title: Certificações e validade
description: Como funcionam as certificações internas geradas por trilhas — emissão, validade, revogação e uso como pré-requisito operacional.
category: know-how
slug: certificacoes
tipo: conceito
nivel: intermediario
tags: [know-how, certificacao, validade, prerequisito]
papeis: [admin, manager, engineer, quality, production, assembly, field, support]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Certificação = registro de aprovação em trilha, com validade configurável (ex.: 12 meses).
- Certificação expirada trava cards que a exigem como pré-requisito (ex.: montagem de equipamento crítico).
- `admin` revoga manualmente com motivo — fica em auditoria.
- Aviso 30 dias antes do vencimento; alerta ao `manager` quando expira.
:::

## Onde ver

:::step{n="1" title="Minhas certificações" img="know-how-home.png" alt="Home do Know-how com bloco de certificações vigentes e prazo de renovação"}
Em `/know-how`, o bloco **Minhas certificações** mostra as suas com data de emissão, validade e status (vigente / vencendo / expirada). O gestor vê o painel completo do time em `/admin/certificacoes` (só `manager`/`admin`).
:::

## Como usam no fluxo operacional

Templates de etapa e checklists podem exigir certificação vigente para o executor:

- **Card bloqueado por certificação** — o operador vê a mensagem e o link para a trilha.
- O `manager` pode conceder **exceção temporária** com justificativa (registrada em auditoria) — máximo 48 h.

## Renovação

- 30 dias antes de vencer, o sistema notifica o usuário e sugere refazer o quiz (não a trilha inteira).
- Se o artigo foi editado com **Requer relerão** no meio do caminho, o quiz volta obrigatoriamente.

## Revogação

`admin` revoga manualmente em `/admin/certificacoes` com motivo obrigatório. Situações típicas: procedimento crítico alterado sem migração automática, ocorrência grave em auditoria externa.

:::atencao
Revogação encerra a certificação **imediatamente** — cards pendentes que dependem dela ficam travados na hora.
:::

:::erro{title="Meu card diz 'Certificação pendente' e eu já fiz a trilha"}
Confira em **Minhas certificações** se está vigente. Pode ser: quiz não finalizado (voltou como reprovado), certificação vencida ou trilha marcada como **Requer relerão** após edição — refaça o quiz para revalidar.
:::

## Ver também

- [Trilhas](/ajuda/documentacao/know-how/trilhas)
- [Publicar conteúdo](/ajuda/documentacao/know-how/publicar-conteudo)
- [Executar etapa](/ajuda/documentacao/producao/executar-etapa)
