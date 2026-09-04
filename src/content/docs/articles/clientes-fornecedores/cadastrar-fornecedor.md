---
title: Cadastrar fornecedor
description: Scan automático (IA) de cartão/folder ou cadastro manual, com enriquecimento de dados oficiais.
category: clientes-fornecedores
slug: cadastrar-fornecedor
tipo: guia
nivel: iniciante
tags: [fornecedor, cadastro, scan, ia, categorias]
papeis: [admin, manager, purchasing]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Em `/fornecedores/novo` você tem **duas abas**: **Scan automático** (padrão) e **Cadastro manual**.
- **Scan automático**: envie até 6 imagens (cartão de visita, folder, catálogo). A IA (Groq Llama 4 Scout) faz OCR e o Firecrawl + Llama 3.3 70B enriquecem com site oficial, resumo e certificações.
- **Cadastro manual**: escolha país, informe documento fiscal (CNPJ/EIN/USCC…) e clique em **Enriquecer** para trazer dados públicos.
- **Categorias** (usinagem, elétrica, pneumática…) definem em que cotação o fornecedor aparece.
- Fornecedor nasce **Em avaliação** e evolui para **Homologado** só depois de docs revisados.
:::

## Aba 1 — Scan automático (recomendado)

:::step{n="1" title="Abrir Compras → Fornecedores → Novo" img="05-fornecedor-novo.png" alt="Tela Novo fornecedor com abas Scan automático e Cadastro manual"}
Vá em **Compras → Fornecedores** e clique em **+ Novo fornecedor**, ou acesse `/fornecedores/novo`. A aba **Scan automático** já vem selecionada.
:::

:::step{n="2" title="Enviar imagens"}
Clique em **Selecionar imagens** ou cole direto com **Ctrl+V**. Aceita JPG/PNG/WEBP, até **6 imagens** por cadastro. Use fotos do **cartão de visita**, do **folder comercial** ou da capa de **catálogos**.
:::

:::step{n="3" title="Acompanhar o pipeline"}
O sistema executa 4 etapas visíveis no topo:

| Fase | O que faz |
|---|---|
| **OCR** | Extrai texto das imagens via Groq Llama 4 Scout Vision. |
| **Translation** | Traduz campos técnicos quando o material é em outro idioma. |
| **Enrichment** | Firecrawl + Llama 3.3 70B buscam site oficial, produtos, certificações, ano de fundação, porte. |
| **Drive** | Arquiva as imagens originais na pasta do fornecedor no Drive. |
:::

:::step{n="4" title="Revisar e salvar"}
Confira razão social, documento fiscal, site, endereço, categorias sugeridas e certificações. Ajuste o que precisar e clique em **Salvar fornecedor**. Você é levado direto para `/fornecedores/$id`.
:::

:::dica{title="Cole imagens rapidamente"}
Tire foto do cartão no celular, envie para o desktop e cole com **Ctrl+V** na área de upload — a IA aceita paste direto.
:::

## Aba 2 — Cadastro manual

Use quando **não tem cartão/folder**, quando o fornecedor é conhecido, ou quando o scan não conseguiu extrair todos os campos.

:::step{n="1" title="Selecionar país e documento fiscal"}
Escolha o **país** (bandeira aparece ao lado). O campo de documento se ajusta automaticamente:

- **BR** — CNPJ (formatação automática, valida DV).
- **US** — EIN.
- **CN** — USCC (18 caracteres).
- **Outros** — Tax ID livre.

Clique em **Enriquecer** para consultar bases públicas e trazer razão social, endereço e CNAEs (BR) ou dados do EIN/USCC.
:::

:::step{n="2" title="Preencher razão social, contato e endereço"}
Preencha razão social, nome fantasia, e-mail corporativo, telefone (DDI + número), cidade, endereço completo e site. Escolha idioma preferido de comunicação (pt/en/zh).
:::

:::step{n="3" title="Marcar categorias e certificações"}
No picker **Categorias**, marque todas em que o fornecedor atua (usinagem, chapa/dobra, elétrica, pneumática, serviços, importação…). Adicione **certificações** (ISO 9001, ISO 14001, IATF, etc.) — a IA sugere as mais comuns por segmento.
:::

:::step{n="4" title="Definir ranking inicial e salvar"}
Escolha o **Ranking** (A/B/C) — parte de B por padrão. Adicione **tags** e **palavras-chave** para busca. Clique em **Salvar**.
:::

## Homologação

| Status | Significado | Quem muda |
|---|---|---|
| **Em avaliação** | Cadastro inicial, sem docs revisados | automático |
| **Em análise** | Docs anexados, aguardando revisão | `purchasing`/`quality` |
| **Homologado** | Apto a receber OC de qualquer valor | `manager`/`admin` |
| **Suspenso** | Reprovações ou pendências; bloqueia novas OC | `manager`/`admin` |

Para homologar: abra `/fornecedores/$id`, revise os anexos (cartão CNPJ, certidões negativas, ISO, contrato-mestre) e altere o status.

:::atencao
Emitir OC para fornecedor **Em avaliação** ou **Suspenso** exige justificativa e alerta o comprador. **Suspenso** só é destravado por `admin`.
:::

## Ver também

- [Categorias de fornecedor e homologação](/ajuda/documentacao/clientes-fornecedores/categorias-e-homologacao)
- [Cotação com múltiplos fornecedores](/ajuda/documentacao/compras/cotacao-multiplos-fornecedores)
- [Homologar fornecedor (FAQ)](/ajuda/faq)

<!-- SHOTS:AUTO -->

## Imagens da tela

:::step{n="1" title="Lista de fornecedores com filtros de país, status, categoria e ranking" img="cadastrar-fornecedor-1.png" alt="Lista de fornecedores com filtros de país, status, categoria e ranking"}
Lista de fornecedores com filtros de país, status, categoria e ranking
:::

:::step{n="2" title="Formulário Novo fornecedor com scan automático (OCR + enriquecimento)" img="cadastrar-fornecedor-2.png" alt="Formulário Novo fornecedor com scan automático (OCR + enriquecimento)"}
Formulário Novo fornecedor com scan automático (OCR + enriquecimento)
:::

<!-- /SHOTS:AUTO -->
