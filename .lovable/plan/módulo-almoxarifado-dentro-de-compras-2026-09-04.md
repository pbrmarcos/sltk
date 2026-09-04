# Módulo Almoxarifado (dentro de Compras)

Objetivo: cadastrar e consultar itens em estoque, com reserva por projeto, para que a Engenharia veja de dentro do projeto o que já existe, o que está reservado e o que precisa comprar.

## Decisões já definidas com você

- Um almoxarifado com endereçamento interno (rua/prateleira) — saldo por item × localização.
- Reserva/empenho por projeto, com baixa somente na retirada.
- Entrada nasce do recebimento da Ordem de Compra existente (`OC-NNNNN`), total ou parcial.
- Valorização por custo médio ponderado; movimentação restrita a Compras/Produção.

## 1. Integração com o que já existe (sem estrutura paralela)

- O almoxarifado entra como submódulo do módulo `compras` já registrado (`/compras/almoxarifado/*`), aproveitando a sidebar, o `ModuleGuard` e o padrão RLS `can_access_module`. Não será criado um novo `app_module`.
- Ordem de compra continua sendo a origem do material: hoje `ordens_compra` já tem os status `recebida_parcial` e `recebida`, e `ordem_compra_itens` já tem `quantidade`, `unidade` e `insumo_id` — mas **não existe quantidade recebida por item**. Será adicionada, e o recebimento por item passa a ser o gatilho da entrada em estoque, mantendo a numeração e o fluxo de aprovação atuais intactos.
- OC do tipo `terceiros` (pass-through) por padrão **não** gera entrada em estoque — o material não passa pelo almoxarifado. Fica como opção marcável no recebimento.
- `projeto_insumos` já tem `qtd_estoque` como número digitado à mão. Ele passa a ser alimentado pelo saldo real (reservado/disponível), eliminando o dado manual divergente.

## 2. Modelagem

Fonte de verdade são **movimentações imutáveis**; saldo é sempre derivado.

- `almox_unidades` — unidades de medida (código, descrição, casas decimais). Reaproveita os valores de unidade já usados em `ordem_compra_itens`/`projeto_insumos`.
- `almox_itens` — SKU: código interno sequencial (`ALM-NNNNN`, mesmo padrão atômico do `OC-NNNNN`), descrição, unidade, categoria, estoque mínimo, ativo, ligação opcional ao fornecedor preferencial e ao código do fabricante.
- `almox_locais` — endereços do almoxarifado (rua/prateleira/posição), com um local padrão.
- `almox_movimentos` — append-only, sem UPDATE/DELETE: item, local, tipo (`entrada_oc`, `entrada_avulsa`, `saida_projeto`, `devolucao`, `transferencia`, `ajuste`), quantidade sinalizada, custo unitário, origem (`ordem_compra_item_id`, `projeto_id`, `reserva_id`), autor, data, observação. Correção se faz com movimento de estorno, nunca editando.
- `almox_reservas` — empenho por projeto: item, projeto, quantidade reservada, quantidade já retirada, status (`ativa`, `atendida`, `cancelada`).
- **Saldos derivados** por view materializada leve / view SQL:
  - `almox_saldo_item_local` — soma dos movimentos por item × local;
  - `almox_saldo_item` — total, reservado (reservas ativas), disponível = total − reservado, custo médio ponderado acumulado.
- Custo médio: recalculado a cada entrada (média ponderada valor/quantidade), gravado no movimento para que o histórico seja auditável.

## 3. Vínculo com projeto / oportunidade

- A reserva é a ponte: `almox_reservas.projeto_id` aponta para `equipamento_projetos`, o mesmo projeto que a Engenharia já usa em `projeto_insumos`.
- No painel de insumos do projeto, cada linha passa a mostrar: quantidade necessária, disponível no almoxarifado, já reservado para este projeto e saldo a comprar. Botão "Reservar do estoque" cria a reserva sem sair da tela.
- A baixa acontece na retirada (Produção/Montagem informa projeto + quantidade), consumindo a reserva.
- Se o projeto está ligado a uma oportunidade, a consulta é feita através do projeto — não haverá coluna de oportunidade duplicada.

