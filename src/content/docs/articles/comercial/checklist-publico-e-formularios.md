---
title: Checklist público e formulários por equipamento
description: Como configurar e compartilhar formulários de Checklist públicos que geram oportunidades automaticamente.
category: comercial
slug: checklist-publico-e-formularios
tipo: guia
nivel: intermediario
tags: [checklist, formulario, publico, captacao]
papeis: [admin, manager, sales]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Cliente preenche Checklist em `/checklist/$slug` **sem login** e envia anexos.
- Cada envio vira uma oportunidade automática na coluna **Novo** do pipeline.
- Formulários são configurados por tipo de equipamento em `/admin/checklist-tipos`.
- Compartilhe por link, QR code ou embed em propostas/e-mails.
:::

## Onde ficam as coisas

| O quê | Onde | Quem edita |
|---|---|---|
| **Tipos de Checklist** (blocos, campos, limites) | `/admin/checklist-tipos` | `admin` |
| **Formulários vigentes** (link, QR, cópia) | `/comercial/checklists` | `sales`, `manager`, `admin` |
| **Página pública** (o cliente enxerga) | `/checklist/$slug` | Qualquer visitante |

## Passo a passo — publicar um Checklist

:::step{n="1" title="Editar o tipo do equipamento"}
Em **Admin → Tipos de Checklist**, edite o tipo desejado (ex.: Envasadora). Ajuste:

- **Blocos** — grupos de perguntas (ex.: "Produto", "Utilidades", "Contato").
- **Campos obrigatórios** — marque com asterisco os que travam o envio.
- **Limite de anexos** — quantidade e tamanho máximo por arquivo.

Clique **Salvar**. O link público é gerado automaticamente com o `slug` do tipo.
:::

:::step{n="2" title="Encontrar o link público" img="04-formularios-checklist.png" alt="Página de Formulários Checklist do comercial com lista de equipamentos e ações de copiar link"}
Vá em **Comercial → Formulários Checklist**. Você vê todos os tipos ativos. Para cada um:

- **Copiar link** — cola em e-mail, WhatsApp ou site.
- **Baixar QR** — para materiais impressos (feira, catálogo).
- **Prévia** — abre o formulário como o cliente veria.
:::

:::step{n="3" title="Distribuir"}
Cole o link em propostas, e-mails, campanhas de mídia paga, feiras. Cada canal pode ser rastreado adicionando `?utm_source=...` ao link.
:::

## O que acontece quando o cliente envia

:::step{n="1" title="Cliente preenche e anexa arquivos"}
No formulário público, o cliente responde os campos e faz upload de anexos (fichas técnicas, layouts, fotos). Uploads passam por edge function autenticada por token temporário — sem exposição de credenciais.
:::

:::step{n="2" title="Sistema cria a oportunidade automaticamente" img="01-pipeline.png" alt="Pipeline com card recém-criado a partir de Checklist na coluna Novo"}
Um **lead** é criado com os dados do cliente. Uma **oportunidade** entra no pipeline em **Novo** com origem "Checklist" (visível no filtro). Anexos ficam vinculados ao card.
:::

:::step{n="3" title="Responsável é notificado"}
O responsável definido no tipo de Checklist recebe notificação por e-mail e no sino do sistema. SLA de primeira resposta começa a contar.
:::

## Boas práticas

:::dica
- Mantenha campos obrigatórios **ao mínimo necessário**. Cada campo extra reduz taxa de envio em ~15%.
- Use os blocos "Utilidades" e "Produto" para separar dados técnicos claros — evita que o cliente misture informação de embalagem com dados de energia.
- Revise **semanalmente** as submissões filtrando por origem "Checklist" no pipeline. Leads frios após 7 dias tendem a esfriar de vez.
:::

## Erros comuns

:::erro{title="Link público volta 404"}
O tipo de Checklist está desativado. Volte em `/admin/checklist-tipos` e reative, ou verifique se o slug mudou.
:::

:::erro{title="Cliente diz que upload falhou"}
Verifique o **limite de tamanho** por arquivo (padrão 10 MB) e o **total de anexos**. Aumente se necessário no tipo de Checklist.
:::

:::atencao
Nunca peça senha, CPF ou dado financeiro no Checklist público. É formulário técnico-comercial — dados sensíveis devem ser coletados só após qualificação, em canal autenticado.
:::

## Ver também

- [Pipeline de oportunidades](/ajuda/documentacao/comercial/pipeline-de-oportunidades)
- [Formulários Checklist públicos](/ajuda/documentacao/site-publico/checklists-publicos)
- [Links públicos e segurança](/ajuda/documentacao/site-publico/links-publicos-e-seguranca)

<!-- SHOTS:AUTO -->

## Imagens da tela

:::step{n="1" title="Checklists" img="checklist-publico-e-formularios-1.png" alt="Checklists"}
Checklists
:::

<!-- /SHOTS:AUTO -->
