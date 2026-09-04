---
title: Trilhas de aprendizado
description: Como funcionam sequências de artigos com quiz final, retentativas, certificação e política de reprovação.
category: know-how
slug: trilhas
tipo: conceito
nivel: intermediario
tags: [know-how, trilha, quiz, treinamento, certificacao]
papeis: [admin, manager, engineer, quality, production, assembly, field, support]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Trilha = **sequência ordenada** de artigos + **quiz final** obrigatório.
- Aprovação no quiz gera **certificação** (com validade, se configurada).
- Progresso é salvo automaticamente — pode pausar e retomar.
- 3 tentativas no quiz por padrão; após reprovar, cooldown de 24h.
- `manager` pode **tornar obrigatória** para papéis específicos e ver relatório de conclusão.
:::

## Estrutura de uma trilha

| Bloco | O que contém |
|---|---|
| **Capa** | Título, descrição, papel-alvo, duração estimada |
| **Módulos** | Grupos de artigos (ex.: "Segurança elétrica", "Ajustes de FAT") |
| **Artigos** | Conteúdo em ordem — o próximo só libera após marcar o atual concluído |
| **Quiz final** | 10–20 perguntas de múltipla escolha, embaralhadas |
| **Certificado** | Emitido ao passar; PDF anexado ao perfil |

## Montar uma trilha (manager/admin)

:::step{n="1" title="Criar em /know-how/trilha/nova"}
Título, descrição, papel-alvo, duração estimada, validade da certificação (ex.: 12 meses).
:::

:::step{n="2" title="Adicionar módulos e artigos"}
Arraste artigos publicados para dentro dos módulos. A ordem importa — o aluno só avança sequencialmente.
:::

:::step{n="3" title="Montar o quiz"}
Adicione perguntas com 4 alternativas cada, marcando a correta. Recomendado: 1 pergunta por artigo-chave.
:::

:::step{n="4" title="Definir política"}
- **Nota mínima** (ex.: 70% de acertos).
- **Tentativas** (padrão: 3).
- **Cooldown** entre tentativas (padrão: 24h).
- **Certificação obrigatória** para determinados papéis (opcional).
:::

:::step{n="5" title="Publicar"}
Ao publicar, a trilha aparece em `/know-how` e — se for obrigatória — vira pendência no dashboard dos papéis-alvo.
:::

## Fluxo do aluno

1. Abre `/know-how/trilha/$slug`.
2. Lê os artigos em ordem, marcando concluído em cada um.
3. Libera o **quiz final** ao completar todos.
4. Faz o quiz — recebe nota e feedback pergunta-a-pergunta.
5. **Aprovou** → certificado disponível para download.
6. **Reprovou** → cooldown 24h, revisa artigos, tenta de novo.

## Reprovação e retentativas

| Cenário | Regra |
|---|---|
| Passou de primeira | Certificado emitido, `atualizado_em` gravado |
| Reprovou | Aguarda cooldown, revê material |
| Estourou tentativas (3x) | Precisa aprovação do `manager` para nova tentativa |
| Certificação expirada | Trilha reaparece como pendente; refaz quiz (não os artigos) |

:::dica
Faça uma **trilha de onboarding** com os 5 artigos essenciais + quiz de 10 perguntas — obrigatória para novos colaboradores. Reduz drasticamente perguntas repetidas no chat interno.
:::

:::atencao
Não deixe trilha ficar antiga. Se o sistema mudou (ex.: nova UI de FAT), trilhas com print antigo confundem o aluno mais do que ajudam. Revise `atualizado_em` a cada release relevante.
:::

## Ver também

- [Visão geral do Know-how](/ajuda/documentacao/know-how/visao-geral)
- [Certificações](/ajuda/documentacao/know-how/certificacoes)
- [Busca e organização](/ajuda/documentacao/know-how/busca-e-organizacao)
