---
title: Trocar senha e encerrar sessões
description: Como alterar sua senha, encerrar sessões em outros dispositivos e reconhecer sinais de acesso não autorizado.
category: conta
slug: trocar-senha-e-sessoes
tipo: passo-a-passo
nivel: iniciante
tags: [senha, seguranca, sessao]
papeis: [admin, manager, sales, engineer, quality, purchasing, production, support]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Troque a senha em `/conta` → cartão **Alterar senha**.
- A troca **invalida todas as sessões antigas** — você fica logado só onde acabou de trocar.
- Requisitos: mín. 8 caracteres, ao menos 1 letra e 1 número, diferente da anterior.
- Perdeu acesso e não consegue logar? Use `/forgot-password` (ver [Login e recuperação](/ajuda/documentacao/conta/login-e-recuperacao-de-senha)).
- Suspeita de acesso indevido? Troque a senha e avise seu `admin`.
:::

## Trocar a senha

:::step{n="1" title="Abrir /conta"}
Menu do usuário → **Minha conta**. Role até o cartão **Alterar senha**.
:::

:::step{n="2" title="Informar senha atual e nova"}
Digite:

- **Senha atual** (validada antes de gravar).
- **Nova senha** — mínimo 8 caracteres, com letra e número.
- **Confirmação** — precisa bater exatamente com a nova.

Clique em **Salvar**.
:::

:::step{n="3" title="Confirmação e re-login"}
Ao gravar, o sistema **encerra todas as sessões antigas** e mantém apenas a atual. Você continua logado — outros dispositivos onde estava aberto vão precisar fazer login de novo.
:::

## Encerrar sessões em outros dispositivos

A forma mais rápida de "deslogar de todo canto" é **trocar a senha** — todos os tokens ficam inválidos.

Alternativa manual em `/conta` → **Sessões ativas** (quando disponível): você vê o dispositivo, navegador e último acesso, e pode encerrar sessão a sessão.

| Situação | Ação recomendada |
|---|---|
| Esqueci logado no PC do escritório | Trocar senha ou encerrar sessão específica |
| Notebook roubado / perdido | **Trocar senha agora** + avisar `admin` |
| Suspeita de phishing | Trocar senha + verificar auditoria em `/admin/auditoria` |
| Vou tirar férias longas | Nenhuma ação — sessão expira sozinha em ~8h de inatividade |

## Política de senha

- Mínimo **8 caracteres**.
- Ao menos **1 letra** e **1 número**.
- Não pode ser igual à anterior.
- Sem repetições triviais (`12345678`, `senha123`) — o backend rejeita.
- Recomendado: senha forte gerada por gerenciador (1Password, Bitwarden, KeePass).

:::dica
Use um gerenciador de senhas. Senhas fortes e únicas por serviço são muito mais eficazes do que trocar senha frequentemente.
:::

:::atencao
Nunca reutilize a senha do Solutek Hub em outros serviços. Vazamentos em terceiros comprometem também seu acesso aqui.
:::

:::erro
**"A senha atual está incorreta"** → confirme se o CapsLock está desligado. Após 5 tentativas erradas em 15 min, o acesso é temporariamente bloqueado.
:::

## Ver também

- [Login e recuperação de senha](/ajuda/documentacao/conta/login-e-recuperacao-de-senha)
- [Editar perfil e avatar](/ajuda/documentacao/conta/editar-perfil-e-avatar)
- [Papéis e permissões](/ajuda/documentacao/conta/papeis-e-permissoes)