## 4. Permissões (8 papéis existentes)

| Ação | Papéis |
| --- | --- |
| Cadastrar/editar item, unidade, local | `admin`, `manager`, `purchasing` |
| Lançar entrada (recebimento de OC / avulsa) | `admin`, `purchasing` |
| Lançar saída, devolução, transferência | `admin`, `purchasing`, `production` |
| Ajuste de inventário | `admin`, `manager` |
| Criar/cancelar reserva para projeto | `admin`, `manager`, `engineer`, `purchasing` |
| Somente consulta (saldo, histórico, custo) | todos com módulo `compras` ou `engenharia` |

RLS: leitura para quem tem `compras` ou `engenharia` via `can_access_module`; escrita com `has_role` conforme a tabela. `almox_movimentos` sem policy de UPDATE/DELETE para ninguém — imutável por construção. Todas as tabelas com GRANT explícito e triggers de auditoria usando `audit_actor()`, como no restante do sistema.

## 5. Telas e mínimo viável

Primeira entrega (MVP):
1. `/compras/almoxarifado` — lista de itens com busca, saldo total, reservado, disponível e alerta de estoque mínimo.
2. `/compras/almoxarifado/$id` — ficha do item: saldo por endereço, custo médio, histórico de movimentos, reservas ativas.
3. Diálogo de cadastro/edição de item (reaproveita o padrão de formulário com rascunho já existente).
4. Recebimento na tela da OC: informar quantidade recebida por item + endereço de destino → gera entrada.
5. Diálogo de saída/retirada com projeto obrigatório.
6. No painel de insumos do projeto: colunas de disponível/reservado + botão de reserva.

Fases seguintes: transferência entre endereços, inventário cíclico com ajuste, relatório de giro/curva ABC, exportação Excel, etiquetas/QR de endereço.

## 6. Fases e esforço

| Fase | Escopo | Esforço |
| --- | --- | --- |
| 1 | Migração: tabelas, views de saldo, sequência `ALM-NNNNN`, RLS/GRANT, auditoria, seed de unidades e local padrão | médio |
| 2 | Server functions de item/local/unidade + telas 1–3 (cadastro e consulta) | médio |
| 3 | Recebimento por item na OC (coluna de quantidade recebida) → entrada e custo médio | médio |
| 4 | Reservas + integração no painel de insumos do projeto (tela 6) | médio |
| 5 | Saídas, devoluções e consumo de reserva (tela 5) | pequeno |
| 6 | Documentação, FAQ, changelog e testes (unitário de saldo/custo médio + E2E de recebimento→reserva→baixa) | pequeno |

## Riscos

- `projeto_insumos.qtd_estoque` hoje é manual; ao passar a derivar do almoxarifado, números atuais podem mudar. Plano: manter a coluna como fallback informativo por um ciclo, exibindo as duas origens até a base estar populada.
- Recebimento parcial repetido precisa ser idempotente (mesmo padrão de chave de idempotência já usado nas oportunidades) para não duplicar entrada em duplo clique.
- Custo médio depende de a OC ter preço unitário confiável; entradas avulsas sem custo entram com custo médio vigente.

---

# Rodada 2 — decisões de schema (respostas aos 6 pontos)

## 1. Relação com os insumos existentes — verificado no banco

Fato confirmado: **não existe catálogo global de insumos**. Todos os FKs `insumo_id` (em `ordem_compra_itens`, `cotacao_itens`, `insumo_anexos`, `insumo_rfq_envios` etc.) apontam para `projeto_insumos`, que é uma tabela de **linhas de BOM por projeto** — cada linha tem `projeto_id NOT NULL`, `descricao`, `unidade`, `quantidade`, `codigo_interno` e `part_number` livres, digitados/importados por planilha. O mesmo parafuso em dois projetos são duas linhas distintas, sem chave comum.

