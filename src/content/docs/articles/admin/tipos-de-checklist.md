---
title: Tipos de Checklist (formulários por máquina)
description: Como criar e editar os formulários Checklist que o site público exibe por tipo de equipamento, em /admin/checklist-tipos.
category: admin
slug: tipos-de-checklist
tipo: guia
nivel: intermediario
tags: [admin, checklist, formulario, site-publico]
papeis: [admin, manager]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Menu **ADMIN → Tipos de Checklist** (`/admin/checklist-tipos`).
- Cada **tipo** vira uma URL pública em `/checklist/{slug}` que o cliente preenche.
- Um tipo tem **blocos** (produto, embalagem, produção, ambiente, extras) com campos configuráveis.
- Ao publicar, o link pode ser divulgado no site e nas campanhas.
:::

## Estrutura de um tipo

| Elemento | Papel |
|---|---|
| **Código** | ex. `envasadora_linear` — usado no slug e nas rotas |
| **Nome (pt/en/zh)** | rótulo mostrado no site público |
| **Blocos** | grupos de perguntas (produto, embalagem, produção, ambiente) |
| **Campos** | pergunta, tipo (texto/número/select/upload), obrigatório sim/não |
| **Template de projeto vinculado** | quando a Checklist vira oportunidade ganha, gera projeto com esse template |

## Passo a passo

:::step{n="1" title="Criar novo tipo"}
Em `/admin/checklist-tipos`, clique em **+ Novo tipo**. Informe código único, nome em pt-BR (obrigatório), en e zh (opcionais para site multilíngue).
:::

:::step{n="2" title="Montar os blocos"}
Adicione blocos na ordem em que aparecem para o cliente. Cada bloco tem título e descrição curta. Dentro de cada bloco, adicione campos:

- **Texto curto** — nome do produto, marca.
- **Texto longo** — características especiais.
- **Número** — vazão, temperatura, viscosidade.
- **Select** — tipo de tampa, formato do frasco.
- **Multi-select** — certificações desejadas.
- **Upload** — arquivo com desenho, ficha técnica.
:::

:::step{n="3" title="Marcar campos obrigatórios e ordem"}
Cada campo tem **Obrigatório sim/não** e **ordem** dentro do bloco. Campos obrigatórios bloqueiam o envio no site público.
:::

:::step{n="4" title="Vincular template de projeto"}
No pé do formulário, escolha o **template de projeto** que será usado quando essa Checklist virar oportunidade ganha (ex.: "Máquina — Envasadora Linear"). Sem template, o projeto nasce vazio.
:::

:::step{n="5" title="Publicar"}
Toggle **Ativo → Sim** e salve. A URL pública `/checklist/{codigo}` fica disponível na hora. Copie o link em **Compartilhar** para divulgar.
:::

:::dica
Antes de publicar, teste como cliente: abra `/checklist/{codigo}` em janela anônima e envie um formulário de teste. Depois exclua a submissão em `/comercial/checklists`.
:::

:::atencao
**Não renomeie o código** depois que a Checklist já recebeu submissões — a URL pública para de funcionar. Se precisar mudar, crie um novo tipo e desative o antigo.
:::

## Ver também

- [Formulários Checklist públicos](/ajuda/documentacao/site-publico/checklists-publicos)
- [Checklist, oportunidade e orçamento](/ajuda/documentacao/comercial/checklist-publico-e-formularios)

<!-- SHOTS:AUTO -->

## Imagens da tela

:::step{n="1" title="Acesso restrito" img="tipos-de-checklist-1.png" alt="Acesso restrito"}
Acesso restrito
:::

<!-- /SHOTS:AUTO -->
