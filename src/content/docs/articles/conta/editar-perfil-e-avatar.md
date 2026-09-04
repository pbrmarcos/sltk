---
title: Editar perfil e avatar
description: Como atualizar seus dados pessoais, foto de perfil e preferências no Solutek Hub.
category: conta
slug: editar-perfil-e-avatar
tipo: passo-a-passo
nivel: iniciante
tags: [perfil, avatar, conta, preferencias]
papeis: [admin, manager, sales, engineer, quality, purchasing, production, support]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Tela: `/conta` (link no menu do usuário no topo direito).
- Nome exibido aparece em assinaturas de **SAT**, **FAT**, **OC** e comentários — use o oficial.
- Avatar aceita JPG/PNG até **2 MB**; o `AvatarCropDialog` corta em círculo antes de subir.
- E-mail só é alterado por `admin` em `/admin/usuarios`.
- Preferências (idioma, fuso, densidade da UI) são por usuário.
:::

## Atualizar nome e cargo

:::step{n="1" title="Abrir /conta"}
Clique no seu nome no topo direito → **Minha conta**. Ou vá direto para `/conta`.
:::

:::step{n="2" title="Editar dados básicos"}
Ajuste:

- **Nome completo** (obrigatório, aparece em assinaturas).
- **Cargo** (opcional, mostrado em atribuições).
- **Telefone** (usado por Pós-venda para contato interno).
- **Departamento** (ajuda o `admin` em relatórios).

Clique em **Salvar**. Alterações são propagadas em segundos.
:::

## Trocar avatar

:::step{n="1" title="Clicar na foto atual"}
No cartão de perfil, clique na imagem. Abre o `AvatarCropDialog`.
:::

:::step{n="2" title="Enviar e recortar"}
Escolha **Enviar imagem** (JPG/PNG até 2 MB). Ajuste o quadro de recorte arrastando. Preview atualiza em tempo real.
:::

:::step{n="3" title="Salvar"}
Clique em **Salvar**. Se a imagem não aparecer imediatamente em cabeçalhos e listas, recarregue a página (**Ctrl+R**).
:::

:::dica
Prefira fotos claras, com bom enquadramento do rosto — melhora reconhecimento em Kanbans e listas de atribuição.
:::

## Preferências

| Preferência | Onde | Efeito |
|---|---|---|
| **Idioma** | `/conta` → **Preferências** | pt-BR / en / zh nos rótulos da UI |
| **Fuso horário** | `/conta` → **Preferências** | Datas exibidas com seu fuso |
| **Densidade** | `/conta` → **Preferências** | Confortável / Compacta em listas |
| **E-mails de notificação** | `/conta` → **Notificações** | Ativa/desativa por tipo de evento |

## O que só o admin muda

- **E-mail de login** — precisa auditoria, feito em `/admin/usuarios`.
- **Papel/permissões** — controlado em `/admin/usuarios` (ver [Papéis e permissões](/ajuda/documentacao/conta/papeis-e-permissoes)).
- **Ativação/desativação** — apenas `admin`.

:::atencao
Trocar o nome depois de ter assinado FATs ou SATs **não reescreve** o histórico — os documentos antigos guardam o nome que estava vigente na data.
:::

## Ver também

- [Trocar senha e encerrar sessões](/ajuda/documentacao/conta/trocar-senha-e-sessoes)
- [Navegação e atalhos](/ajuda/documentacao/conta/navegacao-e-atalhos)
- [Papéis e permissões](/ajuda/documentacao/conta/papeis-e-permissoes)