Opções:

**A) `almox_itens` como catálogo mestre novo, e `projeto_insumos.almox_item_id` opcional apontando para ele.**
- Prós: `projeto_insumos` continua sendo o que é (necessidade de um projeto, com quantidade e criticidade próprias) e o almoxarifado passa a ser o catálogo único da peça física. Não há duplicação conceitual: um é "o que o projeto precisa", o outro é "o que a empresa tem". Adoção incremental — linhas antigas ficam sem vínculo e vão sendo casadas conforme o uso.
- Contras: exige o passo de "vincular ao item do almoxarifado" no fluxo de insumo, e enquanto não vinculado não há saldo visível para aquela linha.

**B) Transformar `projeto_insumos` no próprio item de almoxarifado.**
- Prós: um único lugar.
- Contras: inviável na prática — a tabela é por projeto (`projeto_id NOT NULL`), tem status de compra por linha, e o estoque é justamente o que não pertence a projeto nenhum. Seria preciso deduplicar milhares de linhas retroativamente e reescrever todo o fluxo de BOM/cotação/OC.

**Recomendação: opção A.** Ela evita o de-para paralelo que você quer impedir (o vínculo é uma FK direta, não uma tabela de tradução) e mantém a distinção real entre "necessidade do projeto" e "peça em estoque". Sugestão adicional: quando uma linha de insumo for vinculada, herdar descrição/unidade do item do almoxarifado, para que a divergência de texto pare de crescer.

## 2. Custo médio — trigger no INSERT, com lock

Aceito. Retirado da view.
- `almox_movimentos` ganha `custo_unitario` e `custo_medio_apos`, ambos gravados por trigger `BEFORE INSERT`.
- **Estratégia de lock: advisory lock transacional por item** (`pg_advisory_xact_lock(hashtextextended(item_id::text, 0))`). Escolhido em vez de `SELECT ... FOR UPDATE` na linha do item porque não bloqueia edições de cadastro do item (descrição, mínimo) que nada têm a ver com custo, e libera sozinho no fim da transação.
- **Custo médio é global por item**, não por local — como você recomendou. Endereço é onde a peça está, não o que ela vale.
- Custo médio atual = `custo_medio_apos` do último movimento do item (índice `(item_id, created_at desc, id desc)`).
- **Devolução volta pelo custo de saída**: o movimento de saída grava `custo_unitario` = custo médio vigente naquele instante; a devolução referencia o movimento de saída (`movimento_origem_id`) e entra por aquele mesmo custo, sem alterar a média. A reserva também guarda o custo de saída consumido, para estorno correto.

## 3. Saldo por view SQL comum

Aceito. `almox_saldo_item_local` e `almox_saldo_item` serão views SQL comuns sobre `almox_movimentos` + `almox_reservas`. Nada de materialized view. Se a performance apertar, a evolução prevista é tabela de resumo mantida por trigger, com os movimentos continuando como fonte de verdade.

## 4. Recebimento sem coluna mutável

Aceito. `ordem_compra_itens` **não** ganha coluna de quantidade recebida.
- Quantidade recebida = `SUM(quantidade)` dos movimentos `entrada_oc` com aquele `ordem_compra_item_id`, exposta pela view `almox_recebimento_oc_item` (e agregada em `almox_recebimento_oc` para a listagem de OCs).
- Cada recebimento é um **evento**: tabela `almox_recebimentos` (id, ordem_compra_id, recebido_por, recebido_em, nota_fiscal, `evento_key` texto). Constraint `UNIQUE (ordem_compra_id, evento_key)` — o cliente gera o `evento_key` uma vez ao abrir o diálogo, então duplo clique, retry de rede e reenvio caem na mesma linha e o servidor devolve o recebimento já existente. Os movimentos gerados apontam para `recebimento_id`.
- O status da OC (`recebida_parcial` / `recebida`) passa a ser derivado da comparação entre recebido e pedido, atualizado ao final de cada evento.

