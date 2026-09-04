---
title: Home pública e SEO
description: Como revisar a home pública, metadados, canonical, idioma e chamadas de conversão antes de divulgar o site.
category: site-publico
slug: home-e-seo
tipo: guia
nivel: intermediario
tags: [home, seo, canonical, metadados]
papeis: [admin, manager, sales]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- A home é a **primeira impressão** — hero, CTAs e imagens precisam refletir a operação real.
- Metadados (title, description, canonical, OG) alimentam Google, WhatsApp e LinkedIn.
- Nunca divulgue link de **preview** em campanha externa — quebra ao subir nova versão.
- Textos ficam em `brand_settings` (`/admin/marca`); metadados no `head()` da rota `/`.
:::

:::step{n="1" title="Abrir a home e revisar hero" img="site-home.png" alt="Hero da home com título Packaging engineering for industries that never stop, subtítulo em inglês e CTAs Request a quote/Browse equipment"}
Acesse `/` em desktop e mobile. Confira título, subtítulo, imagem de fundo e os CTAs principais — clique em cada um e confirme que levam a `/contato` ou `/equipamentos`.
:::

:::step{n="2" title="Conferir metadados"}
Abra o **View source** e revise:
- **Title** — marca + categoria principal.
- **Description** — até 160 caracteres, orientado a busca.
- **Canonical** — URL pública definitiva, não domínio de preview.
- **Open Graph / Twitter** — título, descrição e imagem de compartilhamento.
:::

:::step{n="3" title="Testar compartilhamento social"}
Cole a URL num WhatsApp/LinkedIn de teste antes de anunciar. Se o preview vier errado, os caches sociais podem levar horas para atualizar.
:::

:::atencao
Não use link de preview (`id-preview--…lovable.app`) em material externo. Sempre use o domínio publicado ou o custom domain configurado.
:::

:::erro{title="Home carregou em branco"}
Provavelmente o browser está sem JS ou o bundle falhou. Recarregue; se persistir, verifique console e o status do deploy antes de divulgar o link.
:::

:::dica
Evite prometer prazos, certificações ou países atendidos sem validação comercial. Se alterar posicionamento, avise Comercial para alinhar discurso em propostas.
:::

## Ver também

- [Catálogo público de equipamentos](/ajuda/documentacao/site-publico/catalogo-equipamentos)
- [Links públicos e segurança](/ajuda/documentacao/site-publico/links-publicos-e-seguranca)
