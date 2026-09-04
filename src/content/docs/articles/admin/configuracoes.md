---
title: Configurações do sistema
description: Onde configurar marca, e-mails, SLA de chamados, catálogos (segmentos, países, categorias) e integrações externas.
category: admin
slug: configuracoes
tipo: passo-a-passo
nivel: intermediario
tags: [admin, configuracoes, brand, sla, integracoes]
papeis: [admin, manager]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Configurações operacionais ficam agrupadas dentro de `/admin`; mude uma coisa por vez.
- SLA de chamados só afeta **chamados novos** — histórico preserva o SLA vigente na criação.
- Templates de FAT/SAT/Projeto são **versionados**: PDFs antigos continuam fiéis ao layout da época.
- Segredos de integração (Firecrawl, AI Gateway) vivem em secrets do backend, nunca em `brand_settings`.
:::

## Marca e site público — `/admin/marca`

- **Logotipo** (claro/escuro), **favicon**, **cores primárias/secundárias**.
- **E-mail de suporte** — aparece no login, e-mails automáticos e rodapé do site.
- **Textos do site** — hero, sobre, seções de equipamento.
- **Assinatura de e-mail transacional** — cabeçalho e rodapé dos disparos automáticos.

Efeito visível ao salvar; caches de e-mail expiram em 5 min.

## SLA de chamados — `/admin/sla-chamados`

:::step{n="1" title="Configurar prazos por origem × prioridade" img="admin-sla.png" alt="Matriz de SLA com três colunas (Resposta, Resolução, Estagnado) por prioridade, agrupada por origem: Suporte/Site, Interno, Contato do site"}
Em `/admin/sla-chamados` cada bloco é uma **origem** (Suporte/Site público, Interno, Contato do site). Em cada bloco, quatro prioridades (Crítica → Baixa) com três relógios em horas.
:::

- **Resposta** — tempo máximo até a primeira interação.
- **Resolução** — tempo máximo até status `Resolvido`.
- **Estagnado** — sem interação por N horas dispara alerta.

:::atencao
Mudanças só valem para **chamados novos** — chamados existentes mantêm o SLA vigente na criação. Isso está documentado no próprio card do chamado.
:::

## Templates de sistema

- **Projeto** (`/admin/templates-projeto`) — etapas padrão por equipamento, BOM enxuta, checklists.
- **FAT** (`/admin/templates-fat`) e **SAT** (`/admin/templates-sat`) — seções e itens com tipos (booleano, medição em faixa, texto, evidência).
- Versionamento é automático: emitir novo template preserva relatórios já gerados.

## Catálogos

- Segmentos de cliente, países com máscara de documento (CNPJ, RUT, RUC…), categorias de fornecedor, condições de pagamento, transportadoras.
- Cada catálogo tem estado `ativo` — desativar oculta em novos formulários sem apagar histórico.

## Integrações externas

- **Firecrawl** — enriquecimento de dados por CNPJ/RUT/RUC.
- **Supabase Auth** — provedor de login (e-mail + senha). Provedores sociais desabilitados por padrão.
- **AI Gateway** — modelos usados em resumo de chamado, extração de dado de PDF etc.

:::dica
Antes de mexer em configuração global (SLA, template), avise no canal interno com 24 h de antecedência. Mudança pode ter efeito imediato em relatórios exportados por clientes.
:::

## Ver também

- [Gerenciar usuários](/ajuda/documentacao/admin/gerenciar-usuarios)
- [Trilha de auditoria](/ajuda/documentacao/admin/auditoria)

<!-- SHOTS:AUTO -->

## Imagens da tela

:::step{n="1" title="Acesso restrito" img="configuracoes-1.png" alt="Acesso restrito"}
Acesso restrito
:::

<!-- /SHOTS:AUTO -->
