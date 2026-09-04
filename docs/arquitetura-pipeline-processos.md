# Arquitetura: Pipeline Comercial e Processos

## Visão Geral

O sistema SLTK adota umaus fluxo de trabalho em duas camadas para a gestão comercial e operacional:

1. **Pipeline Comercial** (`oportunidades`) — representa o que *pode* virar uma venda.
2. **Processos** (`processos`) — representa o que *já* virou trabalho.

A oportunidade nunca "morre" quando ganha: ela se torna o **DNA comercial** do processo resultante, mantendo seu histórico, valor, e origem vinculados ao projeto/ atendimento/ instalação.

---

## Pipeline Comercial (`oportunidades`)

### Estágios do Pipeline

| Estágio | Descrição |
|---------|-----------|
| `novo` | Lead recém-cadastrado |
| `qualificado` | Perfil validado, interesse confirmado |
| `proposta` | Proposta enviada ao cliente |
| `negociacao` | Em negociação de termos e preço |
| `ganho` | Fechado — convertido em processo |
| `perdido` | Fechado perdido (com motivo obrigatório) |

### Campos e Relacionamentos

- `cliente_id` — opcional. Uma oportunidade pode existir como *lead solto* (`empresa_lead`) antes de ter cliente vinculado.
- `lifecycle_stage` — derivado via função `derive_lifecycle()` no banco. Alimenta o lifecycle do cliente.
- `pipeline_stage` — estágio atual no funil.
- `processo_id` — preenchido após conversão para processo. Mantém o link permanente.

### Triggers no Banco

| Trigger | Função |
|---------|--------|
| `tg_oportunidades_before_update` | Rastreamento de mudança de estágio |
| `tg_oportunidades_after_update` | Grava histórico de alterações |
| `tg_oportunidades_refresh_cliente` | Atualiza KPIs do cliente em tempo real |

---

## Conversão: Oportunidade → Processo

### Fluxo de Conversão

Quando o vendedor marca uma oportunidade como **ganho**, um modal de conversão é exibido (`convertOportunidadesToCliente`).

1. Lista **todas as oportunidades ativas** do mesmo `cliente_id` ou `empresa_lead`.
2. Oferece ações para cada oportunidade:
   - **Win** — cria o `processos`, marca a opp como `ganho`, vincula `processo_id`.
   - **Keep** — mantém a opp aberta (não converte agora).
   - **Lose** — marca como `perdido` (exige `lost_reason` com ≥ 10 caracteres).

### Templates de Processo

Opcionalmente, a conversão pode aplicar um **template pré-configurado**:

- `processo_templates` — modelo de processo (tipo, pilar, fluxo).
- `processo_template_tarefas` — tarefas com datas relativas (ex: "+3 dias da conversão").
- `processo_template_eventos` — eventos/agendamentos com datas relativas.

Isso permite que um processo recém-criado já tenha checklist, tarefas e compromissos pré-populados.

---

## Processos (`processos`)

### Tipos de Processo

| Tipo | Descrição | Pipeline Típico |
|------|-----------|-----------------|
| `projeto` | Máquina, projeto longo, engenharia | Design → Fabricação → Montagem → FAT → Envio |
| `atendimento` | Chamado, RNC, suporte técnico | Recepção → Diagnóstico → Execução → Validação |
| `instalacao` | Startup, comissionamento em campo | Planejamento → Logística → Montagem → Teste → Sign-off |

### Pipeline por Tipo (`PIPELINE_BY_TIPO`)

Cada tipo define seu próprio fluxo de estágios. A estrutura é parametrizável no código.

### Campos Principais

- `tipo` — `projeto`, `atendimento`, `instalacao`
- `pilar_id` — classificação estratégica (ex: Novos Negócios, Pós-venda)
- `progresso` — percentual de avanço (0–100)
- `risco` — `baixo`, `medio`, `alto`
- `valor` — valor do projeto/contrato
- `previsao` — data prevista de conclusão
- `lost_at` — preenchido se o processo for perdido (soft delete lógico)
- `processo_id` — vinculado à oportunidade de origem

