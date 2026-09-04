---
title: Links públicos e segurança
description: Quais links públicos existem, como compartilhar com segurança e quando revogar ou substituir um link enviado ao cliente.
category: site-publico
slug: links-publicos-e-seguranca
tipo: referencia
nivel: intermediario
tags: [links-publicos, seguranca, token, compartilhamento]
papeis: [admin, manager, sales, support]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Nem todo link é indexável — alguns são **credenciais em URL**.
- Nunca publique links com `$token` em redes sociais, páginas abertas ou grupos amplos.
- Enviou para destinatário errado? Gere novo link e revogue o anterior quando a tela permitir.
- Link de preview jamais deve ir para material externo.
:::

## Tipos de link

| Tipo                     | Exemplo                        | Acesso                                     |
| ------------------------ | ------------------------------ | ------------------------------------------ |
| Página institucional     | `/`, `/contato`                | Público e indexável.                       |
| Catálogo                 | `/equipamentos`, `/equipamentos/$slug` | Público e indexável quando publicado. |
| Checklist                      | `/checklist/$slug`                   | Público por slug — captação técnica.       |
| Documento por token      | `/p/relatorio/$tipo/$token`    | Público **somente** para quem tem o token. |
| Cotação por token        | `/p/cotacao/$token`            | Público somente para o destinatário.       |
| Suporte por token        | `/suporte/$token`              | Público somente para acompanhamento do chamado. |

## Regras de compartilhamento

- **Páginas institucionais e catálogo** — envie livremente, incluindo campanhas.
- **Checklist** — envie apenas quando o tipo corresponder ao equipamento do cliente.
- **Tokens** — trate como senha. Não cole em Slack público, redes sociais ou anexos que serão redirecionados.

:::atencao
Um token vazado dá acesso ao documento até ser revogado. Se descobrir que um link foi para o destinatário errado, gere novo link, revogue o anterior (tela do documento → **Gerenciar compartilhamentos**) e avise o cliente correto.
:::

## Sinais de atenção

- Cliente relata que o link expirou ou não abre → verifique validade e regenere se necessário.
- Conteúdo compartilhado mostra dados de **outro cliente** → pare o envio, revise a indexação.
- Link de **preview** foi divulgado externamente → substitua imediatamente pelo link publicado.
- Documento final ainda não homologado, mas já compartilhado → despublique até revisão.

:::erro{title="Cliente diz que o link não abre"}
1. Confirme que o token não foi truncado no e-mail (quebra de linha).
2. Verifique se o compartilhamento não foi revogado.
3. Cheque `/admin/auditoria` para saber se alguém removeu o compartilhamento.
:::

:::dica
Em toda troca sensível, **prefira token específico por destinatário** em vez de link genérico. A trilha de acesso identifica quem baixou cada arquivo.
:::

## Ver também

- [Home pública e SEO](/ajuda/documentacao/site-publico/home-e-seo)
- [Permissões e compartilhamento](/ajuda/documentacao/documentos/permissoes-e-compartilhamento)
