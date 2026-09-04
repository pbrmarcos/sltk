# Criar orçamento a partir da ficha do cliente

Hoje a aba **Equipamentos** do cliente só oferece "Criar de orçamento aprovado": o wizard exige um orçamento já aprovado, então quem ainda não tem proposta fechada fica travado. A ideia é inverter o fluxo: criar o orçamento ali mesmo, deixá-lo como rascunho e só depois marcá-lo como aprovado — e é a aprovação que gera o equipamento.

## O que muda para o usuário

1. Na aba Equipamentos, o botão passa a ser **"Criar orçamento"**.
2. Ele abre o fluxo de novo orçamento já com o cliente preenchido (sem tela de busca de cliente), como fizemos no caminho vindo do pipeline.
3. O orçamento nasce em **rascunho** — não aprovado. Nenhum equipamento é criado nesse momento.
4. Na ficha do cliente, uma lista "Orçamentos" mostra cada orçamento com seu status (rascunho, em revisão, aprovado…) e a ação **"Marcar como aprovado"** para quem tem permissão.
5. Ao aprovar, o comportamento atual já existente é mantido: os equipamentos do orçamento são criados automaticamente na ficha do cliente, e um aviso confirma quantos foram gerados.
6. O caminho antigo continua disponível como ação secundária "Criar equipamento de um orçamento aprovado", para quem já tem a proposta fechada.

## Detalhes técnicos

- `src/routes/_authenticated/clientes.$codigo.tsx` (aba Equipamentos): trocar o botão `Criar de orçamento aprovado` por `Criar orçamento`, navegando para `/comercial/orcamento/novo?cliente=<id>` (o wizard já aceita `prefillClienteId`). Manter o wizard atual (`CriarEquipamentoWizard`) atrás de um botão secundário.
- `OrcamentoWizard` já grava documentos com status inicial `rascunho`; nenhuma mudança de criação é necessária.
- Aprovação: reutilizar a transição existente em `src/lib/docs/docs.functions.ts` (`aprovar`: `em_revisao → aprovado`). Para permitir aprovar direto de um rascunho na ficha do cliente, incluir `rascunho` no `from` dessa transição (ou expor uma ação "enviar para revisão + aprovar" em um passo). A criação automática de `cliente_equipamentos` na aprovação já existe e é idempotente — não será duplicada.
- Lista de orçamentos do cliente: já existe a seção "Orçamentos" na Visão geral; adicionar coluna de status e o botão de aprovar, chamando a função de transição e invalidando as queries de orçamentos e equipamentos do cliente.
- Permissão: a ação de aprovar respeita o RBAC atual do módulo de documentos; sem permissão o botão aparece desabilitado com tooltip (`PermissionLinkButton`).
- Sem mudanças de schema no banco.