### Relacionamentos Filhos

Um processo agrega múltiplas entidades:

- **Tarefas** (`processo_tarefas`) — checklist de execução
- **Eventos** (`processo_eventos`) — compromissos, reuniões, milestones
- **Anexos** (`processo_anexos`) — documentos vinculados (soft delete)
- **Checklists** (`processo_checklists`) — listas de verificação por etapa
- **Emails** (`processo_emails`) — comunicações registradas
- **Notificações** (`processo_notificacoes`) — alertas de prazo e mudança

### Triggers no Banco

| Trigger | Função |
|---------|--------|
| `tg_processos_block_when_lost` | Bloqueia alterações em processos perdidos |
| `tg_processos_audit` | Grava diff de alterações na `audit_log` |
| `tg_processos_refresh_cliente` | Atualiza KPIs do cliente em tempo real |

---

## Ficha 360º do Cliente

As abas **Oportunidades** e **Processos** na ficha do cliente filtram por `cliente_id`:

### Aba Oportunidades

Lista todas as `oportunidades` vinculadas ao cliente.

**KPIs exibidos:**
- Total de oportunidades
- Valor total em pipeline
- Valor ponderado de abertas
- Taxa de conversão (win rate)
- Ticket médio

### Aba Processos

Lista todos os `processos` vinculados ao cliente.

**KPIs exibidos:**
- Processos ativos
- Valor em processos ativos
- Progresso médio
- Processos em risco alto

---

## Logística & Embarque (extensão de Processo)

Embarque é uma etapa terminal de execução — vive **fora** de `processos`, mas referencia itens/projetos liberados pela engenharia/produção.

### Entidades

| Tabela | Papel |
|--------|-------|
| `logistica_embarques` | Cabeçalho: cliente, transportadora, previsão de saída, status, volumes/peso totais |
| `logistica_embarque_itens` | Itens do embarque (descrição, quantidade, peso, volume, referência opcional a processo/OC) |
| `logistica_embarque_anexos` | Arquivos vinculados. Categoria `geral` (documentos) e `status` (evidências de transição) |
| `logistica_embarque_status_log` | Trilha imutável: `from → to`, autor, data, notas, `anexo_ids[]` |

### Máquina de estados

```text
rascunho → programado → embarcado → entregue
                 ↘         ↘          ↘
                    cancelado (qualquer origem)
```

Transições críticas (`embarcado`, `entregue`, `cancelado`) exigem `notas` com ≥ 5 caracteres — validado no frontend e reforçado no `setStatus` server-side. Cada transição grava uma linha em `logistica_embarque_status_log` — nunca sobrescreve status sem log.

### Exportações

- **Romaneio (PDF, A4)** — `generateRomaneioPdf`: cabeçalho, cliente/transporte, itens com totais, trilha, assinaturas. Anexos selecionados: imagens embutidas como páginas; demais entram como lista de referência.
- **Trilha de auditoria** — CSV (BOM UTF-8, Excel-friendly) ou PDF tabular.

### Princípios adicionais

6. **Trilha imutável** — status de embarque só muda via `setStatus`, que sempre insere no log. UI nunca faz `UPDATE` direto em `status`.
7. **Motivo obrigatório em transições críticas** — segurança de rastreio: quem embarcou, quando e por quê ficam gravados juntos das evidências.

---

## Princípios de Design

1. **Imutabilidade Comercial** — a oportunidade nunca é deletada ou esquecida ao converter. Ela persiste como `ganho` com `processo_id`, servindo como registro auditável da origem comercial.
2. **Separação de Domínios** — Pipeline = *prospecção/venda*; Processo = *execução/entrega*. Não confundir os dois.
3. **Soft Delete Universal** — nenhuma tabela usa `DELETE` físico. `deleted_at` marca registros inativos, filtrados por RLS.
4. **RLS por Papel** — toda consulta e mutação é validada no servidor via `auth.uid()` + `has_role()`. O frontend apenas oculta elementos, nunca autoriza.
5. **Auditoria Total** — toda mutação grava em `audit_log` com quem, quando, e diff por campo.
