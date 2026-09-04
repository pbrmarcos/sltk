---
title: Páginas e etapas dos equipamentos
description: Como manter as páginas públicas do catálogo (/admin/paginas-equipamentos) e os templates de etapas de fabricação (/admin/etapas-equipamentos).
category: admin
slug: paginas-e-etapas-equipamentos
tipo: guia
nivel: intermediario
tags: [admin, equipamentos, catalogo, etapas, template]
papeis: [admin, manager]
atualizado_em: 2026-08-20
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
A tela lista todos os equipamentos com **status** (Publicado/Rascunho), **última atualização** e **contagem de blocos**.
:::

:::step{n="2" title="Editar blocos da página"}
Clique no equipamento. Você vê a árvore de blocos (hero, galeria, especificações, aplicações, FAQ, formulário de Checklist). Cada bloco tem:

- Título e subtítulo.
- Imagem/vídeo (upload ou URL).
- Texto rico com variáveis.
- Ordem (arraste para reordenar).
- **Visível sim/não** (para esconder sem excluir).
:::

:::step{n="3" title="Publicar"}
No topo, mude o status para **Publicado** e clique em **Salvar**. A página fica disponível em segundos com cache limpo automaticamente.
:::

:::dica
Blocos duplicados de outro equipamento (**"Duplicar de..."**) aceleram cadastrar um novo tipo — só troque os textos e imagens.
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
