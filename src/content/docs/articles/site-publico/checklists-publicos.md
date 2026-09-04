---
title: Formulários públicos de Checklist
description: Como funcionam os links /checklist/$slug, quando compartilhar com clientes e quais dados entram no Comercial.
category: site-publico
slug: checklists-publicos
tipo: guia
nivel: intermediario
tags: [checklist, formulario, checklist, lead, upload]
papeis: [admin, manager, sales]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- `/checklist/$slug` é um checklist técnico **público por link** — o cliente responde sem precisar de login.
- Cada **tipo de Checklist** é configurado em `/admin/checklist-tipos` com blocos (dados, uploads, matriz de itens).
- O envio cria uma **cotação staging** que o comercial revisa antes de virar oportunidade.
- Uploads passam por endpoint público seguro (`/api/public/rfq/upload`) com limite de tamanho e MIME.
- Todo envio dispara notificação para `sales` e `manager` responsáveis pelo tipo.
:::

## Fluxo end-to-end

:::step{n="1" title="Criar o tipo de Checklist"}
`admin` cria em `/admin/checklist-tipos` os blocos que aparecem no formulário: dados do cliente, especificações técnicas, matriz de itens, uploads de desenhos/normas. Cada tipo tem um `slug` (ex.: `envasadora-1000ml`).
:::

:::step{n="2" title="Compartilhar o link com o cliente"}
Envie `https://<seu-dominio>/checklist/envasadora-1000ml` por e-mail. Sem autenticação — o cliente clica e responde.
:::

:::step{n="3" title="Cliente preenche e envia"}
Ele preenche os blocos, anexa desenhos/normas (PDF, DWG, imagens) e clica em **Enviar**. Recebe confirmação e um **token de consulta** para acompanhar o status posteriormente em `/checklist/status/$token`.
:::

:::step{n="4" title="Chega no staging"}
A submissão vai para `/api/public/rfq/submit` → tabela de staging. Aparece em `/comercial/checklists` para o comercial revisar.
:::

:::step{n="5" title="Comercial promove"}
`sales` valida os dados, faz de-duplicação de cliente (se necessário), e clica em **Promover** — vira **oportunidade** no pipeline (`/comercial/pipeline`) e/ou **cotação** vinculada.
:::

## Segurança do link público

| Camada | Como funciona |
|---|---|
| **Rota pública** | `/api/public/rfq/*` bypassa auth só nesses endpoints |
| **Validação** | Schema Zod no submit; rejeita payload inválido |
| **Upload** | MIME/tamanho validados; anexos escaneados em background |
| **Rate limit** | IP throttling por endpoint |
| **Token opaco** | Consulta de status usa token gerado no envio — não expõe IDs internos |

## Quando usar (e quando não)

**Use** para prospects sem conta que precisam pedir cotação com muitos detalhes técnicos (feiras, indicações, contato via site).

**Não use** para clientes recorrentes com login — nesses casos abra a oportunidade direto no pipeline: dado mais limpo e sem etapa de staging.

:::dica
Crie um tipo de Checklist genérico "Fale com engenharia" além dos específicos por equipamento — funciona como funil geral para leads que ainda não sabem qual máquina precisam.
:::

:::atencao
Não personalize o `slug` do tipo com dados sensíveis (nome de projeto sigiloso, cliente exclusivo). O `slug` compõe a URL pública e fica indexável se compartilhado.
:::

:::erro
**"Não consigo enviar — arquivo grande demais"** → limite padrão é 20 MB por arquivo. Peça para o cliente enviar por WeTransfer/Drive e colar o link no campo observações.
:::

## Ver também

- [Tipos de Checklist (Admin)](/ajuda/documentacao/admin/tipos-de-checklist)
- [Pipeline de oportunidades](/ajuda/documentacao/comercial/pipeline-de-oportunidades)
- [Links públicos e segurança](/ajuda/documentacao/site-publico/links-publicos-e-seguranca)
