---
title: Visão geral do site público
description: O que compõe o site público da Solutek, quais rotas existem e como ele se conecta com Comercial, Administração e Documentos.
category: site-publico
slug: visao-geral
tipo: conceito
nivel: iniciante
tags: [site-publico, home, catalogo, checklist, contato]
papeis: [admin, manager, sales]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- O site público é a vitrine externa: home, catálogo, contato e Checklist público.
- Formulários de contato e Checklist alimentam Comercial diretamente — nada de e-mail manual.
- Rotas com `$slug`/`$token` são públicas por URL — trate o token como credencial.
- Antes de divulgar link externo, valide desktop + mobile, revise SEO e teste o formulário.
:::

## Rotas principais

| Rota                    | Uso                                                    |
| ----------------------- | ------------------------------------------------------ |
| `/`                     | Home institucional com posicionamento e CTAs.          |
| `/equipamentos`         | Catálogo público de equipamentos publicados.           |
| `/equipamentos/$slug`   | Página pública de um equipamento específico.           |
| `/contato`              | Formulário público de contato comercial.               |
| `/checklist/$slug`            | Checklist técnico público por tipo de equipamento.     |
| `/p/relatorio/$tipo/$token` | Relatório compartilhado por token.                 |
| `/suporte/$token`       | Chamado acompanhado por link público.                  |

:::step{n="1" title="Home institucional" img="site-home.png" alt="Home da Solutek com hero 'Packaging engineering for industries that never stop', CTAs Request a quote e Browse equipment"}
Em `/` o visitante encontra o posicionamento, CTAs para orçamento e catálogo, e links para serviços/contato.
:::

## Quem administra

- **admin** — publica páginas, ajusta tipos de Checklist, revisa SEO e mensagens recebidas.
- **manager** — acompanha conteúdo publicado e indicadores de captação.
- **sales** — usa links de equipamentos e Checklist em propostas, e-mails e follow-ups.

## Como se conecta ao Hub

- **Contato** (`/contato`) → triagem em `/pos-vendas/chamados?origem=contato_site` (Chamados unificados, origem "Contato do site").
- **Checklist** (`/checklist/$slug`) → gera oportunidade no pipeline com anexos indexados.
- **Catálogo** → páginas geridas em `/admin/paginas-equipamentos`.

:::atencao
Antes de divulgar link, valide desktop e mobile, revise título/descrição de SEO e confirme que o formulário associado está **ativo**.
:::

## Ver também

- [Home pública e SEO](/ajuda/documentacao/site-publico/home-e-seo)
- [Catálogo público de equipamentos](/ajuda/documentacao/site-publico/catalogo-equipamentos)
- [Formulários públicos de Checklist](/ajuda/documentacao/site-publico/checklists-publicos)
- [Contato público e captação comercial](/ajuda/documentacao/site-publico/contato-e-captacao)
- [Links públicos e segurança](/ajuda/documentacao/site-publico/links-publicos-e-seguranca)
