---
title: Logística — visão geral
description: Como o módulo de Embarques organiza transporte, documentação e status até a entrega ao cliente.
category: logistica
slug: visao-geral
tipo: conceito
nivel: iniciante
tags: [logistica, embarques, entrega, status]
papeis: [admin, manager, purchasing, production, field, logistics]
atualizado_em: 2026-08-20
app_version: "0.99.4"
---

:::tldr
- Menu **LOGÍSTICA → Embarques** (`/logistica/embarques`) reúne todos os transportes vigentes e concluídos.
- Um **embarque** cobre o trecho fábrica → cliente (ou fornecedor → fábrica em importações).
- Cada embarque tem **status, transportadora, incoterm, prazo, valor declarado, seguro** e anexos (nota, romaneio, packing list, BL/AWB).
- Alertas de prazo destacam embarques atrasados em vermelho no painel.
- Toda mudança de status vai para o **status log** com autor, timestamp e anexo opcional.
:::

## Estrutura do módulo

| Rota | O que faz |
|---|---|
| `/logistica/embarques` | Painel com filtros por status, cliente, modalidade |
| `/logistica/embarques/novo` | Formulário de criação (ver [Criar embarque](/ajuda/documentacao/logistica/criar-embarque)) |
| `/logistica/embarques/$id` | Detalhe do embarque, timeline e anexos |

## Ciclo de vida do embarque

:::step{n="1" title="Preparação"}
Após a **liberação do FAT** ou **conclusão da OC** (em importações), Logística cria o embarque com dados do projeto/OC-origem. Status inicial: **Preparação**.
:::

:::step{n="2" title="Aguardando coleta"}
Transportadora agendada, romaneio emitido e assinado. Aguarda coleta física.
:::

:::step{n="3" title="Em trânsito"}
Coleta realizada. Anexe **nota fiscal**, **conhecimento de transporte (CT-e)** ou **BL/AWB** em importação. O prazo estimado começa a contar.
:::

:::step{n="4" title="Entregue"}
Comprovante de entrega anexado (canhoto, POD, e-mail do recebedor). Fecha o ciclo. Notifica Comercial e Pós-venda.
:::

:::step{n="5" title="Devolvido / Sinistrado"}
Em caso de recusa, avaria ou perda, mude para **Sinistrado** e anexe laudo/foto. Aciona seguro conforme apólice.
:::

## Papéis e responsabilidades

| Papel | Pode |
|---|---|
| `logistics` / `manager` / `admin` | Criar, editar, mudar status, anexar |
| `production` | Ver embarques do próprio projeto |
| `purchasing` | Ver embarques de importações (fornecedor → fábrica) |
| `sales` | Ver status dos embarques dos seus clientes |
| `field` | Ver embarques para revisar recebimento em campo (SAT/FAT no cliente) |

## Integração com outros módulos

- **Qualidade** libera o FAT → embarque nasce em **Preparação**.
- **Compras** conclui a OC de importação → cria embarque **fornecedor → fábrica**.
- **Documentos** (`/central-documentos`) puxa NF, romaneio, packing list.
- **Pós-venda** consulta embarque para agendar SAT de start-up assim que **Entregue**.

:::dica
Filtre por **atrasados** (SLA vermelho) na home do painel — é o primeiro lugar a olhar todo dia para não deixar prazo estourar sem justificativa.
:::

:::atencao
Nunca marque **Entregue** sem POD ou canhoto anexado. Se o cliente contestar depois, a única prova é o anexo — o log de status por si só não basta.
:::

## Ver também

- [Criar embarque](/ajuda/documentacao/logistica/criar-embarque)
- [Acompanhar status](/ajuda/documentacao/logistica/acompanhar-status)

<!-- SHOTS:AUTO -->

## Imagens da tela

:::step{n="1" title="Logística & Embarque" img="visao-geral-1.png" alt="Logística & Embarque"}
Logística & Embarque
:::

<!-- /SHOTS:AUTO -->
