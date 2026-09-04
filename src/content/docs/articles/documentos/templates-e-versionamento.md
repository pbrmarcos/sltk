---
title: Templates de documentos e versionamento
description: Como funcionam os templates de orçamento, ETP, OC, Checklist, FAT e SAT — e como o sistema preserva a versão de cada emissão.
category: documentos
slug: templates-e-versionamento
tipo: conceito
nivel: intermediario
tags: [templates, versao, pdf, layout]
papeis: [admin, manager]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Cada documento gerado guarda a **versão do template** ativa no momento da emissão.
- Blocos são ativáveis, com ordem e largura (50% ou 100%) — permitem PDF lado a lado.
- FAT/SAT versionam também as seções e itens de checklist.
- Mudanças de branding (`/admin/brand`) valem para emissões novas, não para PDFs já gerados.
:::

## Onde configurar

:::step{n="1" title="Templates de documento" img="documentos-template.png" alt="Editor de blocos do template de documento com ordem, largura e ativo"}
Em `/template-documentos` você edita orçamento, ETP, Checklist, OC e contratos customizados. Cada bloco tem ordem, largura e flag Ativo. Blocos lado a lado usam largura 50%.
:::

:::step{n="2" title="Templates de FAT e SAT" img="templates-fat.png" alt="Lista de templates de FAT com seções, itens de checklist e versões"}
Em `/templates-sistema/fat` (e `/sat`) você monta seções e itens de checklist. Cada item tem tipo — Sim/Não + comentário, texto, número, data, checkbox múltiplo, medição paramétrica, cabeçalho — e flags obrigatório / exige anexo.
:::

:::step{n="3" title="Branding global" img="admin-brand.png" alt="Configurações de marca com logo, cores, assinatura e rodapé"}
Em `/admin/brand` (só `admin`) você define logo, cor primária e secundária, assinatura padrão e rodapé. Aplica a todos os documentos **novos**; PDFs já gerados mantêm o layout que tinham.
:::

## Versionamento

Ao editar um template ativo você escolhe:

1. **Salvar como nova versão** — cria v2, v3… e a nova vira ativa. Documentos já emitidos continuam apontando para a versão original.
2. **Salvar como rascunho** — não afeta emissões; útil para preparar mudanças.

Cada versão registra autor, data e descrição do que mudou. Ao ativar uma versão, o sistema pergunta se arquiva a anterior.

## Checklists FAT/SAT

FATs/SATs existentes **mantêm** a estrutura em que foram criados; apenas relatórios novos usam a versão ativa.

:::dica
Sempre use **Nova versão (a partir da ativa)** em vez de editar direto — evita quebrar relatórios em andamento.
:::

:::atencao
Não apague um template ativo — arquive. Assim relatórios antigos continuam abrindo.
:::

:::erro{title="PDF antigo saiu com layout diferente do atual"}
Comportamento esperado: emissões preservam a versão do template + branding da época. Isso protege laudos, orçamentos e OCs auditáveis. Para atualizar, reemita o documento (novo número + versão).
:::

## Ver também

- [Visão geral](/ajuda/documentacao/documentos/visao-geral)
- [Permissões e compartilhamento](/ajuda/documentacao/documentos/permissoes-e-compartilhamento)
