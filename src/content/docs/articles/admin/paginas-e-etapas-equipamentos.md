---
title: Páginas e etapas dos equipamentos
description: Como manter as páginas públicas do catálogo (/admin/paginas-equipamentos) e os templates de etapas de fabricação (/admin/etapas-equipamentos).
category: admin
slug: paginas-e-etapas-equipamentos
tipo: guia
nivel: intermediario
tags: [admin, equipamentos, catalogo, etapas, template]
papeis: [admin, manager]
atualizado_em: 2026-09-05
app_version: "0.99.4"
---

:::tldr
- **Páginas dos Equipamentos** (`/admin/paginas-equipamentos`): CMS do catálogo público em `/equipamentos/*`.
- **Etapas dos Equipamentos** (`/admin/etapas-equipamentos`): template padrão de etapas + H/H orçado por tipo de máquina.
- Um equipamento tem um **slug** (ex.: `envasadora`) usado tanto na URL pública quanto para casar com o template de etapas.
- Alterações em template **não afetam projetos já criados** — só os próximos.
:::

## Parte 1 — Páginas do catálogo público

O site em `/equipamentos/{slug}` (ex.: `/equipamentos/envasadora`) é montado a partir de blocos configuráveis.

:::step{n="1" title="Abrir /admin/paginas-equipamentos"}
A lista à esquerda mostra todos os equipamentos com nome, slug, família e o **status** (Publicado/Rascunho). Busque por nome, slug ou família na caixa de busca.
:::

:::step{n="2" title="Editar blocos da página"}
Clique no equipamento. A tela tem duas abas: **Blocos** e **SEO**. Na aba Blocos, cada bloco é um cartão com:

- Setas para mover pra cima/baixo (não há arrastar-e-soltar).
- Olho para mostrar/ocultar sem excluir, e lixeira pra remover.
- **Editar**, que abre um formulário estruturado por campo (título, subtítulo, itens de lista etc. — cada um dos 9 tipos de bloco tem seus próprios campos) com abas PT/ES/EN pra cada texto, mais uma **preview ao vivo** ao lado mostrando exatamente como o bloco fica na página pública, com seletor de idioma.

Use **Adicionar bloco** pra escolher entre os 9 tipos disponíveis: Hero, Descrição rica, Especificações técnicas, Benefícios, Casos de uso, Galeria de imagens, Perguntas frequentes, Vídeo e CTA de orçamento.
:::

:::step{n="3" title="Publicar"}
No topo da página, o interruptor **Publicada/Rascunho** salva assim que você muda — não precisa de um botão "Salvar" separado. A aba SEO (título, descrição, imagem OG) tem seu próprio botão **Salvar SEO**.
:::

## Parte 2 — Template de etapas

Cada tipo de equipamento tem uma **sequência padrão de etapas de fabricação** com H/H orçado, disciplina (mec./elét./montagem) e dependências.

:::step{n="1" title="Abrir /admin/etapas-equipamentos"}
A lista mostra cada equipamento e quantas etapas tem o template. Clique em um para editar.
:::

:::step{n="2" title="Adicionar/editar etapas"}
Cada etapa tem:

| Campo | Exemplo |
|---|---|
| Nome | Estrutura mecânica base |
| Disciplina | Mecânica / Elétrica / Montagem |
| H/H orçado | 40 h |
| Dependências | outras etapas que precisam terminar antes |
| Anexos padrão | desenho, checklist |
| Anexos obrigatórios para concluir | sim/não |
:::

:::step{n="3" title="Salvar e usar em novos projetos"}
Salvo o template, ao criar um novo projeto do tipo **Envasadora**, o sistema copia todas essas etapas com H/H orçado para o projeto. O engenheiro pode editar por projeto sem afetar o template.
:::

:::atencao
Editar o template **não altera projetos que já foram criados**. Se o H/H orçado do template estava errado num projeto em andamento, atualize o projeto direto em `/engenharia/projetos/$id`, não o template.
:::

## Como as duas partes se conectam

O **slug do equipamento** casa as duas telas. Ex.: se você cria `envasadora-rotativa`:

1. Cadastre a **página pública** em `/admin/paginas-equipamentos` (aparece em `/equipamentos/envasadora-rotativa`).
2. Cadastre o **template de etapas** em `/admin/etapas-equipamentos` com o mesmo slug.
3. Cadastre o **tipo de Checklist** em `/admin/checklist-tipos` apontando para o template de projeto certo.

Assim, uma Checklist desse tipo gera projeto com etapas certas e o cliente vê a página pública correspondente.

## Ver também

- [Tipos de Checklist](/ajuda/documentacao/admin/tipos-de-checklist)
- [Catálogo de equipamentos (site público)](/ajuda/documentacao/site-publico/catalogo-equipamentos)

<!-- SHOTS:AUTO -->

## Imagens da tela

:::step{n="1" title="Acesso restrito" img="paginas-e-etapas-equipamentos-1.png" alt="Acesso restrito"}
Acesso restrito
:::

:::step{n="2" title="Acesso restrito" img="paginas-e-etapas-equipamentos-2.png" alt="Acesso restrito"}
Acesso restrito
:::

<!-- /SHOTS:AUTO -->
