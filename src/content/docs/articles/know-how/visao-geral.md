---
title: Visão geral do Know-how
description: Base de conhecimento interna com artigos, trilhas e certificações — como o time captura, organiza e valida saber técnico.
category: know-how
slug: visao-geral
tipo: conceito
nivel: iniciante
tags: [know-how, base, treinamento, certificacao]
papeis: [admin, manager, engineer, quality, production, assembly, field, support, sales, purchasing]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Base de conhecimento interna em `/know-how` — artigos, vídeos, checklists e trilhas.
- **Autoria**: `engineer`, `quality`, `manager` e `admin`; **consumo**: todos os papéis.
- Todo conteúdo passa por **revisão** antes de publicar (rascunho → revisão → publicado).
- **Trilhas** juntam artigos em sequência com quiz e emitem **certificação**.
- Busca global cobre título, corpo e legendas de vídeo indexadas.
:::

## Estrutura do módulo

| Rota | O que faz |
|---|---|
| `/know-how` | Home com destaques, últimos publicados e sua trilha atual |
| `/know-how/artigo/$slug` | Leitura do artigo com anexos e comentários |
| `/know-how/trilha/$slug` | Trilha com progresso, artigos e quiz final |
| `/know-how/novo` | Editor de novo artigo/vídeo/checklist |
| `/know-how/revisar` | Fila de conteúdos aguardando revisão técnica |

## Tipos de conteúdo

| Tipo | Uso ideal |
|---|---|
| **Artigo** | Procedimento, referência técnica, troubleshooting |
| **Vídeo** | Passo-a-passo prático de montagem, ajuste, inspeção |
| **Checklist** | Verificação campo-a-campo (start-up, manutenção preventiva) |
| **Trilha** | Sequência formativa com quiz — onboarding, certificação interna |

## Papéis e permissões

| Papel | Pode |
|---|---|
| `engineer` | Criar/editar artigos técnicos; sugerir trilhas |
| `quality` | Revisar checklists e conteúdos de qualidade |
| `manager` | Aprovar publicação, montar trilhas, definir requisitos |
| `admin` | Tudo, incluindo despublicar e gerenciar certificações |
| Demais | Consumir, comentar, marcar favorito, marcar concluído |

## Ciclo de vida de um artigo

:::step{n="1" title="Rascunho"}
Autor escreve em `/know-how/novo` — markdown com blocos de callout, imagens, vídeos. Autosalva a cada 30s.
:::

:::step{n="2" title="Envio para revisão"}
Autor clica em **Enviar para revisão**. Sai da lista pessoal e entra em `/know-how/revisar`.
:::

:::step{n="3" title="Revisão técnica"}
`engineer`/`quality`/`manager` revisa e aprova, comenta pedindo ajustes ou reprova. Comentários ficam por bloco.
:::

:::step{n="4" title="Publicação"}
Aprovado → publicado. Aparece na busca, home e trilhas vinculadas. Marca automaticamente notificação para os papéis-alvo.
:::

:::step{n="5" title="Manutenção"}
Cada artigo tem `atualizado_em` e `app_version`. Após mudanças relevantes no sistema, revise para manter o passo-a-passo alinhado.
:::

:::dica
Comece pelas **10 dúvidas mais recorrentes** do seu time — se você já respondeu por chat duas vezes, vira artigo.
:::

:::atencao
Nunca copie procedimentos de fornecedor sem revisão. Conteúdo desatualizado no Know-how vira erro caro em campo.
:::

## Ver também

- [Trilhas de aprendizado](/ajuda/documentacao/know-how/trilhas)
- [Busca e organização](/ajuda/documentacao/know-how/busca-e-organizacao)
- [Certificações](/ajuda/documentacao/know-how/certificacoes)
