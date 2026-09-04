---
title: Permissões, links públicos e compartilhamento
description: Quem enxerga o quê, como gerar link com token para o cliente e como revogar, expirar ou auditar acessos.
category: documentos
slug: permissoes-e-compartilhamento
tipo: guia
nivel: intermediario
tags: [permissoes, compartilhamento, link, token]
papeis: [admin, manager, sales, quality, support]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Acesso interno = papel + vínculo com cliente/projeto.
- Externo: link público com token, expiração até 180 dias, revogável a qualquer momento.
- Cada abertura fica registrada com IP, user agent e data.
- `admin` marca documentos como **Restrito** — some para todos exceto liberados.
:::

## Matriz interna

| Papel      | Vê                                                                       |
| ---------- | ------------------------------------------------------------------------ |
| admin      | Tudo, inclusive arquivados e órfãos.                                     |
| manager    | Escopo operacional completo.                                             |
| engineer   | Projetos e evidências de engenharia/produção.                            |
| quality    | FAT, RNC, SAT e evidências relacionadas.                                 |
| purchasing | Cotações, propostas, OCs.                                                |
| sales      | Documentos dos clientes atribuídos.                                      |
| production | Evidências das etapas em que atua.                                       |
| support    | Anexos dos chamados atribuídos.                                          |

Regra adicional: se `sales_liberacao` do cliente é restrita, o acesso é bloqueado mesmo dentro do papel (`/admin/sales-liberacao`).

## Gerar link público

:::step{n="1" title="Abrir o documento e compartilhar" img="documentos-detalhe.png" alt="Detalhe do documento com aba de compartilhamentos e botão para gerar link público"}
Na tela do documento, clique em **Compartilhar → Gerar link público**. Escolha expiração (padrão 30 dias, máx. 180), se exige e-mail do destinatário e se permite download.
:::

O link segue o formato `/p/<tipo>/<token>` (128 bits de entropia). O destinatário vê apenas o PDF/formulário, sem menu Solutek e sem outros documentos.

## Revogar

Aba **Compartilhamentos** → **Revogar**. O link para de funcionar imediatamente e o cliente vê "acesso expirado". Gere outro com token novo se precisar.

:::dica
Para Checklist enviada a fornecedor, use link público — ele responde direto pelo formulário sem criar conta.
:::

## Auditoria

Todo download é auditado (quem, quando, qual arquivo) em `/admin/auditoria`. Downloads em massa (ZIP) contam como um evento único com lista dos arquivos.

## Documentos restritos

`admin` marca como **Restrito** para contratos financeiros, jurídicos ou laudos de terceiros. Efeitos: só admin e liberados enxergam; não vira link público; badge vermelho na lista.

## Limites

| Regra                                | Valor    |
| ------------------------------------ | -------- |
| Expiração máx. do link público       | 180 dias |
| Máx. links ativos por documento      | 5        |
| Tamanho de download em ZIP           | 2 GB     |

:::erro{title="Cliente diz que o link não abre"}
Confira em **Compartilhamentos**: pode estar expirado, revogado ou exigindo e-mail que ele não informou. Gere um novo com expiração maior se necessário.
:::

## Ver também

- [Visão geral](/ajuda/documentacao/documentos/visao-geral)
- [Templates e versionamento](/ajuda/documentacao/documentos/templates-e-versionamento)
