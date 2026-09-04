---
title: Gerenciar usuários
description: Como convidar, desativar e resetar senha de usuários, atribuir um ou mais papéis e acompanhar último login.
category: admin
slug: gerenciar-usuarios
tipo: passo-a-passo
nivel: iniciante
tags: [admin, usuarios, convite, papel, senha]
papeis: [admin, manager]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Todo acesso começa em `/admin/usuarios` → **Convidar usuário**.
- Um usuário pode ter **mais de um papel** (ex.: `engineer` + `sales`).
- Não existe senha manual — o próprio usuário define pelo link do convite (24 h de validade).
- **Desativar** encerra a sessão na hora sem apagar histórico; reativar devolve os papéis anteriores.
:::

:::step{n="1" title="Convidar um novo usuário"}
Em `/admin/usuarios`, clique em **Convidar usuário**, informe **e-mail corporativo** e **nome completo**, marque **um ou mais papéis** e confirme. O sistema envia link de definição de senha por e-mail.
:::

:::step{n="2" title="Acompanhar convites pendentes"}
Enquanto o convidado não define a senha, a linha aparece como **Convite pendente**. Use **Reenviar convite** se ele não recebeu ou o link expirou.
:::

:::step{n="3" title="Alterar papéis"}
Abra a linha do usuário → aba **Papéis**. Marque/desmarque e salve. Só `admin` concede ou revoga o papel `admin` — `manager` não vê essa opção.
:::

:::step{n="4" title="Resetar senha"}
Botão **Resetar senha** dispara `resetPasswordForEmail`. O usuário recebe link em `/reset-password`. Não é possível ver ou definir a senha em texto — nem para o admin.
:::

:::step{n="5" title="Desativar / reativar"}
**Desativar** impede login imediatamente e encerra a sessão ativa. Histórico e responsabilidades permanecem — reatribua os cards abertos antes. **Reativar** devolve o acesso com os mesmos papéis.
:::

:::atencao
Não existe exclusão permanente pela UI. Para LGPD, abra chamado interno — a exclusão via banco também é auditada.
:::

:::erro{title="Convite expirou"}
Links de convite valem 24 h. Se passou desse prazo, use **Reenviar convite** — o link antigo é invalidado.
:::

:::dica
Nunca compartilhe login. Reveja trimestralmente a lista de ativos e mantenha o `admin` **mínimo** — idealmente 2 pessoas com senha forte e MFA.
:::

## Ver também

- [Permissões por papel × módulo](/ajuda/documentacao/admin/permissoes-por-papel)
- [Trilha de auditoria](/ajuda/documentacao/admin/auditoria)

<!-- SHOTS:AUTO -->

## Imagens da tela

:::step{n="1" title="Acesso restrito" img="gerenciar-usuarios-1.png" alt="Acesso restrito"}
Acesso restrito
:::

<!-- /SHOTS:AUTO -->
