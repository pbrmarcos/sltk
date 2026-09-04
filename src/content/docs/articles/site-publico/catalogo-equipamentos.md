---
title: Catálogo público de equipamentos
description: Como publicar, revisar e manter páginas de equipamentos exibidas em /equipamentos e /equipamentos/$slug.
category: site-publico
slug: catalogo-equipamentos
tipo: passo-a-passo
nivel: intermediario
tags: [equipamentos, catalogo, paginas, cms]
papeis: [admin, manager, sales, engineer]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Só equipamentos marcados como **Publicado** aparecem em `/equipamentos`.
- Slugs são a URL — mudar slug **quebra** links já enviados em proposta.
- Cada página tem nome, família, descrição, diferenciais, imagem e metadados de SEO.
- Revise dados técnicos com Engenharia antes de publicar.
:::

:::step{n="1" title="Abrir o catálogo público" img="site-equipamentos.png" alt="Catálogo público mostrando cards de Checkweigher, Codificação e Desensaque de Big-Bag por família"}
Em `/equipamentos` o visitante vê cards com **família, nome, descrição curta e imagem**. Equipamentos sem imagem usam fallback visual — cadastre uma imagem real ou render técnico validado.
:::

:::step{n="2" title="Editar a página"}
Em `/admin/paginas-equipamentos`, crie ou edite. Preencha nome, família, descrição, diferenciais, imagem e textos de SEO.
:::

:::step{n="3" title="Publicar"}
Marque **Publicado** só quando o conteúdo estiver revisado por Engenharia e Comercial. Salvar publica imediatamente; despublicar remove do catálogo mas mantém o histórico.
:::

:::atencao
Slugs são estáveis por decisão de negócio. Se realmente precisar alterar, redirecione o slug antigo — nunca deixe URL antiga retornando 404.
:::

:::dica
Descreva **aplicação do cliente**, não jargão interno. O catálogo é entrada de funil comercial — texto orientado a benefício converte melhor que ficha técnica.
:::

:::erro{title="Equipamento sumiu do catálogo"}
Alguém desmarcou **Publicado**. Verifique `/admin/paginas-equipamentos` e a trilha em `/admin/auditoria` filtrando pela tabela de equipamentos.
:::

## Quando criar uma página separada

Crie página nova quando o equipamento tiver **aplicação, Checklist ou material comercial próprios**. Variações pequenas podem ficar como seção dentro da mesma página.

## Ver também

- [Formulários públicos de Checklist](/ajuda/documentacao/site-publico/checklists-publicos)
- [Home pública e SEO](/ajuda/documentacao/site-publico/home-e-seo)