## 5. Unidade de medida

**Recomendação: (b) fator de conversão no item**, mas em forma mínima.
Motivo: (a) é inviável hoje. A unidade em `ordem_compra_itens.unidade` e `projeto_insumos.unidade` é **texto livre** (a UI sugere UN, PC, M, KG…, mas nada valida). Bloquear o recebimento quando a unidade diverge travaria recebimentos legítimos por diferença de digitação ("PC" vs "pç"), e é justamente o caso "caixa com 50" que você citou.

Forma mínima proposta:
- `almox_itens.unidade_estoque` é a unidade canônica (obrigatória, escolhida de lista fechada).
- `almox_itens_conversao` (item, unidade_compra, fator) — opcional, só para itens que realmente compram em embalagem.
- No recebimento: se a unidade da OC == unidade de estoque → fator 1. Se houver conversão cadastrada → aplica. Se divergir e não houver conversão → o diálogo **bloqueia** e pede que o usuário informe o fator ali mesmo, gravando-o no item para as próximas vezes. O fator aplicado fica gravado no movimento.

## 6. Saldo negativo, reserva e endereço

- **Reserva**: função `almox_reservar(item, projeto, qtd)` em `SECURITY DEFINER`, com advisory lock no item, que recalcula disponível = total − reservado dentro da transação e rejeita o excedente. A interface só reflete o erro; a regra vive no banco. Mesma checagem em trigger `BEFORE INSERT/UPDATE` de `almox_reservas` como rede de segurança.
- **Saída**: trigger de validação impede saldo negativo em item × local. Exceção única: movimento com `permite_negativo = true`, aceito só quando o autor tem papel `admin` e `justificativa` está preenchida — ambos verificados no banco, e a justificativa fica no movimento (imutável).
- **Ciclo de vida da reserva**:
  - reserva tem `status` (`ativa`, `atendida`, `cancelada`, `liberada_auto`) e `expira_em` (padrão 90 dias, editável);
  - trigger no `equipamento_projetos`: ao entrar em status cancelado/concluído, todas as reservas ativas do projeto passam a `liberada_auto`, com evento registrado;
  - relatório "Reservas sem movimento" (>30 dias sem retirada, ou vencidas), com ação de liberar em lote — na tela do almoxarifado e como pendência no dashboard de Compras.
- **Endereço na retirada**: a reserva é global por item (não trava endereço). Na retirada, o diálogo sugere o endereço com maior saldo do item e lista os demais com saldo; o usuário confirma ou troca. Se o saldo do endereço escolhido não cobrir, a retirada pode ser dividida em mais de um movimento na mesma operação. O endereço fica gravado em cada movimento.

## Próximo passo

Com o aceite dos seis pontos, a Fase 1 começa com o schema já nesse formato: `almox_itens` (catálogo mestre) + `almox_item_id` opcional em `projeto_insumos`, movimentos imutáveis com custo por trigger e lock, views SQL comuns, `almox_recebimentos` com chave de evento, conversão de unidade mínima e as travas de reserva/saldo no banco.

---

# Rodada 3 — ajustes finais aceitos (schema da Fase 1)

## 1. Ordenação dos movimentos — PK é UUID, então entra `seq`
Verificado: todas as tabelas do sistema usam `id uuid primary key default gen_random_uuid()`; não há PK serial em lugar nenhum. Portanto `almox_movimentos` ganha `seq bigserial not null unique`, usado **exclusivamente** para ordenação. Índice `(item_id, seq desc)` e a leitura do custo vigente passa a ser `order by seq desc limit 1`. `created_at` fica só como informação.

## 2. Saída respeita reserva de terceiros
A validação de saída passa a considerar, dentro do lock: `livre = total_item − reservas_ativas_de_outros_projetos`.
- Retirada para projeto **com** reserva própria: consome primeiro a reserva (até o saldo reservado), o excedente sai do livre.
- Retirada para projeto **sem** reserva: só pode consumir o livre.
- A trava de saldo negativo por item × local continua, somada a essa.

