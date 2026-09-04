---
title: Login e recuperação de senha
description: Como entrar no Solutek Hub, recuperar acesso e lidar com sessões expiradas.
category: conta
slug: login-e-recuperacao-de-senha
tipo: guia
nivel: iniciante
tags: [login, senha, acesso, sessao]
papeis: [admin, manager, sales, engineer, quality, purchasing, production, support]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Acesso é sempre por `/login` — **não há cadastro público**. Um `admin` precisa criar a conta antes.
- Esqueceu a senha? `/forgot-password` envia link por e-mail (válido por 60 min).
- O link cai em `/reset-password?token=...` e exige senha nova com mín. 8 caracteres.
- Sessão dura ~8 horas de uso ativo; ao expirar, você é redirecionado para `/login` preservando a URL de destino.
- **Nunca compartilhe** sua senha — cada ação fica registrada em auditoria com seu usuário.
:::

## Entrar no sistema

:::step{n="1" title="Abrir /login"}
Acesse a URL da sua empresa (ex.: `https://solutek-hub.lovable.app/login`). O formulário pede e-mail corporativo e senha.
:::

:::step{n="2" title="Preencher e enviar"}
Use o e-mail cadastrado pelo `admin`. Clique em **Entrar**. Se estiver correto, você cai na home ou na rota que tentou acessar antes de logar.
:::

:::step{n="3" title="Se der erro"}
- **E-mail ou senha inválidos** → confira maiúsculas/minúsculas. Após 5 tentativas em 15 min o acesso é temporariamente bloqueado.
- **Conta desativada** → seu `admin` desligou o acesso. Fale com ele em `/admin/usuarios`.
- **Página em branco** → limpe o cache do navegador e tente em aba anônima.
:::

## Recuperar senha

:::step{n="1" title="Clicar em Esqueci minha senha"}
No `/login` clique em **Esqueci minha senha** ou vá direto para `/forgot-password`.
:::

:::step{n="2" title="Informar o e-mail"}
Digite o e-mail cadastrado. Você **sempre** recebe a mensagem "Se o e-mail existir…" — não confirmamos existência de conta para evitar enumeração.
:::

:::step{n="3" title="Abrir o link do e-mail (60 min)"}
Cheque a caixa de entrada e a pasta de spam. O link leva a `/reset-password?token=...` e expira em **1 hora**. Solicite outro se necessário.
:::

:::step{n="4" title="Definir nova senha"}
Nova senha precisa de:

- Mínimo **8 caracteres**.
- Ao menos **1 letra** e **1 número**.
- Não pode ser igual à anterior.

Ao confirmar, você é redirecionado para `/login` já com a nova senha ativa.
:::

## Sessões e expiração

| Situação | O que acontece |
|---|---|
| Uso ativo | Sessão renova sozinha |
| ~8h sem interagir | Redirecionado para `/login` (URL preservada) |
| Trocar de senha | Todas as sessões antigas são invalidadas |
| `admin` desativa conta | Deslogado imediatamente em todos os dispositivos |

:::dica
Se você usa gerenciador de senhas, salve o site como `Solutek Hub` para os campos preencherem automaticamente.
:::

:::atencao
Nunca use e-mails pessoais (Gmail, Hotmail) — auditoria e assinaturas de FAT/SAT dependem do e-mail corporativo. Se o seu foi cadastrado errado, peça correção ao `admin`.
:::

:::erro
**"Este link expirou"** → o token de reset tem 60 min. Volte em `/forgot-password` e solicite outro.
:::

## Ver também

- [Trocar senha e encerrar sessões](/ajuda/documentacao/conta/trocar-senha-e-sessoes)
- [Editar perfil e avatar](/ajuda/documentacao/conta/editar-perfil-e-avatar)
- [Papéis e permissões](/ajuda/documentacao/conta/papeis-e-permissoes)
