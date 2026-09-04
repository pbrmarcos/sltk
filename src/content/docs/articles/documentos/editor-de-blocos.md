---
title: Editor de blocos (Central de documentos)
description: Como montar um documento em /central-documentos combinando blocos reutilizáveis (capa, texto rico, tabela, imagem, checklist, quebra de página).
category: documentos
slug: editor-de-blocos
tipo: guia
nivel: intermediario
tags: [documentos, editor, blocos, template]
papeis: [admin, manager, sales, engineer, quality]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Menu **DOCUMENTOS → Editor de blocos** (`/central-documentos`).
- Um documento é uma **pilha de blocos** com largura configurável (100%, 50%, 33%…).
- Blocos disponíveis: capa, texto rico, tabela, imagem, checklist, assinatura, quebra de página, sumário.
- O documento vira **template** salvando com "Publicar como template" — depois aparece em `/template-documentos`.
:::

## Tipos de bloco

| Bloco | Uso típico |
|---|---|
| **Capa** | Logo + título + cliente + código do projeto |
| **Texto rico** | Introdução, escopo, considerações |
| **Tabela** | B.O.M., cronograma, lista de peças |
| **Imagem** | Foto do equipamento, layout, foto de FAT |
| **Checklist** | Passos de FAT/SAT ou verificação |
| **Assinatura** | Bloco de aceite (cliente + responsável) |
| **Sumário** | Gerado automaticamente a partir dos títulos |
| **Quebra de página** | Força nova página no PDF |

## Passo a passo

:::step{n="1" title="Escolher origem"}
No editor você pode:

- Começar do **zero** (documento em branco).
- Duplicar um **template** existente (recomendado).
- Duplicar um documento já emitido (para gerar uma revisão).
:::

:::step{n="2" title="Arrastar blocos e configurar largura"}
Clique em **+ Adicionar bloco** e escolha o tipo. Cada bloco tem:

- **Largura**: 25%, 33%, 50%, 66%, 75% ou 100%. Blocos com largura < 100% fluem lado a lado.
- **Título opcional**.
- **Configurações específicas** (colunas da tabela, layout da capa, altura mínima).

Reordene arrastando o handle à esquerda.
:::

:::step{n="3" title="Preencher variáveis dinâmicas"}
Textos aceitam variáveis do projeto entre chaves: `{{cliente.nome}}`, `{{projeto.codigo}}`, `{{data.hoje}}`, `{{responsavel.nome}}`. Ao gerar o PDF para um projeto específico, as variáveis são substituídas.
:::

:::step{n="4" title="Pré-visualizar e emitir"}
Use **Pré-visualizar** para ver o PDF final. Ao emitir, o documento sai numerado (`DOC-2026-000123`) e vai para **Documentos → Emitidos**, com histórico de versões.
:::

:::dica
Publique documentos recorrentes (FAT, RNC, aceite de instalação) **como template**. Depois basta duplicar e trocar o projeto — economiza reformatar toda vez.
:::

:::atencao
Blocos de assinatura **congelam** ao emitir: se o cliente já assinou, criar uma nova versão gera um documento novo, com novo código, e não altera o anterior.
:::

## Ver também

- [Templates e versionamento](/ajuda/documentacao/documentos/templates-e-versionamento)
- [Anexar evidências por etapa](/ajuda/documentacao/documentos/anexar-evidencias-por-etapa)
