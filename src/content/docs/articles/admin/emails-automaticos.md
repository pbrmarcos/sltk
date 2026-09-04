---
title: E-mails automáticos (templates e log de envio)
description: Como ativar, editar e testar os e-mails que o sistema envia sozinho — assunto, corpo, variáveis obrigatórias, destinatários e diagnóstico de falhas de envio.
category: admin
slug: emails-automaticos
tipo: guia
nivel: intermediario
tags: [admin, email, template, notificacao, log, envio]
papeis: [admin, manager]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- A tela é `/admin/emails` e tem duas abas: **Eventos** (templates) e **Log de envio**.
- Cada evento do sistema (nova OC, FAT agendado, chamado respondido, embarque atualizado…) tem um template próprio, ligado ou desligado por um interruptor.
- Variáveis entre chaves (ex.: `{{cliente}}`) são preenchidas no momento do envio; as marcadas como obrigatórias travam o disparo se vierem vazias.
- Cada evento tem sua própria lista de **destinatários** (To/Cc), por papel ou e-mail fixo.
- O **Log de envio** mostra o que saiu, o que falhou e o motivo exato de cada e-mail ignorado.
:::

## Pré-requisitos

- Papel `admin` (ou `manager`, conforme a política do módulo Administração).
- Provedor de e-mail configurado — sem isso o log registra **Provider não configurado**.

## Aba Eventos

:::step{n="1" title="Localizar o evento" img="emails-automaticos-1.png" alt="Lista de eventos de e-mail com nome do evento, módulo, interruptor de ativação e ações de editar e visualizar"}
Os eventos estão agrupados por módulo (Comercial, Compras, Engenharia, Logística, Pós-vendas). Use o filtro por `event_key` para achar rápido pelo nome técnico do gatilho.
:::

:::step{n="2" title="Ligar ou desligar o disparo" img="emails-automaticos-1.png" alt="Interruptor de ativação de um evento de e-mail em destaque na linha da lista"}
O interruptor da linha ativa ou desativa o envio daquele evento. Desligado, o sistema continua registrando a ocorrência no log com o status **Ignorado (desativado)** — útil para auditar sem incomodar o cliente.
:::

:::step{n="3" title="Editar assunto e corpo" img="emails-automaticos-1.png" alt="Editor de template de e-mail com campos de assunto e corpo e a lista de variáveis disponíveis ao lado"}
Clique em **Editar**. O editor mostra as **variáveis disponíveis** para aquele evento — insira-as no assunto ou no corpo com chaves duplas. Um prefixo padrão de assunto pode ser aplicado a todos os e-mails do sistema.
:::

:::step{n="4" title="Definir destinatários" img="emails-automaticos-1.png" alt="Painel de destinatários com seleção entre To, Cc e a opção nenhum para cada papel ou e-mail"}
Em **Destinatários**, escolha para cada papel/endereço se ele entra como **To**, **Cc** ou **—** (não recebe). Salve para valer imediatamente nos próximos disparos.
:::

:::step{n="5" title="Pré-visualizar" img="emails-automaticos-1.png" alt="Modal de prévia do e-mail renderizado com dados de exemplo"}
O botão de **Prévia** renderiza o e-mail com dados de exemplo, no mesmo layout que o cliente recebe — confira quebras de linha, logotipo e links antes de ativar.
:::

## Aba Log de envio

Cada linha mostra evento, destinatário, data e status:

| Status | Significado |
|---|---|
| **Enviado** | Entregue ao provedor com sucesso |
| **Falhou** | O provedor recusou — veja o detalhe do erro na linha |
| **Ignorado (desativado)** | O evento está com o interruptor desligado |
| **Ignorado (sem destinatários)** | Nenhum papel/endereço marcado como To |
| **Ignorado (variáveis obrigatórias)** | Alguma variável obrigatória veio vazia |
| **Provider não configurado** | Falta a configuração de envio no ambiente |

Clicar na linha abre o detalhe com as variáveis usadas e o snapshot do template no momento do envio, além de um atalho para o template atual daquele evento.

:::atencao
Alterar um template não reenvia nada. Para reprocessar, é preciso repetir a ação que dispara o evento (por exemplo, reemitir a OC).
:::

:::dica
Antes de ativar um evento novo para clientes, ligue-o só com destinatários internos em Cc por alguns dias e acompanhe o log.
:::

## Ver também

- [Configurações gerais](/ajuda/documentacao/admin/configuracoes)
- [SLA de chamados](/ajuda/documentacao/admin/sla-chamados)
- [Auditoria](/ajuda/documentacao/admin/auditoria)

<!-- SHOTS:AUTO -->

## Imagens da tela

:::step{n="1" title="Acesso restrito" img="emails-automaticos-1.png" alt="Acesso restrito"}
Acesso restrito
:::

<!-- /SHOTS:AUTO -->