## 3. Advisory lock dentro da trigger, com namespace
`pg_advisory_xact_lock(<CLASSID_ALMOX>, hashtextextended(item_id::text, 0)::int)` adquirido na própria trigger `BEFORE INSERT` de `almox_movimentos`, com constante de namespace fixa reservada ao almoxarifado. Assim qualquer caminho de escrita (função, SQL direto, importação) fica coberto, e não há colisão com outros advisory locks.

## 4. Estorno alimenta o cálculo de recebido
Todo estorno de recebimento é um movimento `entrada_oc` com **quantidade negativa** e o **mesmo `ordem_compra_item_id`**, referenciando o movimento original. Confirmado: o recálculo de `recebida_parcial`/`recebida` roda por trigger `AFTER INSERT` em `almox_movimentos` sempre que houver `ordem_compra_item_id`, portanto vale tanto para recebimento quanto para estorno — inclusive voltando a OC de `recebida` para `recebida_parcial` ou para o status anterior quando a soma cai.

## 5. Unidade divergente no vínculo insumo → item
Ao vincular `projeto_insumos.almox_item_id`:
- unidades iguais (normalizadas, sem acento/caixa) → fator 1;
- divergentes com conversão cadastrada no item → usa o fator;
- divergentes sem conversão → o diálogo **exige o fator ali** ou o vínculo é bloqueado. Nunca se grava vínculo sem fator conhecido.
O fator fica em `projeto_insumos.almox_fator_conversao` e é aplicado na exibição do painel (necessário, disponível e reservado sempre na unidade da linha do insumo, com a unidade de estoque indicada em legenda).

## 6. Catálogo não duplica a si mesmo
- Índice único parcial sobre `part_number` normalizado (sem acento, minúsculo, sem separadores) quando preenchido, e o mesmo para `codigo_fabricante`.
- No diálogo de cadastro, busca por descrição semelhante (`pg_trgm`, já instalado no banco) exibindo os itens parecidos **antes** de permitir salvar; salvar com similaridade alta exige confirmação explícita.

## 7. Reservas vencidas saem do reservado por leitura
A view de saldo passa a contar como reservado apenas `status = 'ativa' AND (expira_em IS NULL OR expira_em > now())`. A liberação fica correta por construção, sem job. O relatório de reservas antigas vira só a ferramenta de limpeza/normalização dos registros, e o trigger de projeto cancelado/concluído continua marcando `liberada_auto` para higiene do histórico.

## 8. SECURITY DEFINER com search_path vazio
Confirmado: `almox_reservar` e todas as demais funções novas `SECURITY DEFINER` usam `SET search_path = ''` com todos os nomes totalmente qualificados (`public.almox_movimentos`, `public.has_role`, etc.), e `REVOKE ALL ... FROM PUBLIC` + `GRANT EXECUTE` apenas a `authenticated`/`service_role`, seguindo o padrão já usado em `count_active_admins`/`is_user_active`.

## Extra aceito
No painel de insumos do projeto, além de "Reservar do estoque", entra **"Criar item de almoxarifado a partir desta linha"**, herdando descrição, unidade e part_number, já vinculando a linha ao item recém-criado. Fica na Fase 4 (integração com Engenharia), junto do botão de reserva.

## Entrega da Fase 1
Migração com: `almox_itens`, `almox_itens_conversao`, `almox_locais`, `almox_movimentos` (com `seq`, custo por trigger e lock), `almox_reservas`, `almox_recebimentos`, views `almox_saldo_item_local` / `almox_saldo_item` / `almox_recebimento_oc_item` / `almox_recebimento_oc`, coluna `almox_item_id` + `almox_fator_conversao` em `projeto_insumos`, sequência `ALM-NNNNN`, GRANTs, RLS, auditoria e seeds de unidades/local padrão. Ao final: DDL completo e resultado dos testes de saldo, custo médio, concorrência, reserva e estorno — antes de qualquer trabalho da Fase 2.
