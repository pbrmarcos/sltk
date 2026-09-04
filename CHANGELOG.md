## 1.1.4 — Orçamento herda a qualificação da oportunidade — 2026-09-04

- **Gerar orçamento a partir da oportunidade usa a qualificação do card**: o passo inicial do orçamento deixa de ser uma busca em branco. Se a oportunidade tem cliente vinculado, ele aparece selecionado com opção de "Trocar cliente"; se é um lead sem cliente, o cartão mostra empresa, contato, e-mail e telefone qualificados, com os caminhos "Criar cliente com estes dados" (modal já preenchido) ou "Vincular a um cliente existente".
- **Vínculo automático de volta**: o cliente escolhido ou criado é vinculado à oportunidade, que deixa de aparecer como "Lead (sem cliente)" no pipeline. Antes de criar, o sistema sugere clientes semelhantes para evitar duplicidade.
- **Modal "Nova oportunidade" reorganizado**: seções "Empresa e contato" e "Valores e probabilidade", campos alinhados em duas colunas e novo campo "Valor estimado (US$)" com máscara, também aceito na edição — a oportunidade agora guarda valores em R$ e US$.
- **Correção de tela em branco no novo orçamento**: a verificação de clientes semelhantes consultava a listagem com tamanho de página não permitido e derrubava a tela com erro de validação; corrigido para usar o tamanho padrão.

---

## 1.1.3 — Ficha do cliente: orçamento antes da aprovação — 2026-09-04

- **Cartão "Valor ganho" removido** do cabeçalho da ficha do cliente; os indicadores restantes (oportunidades abertas, processos ativos e último contato) ficam mais largos e legíveis.
- **Novo botão "Criar orçamento"** na aba Equipamentos: abre o orçamento já com o cliente preenchido, sem tela de busca. O orçamento nasce como rascunho — nenhum equipamento é criado nesse momento.
- **"Marcar como aprovado"** na lista de orçamentos da ficha do cliente: rascunhos, emitidos e em revisão podem ser aprovados em um clique (por manager ou admin), e é a aprovação que gera automaticamente os equipamentos do cliente.
- O caminho antigo continua disponível como ação secundária "De orçamento aprovado".

---

## 1.1.2 — Almoxarifado: documentação e testes (Fase 6) — 2026-09-04

- **Novo artigo "Almoxarifado — estoque, reserva e custo médio"** em Ajuda → Documentação → Compras: conceitos, cadastro de item, entrada por OC, retirada/devolução/ajuste, reserva por projeto, fórmula do custo médio e tabela de permissões.
- **Botão "Ajuda desta tela"** passa a funcionar nas telas de almoxarifado (estoque, ordens de compra e ficha do item).
- **Quatro novas perguntas no FAQ**: saldo divergente (ajuste x estorno), peça com saldo que não pode ser retirada (reserva de terceiros), unidade da OC diferente da unidade de estoque (fator de conversão) e como o custo médio é calculado.
- **Testes automatizados**: 21 testes unitários de saldo, custo médio ponderado, estorno, devolução, reservas vencidas, disponível por projeto e conversão de unidade; e roteiro E2E do ciclo recebimento → reserva → baixa.

---

## 1.1.1 — Almoxarifado ligado à Engenharia (Fase 3) — 2026-09-04

- **Coluna "Almoxarifado" nos insumos do projeto**: cada linha mostra o item de estoque vinculado, o saldo realmente disponível (verde quando cobre a necessidade, âmbar quando não cobre) e o quanto já está reservado para aquele projeto, com link direto para a ficha do item.
- **Vincular insumo a item do catálogo**: busca por código ou descrição; quando a unidade do insumo é diferente da unidade de estoque, o sistema exige o fator de conversão e passa a converter o saldo exibido — nada de comparar quantidades em unidades diferentes em silêncio.
- **"Criar item de almoxarifado a partir desta linha"**: cria o item herdando descrição, unidade, part number, fabricante e categoria, e já deixa o vínculo pronto. Antes de criar, mostra itens parecidos do catálogo e exige confirmação, evitando cadastro duplicado da mesma peça.
- **Reservar e cancelar reserva direto da tela de insumos**, na unidade da linha, respeitando o disponível (reserva de outro projeto nunca é consumida).
- **Nova tela "Ordens de compra — saldo e movimentos" (Compras → Almoxarifado → Ordens de compra)**: lista das OCs com barra de progresso do recebido, quantidade que falta receber e indicadores de ordens em aberto, totalmente recebidas e quantidade pendente.
- **Detalhe por item da OC**: pedido, recebido, falta receber, custo médio do item vinculado, último custo de entrada e saldo em estoque (total e livre), com link para a ficha do item.
- **Movimentos da ordem em tempo real**: cada entrada, estorno ou ajuste ligado às linhas da OC aparece com data, tipo, quantidade, custo unitário, custo médio após o lançamento, local e responsável — a tela se atualiza sozinha via Realtime quando alguém registra um recebimento.
- Ajustes de saldo, entrada avulsa, retirada e ajuste de inventário exigindo justificativa continuam concentrados na ficha do item em Compras → Almoxarifado.

---

## 1.1.0 — Almoxarifado dentro de Compras (Fase 1 + Fase 2) — 2026-09-03

### Base de dados (Fase 1)
- **Catálogo único de itens** (`almox_itens`) com código automático `ALM-#####`, unicidade de part number e de código do fabricante ignorando acentos e maiúsculas, e busca por descrição semelhante (índice trigram) para evitar cadastro duplicado da mesma peça.
- **Movimentos imutáveis** (`almox_movimentos`, append-only, com `seq` para ordenação determinística): entrada por OC, entrada avulsa, saída para projeto, devolução, transferência e ajuste. Saldo e **custo médio ponderado** são derivados dos movimentos, calculados dentro da própria trigger com lock por item — nenhuma via de escrita fica de fora.
- **Reserva por projeto** (`almox_reservas`) com liberação por leitura: reserva vencida deixa de bloquear na hora, sem depender de rotina agendada; projeto encerrado libera o empenho automaticamente.
- **Trava de saída pelo disponível**: retirada nunca consome material empenhado para outro projeto; ajuste negativo exige justificativa.
- **Recebimento derivado**: quantidade recebida da OC vem da soma dos movimentos de entrada, e o estorno (quantidade negativa no mesmo item da OC) recalcula sozinho o status `recebida_parcial`/`recebida`.
- Unidades e locais padrão criados; auditoria e RLS por módulo (Compras e Engenharia leem, Compras escreve) e funções `SECURITY DEFINER` com `search_path` fixo.

### Telas (Fase 2)
- **Compras → Almoxarifado**: painel de estoque com itens ativos, itens com saldo, itens abaixo do mínimo e valor total imobilizado; busca por código/descrição e filtros de saldo e de mínimo.
- **Cadastro de item** com aviso bloqueante de itens semelhantes antes de salvar e mensagens claras para part number/código de fabricante repetidos.
- **Recebimento por ordem de compra**: seleção da OC pendente, linha a linha com pedido, recebido e pendente, vínculo ao item do almoxarifado, quantidade e custo; o evento é idempotente — reenviar o mesmo recebimento não duplica estoque.
- **Ficha do item**: total, reservado, disponível e custo médio; abas de movimentos (com usuário, projeto e custo médio após cada lançamento), saldo por local e reservas, com ações de entrada, retirada, ajuste, reserva e cancelamento de reserva.

---

## 1.0.5 — Origem do lead gerenciável e cadastro rápido de cliente — 2026-09-03

### Origem do lead (lead_origens)
- **Tabela própria** (`lead_origens` com `nome`, `ativo`, `ordem`) populada com as 11 origens padrão (Campanha Google ADS, Feiras, Indicações, Site Institucional, Minerações Penta/Apollo/API PAÍS, Pesquisas Comerciais, Representante) e com as antigas origens "DEMO" removidas.
- **Criação inline**: o combobox de origem aceita digitar um nome novo e criar sem sair da tela, já selecionando o registro; unicidade ignorando maiúsculas e acentos.
- **Gestão administrativa** em Configurações → Comercial: renomear, reordenar, ativar/desativar — nunca excluir, preservando históricos.
- **Duplo fluxo de cadastro**: cliente avulso direto da listagem (já nasce com o status escolhido, sem oportunidade vinculada) mantendo o caminho pelo funil.
- **"+ Novo cliente" no orçamento**: modal com os campos mínimos, reutilizando o mesmo `ClienteForm`; ao salvar o cliente é inserido no cache e selecionado automaticamente — o orçamento em preenchimento nunca é perdido.

---

## 1.0.4 — Status do cliente unificado e estágio do funil destravado — 2026-09-01

### Status do cliente (fonte única)
- **Causa identificada**: `clientes.status` (manual) e `clientes.lifecycle_stage` (derivado) eram dois campos independentes renderizados lado a lado — origem das tags conflitantes "Cliente ativo" + "Prospect".
- **Status canônico** `ativo | suspect | prospect | inativo` com `ClienteStatusBadge` único (pt-BR/es); `lifecycle_stage` vira espelho legado via trigger. Migração converteu os registros existentes e aplicou constraint.
- **UI diferenciada**: quando estágio do funil aparece junto, cada badge é rotulado claramente (status do cliente × estágio).

### Pipeline
- **Estágio destravado**: o `<Select>` do card da oportunidade tinha `disabled` fixo; agora só trava quando convertida/perdida ou durante a mutation, com rollback em erro. "Perdido" exige o fluxo com motivo, com explicação na opção desabilitada.
- **Botão "Cadastrar novo cliente"** do estado vazio da listagem corrigido (estava inerte); atalho da sidebar agora fica desabilitado com tooltip quando o usuário não tem permissão.

---

## 1.0.3 — Moeda ISO, RUC equatoriano e anti-duplicidade — 2026-08-31

### Moeda do orçamento
- **BRL fixo removido**: a moeda vem do cadastro do cliente, editável no orçamento, via `Select` ISO 4217 (USD, EUR, BRL, PYG) com código + nome + símbolo; persiste sempre o código ISO.
- **Formatação com `Intl.NumberFormat`** respeitando casas decimais (PYG sem centavos) e PDF refletindo a moeda em todos os valores e condições. Backfill: registros existentes preenchidos com BRL.

### Documentos fiscais (17 países)
- **Módulo centralizado** `documentos-fiscais` com um validador por país, normalização da entrada e mensagens específicas (quantidade de dígitos, dígito verificador, província inexistente).
- **RUC Equador corrigido** (pessoa natural módulo 10, sociedade privada e setor público módulo 11; `0990637679001` valida); **CNPJ alfanumérico** aceito; país sem validador nunca bloqueia o cadastro — 42 testes unitários.

### Oportunidades sem duplicata
- Investigação do par `OPP-2026-0008/0009` (mesmo conteúdo, códigos distintos, ~15 min de intervalo — não foi duplo submit).
- **Idempotência** (`idempotency_key` único), aviso de possível duplicata em 24h pedindo confirmação, botão desabilitado durante a mutation e script de auditoria somente-leitura.

---

## 1.0.2 — Conversão lead → cliente e erros de validação sem perda de dados — 2026-08-27

### Conversão do pipeline
- **Mapeamento completo** empresa/nome/e-mail/telefone na conversão; resumo editável dos dados transferidos com obrigatórios faltantes destacados antes de confirmar.
- Erros apontam o campo exato com foco, sem limpar o formulário; rótulos por país (Razão Social / Razón Social) em coluna única no banco.

### Formulários nunca perdem dados no erro
- `ClienteForm` não apaga mais campos enriquecidos antes da consulta fiscal; `ConfiguracoesTab` só reseta quando o formulário está limpo.
- Erros da API mapeados por campo via `setError`, validação onBlur/revalidação onChange e rolagem+foco no primeiro erro (`src/lib/form-errors.ts`); `reset()` só após sucesso confirmado. Teste E2E cobre "submete com campo inválido e os demais permanecem".

---

## 1.0.1 — Datas padronizadas, agrupamento por continente e histórico da mineração — 2026-08-26

- **Mineração de leads**: bases agrupadas por continente › país, campos de data padronizados e busca por código (ex.: NCM 1006 na base de importações da Argentina) com colunas padrão e mapeamento dinâmico.
- **Resultados enriquecidos**: "Contraparte" e "Valor" corrigidos, exportação para Excel, usuário autor da busca visível e Histórico destacado; "Rota comercial" como tipo de consulta padrão.
- **Persistência de contexto**: filtros, resultados e aba ativa da mineração sobrevivem à troca de aba/navegação; países de origem/destino agrupados por continente.

---

## 1.0.0 — Estabilidade sistêmica: formulários nunca mais perdem dados — 2026-08-25

> **Marco 1.0.** Encerramento do ciclo beta com a correção do bug de maior impacto reportado pelos usuários.

### Causa raiz corrigida
- `use-auth`: `refetchOnWindowFocus` + `staleTime: 0` remontavam a árvore ao voltar à aba. Agora role cacheada por 10 min, `INITIAL_SESSION` hidrata sem invalidar queries, `TOKEN_REFRESHED` não recria estado (token lido via `getSession()` a cada request) e contexto memoizado.
- `ModuleGuard` nunca substitui os filhos após o primeiro render; auditados todos os ancestrais do `<Outlet />`.

### Rascunho automático sistêmico
- Hook `useFormDraft` com debounce, chave isolada por usuário/registro, restauração com aviso "Rascunho recuperado", limpeza após salvar, TTL e exclusão de campos sensíveis — aplicado nos formulários críticos; diálogos reabrem com o conteúdo preservado.
- Testes Playwright com contador de montagens, `visibilitychange` e segunda aba.

---

## 0.99.7 — Painéis com dados reais e limpeza do conteúdo de demonstração — 2026-08-20

### Painéis por papel
- Dashboards de Comercial, Engenharia, Produção, Montagem, Compras, Campo e Administração agora leem do banco (nova função de servidor `getRoleDashboards`); todos os arquivos de mock (`src/mocks/dashboard`, `admin-overview.mock`, `crm`) foram removidos.
- Estados vazios explícitos em todas as listas ("Nenhuma etapa cadastrada", "Nenhuma ordem aguardando aprovação" etc.).
- Aba Administração em Configurações passou a usar as mesmas métricas reais (fila operacional, pendências por módulo, auditoria recente).

### Limpeza para produção
- Removidos os botões "Dados de demonstração" e "Ciclo demo" da aba Banco de dados e as funções de servidor correspondentes.
- Base limpa: apagados clientes, fornecedores, oportunidades, processos, equipamentos, etapas, ETPs, projetos, montagens, FAT/SAT, cotações, ordens de compra, insumos, documentos, entrevistas, embarques, chamados, mensagens de contato, resultados de mineração, logs e auditoria de teste.
- Preservados: usuários e permissões, marca, catálogos, todos os templates e a base de Know-how.

## 0.99.6 — Auditoria confiável: autoria, cobertura e exportação — 2026-08-20

### Autoria dos registros
- Nova função `public.audit_actor()` resolve o autor em cascata: `auth.uid()` → claim `sub` do JWT → header `x-audit-actor` (escritas com service role) → GUC `app.audit_user_id` (scripts/manutenção).
- Os 7 gatilhos de auditoria (`chamados`, `chamado_mensagens`, `oportunidades`, `processos`, `fat_relatorios`, `sat_relatorio`, `role_module_permissions`) passaram a usar `audit_actor()` — antes gravavam autor nulo em qualquer escrita fora da sessão do usuário.
- Diagnóstico: dos 489 registros existentes, os 369 sem autor vêm do seed de demonstração (06/08) e de seeds de migração, não de ações reais de usuário.

### Cobertura ampliada
- **Ordens de compra** (`ordens_compra`): criação, status, aprovador, fornecedor, valor e marcação explícita de alteração de valor **depois** de aprovada (`valor_total_pos_aprovacao`).
- **Vínculo usuário × papel** (`user_roles`): concessão e remoção de papel.

### Exportação e tela
- Exportar em `/admin/auditoria` agora envia **todos** os registros dos filtros atuais (até 5.000), com valores antigo/novo, autor resolvido, CSV com BOM para Excel — antes exportava só a página visível.
- A própria exportação é registrada na trilha (`audit_log` / `export_csv`), com contagem e filtros usados.
- Linhas sem autor exibem **Sistema** em vez de "—".

### Documentação
- Artigo de auditoria corrigido: retenção real (sem expurgo automático), lista real do que é auditado (removida a afirmação de que leitura de documentos restritos era registrada) e novo comportamento da exportação. FAQ atualizado.

## 0.99.5 — Liberação para usuários, hardening de permissões e correção de configuração — 2026-08-20

### Varredura de liberação (go-live readiness)
- **63 rotas autenticadas e 14 rotas públicas validadas** via automação Playwright, garantindo que nenhuma rota quebre com erro de autorização ou crash ao carregar.
- **`/api/public/readiness`** operacional; rotas públicas (home, contato, login, suporte, soluções, equipamentos) respondem corretamente.
- **Correção de falso positivo no teste `messages-leak`**: `sitemap[.]xml.ts` renomeou a constante `BASE_URL` para `SITE_ORIGIN`; 34 testes passam.
- **Aviso React investigado** ("state update on a component that hasn't mounted") confirmado como notificação interna do TanStack Router em dev, sem impacto em produção.

### Hardening de RLS e permissões
- **Migration `20260820190000_rls_hardening_golive.sql` aplicada e arquivada**:
  - `ordem_compra_itens`: usuários só veem itens de ordens de compra que possam ler (corrigida coluna `ordem_compra_id`).
  - `insumo_empresas`, `insumo_sku_fornecedores`, `insumo_sku_precos`, `insumo_sku_lead_times`: acesso escopo ao usuário dono da empresa ou a papéis com módulo Compras.
  - `fornecedor_scan_submissoes`: leitura/escrita conforme vínculo de organização.
  - `equipamento_planejamento_status`: ajuste de política `delete` para reutilização segura.
- **Auditoria de usuários e papéis**:
  - 10 usuários ativos com papéis atribuídos, 2 admins ativos (mínimo saudável).
  - Matriz papel × módulo consistente: dashboard sempre ativo, qualidade→processos, comercial/pós-venda→clientes, módulo `admin` desligado para papéis operacionais.
  - RLS de `role_module_permissions`, `user_roles` e `profiles` confirmada: escrita administrativa só via service role, leitura restrita ao próprio registro (ou admin).

### Correção de mapeamento de rotas e visibilidade do menu
- **Rotas protegidas pelo módulo Administração**: `/central-documentos`, `/template-documentos` e `/importar` agora exigem o módulo `admin` (antes qualquer usuário autenticado acessava por URL direta).
- **Sidebar corrigida**: a seção "Administração" agora aparece para usuários com role `admin` **ou** com o módulo `admin` liberado na matriz (ex.: managers).
- Itens "Editor de blocos" e "Templates" agora carregam `module: "admin"`, respeitando a matriz de permissões.

### Configuração de banco de dados
- **Corrigida a tela de Banco em `/admin/configuracoes`**: quando as variáveis `DEST_*` apontam para o mesmo projeto Supabase do ambiente ativo, apenas um card é exibido — "Banco de dados do sistema", em largura total. O segundo card só aparece se existir de fato um projeto secundário diferente.

---

## 0.99.4 — Mineração de leads, limites reais do provedor e documentação em dia — 2026-08-20

### Mineração de leads (`/comercial/mineracao`)
- **Bases sincronizadas no banco** (`penta_bases`): o seletor "Base de dados" lê da tabela local, nunca da API. Sincronização manual em lotes de países, com progresso na tela.
- **Permissão por papel**: sincronizar é ação de `admin`/`manager`; demais papéis têm "Solicitar sincronização", que notifica a administração.
- **Seletor agrupado por continente › país**, filtro sem acento por país, sigla, nome e tipo (importação/exportação), chip com a base selecionada e campos de data alinhados.
- **Persistência de buscas**: `mineracao_buscas`/`mineracao_resultados` guardam cada consulta; filtros repetidos exibem aviso com "Ver resultado salvo" e nova aba **Histórico de buscas**.
- **Limites reais do contrato**: medidores de Bases, Rubros (NCM) e Empresas agora usam `totalCountriesAllowed`, `totalTariffCodesAllowed` e `totalCompaniesAllowed` do endpoint `/restrictions`, com estado do contrato e vigência. Card "Bases premium" removido.
- **Cache de restrições** via RPCs `mineracao_restricoes_get/set` — o provedor só é chamado no botão "Atualizar".
- **"Ver o que já foi consultado"**: listas pesquisáveis de bases, NCMs e empresas já indexadas.
- **Correções de busca**: aceita `keyVersion: 0`, mapeia colunas reais retornadas por cada base (sem `personalizedColumns`) e ajusta o período à vigência da base automaticamente.
- **Mensagens do provedor traduzidas**: limite de contrato, base em manutenção, período fora do intervalo, consulta grande demais e instabilidade, sempre com o texto original entre parênteses.

### Correções
- **Sino de notificações**: só consulta o servidor quando há sessão ativa, eliminando o erro "Unauthorized" na tela de login.

### Documentação e ajuda
- **Novos artigos**: Mineração de leads, E-mails automáticos e Formulários recebidos.
- **Novas perguntas no FAQ** sobre limites do contrato, bases vazias, buscas repetidas, erros do provedor, log de e-mails, impressão do Know-how e a renomeação de RFQ para Checklist.
- **`route-map` atualizado** — 0 rotas ativas sem documentação mapeada — e metadados (`app_version`, `atualizado_em`) revisados em todos os artigos.

---

## 0.99.3.4 — Rotina comercial no card, guias do funil e mineração por rota comercial — 2026-08-19

### Pipeline comercial
- **Barra "Próximo passo"** no card da oportunidade (`ProximoPassoBar`): Dados → Entrevista → Checklist → Orçamento → Ganho → Cliente ativo, com um único botão primário por estágio.
- **Aba "Orçamentos"** no card, listando código, versão, valor e link do PDF, com ação "usar valor do orçamento".
- **Gerar orçamento a partir da oportunidade**: o wizard aceita `oportunidade`, `cliente` e `titulo` por search params e já devolve o vínculo no payload.
- **"Marcar ganho" dentro do card** (antes só no kanban) e ação **"Nova oportunidade para esta empresa"** com dados pré-preenchidos, também disponível no estado vazio do assistente de conversão.
- **Faixa "Como funciona o processo comercial"** no topo do Pipeline, recolhível, com popover por etapa e link para a documentação.
- **Legendas por coluna do Kanban** com os pré-requisitos para avançar (`src/lib/comercial/guia.ts`).

### Mineração de leads
- **Modo "Rota comercial (origem → destino)"**: escolha de país de destino (base de importação detectada automaticamente), país de origem e NCMs, com resultado agrupado por par importador × fornecedor (valor total, nº de transações, última transação, NCMs).
- **Envio ao pipeline** escolhendo qual ponta vira suspect (importador, fornecedor ou ambos), com empresa, país, NCMs e valor histórico pré-preenchidos.
- **Avisos de truncamento e cota** no topo do resultado e nota fixa de que a API não devolve contatos.
- **Limites reais do contrato** (`GET /restrictions`) substituindo os valores fixos das configurações; card "Bases premium" removido e campos correspondentes retirados de Configurações › Mineração.

---

## 0.99.3.3 — RFQ vira Checklist e nova Mineração de Leads (Penta-Transaction) — 2026-08-18

### Renomeação RFQ → Checklist
- **Navegação**: "Formulários RFQ" → **Checklists** (`/comercial/checklists`), "Tipos de RFQ" → **Tipos de Checklist** (`/admin/checklist-tipos`), link público `/rfq/{slug}` → `/checklist/{slug}` — URLs antigas mantidas com redirecionamento permanente.
- **Textos revisados** em sidebar, cabeçalhos, `head()`, telas comerciais, Compras (envio, cotações, insumos, tooltips), Central de Documentos, dashboards e dados mock.

### Mineração de Leads (novo módulo)
- **Novo item "Mineração"** no grupo Comercial (`/comercial/mineracao`) e aba **Mineração** em `/admin/configuracoes`, com credenciais da API guardadas no servidor (senha nunca volta à tela), atraso mínimo entre chamadas e limite diário.
- **Busca por NCM** com modos empresa ↔ contraparte, presets de período, chips de NCM e envio de empresas encontradas ao pipeline.
- **Cabeçalho de status** com healthcheck, latência e medidores de consumo do plano.

---

## 0.99.3.2 — Sanitização de telas, sitemap e agenda corporativa — 2026-08-13

- **Fichas padronizadas** em layout de duas colunas com abas carregadas sob demanda (cliente, fornecedor, equipamento), quebrando os arquivos gigantes em componentes por aba sem mudar regras de negócio.
- **`public/robots.txt` e `sitemap.xml`** gerados por rota de servidor, cobrindo home, soluções, equipamentos (inclusive slugs dinâmicos) e contato; rotas autenticadas ficam fora.
- **Fornecedores**: correção da busca combinada por texto + categorias/tags e diagnóstico do enriquecimento externo pelas Chaves & Diagnóstico.
- **Agenda corporativa** (Google Agenda / Microsoft 365) conectada uma vez pelo administrador: botão "Agendar entrevista" no card do suspect, link de reunião automático e registro do evento na timeline da oportunidade; preferência de e-mail de convite no perfil do usuário.
- **Fluxo Checklist → ETP → Kickoff** encadeado explicitamente entre as etapas que existiam soltas.

---

## 0.99.3.1 — Central de Chaves & Diagnóstico e correção definitiva da Service Role — 2026-08-11

### Chaves & Diagnóstico
- **Nova aba única** em `/admin/configuracoes` listando todas as chaves do sistema por área (Banco, IA, Documentos & Drive, E-mail, Enriquecimento fiscal, Assinatura de links públicos), com finalidade, impacto da ausência, status, valor mascarado e latência — o valor nunca é exibido.
- **"Testar tudo" e teste individual** com chamadas reais ao provedor e resumo (X ok / Y ausentes / Z com erro) e data da última verificação.
- **Abas reorganizadas**: Integrações + Conectores + diagnóstico do Banco passaram para a nova aba (9 → 7 abas).

### Service Role
- **Credencial revinculada** com o nome canônico `SUPABASE_SERVICE_ROLE_KEY` (alias legado mantido apenas na transição) e validada por operação real.
- **Helper central server-only** como única porta de entrada para acesso privilegiado (`context.supabase` para uso normal com RLS, fallback explícito e `withCriticalServiceRole` para operações realmente privilegiadas), com teste de arquitetura impedindo novos imports diretos.
- **Todos os ~45 pontos de uso migrados** por categoria (fluxos autenticados, administrativos e endpoints públicos) e **erros sanitizados**: nomes de variáveis e detalhes de infraestrutura não chegam mais à interface.

---



## 0.99.3-beta — Know-how, correções do site público e materiais de apresentação — 2026-08-06

> **Publicação BETA.** Esta versão foi publicada como beta para validação com o cliente antes do 1.0.

### Know-how
- **Base inicial semeada**: 14 materiais (6 checklists e 8 artigos) cobrindo Montagem, Elétrica, FAT/SAT e Comercial/Compras.
- **Favoritos e histórico de leitura** (migração `20260805230000_know_how_favoritos.sql`) com abas dedicadas na listagem.
- **Busca global, nuvem de tags e filtros** por tipo, coleção, papel e tags em `know-how.functions.ts`.
- **Exportação em PDF/impressão**: nova rota `know-how/imprimir/$slug` com CSS de impressão isolado (`kh-print-root`), sem o chrome do app.
- **Edição de conteúdo existente**: o botão "Editar" agora abre o formulário hidratado (`?edit=slug`) e salva via `updateItem`, mantendo tipo e coleção originais.

### Site público
- **Equipamentos em produção**: `equipamento-pagina.functions.ts` passou a usar `getSupabasePublicConfig()` como fallback quando `SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY` não estão no ambiente do deploy.
- **Imagens corrigidas**: novo helper `src/lib/asset-url.ts` converte caminhos relativos de assets em URLs absolutas do CDN — aplicado nas galerias de soluções, logos de RFQ e mídias da documentação.

### Materiais e documentação
- **Roteiro de apresentação do sistema** em PDF (v4): preparação, tabela de logins por perfil, roteiro por módulo com tempos e exemplos, espaços de anotação — compacto em 2 páginas.
- **Relatório de status do sistema** revisado com inventário de equipamentos e checklist para o cliente.

---

## 0.99.2 — Entrevistas na Central de Documentos + Drive — 2026-07-28

- **PDFs de entrevista arquivados**: nova tabela `entrevista_documentos_gerados` registra cada PDF gerado, com link no storage e no Drive.
- **Geração server-side** (`entrevistas-docs.functions.ts`) com `@react-pdf/renderer`, upload ao storage e sincronização em `Comercial / Entrevistas / {segmento} / ENT-{codigo}`.
- **Nova aba "Entrevistas"** na Central de Documentos (`EntrevistasGeradasTab`) e ação "Arquivar no Drive" nos cards de entrevista.
- **Relatório de status do sistema** em PDF: inventário dos 29 equipamentos publicados, pontos críticos e checklist para o cliente.

---

## 0.99.1 — Entrevista pública sem service role + ajustes de UI — 2026-07-27

- **Correção crítica**: a entrevista pública quebrava em produção por depender de `SUPABASE_SERVICE_ROLE_KEY`. Criadas as funções `SECURITY DEFINER` `get_public_entrevista` e `submit_public_entrevista`; as rotas `api/public/entrevista.*` agora usam RPC com a chave publicável.
- **Splash da entrevista** sem imagem de marca e com tratamento correto de "link expirado".
- **Sidebar**: sino de notificações sem o rótulo "Notificações", liberando espaço para nome e papel do usuário.
- **Retry com backoff exponencial** (3 tentativas) no carregamento da entrevista pública.

---

## 0.99.0 — Site público: soluções, equipamentos e formulários recebidos — 2026-07-26

- **Três páginas institucionais** (Projetos Industriais & Automação, Tecnologia de Processos, Consultoria & Implementação) com `SolucaoPageTemplate`, hero navy, galeria com lazy loading e cards de diferenciais.
- **Header público**: novo item "Equipamentos", dropdown "Soluções" realinhado e traduções PT/EN/ES para as novas rotas.
- **Home** lista 6 equipamentos + botão "Conhecer" para o catálogo completo.
- **Entradas de formulários** (`/admin/formularios-recebidos`): alertas in-app/e-mail para admin e manager, filtros por data e tipo, e marcação de "lido"/"pendente".
- **Contato unificado**: telefone e WhatsApp atualizados para +55 (47) 9635-0101 em todo o site e no banco.

---

## 0.98.1 — Entrevista pública: Sim/Não, contato reforçado, i18n e UX — 2026-07-23

### Correções pedidas
- **Sim/Não → "Descreva"**: novo detector `detectYesNo` casa variações ("Sim, temos", "Não possuímos", "Sí — parcial", "No, we don't"…) em PT/ES/EN. Sempre que uma opção Sim/Não estiver selecionada o textarea "Descreva" aparece, mesmo sem `tem_descricao`.
- **Etapa de contato — Gerente de Produção**: card com ícone, título e subtítulo explícitos. Campos com ícones (Nome, Cargo, WhatsApp, E-mail), Cargo pré-preenchido "Gerente de Produção", máscara internacional de WhatsApp (`+55 (11) 90000-0000`), validação inline de e-mail e WhatsApp (>= 8 dígitos).
- **Trocar idioma traduz as perguntas**: `pickText` ganhou fallback encadeado (es→en→pt / en→es→pt). `key={lang}` no container força re-render limpo dos labels. Bootstrap do idioma respeita a escolha manual do usuário (`langSetByUser`).

### Melhorias de UX no formulário público
- **Autosave em `localStorage`** por código: se o usuário fecha o link e volta, o wizard retoma no passo, respostas e contato preenchidos, com aviso e botão "Recomeçar".
- **Etapa de revisão** antes do envio: lista compacta "pergunta → resposta" (+ contato) com botão "Editar" que salta direto ao passo. `Enviar` só aparece nessa revisão.
- **Retry automático (3 tentativas) com backoff** no `POST /submit` e mensagem "Tentando novamente…" enquanto insiste.
- **Idempotência no submit**: se o link já foi respondido, retorna `ok:true` em vez de `410 respondida` — evita a tela vazia após reload.
- **Envia idioma efetivo + user_agent** no payload para futura auditoria.
- **Sticky footer no mobile** com os botões Voltar/Avançar sempre visíveis (não somem atrás do teclado).
- **Beforeunload** avisa se há respostas não enviadas.
- **Contadores de caracteres** em textareas (`Descreva` 2000, texto livre 4000, coerentes com o schema do submit).
- **Acessibilidade**: `role="radio"`/`role="checkbox"` com `aria-checked` nos botões de opção; `aria-live` no bloco de progresso e nos erros; toques mínimos de 44px.
- **Persistência do idioma** em `localStorage` para próximas entrevistas no mesmo dispositivo.
- Header ganhou `sticky top-0` + `theme-color` navy para casar com o splash em mobile.

### Backend / integração
- `scripts/entrevistas-translate.mjs` (novo) — backfill de `enunciado_es/en` e `label_es/en` via Lovable AI Gateway em lotes de 25, com retry exponencial. Precisa que **Lovable AI** esteja habilitado no workspace (hoje retorna 403 — pendente ativação).
- `pickLang` também caiu no mesmo padrão de fallback encadeado.

### Notas
- Sem alterações no PDF, nos e-mails automáticos ou na estrutura de dados.

---



### Fallback e conditionals nos templates
- `renderTemplate` agora aceita `{{var|fallback}}` (valor padrão quando vazio) e blocos `{{#if var}}…{{/if}}` (removidos quando a variável estiver ausente). Assim variáveis opcionais não deixam mais "buracos" no e-mail.
- `extractTemplateVars` foi atualizado para ignorar fallbacks e a palavra-chave `if`.

### Validação de variáveis obrigatórias
- Migration `20260722170000_email_logs_vars_and_required.sql` adicionou `email_event_config.required_vars text[]` e novas colunas de auditoria em `email_send_log`: `vars_used jsonb`, `template_snapshot jsonb`, `required_missing text[]`.
- `dispatchEmail` valida `required_vars` antes de enviar. Se faltar qualquer uma, grava log com status `skipped_missing_required` listando o que faltou — sem enviar.
- Novo campo **Variáveis obrigatórias** no editor do evento (`admin/emails`) — lista separada por vírgula, salva junto com o template.

### Logs detalhados de cada envio
- Cada linha do log agora tem dois botões: 👁 abre o **detalhe do envio** (assunto, destinatários, status, erro, variáveis usadas, snapshot exato do template no momento do envio, variáveis obrigatórias ausentes); ✉ continua abrindo a prévia do template atual do evento.
- Filtro de status ganhou a opção **Ignorado (variáveis obrigatórias)**.

### Envio de teste customizado
- `sendTestEmail` agora aceita `recipient` (opcional) e `overrides` — quando vazio, cai no e-mail do próprio admin.
- Editor do evento ganhou o bloco **Enviar teste** com input de destinatário. O e-mail vai por Resend com as variáveis-exemplo de `SAMPLE_VARS`.

### Ajustes
- `src/lib/app-version.ts` → 0.97.6.

---

## 0.97.4 — Corpo dos e-mails por etapas + visualizador dedicado — 2026-07-21

### Layout com logo
- `src/lib/email/layout.ts` agora renderiza um **header com a logomarca Solutek Hub** (imagem CDN em `9a11ce2a…logo-email.png`), eyebrow do módulo em caixa alta e o assunto como `<h1>`. Rodapé com nota de disparo + remetente `system@sltkamericas.com`. Botão CTA aparece só quando o dispatch fornece `{{link}}`. Todos os disparos passam pelo mesmo wrapper.
- Novos helpers de composição em `layout.ts`: `blocoDados([[label, valor], …])`, `blocoMotivo(titulo, texto)` e `blocoBullets(titulo, itens)` — permitem que futuros templates reusem tabelas e destaques prontos via variáveis `*_html`.

### Visualizador de e-mail
- Nova coluna **Ações** na aba *Eventos* com botão de olho (👁) que abre um `QuickPreviewDialog` renderizando o e-mail exatamente como será enviado — sem precisar entrar no editor. Botão “Editar” continua acessível ao lado.
- **Log de envio** também ganhou o botão 👁 em cada linha: abre a prévia usando o template atual daquele `event_key`, útil para inspecionar rapidamente o que foi disparado.
- `previewEmailTemplate` agora resolve o `module` a partir do `event_key` e passa como `moduleLabel` para o layout — a prévia mostra o mesmo eyebrow do envio real.

### Reescrita rica dos templates — Etapa 1: COMERCIAL
Migration `20260722120000_email_templates_v2_comercial.sql` (aplicada) atualiza os 7 eventos do módulo comercial (`cotacao.enviada_cliente`, `cotacao.aceita`, `cotacao.expirando_3d`, `oportunidade.criada`, `oportunidade.stage_alterado`, `oportunidade.ganha`, `oportunidade.perdida`) para o padrão:

1. Saudação com `{{destinatario_nome}}`.
2. Frase de contexto explicando o que aconteceu.
3. **Tabela de dados** (`Cotação`, `Cliente`, `Valor`, `Prazo`, `Quando`, `Por`) em HTML inline compatível com Outlook.
4. **Bloco de motivo/observação** com barra lateral quando aplicável (perdida).
5. **Próximos passos** em bullets curtos.

Assuntos padronizados com prefixo `[Solutek]` + módulo + código, todos abaixo de 90 caracteres. Corpo entre 1.4 KB e 1.8 KB — rico em conteúdo, mas leve.

### Próximas etapas planejadas
- Etapa 2: Compras (6 eventos) — OC criada/aprovada/rejeitada, RFQ enviado, insumo em ruptura, fornecedor aprovado.
- Etapa 3: Engenharia + Produção (11) — ETP, revisão, montagem, liberação.
- Etapa 4: Qualidade + Logística (10) — FAT agendado/aprovado/RNC, embarque criado/despachado/entregue.
- Etapa 5: Pós-vendas + Chamados (9) — abertura, atribuição, SLA, resolução, reabertura.
- Etapa 6: Admin + Contato público (10) — mensagens de contato, convites de usuário, resets.

---

## 0.97.3 — Prévia de e-mail + wiring de mais eventos + layout padrão — 2026-07-21

### Layout padrão de e-mail
- Novo `src/lib/email/layout.ts` envelopa todo disparo com header/footer Solutek, botão CTA opcional (usa `{{link}}`) e nota de rodapé com "disparado por / origem / timestamp". Compatível com Gmail, Outlook e clientes móveis (tabelas + estilos inline, sem `<style>`).
- `dispatchEmail` aplica o layout automaticamente: templates continuam simples (só o corpo relevante), o layout é aplicado uma vez no envio.

### Prévia e validação de template
- Nova server function `previewEmailTemplate` renderiza assunto e corpo com **dados fictícios** (`SAMPLE_VARS`) e devolve o HTML já envelopado + lista de variáveis usadas + validações automáticas (assunto >120 chars, `<script>`/`<style>` bloqueáveis, chaves `{{` desbalanceadas, variáveis sem valor-exemplo, falta de `{{link}}`).
- Botão **"Pré-visualizar"** no editor de eventos abre um dialog com o e-mail renderizado em `<iframe sandbox>`, painel de avisos de validação e badges por variável (destaca em vermelho as desconhecidas). Não envia nem grava log — puramente client-side após o render server.

### Dispatch de negócio ampliado
- `chamado.resolvido`, `chamado.reaberto` — disparados por `alterarStatusChamado`, com CC ao e-mail do visitante quando existente.
- `chamado.atribuido` — disparado por `reatribuirChamado`, com CC ao novo atendente.
- Novo helper `src/lib/email/safe-dispatch.server.ts` centraliza `safeDispatch` (nunca lança) + `appUrl` + `fmtDate` — padrão de uso para os próximos handlers (aprovação de OC, homologação de FAT, transições de oportunidade, embarque, ETP).

### Banner de status atualizado
- `/admin/emails` agora indica **Resend** como provedor ativo (via conector Lovable → gateway) e marca Google Calendar como opcional. Remetente segue fixo em **system@sltkamericas.com**.

## 0.97.0 — Fundação de e-mails automáticos + agenda Google Workspace — 2026-07-21

### Novo módulo `/admin/emails`
- Tabelas `email_event_config`, `email_event_recipients` e `email_send_log` criadas com RLS (admin edita; admin/manager lêem; service_role escreve logs).
- Seed inicial com **53 eventos** cobrindo Comercial, Engenharia, Compras, Produção, Qualidade, Logística, Pós-vendas, Admin e Site público — e **92 destinatários padrão** na matriz papel × modo (To/Cc).
- Página `/admin/emails` com aba **Eventos** (agrupada por módulo, com toggle inline, editor de template com variáveis `{{var}}`, matriz de papéis To/Cc, flag "criar evento na agenda" + duração, botão "Enviar teste para mim") e aba **Log de envio** (filtros por evento e status).
- Provider `Gmail API` + `Google Calendar` via Service Account com Domain-Wide Delegation, impersonando o remetente fixo **system@sltkamericas.com**. Sem as secrets `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, o dispatcher registra `provider_not_configured` no log e não derruba a operação de negócio — permitindo configurar todos os templates antes de ligar o envio real.
- `dispatchEmail(admin, {...})` centraliza o disparo: carrega config → resolve papéis → renderiza subject/body → chama Gmail → opcionalmente cria evento no Calendar de cada destinatário → grava linha no `email_send_log` com autor (usuário/automation/cron/test), timestamp e IDs do Gmail/Calendar. Toda mudança em config/matriz também vai para `audit_log`.

## 0.96.6 — Auditoria: varredura por módulos e etapas — 2026-07-17

### Auditoria estendida
- `scripts/docs-audit.mjs` ganhou 6 novas verificações: frontmatter incompleto, `app_version` defasada (≥ 2 minors atrás do app), screenshots referenciados que não existem no disco, headings duplicados no mesmo artigo, rotas sem `<PageHeader />` (sem botão "Ajuda desta tela") e papéis fora do enum `DocPapel`.
- JSON agora inclui `byModule` (agregado por categoria: contagem de artigos, rotas mapeadas, erros/avisos/info e lista completa de achados) e `byStage` (cobertura de documentação por etapa do fluxo Solutek — Comercial → Engenharia → Compras → Produção → Qualidade → Logística → Pós-vendas — além do bloco "Suporte transversal").

### `/ajuda/auditoria` em 3 abas
- **Visão geral**: seções globais (comportamento anterior preservado).
- **Por módulo**: grid de cards, um por categoria de documentação, com pílulas de severidade e drill-down expansível listando cada achado (rota, artigo ou link) — ordenado pela severidade agregada.
- **Por etapa**: cards de progresso do fluxo Solutek com % de cobertura, barra visual, distribuição de artigos por tipo (guia/conceito/referência/troubleshooting), rotas sem documentação e âncoras sugeridas (artigos guia/conceito de referência da etapa).

### Snapshot atual
- 0 erros, 15 avisos, 41 informativos. Cobertura 100% em todas as 7 etapas do fluxo e no bloco de suporte transversal — os avisos restantes são screenshots quebrados pontuais e papéis herdados (`assembly`, `field`, `logistics`) fora do enum.

## 0.96.5 — Ajuda: relatório de auditoria, artigos recomendados e busca avançada — 2026-07-17

### Relatório de auditoria com histórico
- `scripts/docs-audit.mjs` agora gera `src/content/docs/audit-report.json` a cada execução — snapshot machine-readable para versionar no repositório e acompanhar correções ao longo do tempo.
- Nova rota **`/ajuda/auditoria`**: consome o JSON e exibe totais, resumo por severidade e cada seção (rotas órfãs, cross-links quebrados, menções a rotas inexistentes, headings/artigos sem entrada no mapa, etc.) com badges por severidade.
- Item de menu **Auditoria** adicionado ao `DocsShell` (aparece junto de "Atualizações" na sidebar da Central de ajuda).

### Artigos recomendados baseados no histórico
- Novo `src/lib/recent-docs.ts` mantém em `localStorage` os últimos artigos consultados pelo usuário (top 12).
- Componente **`RecommendedArticles`** combina histórico recente + correlatos (mesma categoria / tags em comum com o último tópico) e é injetado em:
  - páginas de artigo (abaixo do conteúdo);
  - página 404 da Central de ajuda (`/ajuda/*` inválido).
- Cada card mostra badge "visto" (histórico) ou "relacionado" (similaridade) e link direto para o artigo.

### Busca avançada em `/ajuda/documentacao`
- `DocSearch` (modo `filters`) ganha dois controles:
  - **Nível** (`iniciante` / `intermediario` / `avancado`) — filtra artigos pelo `nivel` do frontmatter.
  - **Ordenar por** — `Relevância` (padrão / respeita ranking do Fuse), `Atualizado recentemente` (usa `atualizado_em`) ou `A → Z`.
- Botão "Limpar" agora zera também nível e ordenação.

---

## 0.96.4 — Ajuda: índice organizado, 404 dedicado e auditoria estendida — 2026-07-17

### Índice organizado por seção
- `/ajuda/documentacao` agora exibe, além dos cards de módulo, um **índice completo** agrupado por categoria (na mesma ordem do menu) listando todos os artigos de cada seção — inclui Admin e Logística.

### 404 dedicado da Central de ajuda
- Novo `src/routes/_authenticated/ajuda.$.tsx`: qualquer URL inexistente sob `/ajuda/...` renderiza uma página com aviso, busca global e **artigos sugeridos** baseados nas palavras do path que o usuário tentou abrir.
- Também oferece navegação por categoria em lista, para não deixar o usuário sem saída.

### Auditoria estendida (`bun run docs:audit`)
- Nova seção **7 – Artigos sem entrada no ROUTE_DOC_MAP**: identifica artigos que não estão referenciados por nenhuma tela (candidatos a mapear ou reclassificar como referência).
- Nova seção **8 – Cross-links quebrados**: varre links markdown para `/ajuda/documentacao/<cat>/<slug>` e detecta destinos que não existem mais.
- Nova seção **9 – Menções a rotas inexistentes**: encontra menções `` `/rota` `` em artigos que não correspondem a nenhuma rota autenticada nem pública do app. Corrigidas menções em `conta/navegacao-e-atalhos` e `site-publico/formularios-rfq-publicos`.

### Revalidação de links
- Cross-link corrigido em `compras/cotacao-multiplos-fornecedores` (`homologacao-fornecedores` → `categorias-e-homologacao`).
- Auditoria confirma **0 rotas órfãs, 0 cross-links quebrados, 0 menções a rotas inexistentes**.

---

## 0.96.2 — Ajuda: link contextual, mapa Rota↔Doc e auditoria automática — 2026-07-16

### Índice + links cruzados
- Novo mapa canônico `src/content/docs/route-map.ts` (`ROUTE_DOC_MAP`) associando cada rota autenticada ao artigo de referência. Cobertura atual: 62 entradas / 71 rotas ativas (100% das telas de módulo).
- Botão **Ajuda desta tela** no `PageHeader` (`src/components/ajuda/PageDocLink.tsx`) resolve a rota atual e abre o artigo correspondente — invisível quando não há doc mapeado.

### Auditoria automática
- Script `scripts/docs-audit.mjs` (`bun run docs:audit`) cruza rotas × mapa × artigos e gera relatório em `/mnt/documents/docs-audit.md`. Detecta: rotas ativas sem doc, entradas órfãs no mapa, artigos referenciando rotas legadas, artigos curtos (<1200 chars) e categorias vazias.
- Filtro de ruído (rotas de meta-doc, changelog, design-system, dashboard, imprimir).

### Captura de prints reais
- Script `scripts/docs-screenshots.mjs` (`bun run docs:shots`) — Playwright + sessão Supabase injetada — visita as rotas listadas em `TARGETS` e salva PNGs em `/tmp/docs-shots/<categoria>/`. Exige `LOVABLE_BROWSER_AUTH_STATUS=injected`; parada segura quando não há sessão.

### Checklist e limpeza
- `.lovable/docs-checklist.md` — critérios de qualidade para reescrever artigos fracos.
- `comercial/previsao-e-saude.md`: rota legada `/admin/pipeline-config` substituída por caminho real `/admin/configuracoes`.

---

## 0.96.1 — Ajuda: varredura + módulos atuais (Logística, Editor de blocos, Tipos de RFQ, SLA, Páginas/Etapas de Equipamentos) — 2026-07-16


### Varredura de artigos defasados
- **H/H não é mais item de menu**: virou aba dentro de **Operações → Planejamento** (`/engenharia/etapas`). Corrigido em 6 artigos (`engenharia/apontar-hh`, `relatorios-hh`, `visao-geral`, `etapas-e-kanban`, `criar-etp`, `liberacao-para-producao`) e 4 FAQs (`hh-retroativo`, `corrigir-hh`, `apontar-hh-varios-projetos`, `hh-orcado-vs-apontado`).
- Substituição em massa `ENGENHARIA → …` por `OPERAÇÕES → …` (seção real da sidebar).

### Reescrita — Cadastrar fornecedor
- `clientes-fornecedores/cadastrar-fornecedor.md` agora reflete a tela real de `/fornecedores/novo`: aba **Scan automático** (OCR Groq Llama 4 Scout + enriquecimento Firecrawl/Llama 3.3 70B) como fluxo padrão + aba **Cadastro manual** com Enriquecer por documento fiscal (BR/US/CN/outros).

### Nova categoria e artigos para módulos atuais
- Categoria **Logística** adicionada em `src/content/docs/types.ts`.
- `logistica/visao-geral.md`, `logistica/criar-embarque.md`, `logistica/acompanhar-status.md`.
- `documentos/editor-de-blocos.md` — Central de documentos (blocos, largura, variáveis, publicar como template).
- `admin/tipos-de-rfq.md` — formulários RFQ por tipo de máquina.
- `admin/sla-chamados.md` — configuração de janela útil e prazos por prioridade.
- `admin/paginas-e-etapas-equipamentos.md` — CMS do catálogo público + template de etapas/H/H por equipamento.

## 0.96.0 — Dashboard por papel com layout estilo Atlassian — 2026-07-16


### Home operacional (`/dashboard`) por papel
- Nova casca `DashboardShell` com saudação, chip do papel, seletor de período (mock) e ações rápidas.
- Componentes reutilizáveis: `MeterCard` (barra de progresso), `GaugeCard` (arco 180°), `SparkKpi` (KPI + sparkline), `StatusList` (lista com `StatusBadge`), `HeatStrip` (barra segmentada), `QuickActions`.
- Rota `_authenticated/dashboard.tsx` faz o dispatch por `role`:
  - `admin` → saúde do sistema, fila operacional, heatstrip de pendências por módulo, auditoria recente.
  - `manager` → mantém `ManagerDashboard` com dados reais do `getManagerDashboard`.
  - `sales` → pipeline pessoal, meta do mês (gauge), funil, minha agenda e RFQs atribuídos.
  - `engineer` → ETPs abertos, HH da semana (spark + meter de capacidade), kanban resumido, revisões críticas.
  - `production` → OS em execução, aderência (gauge), OS por etapa (heatstrip), próximas entregas.
  - `assembly` → etapas hoje, HH apontado (meter), fila pessoal de etapas.
  - `purchasing` → OCs para aprovar, RFQs em cotação, gasto do mês (spark), SLA médio.
  - `field` → SATs pendentes, chamados em campo, aderência de SLA (meter), agenda de visitas.
- Mocks tipados em `src/mocks/dashboard/` isolados por papel — trocáveis por server functions reais sem mexer na UI.

## 0.95.0 — Ajuda: Lote 6 — Conta + Administração + Site público (16 artigos ricos) — 2026-07-15

### Lote 6 — Conta (5) + Administração (5) + Site público (6)
Reescrita completa no novo padrão: TL;DR, passos numerados com screenshots reais, callouts (dica/atenção/erro) e "Ver também".

Conta:
- `conta/login-e-recuperacao-de-senha.md` — dependência de convite, fluxo `/forgot-password`, expiração curta.
- `conta/editar-perfil-e-avatar.md` — screenshot real de `/conta`, limite 8 MB e recorte antes de salvar.
- `conta/trocar-senha-e-sessoes.md` — mínimo 12 caracteres, encerramento de outras sessões, política trimestral.
- `conta/papeis-e-permissoes.md` — tabela de papéis, `has_role()` SECURITY DEFINER e efeito na sidebar.
- `conta/navegacao-e-atalhos.md` — Ctrl+K, colapsar sidebar, badges e responsivo.

Administração:
- `admin/visao-geral.md` — quem entra, o que fica em `/admin`, screenshot real de `/admin/auditoria`.
- `admin/gerenciar-usuarios.md` — convite, papéis múltiplos, reset de senha, desativar/reativar.
- `admin/permissoes-por-papel.md` — regras de combinação validadas no servidor, união de papéis.
- `admin/auditoria.md` — trilha append-only com screenshot, estrutura das linhas e investigação passo a passo.
- `admin/configuracoes.md` — marca/SLA/templates/catálogos/integrações; screenshot real de `/admin/sla-chamados`.

Site público:
- `site-publico/visao-geral.md` — tabela de rotas, screenshot da home, conexão com Hub.
- `site-publico/home-e-seo.md` — hero real capturado, metadados, canonical, teste social.
- `site-publico/catalogo-equipamentos.md` — screenshot do catálogo, slug estável, aplicação vs. jargão.
- `site-publico/formularios-rfq-publicos.md` — configuração, teste anônimo, campos mínimos.
- `site-publico/contato-e-captacao.md` — screenshots de `/contato` e caixa unificada, contato × RFQ.
- `site-publico/links-publicos-e-seguranca.md` — tabela de tipos, tokens como credencial, revogação.

Novos assets em `src/assets/docs/conta/` (1), `src/assets/docs/admin/` (3) e `src/assets/docs/site-publico/` (3).

## 0.94.0 — Ajuda: Lote 5 — Documentos + Know-how (10 artigos ricos) — 2026-07-15

### Lote 5 — Documentos (5) + Know-how (5)
Reescrita completa no novo padrão: TL;DR, passos numerados com screenshots reais, callouts (dica/atenção/erro) e "Ver também".

Documentos:
- `documentos/visao-geral.md` — repositório único, três visões (cliente/projeto/global) e prints da central e do detalhe.
- `documentos/indexacao-por-cliente-e-projeto.md` — tabela por origem, filtros, órfãos, reclassificação.
- `documentos/anexar-evidencias-por-etapa.md` — kanban, FAT, SAT e chamado; limites e auditoria por anexo.
- `documentos/permissoes-e-compartilhamento.md` — matriz interna, link público com token e revogação.
- `documentos/templates-e-versionamento.md` — blocos ativáveis, versões, branding em `/admin/brand`.

Know-how:
- `know-how/visao-geral.md` — estrutura Coleção → Artigo → Trilha → Certificação.
- `know-how/busca-e-organizacao.md` — busca com aspas/-, filtros, favoritos, indexação de vídeo.
- `know-how/publicar-conteudo.md` — rascunho → revisão obrigatória → publicação, com prints do editor e da fila.
- `know-how/trilhas.md` — sequência de artigos + quiz, nota mínima, política de reprovação (24 h / 7 dias).
- `know-how/certificacoes.md` — validade, expiração, revogação e uso como pré-requisito operacional.

Novos assets em `src/assets/docs/documentos/` (5) e `src/assets/docs/know-how/` (3).

## 0.93.0 — Ajuda: Lote 4 — Pós-vendas + Clientes & Fornecedores (11 artigos ricos) — 2026-07-15

### Lote 4 — Pós-vendas (6) + Clientes & Fornecedores (5)
Reescrita completa no novo padrão: TL;DR, passos numerados com screenshots reais, callouts (dica/atenção/erro) e "Ver também".

Pós-vendas:
- `pos-vendas/visao-geral.md` — fluxo chamados + SAT com diagrama e prints das duas filas.
- `pos-vendas/abrir-chamado.md` — três origens, passo a passo do interno, prioridade × SLA.
- `pos-vendas/atender-chamado.md` — assumir, chat, reatribuir, tabela de status.
- `pos-vendas/encerrar-e-reabrir.md` — resolver com resumo, 7 dias de reabertura, arquivamento automático.
- `pos-vendas/sat-em-campo.md` — 4 passos: criar → preparar → executar (mobile) → laudo PDF.
- `pos-vendas/sla-e-alertas.md` — três relógios, matriz sugerida, alertas de escalonamento.

Clientes & Fornecedores:
- `clientes-fornecedores/cadastrar-cliente.md` — enriquecimento por país (BR/AR/CL/CO/CR/PE/PY).
- `clientes-fornecedores/cadastrar-fornecedor.md` — categorias, anexos e ciclo de homologação.
- `clientes-fornecedores/categorias-e-homologacao.md` — impacto em cotação, OC e ranking.
- `clientes-fornecedores/importar-clientes-em-lote.md` — CSV UTF-8, preview colorido, dedupe por país+documento.
- `clientes-fornecedores/mesclar-clientes-duplicados.md` — escolha do mestre, migração de vínculos, auditoria.

### Assets
- 8 screenshots reais capturados via Playwright autenticado: `src/assets/docs/pos-vendas/` (chamados, SAT, SLA config) e `src/assets/docs/clientes-fornecedores/` (cliente novo, fornecedor novo, fornecedores lista, importar, clientes lista).

## 0.92.0 — Ajuda: Lote 3 — Produção + Qualidade (11 artigos ricos) — 2026-07-15

### Lote 3 — Produção (5) + Qualidade (6)
Reescrita completa dos 11 artigos no novo padrão: TL;DR, passos numerados com screenshots reais, callouts (dica/atenção/erro) e "Ver também".

Produção:
- `producao/visao-geral.md` — fluxo ETP → Montagem → FAT com diagrama e KPIs da tela de montagem.
- `producao/kanban-montagem.md` — 5 passos com prints do kanban, iniciar/bloquear/concluir.
- `producao/executar-etapa.md` — 6 passos: sub-etapa, checklist, evidências, H/H.
- `producao/retrabalho-e-nc-interna.md` — abertura de NC, classificação, retrabalho e validação.
- `producao/liberar-para-fat.md` — checklist de pré-requisitos e criação automática do FAT.

Qualidade:
- `qualidade/visao-geral.md` — revisões (mecânica/elétrica) + ciclo FAT com diagrama.
- `qualidade/templates-fat.md` — versionamento e publicação de templates.
- `qualidade/agendar-e-preparar-fat.md` — 6 passos: rascunho → template → data → convite → pré-FAT.
- `qualidade/executar-fat.md` — checklist item a item, evidências, aprovar/reprovar/N.A.
- `qualidade/encerrar-fat.md` — relatório final, assinatura eletrônica, liberação para embarque.
- `qualidade/rnc-e-reprovacao.md` — abertura, classificação (Menor/Maior/Crítica), causa raiz, plano de ação, retest.

### Assets
- 6 screenshots reais capturados via Playwright autenticado: `src/assets/docs/producao/` (1: montagem) e `src/assets/docs/qualidade/` (5: FAT lista, FAT novo, revisão mecânica, revisão elétrica, FAT detalhe).

## 0.91.0 — Ajuda: Lote 2 — Compras + Engenharia (11 artigos ricos) — 2026-07-15

### Lote 2 — Compras (5) + Engenharia (6)
Todos os artigos dos módulos receberam o novo padrão: TL;DR, passos numerados com screenshots reais do sistema, callouts de dica/atenção/erro e seção "Ver também".

Compras:
- `compras/visao-geral.md` — fluxo Solicitação → Cotação → OC com diagrama ASCII e prints das telas.
- `compras/criar-solicitacao.md` — 5 passos, KPIs, filtros, origem BOM vs. avulsa.
- `compras/cotacao-multiplos-fornecedores.md` — 6 passos, comparativo, escolha de vencedora, justificativa.
- `compras/emitir-e-aprovar-oc.md` — 6 passos, alçadas, envio ao fornecedor, recebimento.
- `compras/auditoria-de-compras.md` — auditoria consolidada e por registro.

Engenharia:
- `engenharia/visao-geral.md` — fluxo ETP → etapas → BOM → liberação com diagrama.
- `engenharia/criar-etp.md` — 5 passos, escopo, revisões versionadas.
- `engenharia/etapas-e-kanban.md` — 5 passos, colunas do kanban, cards, anexos.
- `engenharia/liberacao-para-producao.md` — 4 passos, checklist de pré-requisitos.
- `engenharia/apontar-hh.md` — 5 passos, grade semanal, fechamento sexta.
- `engenharia/relatorios-hh.md` — 4 passos, KPIs de produtividade, exportação.

### Assets
- 13 screenshots reais capturados via Playwright autenticado em `src/assets/docs/compras/` (6) e `src/assets/docs/engenharia/` (7): solicitações, cotações, ordens, nova OC, auditoria, projetos, ETP, kanban de etapas, mecânico, elétrico, H/H.

## 0.90.0 — Ajuda: artigos ricos com TL;DR, passos e screenshots — Lote 1 Comercial — 2026-07-15

### Infraestrutura de conteúdo
- **Novos blocos de conteúdo** (`src/components/ajuda/DocBlocks.tsx`) — `TldrBox` (resumo destacado no topo), `Step` (passo numerado com imagem à direita e link para ampliar), `Callout` (variantes `dica`/`atencao`/`erro`/`nota`) e `Figure`. Componentes acessíveis (role="note", aria-labels) e responsivos.
- **Shortcodes em markdown** — `ArticleRenderer` agora processa `remark-directive` e mapeia `:::tldr`, `:::step{n title img alt}`, `:::dica{title}`, `:::atencao{title}`, `:::erro{title}` e `:::nota{title}` para os componentes acima. Atributo `img` referencia um filename e é resolvido para a URL CDN via `src/content/docs/media.ts` (glob de `.asset.json` por categoria).
- **Pipeline de screenshots** — Playwright autenticado captura telas reais do sistema (viewport 1440×900) e cada imagem vira asset CDN via `lovable-assets create`, com pointer JSON em `src/assets/docs/<categoria>/`.

### Lote 1 — Comercial (8 artigos reescritos)
Todos os artigos do módulo Comercial receberam o novo padrão: TL;DR no topo, passos numerados com screenshot em cada passo relevante, callouts de dica/atenção/erro comum e seção "Ver também".
- `comercial/visao-geral.md` — fluxo do módulo com imagem do pipeline.
- `comercial/pipeline-de-oportunidades.md` — 4 passos com prints do kanban, do diálogo "Nova oportunidade" e do painel de edição.
- `comercial/novo-orcamento.md` — 5 passos com wizard, lista de orçamentos e etapas de condição/idioma.
- `comercial/corrigir-orcamento.md` — 4 passos, alerta sobre aditivo após ganho.
- `comercial/converter-oportunidade-em-orcamento.md` — 4 passos + reversão.
- `comercial/fechar-oportunidade.md` — Ganho e Perdido lado a lado, com motivos padronizados e erros comuns.
- `comercial/rfq-publico-e-formularios.md` — configuração, distribuição e criação automática de oportunidade a partir de submissão pública.
- `comercial/previsao-e-saude.md` — indicadores, sinais de alerta e roteiro de reunião semanal.

### Assets
- 8 screenshots do módulo Comercial em `src/assets/docs/comercial/` (pipeline, orçamentos, wizard, formulários RFQ, dashboard, diálogos de nova oportunidade e edição, detalhe de orçamento).

### Dependências
- `remark-directive@4.0.0` e `rehype-raw@7.0.0`.

## 0.89.3 — Ajuda: Administração e Site público documentados — 2026-07-15


### Central de ajuda
- **Cards corrigidos** — a categoria Administração agora usa o mesmo identificador dos artigos (`admin`), então o card abre a lista de artigos existentes em vez de cair em categoria vazia. Mantido alias para `/ajuda/documentacao/administracao`.
- **Site público documentado** — adicionados 5 artigos em `src/content/docs/articles/site-publico/`: visão geral, home/SEO, catálogo de equipamentos, formulários RFQ públicos, contato/captação e links públicos/segurança.
- **Categorias alinhadas** — Know-how passa a aparecer na Central de ajuda com os artigos já existentes.

## 0.89.2 — Logística: motivo obrigatório, anexos na trilha e export PDF/CSV — 2026-07-15

### Módulo `/logistica/embarques`
- **Motivo obrigatório para transições críticas** — ao mudar o status para `embarcado`, `entregue` ou `cancelado` o motivo passa a ser exigido (mínimo 5 caracteres). O diálogo destaca o campo com asterisco, mostra mensagem de validação inline e o botão "Confirmar" fica desabilitado até o motivo ser preenchido. `programado` continua opcional. Validação replicada no servidor em `setStatus` para impedir bypass.
- **Anexos no motivo/comentário** — o diálogo de mudança de status agora aceita múltiplos arquivos. Cada arquivo é enviado ao bucket `logistica-embarques` (categoria `status`), registrado em `logistica_embarque_anexos` e vinculado à linha da trilha por meio da nova coluna `logistica_embarque_status_log.anexo_ids uuid[]`. Na seção **Trilha de auditoria** os anexos aparecem como chips clicáveis logo abaixo do motivo, abrindo em nova aba via URL assinada.
- **Exportar trilha em PDF ou CSV** — novo botão "Exportar" (dropdown PDF/CSV) no cabeçalho da seção de auditoria. Server function `exportStatusLog` retorna o arquivo em base64: CSV `;`-separado com BOM UTF-8 (Excel-friendly) contendo data/hora, transição, autor, motivo e nomes dos anexos; PDF A4 tabular gerado com `@react-pdf/renderer`.
- **Migração aplicada** — `20260718120000_logistica_status_log_anexos.sql` adiciona `anexo_ids uuid[]` (default `{}`) + índice GIN em `logistica_embarque_status_log`.

## 0.89.1 — Logística: PDF do romaneio, trilha de auditoria e filtros avançados — 2026-07-15

### Módulo `/logistica/embarques`
- **Exportar romaneio em PDF** — nova ação no topo do detalhe (`FileText` "Exportar PDF") gera um PDF A4 com o cabeçalho da empresa (via `documento_layout_config` do tipo `romaneio`, com fallback), dados de cliente/equipamento/transporte, tabela de itens com totais de quantidade/peso/volume, observações, trilha de status e área de assinaturas (Expedidor · Transportadora · Recebedor). Um diálogo permite escolher anexos: imagens (`image/*`) são embutidas como páginas dedicadas; demais tipos aparecem listados como referência. Servidor: `generateRomaneioPdf` em `src/lib/logistica.functions.ts` + componente `src/lib/docs/romaneio-pdf.tsx` (react-pdf).
- **Trilha de auditoria por embarque** — nova tabela `logistica_embarque_status_log` (`from_status`, `to_status`, `notas`, `changed_by`, `changed_at`) preenchida automaticamente por `setStatus` sempre que o status muda. Nova seção **Trilha de auditoria** no detalhe do embarque mostra a linha do tempo com data/hora, transição (badge → badge) e nome do responsável (via `profiles`). Server function `listStatusLog` inclui `actor_nome`/`actor_email`.
- **Filtros e busca no grid** — a listagem `/logistica/embarques` ganhou filtros por **cliente**, **transportadora** e **faixa de datas** (previsão de saída), somados aos filtros existentes de status e busca livre por número/NF/destino. Botão "Limpar filtros" e contador de resultados. Novo endpoint `listClientesComEmbarques` lista apenas os clientes que já possuem embarques.
- **Migração aplicada** — `20260717120000_logistica_status_log.sql` com GRANTs e RLS (SELECT autenticado; INSERT para `admin`/`manager`/`field`).

## 0.89.0 — Logística & Embarque: MVP funcional — 2026-07-15




### Módulo `/logistica/embarques`
- **Migração aplicada** (`20260716120000_logistica_embarques.sql`) — 3 tabelas: `logistica_embarques` (cabeçalho com `numero` auto `EMB-YYYY-NNNN`, projeto, transportadora, status, previsão/data de saída, data de entrega, NF, destino, observações), `logistica_embarque_itens` (romaneio com descrição, quantidade, peso, volume, serial) e `logistica_embarque_anexos` (fotos, NF/XML, comprovantes). Enum `logistica_embarque_status` (rascunho/programado/embarcado/entregue/cancelado). Sequence + trigger para número legível. GRANTs padrão. RLS: leitura para autenticados, escrita para `field`/`manager`/`admin`, delete apenas `admin`.
- **Storage** — bucket privado `logistica-embarques` (aplicado `20260716120100_logistica_storage_policies.sql`) com RLS em `storage.objects`: leitura autenticada, upload por `field`/`manager`/`admin`, delete por dono ou `manager`/`admin`. URLs assinadas por 1h via server function.
- **Server functions** (`src/lib/logistica.functions.ts`): `listEmbarques` (busca por número/NF/destino, filtros por status/projeto), `getEmbarque` (cabeçalho + itens + anexos), `listProjetosDisponiveis`, `listTransportadoras`, `createEmbarque`, `updateEmbarque`, `setStatus` (grava `data_saida`/`data_entrega` automaticamente ao marcar embarcado/entregue), `addItem`, `removeItem`, `registrarAnexo`, `removerAnexo` (com cleanup do storage), `getAnexoSignedUrl`.
- **Rotas**:
  - `/logistica/embarques` — tabela com busca e filtro por status.
  - `/logistica/embarques/novo` — criação a partir de projeto + transportadora + previsão + destino.
  - `/logistica/embarques/$id` — cabeçalho editável, tabela do romaneio (add/remove inline), upload de anexos categorizados (foto/nf/comprovante/outro), botões de fluxo Programar → Marcar embarcado → Marcar entregue.
- **Sidebar** — nova seção "Logística → Embarques" ligada ao módulo `logistica`.

### Fora do MVP (mantido conforme plano)
- Cálculo de frete, integração com transportadora, cotação de seguro, geração de etiqueta, notificações automáticas por e-mail ao cliente. A janela de garantia registra apenas a `data_entrega`.

---

## 0.88.1 — Changelog agora renderiza direto do CHANGELOG.md — 2026-07-15

### Correção
- Página `/changelog` deixou de depender de um array hardcoded em `src/routes/_authenticated/changelog.tsx` e passa a ler o `CHANGELOG.md` da raiz do projeto via `?raw` no build do Vite. Toda entrada nova adicionada ao arquivo aparece automaticamente na UI — não é mais possível "esquecer" de espelhar no TSX (motivo pelo qual as versões 0.85.x, 0.86.x, 0.87.x e 0.88.0 não estavam listadas).
- Ordenação passou a ser por data DESC (empate por versão DESC), então a versão mais recente aparece sempre no topo.
- Renderizador simples de markdown: `### Seção` vira separador de bloco dentro da entrada; `**negrito**` e `` `código` `` inline são preservados; hífens no meio de títulos não quebram mais o parser (só em-dash/en-dash separam versão‧título‧data).
- Palavra "" removida de todo o histórico do CHANGELOG (paths, referências e menções ao provedor), preservando o restante do texto.

---

## 0.88.0 — Know-how & Treinamentos: MVP funcional — 2026-07-15

### Módulo `/know-how`
- **Migração aplicada** (`20260715120000_know_how.sql`) — 4 tabelas: `kh_colecoes`, `kh_itens`, `kh_item_versoes`, `kh_visualizacoes`. Enums `kh_item_tipo` (artigo/video/pdf/checklist) e `kh_item_status` (rascunho/em_revisao/publicado/arquivado). RLS: leitura pública para autenticados quando `publicado`; escrita restrita a autor + `engineer`/`manager`/`admin`; publicação apenas `manager`/`admin`. GRANTs padrão + gin index em `tags`. Seed com 7 coleções default (Montagem, Elétrica, Comissionamento, FAT/SAT, Comercial, Compras, Segurança).
- **Server functions** (`src/lib/know-how.functions.ts`): `listColecoes`, `listItens` (busca + filtro por coleção), `getItemBySlug` (registra visualização), `createItem` (rascunho com slug único), `updateItem`, `enviarParaRevisao`, `listRevisao`, `aprovarItem` (grava versão + publica), `solicitarAjuste`.
- **Rotas**:
 - `/know-how` — grid por coleção com busca por título/resumo, filtro por coleção, badges de tipo/status/tags.
 - `/know-how/$slug` — leitura com corpo/mídia, botão Enviar para revisão (autor) e Editar (autor/gestor). Auditoria automática em `kh_visualizacoes`.
 - `/know-how/novo` — formulário rascunho: coleção, tipo, título, resumo, corpo, mídia URL, tags e papéis-alvo.
 - `/know-how/revisar` — lista `em_revisao` com botões Aprovar/Solicitar ajuste (apenas `manager`/`admin`).
- **Sidebar** — nova seção "Know-how → Biblioteca" ligada ao módulo `know_how`.

### Fora do MVP (adiado)
- Trilhas, quiz, checkpoints, certificações, transcrição automática de vídeo, favoritos, "últimos vistos", bloqueio de cards de Produção por certificação. A documentação (0.87.1) já descreve o comportamento-alvo dessas features.

### Próxima etapa
- Fase 2 — Logística & Embarque (romaneio, expedição, entregas), conforme `docs/plan.md`.

---



## 0.87.2 — Documentação & FAQ: Etapa 4 sprint 11 (Comercial complemento) — 2026-07-15

### Comercial (`src/content/docs/articles/comercial/`)
- +3 artigos complementares: `visao-geral`, `fechar-oportunidade`, `previsao-e-saude` (soma com `novo-orcamento`, `corrigir-orcamento`, `converter-oportunidade-em-orcamento`, `pipeline-de-oportunidades`, `rfq-publico-e-formularios` já existentes).
- +4 FAQs: `reverter-oportunidade-ganha`, `desconto-acima-alcada`, `follow-up-perdido-preco`, `nova-revisao-vs-nova-oportunidade`.
- Cobertura: escopo do módulo e integrações (Clientes, Engenharia, Compras, Documentos), fluxo Ganho/Perdido com motivo obrigatório + efeitos colaterais (projeto criado, cliente Ativo, BOM liberada), reversão de Ganho em 24 h sem movimentação, saúde do pipeline com forecast ponderado por estágio, oportunidades estagnadas (amarelo/vermelho), alçada de desconto por papel com margem calculada e auditoria, follow-up de Perdido por preço (30/60/90 d, reabertura até 12 m), regra revisão × oportunidade nova.

### Próxima etapa
- Etapa 4 sprint 12 — Logística & Embarque (expedição, romaneio, transportadora).

---

## 0.87.1 — Documentação & FAQ: Etapa 4 sprint 10 (Know-how & Treinamentos) — 2026-07-15

### Know-how (`src/content/docs/articles/know-how/`)
- 5 artigos: `visao-geral`, `publicar-conteudo`, `trilhas`, `certificacoes`, `busca-e-organizacao`.
- 5 FAQs: `quem-publica-know-how`, `editar-artigo-publicado`, `card-bloqueado-certificacao`, `reprovei-quiz-quando-refazer`, `video-grande-nao-sobe`.
- Cobertura: biblioteca interna organizada por coleção/tipo/papel-alvo, fluxo rascunho → revisão obrigatória (RLS) → publicação com versionamento (1.0/1.1/correção urgente notificando quem já consumiu), trilhas de qualificação com itens ordenados + checkpoints (quiz 80% e/ou checklist prático assinado por `manager`), certificações com validade 6/12/24 m, aviso 30 dias antes, bloqueio de cards de Produção/FAT ao expirar (com "Ir para a trilha" e liberação temporária 48 h por `manager`), revogação auditada, re-certificação incremental (só checkpoints + itens novos da versão), carência de 24 h após reprovação e suspensão 7 d após 3 reprovações, busca com transcrição automática de vídeo, limite 500 MB upload direto + YouTube não listado.

### Próxima etapa
- Etapa 4 sprint 11 — Comercial (pipeline, oportunidades, orçamento).

---

## 0.87.0 — Documentação & FAQ: Etapa 4 sprint 9 (Administração) — 2026-07-15

### Administração (`src/content/docs/articles/admin/`)
- 5 artigos: `visao-geral`, `gerenciar-usuarios`, `permissoes-por-papel`, `auditoria`, `configuracoes`.
- 6 FAQs: `como-convidar-usuario`, `desativar-usuario-preserva-historico`, `porque-nao-consigo-marcar-admin`, `mudar-sla-afeta-chamados-existentes`, `quem-alterou-permissao`, `perdi-acesso-admin`.
- Cobertura: escopo de `/admin` e quem enxerga (`admin` total, `manager` delegado), gestão de usuários (convite com link de 24 h, múltiplos papéis, desativação preservando histórico, reset via `resetPasswordForEmail`), matriz papel × módulo em `/admin/permissoes` com regras validadas no servidor (Dashboard obrigatório, Administração só para `manager`, Qualidade→Processos, Pós-venda/Comercial→Clientes) e auto-fix, trilha imutável em `audit_log` (papéis, permissões, brand, OCs, chamados, docs restritos) com retenção 730 dias e export CSV auditado, SLA por origem×prioridade fotografado na criação do chamado, catálogos versionados (segmentos, países, categorias, condições, transportadoras), integrações (Firecrawl, Supabase Auth, AI Gateway) e regra de contingência de manter ≥ 2 `admin`.

### Próxima etapa
- Etapa 4 sprint 10 — Know-how & Treinamentos (biblioteca interna, trilhas, certificações).

---

## 0.86.9 — Documentação & FAQ: Etapa 4 sprint 8 (Documentos) — 2026-07-14

### Documentos (`src/content/docs/articles/documentos/`)
- 5 artigos: `visao-geral`, `anexar-evidencias-por-etapa`, `indexacao-por-cliente-e-projeto`, `templates-e-versionamento`, `permissoes-e-compartilhamento`.
- 5 FAQs: `anexo-nao-aparece-cliente`, `tamanho-limite-anexo`, `reclassificar-documento`, `revogar-link-publico`, `versao-antiga-template`, `anexo-orfao`.
- Cobertura: Central de Documentos como repositório único indexado por cliente/projeto/tipo, regras de upload por contexto (kanban, checklist FAT/SAT, chamado) com herança automática de `cliente_id`/`projeto_id`/`etapa_id`, filtros e exportação ZIP/CSV, reclassificação de metadados, templates versionados (orçamento, ETP, RFQ, OC, FAT, SAT) com blocos ativáveis e nova versão preservando emissões antigas, permissões por papel × vínculo + sales_liberacao, compartilhamento via link público com token (expiração até 180 dias, revogação, auditoria de acesso) e documentos Restritos.

### Próxima etapa
- Etapa 4 sprint 9 — Administração (usuários, permissões, auditoria e configurações).

---

## 0.86.8 — Documentação & FAQ: Etapa 4 sprint 7 (Produção) — 2026-07-14

### Produção (`src/content/docs/articles/producao/`)
- 5 artigos: `visao-geral`, `kanban-montagem`, `executar-etapa`, `retrabalho-e-nc-interna`, `liberar-para-fat`.
- 6 FAQs: `etapa-travada-a-fazer`, `anexar-evidencia-checklist`, `retrabalho-conta-produtividade`, `reabrir-etapa-concluida`, `verificacoes-liberar-para-fat`, `fat-reprovado-reabre-producao`.
- Cobertura: pré-requisitos de entrada (ETP aprovado, BOM revisada, H/H fechado, kit disponível), kanban `/producao/montagem` com colunas A fazer → Em execução → Aguardando → Pronta → Concluída, checklist com evidências obrigatórias e medições em faixa, apontamento de horas (0,25 h mín / 12 h máx / retroativo 7 dias), retrabalho com causa raiz (projeto/material/execução/terceiro), reabertura de etapa por `manager`/`admin` com auditoria, liberação para FAT com checagem automática e efeitos pós-FAT (aprovado / com ressalvas → SAT / reprovado).

### Próxima etapa
- Etapa 4 sprint 8 — Documentos (Central de Documentos, templates, versionamento, permissões).

---

## 0.86.7 — Documentação & FAQ: Etapa 4 sprint 6 (Pós-vendas) — 2026-07-14

### Pós-vendas (`src/content/docs/articles/pos-vendas/`)
- 6 artigos: `visao-geral`, `abrir-chamado`, `atender-chamado`, `sat-em-campo`, `sla-e-alertas`, `encerrar-e-reabrir`.
- 6 FAQs: `abrir-chamado-interno`, `sla-como-e-calculado`, `reatribuir-chamado`, `cliente-reabrir-chamado`, `sat-a-partir-de-fat`, `sat-encerramento-parcial`.
- Cobertura: caixa unificada de chamados (origens site público / contato / interno), SLA por origem × prioridade em `/admin/sla-chamados` (resposta, resolução, estagnado), chat com o cliente via link seguro, reatribuição/escalonamento, resolução com resumo obrigatório, reabertura em 7 dias, arquivamento automático, ciclo completo de SAT em campo (agendamento → execução mobile → assinatura → laudo PDF) e handoff a partir do FAT aprovado com ressalvas.

### Próxima etapa
- Etapa 4 sprint 7 — Produção (montagem, kanban de etapas, integração com Engenharia).

---

## 0.86.6 — Documentação & FAQ: Etapa 4 sprint 5 (Qualidade + FAT) — 2026-07-14

### Qualidade (`src/content/docs/articles/qualidade/`)
- 6 artigos: `visao-geral`, `agendar-e-preparar-fat`, `executar-fat`, `rnc-e-reprovacao`, `encerrar-fat`, `templates-fat`.
- 5 FAQs: `agendar-fat`, `anexar-foto-fat`, `item-nao-conforme-fat`, `fat-reprovado-gera-sat`, `quem-homologa-fat`.
- Cobertura completa do FAT: fluxo Agendamento → Preparação → Execução → RNC → Homologação → handoff para SAT; regras de evidência (fotos, medições com faixa, anexos obrigatórios), assinaturas (`fat_assinaturas`), RNC (`fat_rnc`) com reteste, templates versionados (`fat_template*`), desfechos Aprovado / Aprovado com ressalvas / Reprovado e efeitos na expedição e no Pós-vendas.

### Próxima etapa
- Etapa 4 sprint 6 — Pós-vendas (SAT em campo, chamados com SLA, chat com o cliente).

---

## 0.86.5 — Documentação & FAQ: Etapa 4 sprint 4 (Compras) — 2026-07-14

### Compras (`src/content/docs/articles/compras/`)
- 5 artigos: `visao-geral`, `criar-solicitacao`, `cotacao-multiplos-fornecedores`, `emitir-e-aprovar-oc`, `auditoria-de-compras`.
- 5 FAQs: `cotacao-3-fornecedores`, `quem-aprova-oc`, `alterar-oc-aprovada`, `auditoria-compras`, `compra-spot-sem-cotacao`.
- Cobertura: fluxo solicitação → cotação → OC, RFQ interna com convite público a fornecedores, comparativo de propostas, alçadas de aprovação (spot / manager / admin), revisão vs. ajuste leve em OC aprovada, homologação impactando aprovação, trilhas em `cotacao_historico` / `ordem_compra_historico` / `/admin/auditoria`.

### Próxima etapa
- Etapa 4 sprint 5 — Qualidade (revisão mecânica/elétrica, FAT, checklist e RNC).

---

## 0.86.4 — Documentação & FAQ: Etapa 4 sprint 3 (Engenharia + H/H) — 2026-07-14

### Engenharia (`src/content/docs/articles/engenharia/`)
- 6 artigos: `visao-geral`, `criar-etp`, `etapas-e-kanban`, `apontar-hh`, `relatorios-hh`, `liberacao-para-producao`.
- 6 FAQs: `orcamento-em-etp`, `apontar-hh-varios-projetos`, `hh-retroativo`, `corrigir-hh`, `hh-orcado-vs-apontado`, `travas-liberacao-producao`.
- Foco especial em **Homens-Hora (H/H)**: como apontar em `/engenharia/hh`, regras (0,25 h mínimo, 12 h máximo diário soft, janela retroativa de 7 dias), edição/auditoria, relatórios por projeto/engenheiro/disciplina, produtividade (concluído vs. apontado) e comparação com o orçado do template do equipamento.

### Próxima etapa
- Etapa 4 sprint 4 — Compras (solicitação, cotação com múltiplos fornecedores, OC, aprovação, impressão, auditoria).

---

## 0.86.3 — Documentação & FAQ: Etapa 4 sprint 2 (Clientes & Fornecedores) — 2026-07-14

### Clientes & Fornecedores (`src/content/docs/articles/clientes-fornecedores/`)
- 5 artigos: `cadastrar-cliente`, `importar-clientes-em-lote`, `mesclar-clientes-duplicados`, `cadastrar-fornecedor`, `categorias-e-homologacao`.
- 4 FAQs: `importar-clientes-em-lote`, `mesclar-cliente-duplicado`, `homologar-fornecedor`, `historico-compras-fornecedor`.
- Cobertura: cadastro multipaís (BR/AR/CL/CO/CR/PE/PY) com enriquecimento, importação CSV em lote, deduplicação/mesclagem, ciclo de homologação de fornecedor e uso das categorias em cotações/OC.

### Build
- `package.json`: `NODE_OPTIONS=--max-old-space-size=8192` em `build` e `build:dev` (corrige OOM do Nitro em `rendering chunks`).

### Próxima etapa
- Etapa 4 sprint 3 — Engenharia (ETP, mecânico/elétrico, etapas, H/H, liberação para produção).

---

## 0.86.2 — Documentação & FAQ: Etapa 4 sprint 1 (Comercial) — 2026-07-14

### Comercial (`src/content/docs/articles/comercial/`)
- 5 artigos: `pipeline-de-oportunidades`, `novo-orcamento`, `corrigir-orcamento`, `converter-oportunidade-em-orcamento`, `rfq-publico-e-formularios`.
- 4 FAQs (`src/content/docs/faq/`): `duplicar-orcamento`, `idioma-do-pdf`, `reabrir-oportunidade-perdida`, `link-publico-rfq`.
- Cobertura: pipeline/kanban, wizard de orçamento com idioma pt/es/en, versionamento via **Corrigir**, conversão de oportunidade ganha, formulários RFQ públicos e captação.

### Validação
- `import.meta.glob` já carrega os novos arquivos; nenhum registro manual necessário.
- Sem alteração de rota — os artigos aparecem automaticamente em `/ajuda/documentacao/comercial`.

### Próxima etapa
- Etapa 4 sprint 2 — Clientes & Fornecedores (cadastro manual, importação CSV, homologação, mescla de duplicados).

---

## 0.86.1 — Documentação & FAQ: Etapas 1+2+3 (infra + piloto "Conta") — 2026-07-14

### Infra de conteúdo (Markdown no repositório)
- Deps: `react-markdown`, `remark-gfm`, `rehype-slug`, `rehype-autolink-headings`, `fuse.js`.
- Conteúdo em Markdown puro (`src/content/docs/articles/**/*.md` e `src/content/docs/faq/*.md`) — carregado via `import.meta.glob(..., { query: "?raw", eager: true })`. Sem dependência de Buffer/gray-matter.
- `src/content/docs/types.ts` define categorias, tipos (`guia|conceito|referencia|troubleshooting`), níveis, papéis e a lista `CATEGORIES` (11 áreas espelhando `docs/mapa-sistema.md`).
- `src/content/docs/loader.ts` parseia frontmatter, extrai excerpt (primeiro parágrafo) e expõe `ARTICLES`, `FAQS`, `getArticle`, `getArticlesByCategory`, `getFaqsByCategory`.

### Componentes (`src/components/ajuda/`)
- `DocsShell` — layout com sidebar de categorias (sticky, ativa por pathname) + área principal.
- `DocSearch` — busca client-side com **Fuse.js** sobre artigos + FAQs (título, pergunta, excerpt). Dropdown com até 8 resultados, tags de categoria.
- `ArticleRenderer` — Markdown → HTML com `remark-gfm`, `rehype-slug`, `rehype-autolink-headings`, estilizado via `prose` mapeada nos tokens `--text-*`/`--bg-*`.
- `FaqAccordion` — filtro por texto + categoria, agrupamento por categoria, âncoras por FAQ id (deep-link via `/ajuda/faq#<id>`).
- `ArticleFooter` — "Atualizado em <data>" (pt-BR), 👍/👎 (toast) e link "Sugerir melhoria" para `/pos-vendas/chamados`.

### Rotas novas
- `/ajuda` — hub com busca, contadores e grid de categorias (`ajuda.index.tsx`).
- `/ajuda/documentacao` — lista de categorias com contagem de artigos (reescrita).
- `/ajuda/documentacao/$categoria` — lista de artigos + snippet de FAQ da categoria; `notFound` para categoria inválida.
- `/ajuda/documentacao/$categoria/$slug` — artigo renderizado + relacionados + footer; `notFound` para artigo inválido.
- `/ajuda/faq` — passa a consumir `FAQS` do loader (reescrita).
- Todas com `robots: noindex` (rotas autenticadas).

### Sidebar
- Grupo **Ajuda** ganhou item **Central de ajuda** (`/ajuda`) como pai; Documentação/FAQ/Changelog permanecem.

### Piloto "Conta & primeiros passos"
- 5 artigos: `login-e-recuperacao-de-senha`, `editar-perfil-e-avatar`, `trocar-senha-e-sessoes`, `papeis-e-permissoes`, `navegacao-e-atalhos`.
- 5 FAQs: e-mail de recuperação, avatar, papel errado, múltiplos papéis, sessões ativas.

### Validação
- Typecheck `tsgo --noEmit`: limpo.
- Smoke via `curl http://localhost:8080` — todas 200: `/ajuda`, `/ajuda/documentacao`, `/ajuda/documentacao/conta`, `/ajuda/documentacao/conta/papeis-e-permissoes`, `/ajuda/faq`.

### Próxima etapa
- Etapa 4 sprint 1 — Comercial: 1 visão geral + 3–6 guias + 5–10 FAQs (Pipeline, Orçamento wizard/PDF/versionamento/correção, RFQ público).

---

## 0.86.0 — Documentação & FAQ: Etapa 0 (mapa do sistema) — 2026-07-14

### Planejamento aprovado
- Plano de 6 etapas para produção da Documentação e FAQ salvo em `docs/plan.md`. Decisões: escopo apenas dentro de `_authenticated`, pt-BR na v1, ordem Conta → Comercial → Engenharia → Compras → Qualidade → Pós-vendas → Produção → Administração → Site público, conteúdo em **MDX no repositório** (`src/content/docs/*.mdx`, `src/content/faq/*.mdx`).

### Etapa 0 — Mapa do sistema
- Criado `docs/mapa-sistema.md` cobrindo 11 áreas (Conta, Comercial, Clientes/Fornecedores, Engenharia, Compras, Qualidade, Pós-vendas, Produção, Documentos, Administração, Site público). Para cada módulo: objetivo, papéis, rotas reais extraídas de `src/routes/_authenticated/` e `src/routes/`, fluxos principais, integrações (Supabase, edge functions, AI, Storage) e FAQs candidatas.
- Matriz papel × módulo resumindo acessos por `app_role` (`admin`, `manager`, `sales`, `engineer`, `quality`, `purchasing`, `production`, `support`).
- Backlog inicial de 6 artigos para o piloto "Conta & primeiros passos" (Etapa 3).

### Próxima etapa (aguardando confirmação)
- Etapa 1+2: infra MDX (`@mdx-js/rollup`, `remark-gfm`, `rehype-slug`, `rehype-autolink-headings`, `fuse.js`, `gray-matter`), estrutura de rotas `/ajuda`, `/ajuda/documentacao/*`, `/ajuda/faq`, componentes `DocsShell`/`DocSearch`/`ArticleRenderer`/`FaqAccordion`, script `scripts/build-docs-index.ts` para índice de busca.

---

## 0.85.2 — Canonical/og consistency para sltkamericas.com + status E2E — 2026-07-14

### SEO — canonical e og:image sem duplicidade nas rotas públicas
- Removidas as tags `og:image` e `twitter:image` de `src/routes/__root.tsx`. Regra do TanStack: `head()` do root concatena em toda match, então uma imagem no root sobrescreve toda leaf. Agora ficam **apenas** nas folhas que definem imagem própria.
- Adicionado `canonical` + `og:url` (absolutos para `https://sltkamericas.com`) em cada rota pública:
 - `/` — canonical `https://sltkamericas.com/`, `og:image` absoluto para `solutek-fachada.jpg`.
 - `/contato` — canonical `https://sltkamericas.com/contato`, sem `og:image` (sem imagem-folha adequada).
 - `/equipamentos` — canonical `https://sltkamericas.com/equipamentos`, sem `og:image`.
 - `/equipamentos/envasadora` — canonical `https://sltkamericas.com/equipamentos/envasadora`, `og:image` absoluto para `envasadora-hero.webp`.
 - `/equipamentos/$slug` (dinâmica) — canonical + `og:url` derivados de `params.slug`, `og:image` absoluto a partir de `p.og_image_url` quando presente; `notFound` recebe `robots: noindex`.
- **Validação por Playwright contra o build dev** (localhost:8080, `DOMContentLoaded`, `document.head`): cada rota pública emite exatamente 1 `link[rel=canonical]`, 1 `meta[og:url]`, 1 `meta[og:title]`, 1 `meta[description]`, 0-1 `meta[og:image]` (só onde há imagem-folha) e nenhum vazamento do root. Todos os URLs absolutos apontam para `https://sltkamericas.com`.
- Typecheck `tsgo --noEmit`: limpo.

### E2E `sltkamericas.com` — status
- **Não executado.** O domínio `sltkamericas.com` ainda não está conectado ao projeto (Project Settings → Domains lista somente `solutek-hub.app`). Rodar Playwright contra `https://sltkamericas.com` retornaria DNS/SSL error antes de qualquer asserção.
- Requisitos pendentes para destravar a execução:
 1. Conectar `sltkamericas.com` em **Project Settings → Domains** (root + `www`) e aguardar status **Active**.
 2. Adicionar `https://sltkamericas.com` como Site URL e `https://sltkamericas.com/**` como Redirect URL em **Supabase → Authentication → URL Configuration** (senão o `resetPasswordForEmail` do `/forgot-password` cai em 400 no domínio novo).
 3. Prover `E2E_BASE_URL=https://sltkamericas.com` + `E2E_STORAGE_ADMIN` (storage-state gerado por login manual do admin) e opcionalmente `E2E_STORAGE_{MANAGER,ENGINEER,NOROLE}` — a suíte `e2e/usuarios-permissoes.spec.ts` já skipa os specs quando faltam, mantendo o CI verde até isso estar disponível.
- Precheck estático de CORS/redirect no código: `safeRedirect` (`src/routes/login.tsx`) só aceita paths same-origin (bloqueia open-redirect ao trocar de domínio); Supabase client (`src/integrations/supabase/client.ts`) usa `localStorage` sem cookies domain-fixed, então a troca de domínio não gera preflight CORS extra; auth reset usa `${window.location.origin}/reset-password` (adapta automaticamente). Nenhum código-fonte referencia `.app` em runtime de auth.

---

## 0.85.1 — Preparação para domínio sltkamericas.com (domain-portability audit) — 2026-07-14

### Portabilidade de domínio
- Varredura de URLs hardcoded no front: nenhum acoplamento a `*.app` no fluxo runtime. Auth reset (`resetPasswordForEmail`) já usa `${window.location.origin}/reset-password`, portanto adapta-se automaticamente a `https://sltkamericas.com`.
- Redirect do `/login` (`safeRedirect`) restringe a paths same-origin (`^/(?![/\\])`), bloqueando open-redirect ao trocar de domínio.
- Sessão Supabase em `localStorage` (sem cookies com Domain fixo) — nenhuma dependência de `.app`; a troca de domínio não invalida sessão nem CORS.
- Removidas do `src/routes/__root.tsx` as tags duplicadas `og:image`/`twitter:image` que apontavam para um screenshot do preview `id-preview--….app`; agora só o `faviconUrl` é usado como fallback, e cada rota-folha define seu próprio `og:image` quando aplicável.
- `canonical_base_url` continua configurável em `/admin/configuracoes` (Admin) — usuário deve definir `https://sltkamericas.com` antes de publicar.

### Checklist operacional para publicar em sltkamericas.com
1. Supabase Auth → Authentication → URL Configuration: adicionar `https://sltkamericas.com` em **Site URL** e `https://sltkamericas.com/**` em **Redirect URLs** (mantendo o preview `*.app` durante a transição).
2. `/admin/configuracoes` → **URL base canônica** = `https://sltkamericas.com`.
3. DNS: registros A/TXT conforme fluxo do Custom Domain (Project Settings → Domains).
4. Após propagação, refazer o smoke test do login, reset de senha e `/admin/usuarios`.

### Verificações
- Typecheck `tsgo --noEmit`: limpo.
- Nenhuma referência a `.app` em código que afete auth/CORS.

---

## 0.85.0 — Varredura Usuários & Permissões: mapeamento de rotas e validação das camadas — 2026-07-14

### Auditoria de segurança do módulo Usuários
- Mapeadas as rotas admin (`/admin`, `/admin/usuarios`, `/admin/auditoria`, `/admin/configuracoes`, `/admin/sla-chamados`, `/admin/suporte`, `/admin/rfq-tipos`, `/admin/paginas-equipamentos`, `/admin/etapas-equipamentos`, `/admin/banco`, `/admin/contato`) e confirmado que `admin.tsx` renderiza `<Outlet />` corretamente para o layout com tabs.
- Validadas as **5 camadas de permissão** ativas: (1) DB com `user_roles` + enum `app_role` e RPCs SECURITY DEFINER (`has_role`, `is_user_active`, `count_active_admins`, `max_role_rank`, `role_rank`); (2) guards server-side em `src/lib/admin-guard.ts` (`assertActiveUser`, `assertAdmin`, `assertAdminOrManager`, `assertEngineerOrHigher`, `assertCanActOn` — bloqueia self-action, escalação de privilégio e remoção do último admin); (3) matriz por módulo em `role_module_permissions` (14 módulos × 8 roles = 112 linhas, sem gaps); (4) front-end via `useMyModules()` filtrando o `AppSidebar` e `_authenticated/route.tsx` redirecionando anônimos para `/auth`; (5) UI com gate extra por `role === "admin"` em `/admin/usuarios`.
- Estado atual do banco: 9 perfis (0 desabilitados, 0 soft-deleted), 9 role assignments, **1 admin ativo** — proteção `count_active_admins` impede rebaixar/desativar/apagar este único admin (código `last_admin`).
- Nova suíte E2E `e2e/usuarios-permissoes.spec.ts` (Playwright) cobrindo: CRUD de usuários (criar com senha temporária revelada uma vez, editar roles, reset de senha, desativar/reativar), autoproteção do admin logado, filtros por role/status/busca, deep-link `?tab=permissoes`, regras da matriz (`qualidade-requires-processos`, `admin-only-manager`) e guards de hierarquia (engineer, manager e sem-role bloqueados; último admin não pode ser desativado). Segue o padrão scaffold — requer `E2E_BASE_URL` + `E2E_STORAGE_ADMIN` (e opcionalmente `E2E_STORAGE_{MANAGER,ENGINEER,NOROLE}`); ausentes, os testes são pulados mantendo o CI verde.
- Typecheck `tsgo --noEmit` limpo.

## 0.83.0 — Caixa de entrada unificada: Contato + Chamados com SLA, prioridade e filtros 'meus' — 2026-07-08

### Pós-vendas / Chamados
- Mensagens do formulário `/contato` do site institucional agora entram como chamados (origem `contato_site`), consolidadas em `/pos-vendas/chamados`. Item **Mensagens de contato** removido do Admin; `/admin/contato` redireciona para a lista de chamados filtrada por origem.
- Novas colunas em `chamados`: `origem` (Suporte/Contato do site/Interno), `prioridade` (Baixa/Média/Alta/Crítica) e SLA calculado por trigger no INSERT/UPDATE (Crítica 1h/4h · Alta 4h/24h · Média 8h/72h · Baixa 24h/7d). `first_response_at` gravado automaticamente na primeira resposta do atendente.
- Tela `/pos-vendas/chamados` ganhou filtros por origem, prioridade, escopo ('Meus chamados' / 'Sem atendente') e checkbox 'SLA estourado'; filtros persistem em search params. Novas colunas: badge de origem, prioridade, relógio de SLA (verde/âmbar/vermelho).
- Detalhe do chamado exibe selectors de prioridade (recalcula SLA on-change) e de atendente (reatribuir para qualquer admin/manager/engineer). Cabeçalho mostra badges de origem, status, prioridade e dois relógios de SLA (resposta e resolução). Card de equipamento fica oculto para mensagens do site.
- Pendências do sidebar agora detalham o balde de Chamados em quatro linhas: abertos, aguardando resposta interna, mensagens do site e SLA estourado. Contagem de `/admin/contato` removida.

### Banco & backend
- Migração `20260708120000_chamados_unificados.sql`: colunas `prioridade`, `sla_resposta_at`, `sla_resolucao_at`, `first_response_at`; novo enum `chamado_prioridade`; valor `contato_site` adicionado ao enum `chamado_origem`; `numero_serie` relaxado para nullable.
- Migração `20260708120100_migrar_contato_para_chamados.sql`: dados legados de `contato_mensagens`/`contato_respostas` migrados 1:1 para `chamados` + `chamado_mensagens` (idempotente).

## 0.84.0 — Configuração de SLA por categoria de chamado + notificações lidas/não lidas — 2026-07-07

### Admin
- Nova página **Admin › SLA de Chamados** (`/admin/sla-chamados`) para editar prazos de resposta, resolução e estagnação por origem (site público, interno, contato do site) e prioridade (crítica, alta, média, baixa).
- Seed padrão aplicado para as origens existentes: `site_publico`, `interno` e `contato_site`.

### Banco & backend
- Nova migration `20260714120000_chamados_sla_config.sql`: tabela `chamado_sla_config` (origem, prioridade, resposta_horas, resolucao_horas, estagnado_horas) com GRANTs e RLS; função `public.sla_horas_por_chamado(p_origem, p_prioridade)` lookup seguro.
- Trigger `tg_chamados_calc_sla` e cron `chamados_gerar_alertas` passam a consultar `chamado_sla_config` em vez de usar valores fixos; alertas de SLA estourado e estagnação respeitam a configuração dinâmica.

### Notificações
- Tabela `notificacoes_usuario` ganha coluna `lida_em`; server functions `marcarComoLida` e `marcarTodasLidas` em `src/lib/notificacoes.functions.ts`.
- `NotificationsBell` mostra filtro **Todas / Não lidas**, highlight em itens não lidos e ação "Marcar todas como lidas".

## 0.76.0 — Etapas por disciplina + BOM auto-seed no equipamento + refino do fluxo Compras/BOM — 2026-07-05

### Etapas por disciplina (novo módulo dentro do modal do equipamento)
 - Tabelas `equipamento_disciplina_etapas` (Kanban de etapas por disciplina, com `parent_id` para subtarefas, `status`, `prioridade`, `data_vencimento`, `responsavel_id`, `ordem`, `deleted_at`) e `equipamento_etapa_comentarios` (thread por etapa).
 - Função `public.seed_equipamento_disciplinas(_eq_id uuid)` idempotente: cria automaticamente **26 etapas base** (5 Planejamento + 6 Engenharia mecânica + 6 Automação/Elétrica + 5 Qualidade + 4 Pós-venda) + **até 2 etapas extras por família** (envasadora/sachê/rotuladora/paletizadora/inspeção/big-bag/codificação/transporte/encaixotamento) e **projetos R00 mecânico + elétrico** com **BOM base** (estrutura inox, moto-redutor, kit pneumático, painel elétrico, CLP+IHM, sensores) + itens específicos por família.
 - Trigger `trg_cliente_equipamentos_seed_disc` (`AFTER INSERT ON cliente_equipamentos`) dispara o seed automaticamente ao criar qualquer equipamento — **inclusive os criados via aprovação de orçamento**. Confirmado por SQL: um INSERT gera 28 etapas + 13 itens de BOM + 2 projetos R00.
 - RLS: leitura para autenticados; INSERT/UPDATE para admin/gestor/manager e para o responsável da etapa; DELETE restrito a admin/gestor.
- Nova migration `20260708120000_seed_bom_eletrico.sql` amplia a BOM de referência (cabos, disjuntores, inversor, sensores/atuadores, IHM/CLP) para o projeto R00 elétrico e expõe `seed_equipamento_disciplinas` para o botão "Aplicar seed".
- UI — `EquipamentoDrawer` → aba **Disciplina** (`src/components/clientes/equipamentos/DisciplinaTab.tsx`):
 - Kanban por disciplina (Planejamento, Engenharia, Produção/Automação, Qualidade, Pós-venda) com **drag&drop entre colunas mudando o status**, subtarefas expansíveis, edição em `Sheet` (título, descrição, responsável, prazo, prioridade), thread de comentários por etapa e ação de exclusão restrita a admin/gestor.
 - Botão **"Aplicar seed"** em `BomSummaryCard` chama `seed_equipamento_disciplinas` para (re)popular equipamentos vazios; ações restritas escondidas para não-gestor.
 - Timeline reconectada: seção "Etapas por prazo" ordenada por `data_vencimento` ao lado do histórico auditável.

### Ciclo demo (Admin › Banco)
- O botão **"Rodar ciclo demo: orçamento → equipamento"** (`ORC-DEMO-<timestamp>`) agora, ao ser aprovado, cria equipamentos que **já nascem com as 28 etapas + BOM base** — nada precisa ser executado além do próprio botão. Cleanup remove docs, versões, PDFs no Storage e equipamentos marcados com `[auto:orc:<docId>]`, cascateando as etapas via FK `ON DELETE CASCADE`.

### Compras ↔ Necessidades (BOM)
- Nova coluna **Origem** na lista de Necessidades (`/compras/solicitacao`) distinguindo `EQP-<código> · <disciplina>` (aba EQP) de `Projeto R<xx>` (projeto formal), com filtro por origem/disciplina.
- **Deep-link** de `BomSummaryCard` (aba Visão do equipamento) para a lista de necessidades filtrada por aquele equipamento.
- `BomTable` faz join com `ordens_compra` e mostra badge **"Comprado ✓"** com link direto para a OC quando o status é `recebido`.

### Higiene / correções
- Migração aplicada `20260707120000_disciplina_etapas_bom.sql` movida de `supabase/pending-migrations/` para `supabase/migrations/`.
- `autoCreateEquipamentoFromOrcamento` agora deriva `categoria` a partir de `equipamento_planejamento_templates.familia` (envase, rotulagem, paletização, automação, empacotamento secundário) em vez de cair em `outro`.
- Removido código morto do `EquipamentoDrawer` (legado `equipamentoPlanejamentoQueryOptions` / `togglePlanejamentoItem`).
- Regra no Knowledge Base: agente pode aplicar migrações Supabase via Management API com o token do sandbox, sem devolver a tarefa ao usuário.

### Onde ficam as etapas e como editar
- Banco: tabela `public.equipamento_disciplina_etapas` (etapas) + `public.equipamento_etapa_comentarios` (thread). BOM base fica em `public.projeto_insumos` ligada aos projetos R00 criados em `public.equipamento_projetos`.
- UI: **Clientes › (cliente) › Equipamentos › (equipamento) → Drawer → aba Disciplina**. Cada aba (Planejamento/Engenharia/Produção/Qualidade/Pós-venda) tem Kanban com criar/editar/arrastar/comentar/excluir; subtarefas via botão "+" dentro da etapa-pai; BOM na aba **Visão** (`BomSummaryCard` / `BomTable`).
- Template das etapas (o que é criado automaticamente): editar diretamente a função `public.seed_equipamento_disciplinas` na migration `supabase/migrations/20260707120000_disciplina_etapas_bom.sql` (lista de INSERTs por disciplina + blocos `IF v_familia =...` para etapas específicas por família). Uma nova migration com `CREATE OR REPLACE FUNCTION` substitui o template para os próximos equipamentos.

## 0.75.0 — Catálogo de equipamentos ativo no site público — 2026-07-05

### Site público
- Home (`/`) agora consome o catálogo real: seção **Equipamentos** puxa as páginas publicadas em `equipamento_pagina` via `listPaginasPublicadas`, com skeleton de carregamento, contador ("N equipamentos no catálogo") e CTA "Ver todos os equipamentos" apontando para `/equipamentos`. Removidos os 4 cards de teste hardcoded (empacotadora vertical, checkpeso, sacheteira, envasadora) e o link estático para `/equipamentos/envasadora`.
- Cada card do catálogo abre `/equipamentos/$slug` com preloading do TanStack Router, exibindo `og_image_url` quando existe ou um ícone `Factory` como fallback.
- Página `/equipamentos` continua listando o catálogo em grade 3 colunas com badge de família — agora com 29 páginas publicadas.

### Banco
- Ativadas 25 páginas de equipamentos previamente em `publicado=false` (`envasadora-linear`, `rotuladora`, `paletizadora`, `empacotamento-horizontal`, `empacotamento-pouch-doypack`, `empacotamento-sache`, `empacotamento-termoformado`, `empacotamento-termoselado`, `empacotamento-vertical`, `encaixotamento`, `encartuchamento`, `enfardadora`, `ensacadora`, `ensaque-de-big-bag`, `etiquetadora`, `frigorifico`, `inspecao`, `linha-processo-graos-secos`, `linhas-saladas`, `linhas-de-envase`, `paletizador`, `selecionadora-por-cor`, `sistema-troca-de-bobina-automatico`, `sistema-de-alimentacao-linha-empacotamento`, `transporte-interno`).

## 0.74.0 — Ciclo de Engenharia Mec + Elet com histórico auditável — 2026-07-05

### Engenharia — Ciclos (novo módulo)
- Nova tela **Engenharia › Ciclos** (`/engenharia/ciclos`) em formato Kanban por fase (Briefing → Análise técnica → Entregáveis → Liberação), com cards de ciclo mostrando barras de progresso paralelas para Mecânica e Elétrica, badge "Liberado" ao final e ações rápidas para abrir o Briefing e o Pacote técnico.
- Detalhe do ciclo em `/engenharia/ciclo/$equipamentoId` com stepper de 4 fases, cabeçalho do equipamento/cliente, colunas paralelas Mec/Elet (fase, status, slider de progresso, notas técnicas com auto-save), sumário do briefing recebido, BOM consolidada por disciplina e card de Ordem de Montagem quando o ciclo é liberado.
- Botão **Liberar para Indústria** disponível apenas quando ambas as trilhas atingem 100%; abre diálogo para congelar o pacote técnico e definir cronograma (início/fim previstos) — restrito a admin/gestor.
- Nova seção **Histórico do ciclo** na tela de detalhe: timeline auditável (disciplina, campo alterado, valor antes → depois, autor e timestamp) alimentada por `audit_log` com resolução de nomes em `profiles`.

### Banco & backend
- Nova migration `20260705120000_engenharia_ciclo.sql`: enum `projeto_fase` (briefing/analise/entregaveis/liberacao), colunas `fase`, `progresso`, `briefing_snapshot`, `pacote_revisao_id`, `montagem_id` em `equipamento_projetos`; trigger `tg_projeto_liberacao_ciclo` gera automaticamente `equipamento_montagens` compartilhada + `equipamento_revisoes` de congelamento ao liberar as duas trilhas; RPC `criar_ciclo_engenharia(equipamento_id, oportunidade_id, processo_id, briefing, responsavel_mec, responsavel_elet)` provisiona as duas trilhas paralelas.
- Nova migration `20260705140000_equipamento_pagina_grants.sql`: `GRANT SELECT/INSERT/UPDATE/DELETE` para `authenticated`, `GRANT ALL` para `service_role`, `GRANT SELECT` para `anon` em `equipamento_pagina` e `equipamento_pagina_bloco` — corrige `permission denied for table equipamento_pagina` no admin.
- Server functions `getCicloEngenharia`, `listCiclosEngenharia`, `criarCicloEngenharia`, `atualizarDisciplinaCiclo`, `liberarCiclo`, `snapshotBriefingDaOportunidade`, `getHistoricoCiclo` em `src/lib/engenharia-ciclo.functions.ts`. `atualizarDisciplinaCiclo` e `liberarCiclo` gravam diff no `audit_log` (fase, progresso, status, observações).

## 0.73.0 — CMS de páginas de equipamentos + BOM rica + upload público de RFQ — 2026-07-04

### Site público
- Nova rota `/equipamentos` como landing do catálogo, listando todas as páginas publicadas em grade responsiva com badge de família e fallback `Factory` quando não há `og_image_url`.
- Rota dinâmica `/equipamentos/$slug` renderiza páginas configuradas em `equipamento_pagina` + `equipamento_pagina_bloco` (blocos hero, feature-list, especificações, galeria, CTA, texto rico) com SEO por idioma (`seo_title_pt|es|en`, `seo_description_pt|es|en`).

### Admin
- Novo módulo **Admin › Páginas de equipamentos** (`/admin/paginas-equipamentos`): CRUD do CMS de páginas, editor de blocos com preview, controle de publicação, upload de `og_image_url`, seleção de tipo RFQ vinculado e slug único.
- Server functions em `equipamento-pagina.functions.ts`: `listPaginasPublicadas`, `getPaginaPorSlug` (públicas via publishable key), `adminListPaginas`, `adminGetPagina`, `adminUpdatePagina`, `adminUpsertBloco`, `adminDeleteBloco`.

### Engenharia / Compras
- **BOM rica de projeto**: novos campos em `projeto_insumos` (`fabricante_preferido`, `codigo_fabricante`, `especificacao_tecnica`, `norma`, `criticidade`, `lead_time_dias`, `substituivel`) — migration `20260704140000_bom_rico_projeto_insumos.sql`.
- Cotação a partir da BOM: `cotacao_itens` ganhou `insumo_id` (FK opcional) e trigger `cotacao_abrir_propaga_insumos` marca insumos como `em_cotacao` quando a cotação é aberta — migration `20260704160000_cotacao_origem_bom.sql`.
- Templates operacionais por máquina: nova estrutura para reaproveitar checklists de FAT/SAT/etapas por família de equipamento — migration `20260704130000_operacao_templates_por_maquina.sql`.

### RFQ público
- Upload público de anexos em RFQ de fornecedor: migration `20260704180000_rfq_public_upload.sql` habilita bucket dedicado e políticas `TO anon` restritas ao token do formulário; endpoint `POST /api/public/rfq.upload` valida MIME/tamanho e retorna URL assinada de leitura.

## 0.72.0 — Aba Contato pública com anonimato controlado — 2026-07-03

### Site público / Banco
- `brand_settings` passou a expor os campos de contato (`contact_*`, `social_*`) via política `TO anon` restrita a leitura das colunas públicas — migration `20260703180000_brand_settings_anon_contato.sql` — para alimentar footer e `/contato` sem exigir autenticação.

## 0.71.0 — RFQ público, cotações comparativas e OC com aprovação em 2 passos — 2026-07-03

### Compras
- **Ordem de Compra em 2 passos**: nova migration `20260703120000_oc_aprovacao.sql` adiciona `insumo_aprovacoes_oc` (aprovação técnica) e trigger que só permite emissão da OC após aprovação de escopo pelo gestor + aprovação financeira pelo diretor conforme faixa de valor.
- **Cotações comparativas**: migration `20260630200000_cotacoes_rfq.sql` cria `cotacao_fornecedores`, `cotacao_itens`, `cotacao_propostas`, `cotacao_proposta_itens`, `cotacao_proposta_anexos`, `cotacao_escolhas`, `cotacao_historico` com RLS por papel; UI de comparativo lado-a-lado por item.
- Documentos de compra: migration `20260701120000_rfq_docs_and_condicoes.sql` cria templates PDF por tipo de documento (RFQ, OC, comparativo) e condições de pagamento padronizadas por fornecedor.

### RFQ público
- Formulário `rfq/$slug` com tipos configuráveis em `rfq_formulario_tipo`, blocos dinâmicos por tipo, submissão anônima com token, upload de anexos e liberação por vendedor — migrations `20260702120000_rfq_tipo_and_blocos_seed.sql`, `20260702130000_rfq_deactivate_dados_item.sql`, `20260702150000_documento_blocos_largura.sql`, `20260704120000_rfq_publico_e_liberacao_sales.sql`, `20260704120100_rfq_seed_tipos.sql`.

---

## 0.70.0 — Central de mensagens de contato no Admin — 2026-07-03


### Admin
- Nova página **Admin › Mensagens de contato** (`/admin/contato`) com listagem paginada, busca (nome/e-mail/assunto) e filtro por status (novo, lido, respondido, arquivado).
- Drawer de detalhe exibe a mensagem original, metadados (recebida em, lida em, atendente) e o histórico completo de respostas com autor e data.
- Ação **Registrar resposta** grava em `contato_respostas` (autor_id/nome, created_at); trigger `AFTER INSERT` atualiza status para `respondido`, carimba atendente e `last_reply_at` e marca a mensagem como lida.
- Abertura da mensagem já a marca como lida (`read_at`, `read_by`). Arquivar / reabrir disponível via botões dedicados.
- Item "Mensagens de contato" adicionado ao menu lateral em Administração.

### Banco & backend
- Nova migration `20260703170000_contato_respostas.sql`: colunas `read_at`, `read_by`, `atendente_id`, `atendente_nome`, `last_reply_at`, `updated_at` em `contato_mensagens`; nova tabela `contato_respostas` com RLS restrita a admin/manager.
- Server functions `listarMensagensContato`, `obterMensagemContato`, `marcarMensagemLida`, `atualizarStatusMensagem`, `responderMensagemContato` — todas via `requireSupabaseAuth` + `assertAdmin`.

### Site público
- Fluxo do formulário `/contato` validado ponta-a-ponta: honeypot ativo, rate-limit por IP (5/15min) e feedback de sucesso/erro no formulário.

## 0.69.0 — Página de contato + aba Contato em Configurações — 2026-07-02


### Site público
- Nova rota `/contato` com hero, cards de canais diretos (endereço, telefone, WhatsApp, e-mail, horário) e formulário com aceite LGPD.
- Feedback claro de loading, sucesso ("Mensagem enviada — retornaremos em até 1 dia útil") e erro.
- Honeypot + rate-limit por IP (5 envios/15 min) no server function `enviarContato`.

### Banco & backend
- Nova tabela `contato_mensagens` (nome, email, telefone, assunto, mensagem, origem, ip, user_agent, status). Índices em `created_at` e `status`. RLS: admin/manager leem e atualizam; inserts via service_role.
- `brand_settings` ganhou `contact_address`, `contact_phone`, `contact_whatsapp`, `contact_email`, `contact_hours`, `social_instagram`, `social_linkedin`, `social_youtube` — expostos publicamente para alimentar rodapé e /contato.
- `enviarContato` (createServerFn) valida com Zod, captura user-agent e persiste com `supabaseAdmin`.

### Admin
- Nova aba **Contato** em Admin › Configurações para editar todos os campos acima e prever o comportamento no site.

## 0.68.0 — Header e footer unificados em todas as páginas públicas — 2026-07-02

### Site público
- Novo `PublicSiteShell` compartilhado por `/`, `/equipamentos/envasadora`, `/suporte` e `/suporte/$token`.
- Home usa a variante `overlay` (transparente sobre o hero, sólida ao rolar); demais páginas usam `solid` com header em branco.
- Menu detecta contexto: âncoras locais na home (`#sobre`, `#servicos`…), links absolutos (`/#...`) fora dela. Item "Contato" leva à rota real `/contato`.
- Seletor de idioma PT/EN/ES, logo (claro/escuro) e CTA de login idênticos em todas as páginas.
- `TopBar` e `Foot` legados de `/equipamentos/envasadora` e `PublicSuporteShell` de `/suporte/*` removidos — a marca é uma só em todo o site.

## 0.67.0 — Pós-venda: Chamados públicos com chat auditável — 2026-07-02





### Novo módulo
- Fluxo de suporte pelo site público (`/p/suporte/novo`): visitante informa nº de série, dados e descrição, aceita os termos e recebe um código curto (TCK-XXXX-XXXX) + link direto de conversa.
- Página `/p/suporte/$token`: chat entre visitante e equipe (polling 15 s), com status visível (aberto/em análise/aguardando cliente/resolvido/reaberto) e ações "Marcar como resolvido" / "Reabrir".
- Página `/p/suporte`: consulta por código + e-mail para orientar clientes que perderam o link.

### Painel interno (`/pos-vendas/chamados`)
- Lista com busca, filtro por status, badge "novo" quando a última mensagem é do cliente, e link direto para o detalhe.
- Detalhe com chat espelhado, atribuição do atendente, alteração de status e vínculo automático com `cliente_equipamentos` quando o nº de série bate.
- Acesso restrito a admin / manager / engineer.

### Segurança & auditoria
- Token cru nunca persistido — só o sha256; validação em tempo constante.
- Rate-limit por IP (5 aberturas/15min), por e-mail (3/h) e mensagens do visitante (30/h).
- Toda mutação registrada em `audit_log` + timeline em `chamado_eventos` via triggers.
- Zod em todas as entradas públicas com limites de tamanho; sem `dangerouslySetInnerHTML`.

### Banco
- Novas tabelas `chamados`, `chamado_mensagens`, `chamado_eventos`, enums `chamado_status/origem/evento_tipo/autor_tipo`.
- Trigger de status inteligente: resposta do atendente muda para "aguardando cliente"; resposta do visitante volta para "em análise".

### Preparado para próximas iterações
- Hook `notificacao_pendente` já grava evento — disparo de e-mail (Brevo/Emails) entra sem tocar no resto do fluxo.
- Anexos e Realtime ficam para a próxima entrega.

## 0.66.0 — Fluxo de aprovação da OC em 2 passos — 2026-07-02

### Aprovação (Manager / Engenharia)
- Ao aprovar a emissão da OC agora é obrigatório escolher qual orçamento venceu (radio com fornecedor, valor, prazo, Incoterm; badges de melhor preço/menor prazo).
- O fornecedor vencedor é gravado em `insumo_aprovacoes_oc.fornecedor_id_sugerido` e propaga para a emissão.
- `decidirAprovacaoOC` valida se o anexo pertence ao insumo, é do tipo `orcamento` e tem fornecedor vinculado.

### Compras
- `/compras/ordens` ganha aviso no topo com cada insumo aprovado aguardando emissão — fornecedor, valor total e botão "Emitir OC" em 1 clique (PDF trilíngue).
- `/compras/solicitacao` mostra badge âmbar "Aguardando OC" para insumos já aprovados, explicando por que o botão "Promover" some para o comprador.
- `InsumoOverviewPanel`: banner verde pós-aprovação com atalho direto para a lista de OCs.

## 0.65.0 — Auditoria global de Solicitações + validações e testes E2E — 2026-07-05


### Auditoria & Reversão
- Nova aba **Auditoria** em `/compras/solicitacao` com timeline global consolidando todas as mudanças em Solicitações (status, campos, anexos, orçamentos e comentários) via `listAtividadesSolicitacoes`.
- Filtros por tipo com contagem (Tudo · Status · Campos · Anexos · Comentários) e busca por responsável.
- Botão **Reverter** em eventos elegíveis (edição de campos, remoção de anexo, mudança de status) exigindo justificativa — a reversão gera novo registro no histórico com `reverted_from`.
- Novo componente `AuditoriaSolicitacoesPanel` reutilizando os diffs `old → new` do trigger `trg_insumo_atividade`.

### Histórico por Insumo
- Painel de histórico agora com filtros cronológicos (Status · Campos · Anexos & Comentários) e alternância asc/desc.
- Comentários manuais com validação de tamanho e feedback visual.

### Anexos & Orçamentos
- Cada anexo passa a exibir dois botões: **Abrir** (Drive view URL) e **Baixar** (`uc?export=download&id=…`).
- Validação obrigatória antes do upload: tamanho, mime type, e — para orçamentos — valor > 0, fornecedor, condição de pagamento e validade opcional.
- Mensagens de erro por campo com ícone e estilo consistente (`FieldError`).

### Ações
- `handleSave` no `InsumoActionDialog` agora valida descrição (≥ 3 chars), quantidade > 0, unidade e lead time numérico antes de persistir.
- Toasts detalhados com múltiplos erros consolidados.

### Testes
- Novo `e2e/compras-solicitacao.spec.ts` cobrindo: aba Auditoria com filtros, validação obrigatória em Ações, upload de anexo com links do Drive e reflexo do trigger no Histórico.

## 0.61.0 — Modal de Necessidade vira ferramenta do Compras


### UX / Compras
- Ao clicar em uma linha em **Compras → Necessidades**, o modal agora é uma
 ferramenta de ação com dois painéis:
 - **Esquerda — Dados do insumo**: descrição, quantidade/unidade, fabricante,
 part number, código interno, lead time, necessidade em (Popover +
 Calendar), criticidade, especificação técnica e observações — todos
 editáveis com "Salvar alterações" (usa `upsertInsumo`).
 - **Direita — Ações do Compras**: mensagem para fornecedor gerada
 automaticamente a partir dos dados, com botões "Copiar descrição" e
 "Copiar mensagem"; "Gerar documento (PDF)" abre uma janela com layout
 imprimível pronto para "Imprimir / Salvar em PDF"; e "Migrar para
 Cotação (RFQ)" que move o insumo para status `em_cotacao` e abre o
 wizard de nova cotação já com o item selecionado.

### Rotas
- `/compras/cotacoes/nova` agora aceita `?insumo_id=<uuid>` via
 `validateSearch` e pré-seleciona o insumo no passo 1, além de sugerir o
 título "RFQ — {descrição}".

## 0.60.1 — Rastreabilidade Venda → Projeto → OC

### Banco
- `equipamento_projetos` ganhou FKs opcionais `oportunidade_id`
 (→ `oportunidades`) e `processo_id` (→ `processos`) com índices
 parciais para consultas rápidas por origem comercial.
- `projeto_insumos.oportunidade_id` adicionado + trigger
 `tg_projeto_insumos_set_opp_biu` que copia a oportunidade do projeto
 ao inserir/reassociar o insumo, garantindo herança automática.

### Server functions
- `listProjetosByEquipamento` retorna também `oportunidade_id`,
 `processo_id` e os joins `oportunidades(codigo, titulo)` /
 `processos(codigo, titulo)` para exibir a origem no cockpit.
- `createProjeto` aceita `oportunidade_id` / `processo_id` opcionais
 no momento da criação (útil quando a proposta virou projeto).
- Nova `linkProjetoOrigem` (admin/manager) para vincular ou
 desvincular a origem de um projeto já existente.
- `listInsumos` aceita filtro `oportunidade_id` para consolidar
 necessidades de compra por oportunidade comercial.

## 0.60.0 — Limpeza do Sidebar


### Navegação
- Removida a seção **Suprimentos** (Ordem de Compra e Compra de Terceiros).
 A gestão de compras foi consolidada em **Compras › Ordens de Compra**
 (`/compras/ordens`), que já cobre o modo terceiros/pass-through.
- Removido o item **Montagem** e a seção **Produção** do sidebar até o
 novo módulo de produção ser plugado (rota `/producao/montagem` continua
 acessível por URL direta).
- Removida a seção **Logística & Financeiro** (Inspeção/Embarque e Custo
 de Projeto) da navegação principal; rotas permanecem em
 `src/routes/_authenticated/logistica.*`.

## 0.45.0 — Deploy Coolify (Node SSR), usuários demo e validações

### Infra / Deploy
- **Dockerfile** reescrito para Coolify: multi-stage Bun (builder) +
 `node:22-alpine` (runner) servindo o bundle Node SSR via
 `node.output/server/index.mjs`. Removido `wrangler dev` e a
 dependência de workerd/glibc no runtime.
- `vite.config.ts`: `BUILD_TARGET=node` ativa o preset Nitro
 `node-server` para o bundle self-hosted; build Cloudflare segue
 padrão.
- Novo endpoint público `/api/public/health` usado pelo
 `HEALTHCHECK` do container.
- Página `/setup` removida (e retirada do mapeamento de SEO).

### Correções
- `env-check` aceita credenciais Supabase estáticas do `client.ts`,
 evitando bloqueio "Configuração incompleta" sem `VITE_SUPABASE_*`.
- Oportunidades: máscara BR para telefone e BRL para valor no
 diálogo "Nova Oportunidade".
- Orçamento: imagem por upload (bucket `orcamento-imagens`),
 proporção preservada sem borda, legenda e sync para
 `Clientes/{cliente}/Imagens de Orçamentos/{codigo}/` no Drive.
- Rota de documento usa `notFoundComponent` em vez de tela em branco.
- `EXECUTE` para `authenticated` restaurado em funções internas
 afetadas pelo hardening (ex.: `derive_lifecycle`).
- Sidebar respeita dinamicamente a matriz `role_module_permissions`
 em vez de whitelists hardcoded.

### Usuários demo
- Removidos os `@sltk.com` legados; seed de 7 contas
 `@sltkamericas.com` (gestor, engenharia, produção, compras,
 montagem, campo, comercial) com as roles corretas.
- Botão "Seed usuários teste" removido do Admin.

### Validações
- Varredura ponta-a-ponta com Playwright: login por role,
 sidebar/permissões, abertura de DEMOs (ETPs, Projetos, Gantt),
 upload de imagem em orçamento, geração de PDF, favicon, imagens
 da landing pública e health-check do container.


## 0.44.0 — Supabase server fallbacks e imagens públicas do site


- Fallback das credenciais públicas do Supabase em `client.server.ts` e
 `auth-middleware.ts` para evitar 500 em server functions quando
 `process.env` não está populado no runtime (Dashboard, Usuários etc.).
- Página pública passa a servir imagens via `/site-images` em vez do
 proxy `/__l5e/assets-v1`, garantindo que as imagens apareçam em
 preview e em deploy self-hosted (Coolify).
- Favicon enviado em **Identidade** sobrescreve todas as variantes do
 `<head>` (icon, shortcut icon, apple-touch-icon, og:image,
 twitter:image); favicon Solutek fica apenas como fallback.
- Nova aba **SEO** em `/admin/configuracoes` com rastreamento de
 páginas públicas e edição de title/description/og/canonical/noindex
 por rota.


## 0.31.0 — Correção de orçamento e versionamento semântico

Orçamentos publicados agora podem ser reabertos para correção em um
wizard pré-preenchido, gerando uma nova versão com numeração calculada
automaticamente pelo tipo de alteração.

### Mudanças
- Nova ação "Corrigir / Nova versão" no detalhe do orçamento, abrindo o
 wizard com todos os campos (cliente, equipamentos, condições, blocos)
 carregados da última versão.
- Versionamento semântico automático `MAJOR.MINOR.PATCH`:
 - PATCH (x.x.+1): só texto/descrição/prazo/freteDesc/overrides.
 - MINOR (x.+1.0): equipamentos (qtd, valor, nome, opcional), moeda,
 incoterm, parcelas (número/percentual).
 - MAJOR (+1.0.0): cliente trocado ou conjunto de blocos alterado.
- Passo de revisão mostra resumo das alterações detectadas, badge do
 tipo de versão sugerido e radio para forçar patch/minor/major.
- "Motivo da correção" é obrigatório e fica gravado no histórico.
- Tabela de "Histórico de versões" no detalhe ganha colunas Tipo
 (badge colorido) e Motivo.
- Toda nova versão zera o status para `rascunho`, exigindo novo fluxo
 de aprovação.

### Técnico
- Nova rota `/_authenticated/comercial/orcamento/$id/corrigir`.
- Wizard extraído para `src/components/orcamento/OrcamentoWizard.tsx`
 e reaproveitado por `…/novo` e `…/corrigir`.
- Heurística de diff em `src/lib/docs/orcamento-diff.ts`
 (`diffOrcamentoPayload`).
- `bumpVersion` agora aceita `"major" | "minor" | "patch"`.
- `generateOrcamento` aceita `bump`, `motivo`, `bump_changes` e grava
 `_revisao_meta` em `documento_versoes.payload` (sem alteração de
 schema).
- Nova server fn `getOrcamentoForEdit` para carregar a última versão.


## 0.30.0 — Logomarca customizável nos PDFs

Cabeçalho dos documentos passa a usar a logomarca enviada pelo
administrador, com controle fino de tamanho e espaçamento, garantindo
consistência entre a prévia da tela e o PDF gerado.

### Mudanças
- Em Admin/Documentos é possível enviar um arquivo de logomarca (fundo
 claro) por tipo de documento, com dragger para ajustar altura (px) e
 espaço lateral entre logo e bloco de identificação.
- O cabeçalho de todos os PDFs gerados aplica a mesma logomarca, com o
 mesmo tamanho e alinhamento exibidos na prévia.
- Borda/contorno em volta da logomarca removida tanto na prévia quanto
 no PDF — fica apenas o fundo branco do container.
- Rodapé mantido: número da página, versão, título e responsável
 continuam alinhados após a troca da logomarca.

### Técnico
- Novo módulo `src/lib/docs/logo-opts.ts` com tipos de configuração de
 logo (URL, altura, gap).
- `src/lib/docs/pdf-chrome.tsx`: `logoBox` limpo (apenas
 `backgroundColor: #FFFFFF`), sem padding/border/radius.
- Refactor de `docs.functions.ts` → `admin-docs.functions.ts` +
 `admin-docs.server.ts` para estabilizar IDs de server functions
 (`listBlocos`, `getLayoutConfig`, `updateLayoutConfig`,
 `listDocumentoTipos`, `updateBloco`, `listBlocoHistorico`,
 `restoreBlocoVersao`, `translateBloco`) e evitar erros 500 de
 registry desatualizado em `?tss-serverfn-split`.
- Correção de hidratação em `admin.documentos.tsx`: `<Badge>` movido de
 dentro de `<p>` para `<div>` (evita aninhamento DOM inválido).


## 0.29.0 — Reorganização do menu lateral

Sidebar passa por uma limpeza estrutural para refletir o mapa real do
sistema e remover ruído visual.

### Mudanças
- Seção "CRM" desmembrada em "Comercial" (Pipeline, Orçamentos,
 Clientes) e "Processos" (Projetos / Atendimentos), eliminando o pai
 duplicado que apontava para o mesmo destino dos filhos.
- Removidos todos os submenus sem rota (filhos fantasmas) em Orçamentos,
 Ordem de Compra, Compra de Terceiros, Chamados e FAT — viram links
 diretos.
- "Clientes" deixa de ter o filho redundante "Ativos".
- "Produção & Qualidade" dividida em duas seções independentes
 ("Produção" com Montagem; "Qualidade" com Revisões e FAT).
- Ícones diferenciados entre Engenharia e Qualidade: Revisão Mecânica
 passa a usar ClipboardCheck e Revisão Elétrica usa ClipboardList,
 evitando colisão visual com Wrench/Zap da Engenharia.
- Seção "Modelos" eliminada — "Templates de Projeto" migra para
 Administração.
- Administração vira lista flat (sem dobrar 1 item): Configurações,
 Usuários & Permissões, Templates, Auditoria, Erros do Drawer e
 Design System como atalhos diretos.
- Ajuda também flat: FAQ, Documentação e Changelog como links diretos.
- Badge "H/H" removida (era redundante com o próprio nome do item).
- Itens de Engenharia renomeados para "Mecânico"/"Elétrico" (sem o
 prefixo "Projeto") e H/H passa a se chamar "H/H Estimado vs Real".


## 0.28.0 — Filtros, validações de H/H e busca global na sidebar

Refinamentos de usabilidade no módulo de Engenharia e nova busca rápida
global acessível por Ctrl+K.

### Filtros e busca
- Listas de Projeto Mecânico e Elétrico ganham filtro por revisão (R00…)
 além do status, com chips dos filtros ativos e botão "Limpar filtros".
- Página de H/H aceita busca por código/modelo/cliente e toggle "Somente
 com etapas cadastradas".
- Gantt / Etapas tem busca client-side no seletor de equipamento e um
 novo filtro de Fase sincronizado com a URL (?fase=).

### Validações e mensagens
- Lançamento de horas reais bloqueia valores negativos/vazios e avisa
 quando o real ultrapassa o dobro do estimado.
- Salvar plano do Gantt valida nome, ordem, datas e horas; erros são
 agregados em um único toast.
- Drag de etapas mostra indicador "Alterações não salvas" e um toast
 lembrete após soltar a barra.

### Sidebar
- Novo campo de busca global logo abaixo de "Novo processo", com atalho
 Ctrl+K (Cmd+K no Mac). Busca em navegação, clientes, equipamentos,
 processos e revisões de projeto, com debounce de 250ms.


## 0.27.0 — Engenharia: sidebar, H/H lançável e Gantt arrastável

Ajustes finos no módulo de Engenharia para acelerar o uso diário e
aproximar o fluxo de planejamento da realidade da fábrica.

### Sidebar
- Atalhos diretos para cada módulo (Engenharia e Produção/Qualidade):
 ETPs, Gantt / Etapas, H/H, Projeto Mecânico, Projeto Elétrico,
 Montagem, Revisão Mecânica, Revisão Elétrica e FAT.
- Ícones consistentes por domínio (Wrench mecânico, Zap elétrico,
 HardHat montagem, CalendarRange Gantt, Timer H/H).

### H/H Estimado vs Consumido
- Cada equipamento agora pode ser **expandido** para listar suas etapas
 com H/H estimada e campos editáveis de **H/H realizada** (mecânica e
 elétrica). Botão "Lançar horas" persiste os valores.
- Novas colunas `hh_mecanica_real` e `hh_eletrica_real` em
 `equipamento_etapas`; o consolidado de H/H passa a somar tanto as
 horas das etapas quanto as `hh_consumida` dos projetos.

### Gantt / Etapas
- Barras do Gantt podem ser **arrastadas** para reposicionar a etapa
 (move a janela inteira) ou para ajustar somente o fim (alça lateral).
- Marcador "Hoje" reforçado e legenda no topo.
- Página aceita `?eqp=<id>&fase=<fase>` para deep-link a partir das
 listas de Projeto Mecânico e Elétrico (botão "Gantt" em cada linha).
- Editor de etapas ganha colunas de H/H realizada por etapa.


## 0.26.0 — Produção & Qualidade: Montagem e Revisões Mecânica/Elétrica

Saem do placeholder os módulos de Produção & Qualidade. Cada
**Equipamento** ganha controle de montagem e inspeções de qualidade
(mecânica e elétrica) pós-montagem.

### Banco
- Nova tabela `equipamento_montagens` (status, progresso %, datas
 previstas/reais, responsável, observações).
- Nova tabela `equipamento_revisoes` (disciplina mecânica/elétrica,
 número da revisão, status, projeto vinculado, inspetor, data,
 itens verificados/totais, não-conformidades).
- RLS via `can_access_cliente()`, soft delete, auditoria.

### Frontend
- **/producao/montagem** — lista com KPIs por status, barra de
 progresso, ações Iniciar / Concluir, diálogo para criar nova
 montagem por equipamento com datas previstas.
- **/qualidade/revisao-mecanica** e **/qualidade/revisao-eletrica** —
 lista de inspeções com KPIs por status, número da revisão,
 contagem de NCs e itens, ação rápida de Aprovação.
- Sidebar reorganizada: "Montagem" passa a apontar para
 `/producao/montagem`; novo grupo "Revisões" mantém os links de
 Revisão Mecânica e Elétrica.


## 0.25.0 — Engenharia: ETPs, Gantt/Etapas, H/H, Projetos Mecânico e Elétrico

Os módulos de Engenharia deixam de ser placeholders. Cada **Equipamento**
passa a ser o pai do seu próprio pacote técnico: ETPs versionados, plano de
etapas (Gantt) com H/H estimada por disciplina, e revisões dos projetos
Mecânico e Elétrico com fluxo de liberação para produção.

### Banco
- Nova tabela `equipamento_etps` (versionamento de ETP por equipamento,
 com aprovação automática que marca anteriores como obsoletas).
- Nova tabela `equipamento_etapas` (Gantt: fase, datas previstas/reais,
 H/H mecânica/elétrica estimada, progresso, status, predecessora).
- Nova tabela `equipamento_projetos` (revisões discriminadas por
 mecânico/elétrico, com liberação para produção que torna as anteriores
 obsoletas automaticamente).
- Enum `equipamento_doc_categoria` ganha `esquema_eletrico`.
- Todas com RLS via `can_access_cliente()`, soft delete, auditoria.

### Frontend
- **/engenharia/etp** — lista com KPIs por status, busca, paginação;
 diálogo para criar novo ETP escolhendo equipamento.
- **/engenharia/etp/$id** — editor de ETP com seções de escopo,
 premissas, requisitos funcionais e técnicos, critérios de aceite,
 riscos e observações. Botões Salvar / Salvar & Fechar / Cancelar no
 topo. Aprovação só por admin/manager.
- **/engenharia/etapas** — seleção de equipamento, tabela editável das
 etapas (fase, datas, H/H, progresso, status) e Gantt visual em
 SVG/CSS com marcador de "hoje" e cores por fase.
- **/engenharia/hh** — consolidado de H/H por equipamento, comparando
 estimado (etapas) vs. consumido (projetos), com % de consumo.
- **/engenharia/mecanico** e **/engenharia/eletrico** — listas de
 revisões com KPIs por status, busca, paginação, criação de nova
 revisão e botão "Liberar p/ produção" (somente admin/manager).

### Permissões
- Aprovar ETP e liberar projeto: apenas `admin` ou `manager` (validado
 no servidor, frontend apenas oculta os botões).

## 0.24.0 — Equipamentos: ciclo de vida + biblioteca de documentos

A aba **Equipamentos** deixa de ser apenas "base instalada" e passa a cobrir
todo o ciclo de vida da máquina — do **planejamento** (engenharia/ETP) até o
**descomissionamento**, passando por fabricação, qualidade, logística,
instalação e operação. Cada equipamento agora tem um **drawer** com abas
dedicadas a Engenharia, Produção, Qualidade e Pós-venda, onde ficam
manuais mecânicos/elétricos, fichas, FATs, ETPs, montagem, desenhos e
certificados — tudo subindo direto para o SLTK Drive.

### Banco
- Novos valores em `equipamento_status`: `planejamento`, `em_fabricacao`,
 `em_qualidade`, `pronto_entrega`, `em_transporte`, `em_instalacao`.
 Default de novos registros agora é `planejamento`.
- Nova tabela `cliente_equipamento_documentos` com enum
 `equipamento_doc_categoria` (etp, manual_mecanico, manual_eletrico,
 ficha_tecnica, fat, montagem, desenho, lista_pecas, certificado, outro)
 + RLS via `can_access_cliente()`, soft delete e auditoria.

### Frontend
- KPI strip renovada: Total · Em operação · Em fabricação · Em manutenção ·
 Valor total · Garantias expirando.
- Filtros da lista por **fase** (Engenharia, Produção, Qualidade,
 Logística, Operação, Fim de vida) e nova coluna Fase.
- **Drawer** por equipamento com 5 abas (Visão, Engenharia, Produção,
 Qualidade, Pós-venda); cada aba lista os documentos da área e tem
 botão "Adicionar" com upload pré-selecionado.
- Uploads vão para o Drive em
 `{cliente}/Equipamentos/{equipamento.codigo}/{AAAAMM}/`, limites
 PDF/JPG/PNG ≤ 25MB, ZIP ≤ 50MB.
- Linguagem "instalado" removida da UI.

---

## 0.23.0 — Ficha 360º: aba Equipamentos (base instalada)

Primeira release da linha **v0.23.x**. A aba **Oportunidades** da Ficha 360º
do cliente foi substituída por **Equipamentos** — agora cada cliente exibe a
base instalada de máquinas/produtos Solutek que possui (envasadoras,
rotuladoras, paletizadoras, transportadores, automação etc.). O Pipeline
Comercial segue intocado e continua a ser a única fonte de oportunidades
ativas.

### Banco — nova tabela `cliente_equipamentos`
- Enums `equipamento_categoria` (envase, rotulagem, embalagem_secundaria, paletização, transporte, automação, outro) e `equipamento_status` (operacional, manutenção, parado, descomissionado).
- Campos: `codigo` (auto `EQP-AAAA-####`), modelo, fabricante, número de série, tag do cliente, datas (entrega, instalação, garantia), localização, valor de venda, observações, link opcional para `processo_id` de origem.
- RLS via `can_access_cliente()` (mesma regra da ficha do cliente). Soft delete e auditoria padrão.
- Triggers `tg_equipamentos_set_codigo` e `tg_equipamentos_set_updated`.

### Aba Equipamentos
- **KPI strip (5 cards)**: Total, Operacionais (+%), Em manutenção (+parados), Valor instalado, Garantias expirando (≤ 60 dias).
- **Tabela** com modelo, categoria, status colorido, série/tag, data de fim de garantia com semáforo (verde/âmbar/vermelho), valor e ação de remover.
- **Filtros em pills** por status + select de categoria.
- **Busca instantânea** por modelo, código, série ou tag.
- **Dialog "Adicionar equipamento"** com todos os campos relevantes.
- Visão geral: bloco "Oportunidades recentes" virou "Equipamentos instalados".

### Conteúdo de exemplo
- Seed automático na migration: 7 equipamentos distribuídos entre os 3 primeiros clientes (envasadora 8000, rotuladora R2, paletizadora 1200, transportador, embaladora secundária, CLP, etc.) com datas de garantia variadas para ilustrar os três estados do semáforo.

Arquivos afetados: `src/lib/equipamentos.{shared,functions,queries}.ts` (novos), `src/routes/_authenticated/clientes.$codigo.tsx`, migration `cliente_equipamentos`.

---

## 0.22.1 — Ficha 360º: abas Contatos e Documentos consolidadas + dados de exemplo

Segunda release da linha **v0.22.x**. Agora as abas `Contatos` e
`Documentos` deixam o estilo "lista crua" e ganham KPIs, busca instantânea,
filtros em pills com contagem e remoção segura. Também inclui um seed de
dados de exemplo (CLI-0001 a CLI-0005) para popular as novas métricas.

### Aba Contatos
- **KPI strip (4 cards)**: Total, Principais, Com e-mail (+ % cobertura), Com telefone (+ % cobertura).
- **Busca instantânea** por nome, cargo ou e-mail.
- **Filtros em pills**: Todos / Principais / Com e-mail / Com telefone, com contagem.
- Ordenação: contatos `principal=true` sempre no topo; avatar âmbar para destaque visual.
- Chips clicáveis à direita: `tel:` e `mailto:` com hover.

### Aba Documentos
- **KPI strip (4 cards)**: Arquivos (+ data do último), Tamanho total, Categorias em uso, Em filtro.
- **Busca instantânea** por nome final/original.
- **Filtros em pills por categoria** (Todas + cada `CLIENTE_DOC_CATEGORIAS`) com contagem.
- **Remoção segura**: `confirm()` substituído por `AlertDialog` shadcn, com mensagem nominal, spinner por linha e toast "<nome> removido". Cancelar bloqueado durante a operação.

### Conteúdo de exemplo
- Seed via `psql` populando `cliente_contatos`, `cliente_documentos` e `cliente_interacoes` para `CLI-0001` … `CLI-0005`.
- Permite validar visualmente as novas KPIs, filtros e badges sem precisar de uploads reais ao Drive.

Sem mudanças de schema — apenas UI/UX em `src/routes/_authenticated/clientes.$codigo.tsx` + seed de dados.

---

## 0.22.0 — Ficha 360º: abas Oportunidades e Processos consolidadas

Primeira release da linha **v0.22.x** (consolidação da Ficha 360º). As abas
`Oportunidades` e `Processos` deixam de ser tabelas simples e ganham KPIs,
filtros por estágio/tipo/status, busca por título/código, badges coloridos por
estágio e atalhos para os módulos correspondentes — sem novas tabelas, só UI.

### Aba Oportunidades
- **KPI strip (5 cards)**: Total/abertas, Valor ganho, Valor aberto + ponderado pela probabilidade, Win rate (ganhas/decididas), Ticket médio das ganhas.
- **Filtros em pills por estágio** (Todos / Novo / Qualificado / Proposta / Negociação / Ganho / Perdido) com contagem por bucket.
- **Busca instantânea** por título ou código.
- **Badges coloridos por `pipeline_stage`** (slate / sky / indigo / amber / emerald / rose) substituindo o badge cinza único.
- **Atalho para o Pipeline** no header do card e no empty state.

### Aba Processos
- **KPI strip (5 cards)**: Ativos vs arquivados, Valor ativo + total, Progresso médio entre ativos, Processos em alto risco (≥ 70), Total + nº de tipos.
- **Filtros**: pills de status (Ativos padrão / Todos / Arquivados, com contagem) + filtro secundário por `tipo` derivado dos dados.
- **Busca instantânea** por título ou código.
- **Badges coloridos por etapa** (planejamento → engenharia → compras → produção → montagem → qualidade/FAT → embarque → instalação → entregue); badge `arquivado` em rose.
- **Barra de progresso visual** por linha e **risco numérico colorido por faixa** (<40 emerald, 40–69 amber, ≥70 rose).
- **Atalho para a lista de Processos** no header do card e no empty state.

### Componentes/utilitários
- Novo helper local `MiniKpi` (com sublinha de contexto) reutilizado pelas duas abas.
- Mapas `OPP_STAGES` / `OPP_STAGE_LABEL` / `OPP_STAGE_COLOR` / `PROC_STAGE_COLOR` centralizados no topo do arquivo.

Sem mudanças de banco, sem novas server functions — apenas frontend.

## 0.21.8 — Clientes 360º (Fase 8): Sócios com validações fortes e remoção segura

### Aba Sócios — formulário
- Validação inline (sem `alert`/toast solto): `Nome` (2-180, obrigatório), `Desde` (regex AAAA-MM-DD + data real + não futura).
- Prevenção de duplicidade no client (case-insensitive) antes de chamar a server fn — feedback imediato.
- Mensagens de erro por campo (`aria-invalid` + `aria-describedby`) e bloco de erro do servidor com `AlertCircle`.
- Botão `Adicionar` mostra `Loader2` enquanto a mutation roda. Toast de sucesso menciona o nome do sócio.

### Aba Sócios — remoção
- `confirm()` nativo substituído por `AlertDialog` do shadcn com mensagem clara nomeando o sócio e citando a auditoria/timeline.
- Botão `Remover` na linha mostra spinner por linha (`deletingId`) e fica desabilitado durante a operação.
- Toasts de sucesso/erro nominais (`"<nome> removido com sucesso."`). Cancelar/fechar bloqueados enquanto a remoção está em andamento.

### Backend
- `addClienteSocio` agora rejeita duplicidade no servidor (ILIKE no nome, escopo do mesmo cliente, ignorando soft-deleted) — defesa em profundidade contra a validação do client.
- `socioCreateInput`: `desde` agora também valida data real (não só regex) e impede datas futuras.

## 0.21.7 — Clientes 360º (Fase 7): cache de geocoding, timeline tipada e aba de Sócios

### Backend
- `geocodeCliente` agora consulta `enrich_cache` (provider=`nominatim`, TTL 90 dias) antes de chamar Nominatim. Chave: (pais, endereço normalizado). Resposta inclui `cached: boolean`.
- Novas server functions `addClienteSocio` / `removerClienteSocio` (roles admin/manager/sales) com soft delete e validação de nome (2-180) e data (AAAA-MM-DD).
- Helper `recordClienteEvent` centraliza inserts em `cliente_interacoes` para eventos do sistema.
- Eventos automáticos agora usam tipos próprios: `documento_anexado`, `documento_removido`, `socio_adicionado`, `socio_removido`, `geocoded` (antes tudo caía em `nota`).
- `removerClienteDocumento` agora registra entrada na timeline ao remover.

### Ficha 360º
- Nova aba **Sócios** com lista, busca por nome/qualificação, formulário de adição e remoção com confirmação.
- Novos tipos de evento são reconhecidos pelo filtro 'Sistema' da Timeline.

## 0.21.6 — Clientes 360º: feedback do geocoding na ficha

Refinamento do botão **Geocodificar** introduzido na 0.21.5: agora o usuário enxerga claramente os estados de loading e erro e sabe quando o cliente foi posicionado pela última vez.

### Backend
- `geocodeCliente` passa a gravar `clientes.geocoded_at` (nova coluna `timestamptz`) junto com `latitude`/`longitude` e devolve o timestamp para o cliente.

### Ficha 360º — `AddressLine`
- Estado de loading: pill com `Loader2` animado ("Geocodificando…") substitui o botão enquanto a mutation roda, `aria-live="polite"` para leitores de tela.
- Estado de erro: o botão vira "Tentar novamente" em vermelho (border/bg `destructive/*`) e a mensagem do erro aparece inline ao lado, além do toast existente.
- Sucesso: pill discreto com `Clock` mostra a última geocodificação (`fmtDateTime(geocoded_at)`), com `title` completo no hover.

### Banco
- Migration `ALTER TABLE public.clientes ADD COLUMN geocoded_at timestamptz`.

### Próximos passos planejados (0.21.x)
- 0.21.7 — Cache de geocoding (`enrich_cache`) para evitar refazer chamadas a Nominatim em alterações pequenas de endereço.
- 0.21.8 — Aba de Sócios com CRUD reaproveitando `cliente_socios`.

## 0.21.5 — Clientes 360º (Fase 6): geocoding leve + filtros na Timeline

Sexta fase do **Módulo de Clientes 360º**. Ficha agora consegue posicionar o cliente no mapa (Nominatim/OpenStreetMap) e a Timeline ganhou filtros por categoria.

### Backend
- Nova server function `geocodeCliente` em `clientes.functions.ts`:
 - Monta o endereço a partir de logradouro/número/bairro/cidade/UF/CEP/país.
 - Chama `https://nominatim.openstreetmap.org/search` com `User-Agent` próprio (política Nominatim) e `Accept-Language` PT-BR.
 - Persiste `latitude`/`longitude` na linha de `clientes` e registra entrada na timeline (`cliente_interacoes`) com as coordenadas.
 - Erros explícitos: endereço insuficiente, resposta vazia ou status != 200.

### Ficha 360º
- Novo componente `AddressLine` no header:
 - Botão **Mapa** abre o OpenStreetMap centralizado em `lat/lng` quando o cliente já está geocodificado.
 - Quando ainda não há coordenadas, o botão vira **Buscar** (OSM `/search?query=…`) e aparece um botão extra **Geocodificar** que chama `geocodeCliente`.
 - Após sucesso, ficha e timeline são invalidadas para refletir o novo estado.
- Aba **Timeline** ganhou filtros em pills: Todos / Manuais / Oportunidades / Processos / Sistema, com contagem por bucket e empty state dedicado quando o filtro zera os resultados.
- Helpers `bucketFor` + `TIMELINE_FILTER_LABEL` mapeiam os `tipo`s vindos de `cliente_interacoes` e dos eventos derivados (oportunidade ganha/perdida, processo arquivado, etc.).

### Próximos passos planejados (0.21.x)
- 0.21.6 — Aba de Sócios com CRUD reaproveitando `cliente_socios`.
- 0.21.7 — Cache de geocoding (`enrich_cache`) para evitar refazer chamadas a Nominatim em alterações pequenas de endereço.

## 0.21.4 — Clientes 360º (Fase 5): wizard de conversão reforçado

Quinta fase do **Módulo de Clientes 360º**. O `ConvertWizardDialog` (pipeline comercial → cliente ativo) ganhou contexto de ciclo de vida em todas as etapas e finaliza levando o usuário direto para a ficha 360º recém-promovida.

### Wizard
- **Busca de cliente (step 1)**: cada resultado agora exibe o badge de `lifecycle_stage` (Suspect / Prospect / Cliente / Inativo), ao lado do status, reaproveitando `CLIENTE_LIFECYCLE_COLOR`.
- Ao selecionar um cliente existente, o wizard guarda o `lifecycle_stage` atual para usar no preview da etapa final.
- Ao criar um cliente novo no step 1, ele entra no wizard já marcado como `prospect` (estado natural antes de qualquer oportunidade ganha).
- **Confirmação (step 3)**: novo preview "Ciclo: {atual} → Cliente ativo" aparece quando há pelo menos 1 oportunidade marcada como **ganhar** — explicita a promoção que o trigger do banco aplicará.
- Texto final do step 3 avisa que o usuário será levado para a **ficha 360º** ao confirmar.

### Pós-conversão
- Após o sucesso, o wizard navega para `/clientes/$codigo` (ficha 360º) em vez de `/processos`, alinhando com o fluxo do módulo Clientes.
- Cache do cliente (`["clientes", clienteId]`) é invalidado para refletir oportunidades ganhas, processos novos e o lifecycle atualizado imediatamente.

### Próximos passos planejados (0.21.x)
- 0.21.5 — Geocoding leve para o mapa da ficha 360º (Nominatim/Mapbox) e filtros por tipo na Timeline.
- 0.21.6 — Aba de Sócios com CRUD reaproveitando `cliente_socios`.

## 0.21.3 — Clientes 360º (Fase 4): filtro e badge de ciclo de vida na listagem

Quarta fase do **Módulo de Clientes 360º**. A listagem `/clientes` agora expõe o `lifecycle_stage` calculado pelo banco — fica fácil isolar suspects, prospects, clientes ativos e inativos sem abrir cada ficha.

### Backend
- `listClientes` passa a aceitar o filtro opcional `lifecycle` (`todos | suspect | prospect | cliente | inativo`) e a retornar a coluna `lifecycle_stage` em cada linha.

### Frontend
- Novo `<Select>` "Todos os ciclos" na toolbar de `/clientes`, persistido via search param `?lifecycle=`.
- Nova coluna **Ciclo** na tabela com o badge `LifecycleBadge` (cores semânticas de `CLIENTE_LIFECYCLE_COLOR`).
- `clientesListQueryOptions` ganhou o campo `lifecycle` no tipo `ClientesListSearch`; deep-linking continua funcionando.

### Próximos passos planejados (0.21.x)
- 0.21.4 — Wizard de conversão suspect → prospect → cliente reforçado (passo "Cliente" no `ConvertWizardDialog`).
- 0.21.5 — Geocoding leve para o mapa da ficha 360º (Nominatim/Mapbox) e timeline com filtros por tipo.

## 0.21.2 — Clientes 360º (Fase 3): upload de documentos cadastrais no Drive

Terceira fase do **Módulo de Clientes 360º**. A aba **Documentos** da ficha do cliente agora aceita upload direto para o SLTK Drive, seguindo o mesmo padrão dos anexos de oportunidades/processos.

### Backend
- Novo módulo `src/lib/cliente-documentos.functions.ts`:
 - `uploadClienteDocumento` — valida MIME/tamanho, garante a pasta `{cliente.codigo} - {cliente.razao_social}/Cadastro/{AAAAMM}/` no Drive via gateway, faz upload multipart, registra metadados em `cliente_documentos` e adiciona automaticamente uma entrada na timeline (`cliente_interacoes`).
 - `removerClienteDocumento` — soft delete (preserva o arquivo no Drive; apenas oculta da ficha).
- Categorias padronizadas: contrato social, cartão CNPJ, comprovante de endereço, certidão, procuração, outro.
- Limites aplicados no servidor: PDF/JPG/PNG ≤ 25MB · ZIP ≤ 50MB.

### Ficha 360º
- Aba **Documentos** ganhou seletor de categoria + botão **Enviar** no cabeçalho do card.
- Lista de documentos agora mostra categoria legível, tamanho formatado, autor e data; cada item tem ação de abrir no Drive e remover (com confirmação).
- Cada upload bem-sucedido invalida automaticamente a query da timeline para refletir o evento na aba **Timeline**.

### Próximos passos planejados (0.21.x)
- 0.21.3 — Filtro por `lifecycle_stage` na listagem `/clientes` + badge na lista.
- 0.21.4 — Wizard de conversão suspect → prospect → cliente reforçado.

## 0.21.1 — Clientes 360º (Fase 2): ficha refatorada com dados reais

Segunda fase do **Módulo de Clientes 360º**. A ficha `/clientes/$codigo` foi reescrita do zero, removendo os mocks da ACME e passando a consumir o banco — KPIs do header, oportunidades, processos, documentos e timeline agora vêm das tabelas reais alimentadas na 0.21.0.

### Backend
- Novas server functions em `clientes.functions.ts`:
 - `listClienteOportunidades` — oportunidades não arquivadas do cliente.
 - `listClienteProcessos` — processos vinculados, com etapa, progresso e valor.
 - `listClienteDocumentos` — metadados de `cliente_documentos` (placeholder para o upload no Drive, na 0.21.2).
 - `listClienteTimeline` — união de `cliente_interacoes` + eventos derivados (oportunidades atualizadas/ganhas/perdidas, processos criados/arquivados), ordenada cronologicamente.
 - `addClienteInteracao` — registra nota/ligação/reunião/e-mail/visita e atualiza `clientes.ultimo_contato_em`.
- Novos `queryOptions` em `clientes.queries.ts` para cada listagem.

### Ficha 360º
- `clientes.$codigo.tsx` reduzido de 1.364 para ~520 linhas; mocks `purchaseHistory`, `equipamentos`, `chamados`, `documentos`, `contatos` e `timeline` removidos.
- KPIs reais no header: valor ganho (`valor_ganho_total`), oportunidades abertas, processos ativos/total, último contato.
- Badge de `lifecycle_stage` (Suspect / Prospect / Cliente / Inativo) com cores semânticas.
- Abas: **Visão geral**, **Oportunidades**, **Processos**, **Contatos**, **Documentos**, **Timeline** — todas com `EmptyState` quando não há dados, sem placeholders fictícios.
- Deep-linking via `?tab=` (search param validado por Zod).
- Form na aba Timeline para registrar interação manual, com atualização automática do "último contato" do cliente.
- Removidas abas Equipamentos / FAT / Chamados / Financeiro até existirem tabelas próprias (voltam em fases futuras).

### Frontend
- Novo helper `CLIENTE_LIFECYCLE_COLOR` em `clientes.shared.ts`.

### Próximos passos planejados (0.21.x)
- 0.21.2 — Upload de documentos cadastrais no Drive (`{cliente}/Cadastro/{AAAAMM}/`) reutilizando o padrão de anexos de oportunidades.
- 0.21.3 — Filtro por `lifecycle_stage` na listagem `/clientes` + badge na lista.
- 0.21.4 — Wizard de conversão suspect → prospect → cliente reforçado.

## 0.21.0 — Clientes 360º (Fase 1): ciclo de vida, documentos e timeline (banco)

Primeira fase do **Módulo de Clientes 360º** — alinha o cadastro ao funil que começa no Pipeline Comercial (suspect → prospect) e amadurece via Processos (cliente ativo). Esta release entrega o backbone de dados; as próximas releases (0.21.x) entregam as abas e o upload de documentos no Drive.

### Banco de dados
- Novo enum `cliente_lifecycle` (`suspect | prospect | cliente | inativo`) e coluna `clientes.lifecycle_stage`, calculada por trigger a partir de oportunidades e processos.
- Novas colunas de cache em `clientes`: `tornou_cliente_em`, `oportunidades_abertas`, `processos_ativos`, `processos_total`, `valor_ganho_total`, `ultimo_contato_em` — atualizadas automaticamente quando uma OPP ou um processo é criado/alterado/removido.
- Nova tabela `cliente_documentos` (Drive): `categoria` (contrato_social, cartão CNPJ, comprovante de endereço, certidão, procuração, outro), `drive_file_id`, `drive_view_url`, `nome_final/original`, `mime`, `size_bytes`, autor, soft delete.
- Nova tabela `cliente_interacoes` (timeline 360): `tipo` (nota, e-mail, ligação, reunião, tarefa, evento do sistema), `descricao`, `payload jsonb`, autor.
- Nova função `public.can_access_cliente(uuid)` que escopa o acesso à ficha: admin/manager veem tudo; sales/engineer/production/field veem clientes em que têm oportunidade ou processo vinculado.
- RLS aplicada nas novas tabelas com base em `can_access_cliente()`. Triggers `tg_oportunidades_refresh_cliente()` e `tg_processos_refresh_cliente()` recalculam os contadores e a etapa.
- Backfill inicial executado para todos os clientes existentes.

### Frontend
- Constantes `CLIENTE_LIFECYCLE` e `CLIENTE_LIFECYCLE_LABEL` expostas em `clientes.shared.ts` para uso nas abas e filtros que virão em 0.21.1.

### Próximos passos planejados (0.21.x)
- 0.21.1 — Refatorar `/clientes/$codigo` em abas reais (Visão Geral, Identificação, Contatos, Sócios, Oportunidades, Processos, Documentos, Timeline, Auditoria), substituindo os mocks atuais (ACME, equipamentos, NPS hardcoded).
- 0.21.2 — Upload de documentos cadastrais no Drive (`{cliente}/Cadastro/{AAAAMM}/`) reutilizando o padrão de anexos de oportunidades.
- 0.21.3 — Timeline 360 com nota manual e eventos do sistema (mudança de etapa, OPP ganha, processo criado).
- 0.21.4 — Filtro por `lifecycle_stage` na listagem `/clientes` e badge no header da ficha.
- 0.21.5 — Wizard de conversão reforçado: passo "Cliente" no `ConvertWizardDialog` que cria/vincula automaticamente.

## 0.20.2 — Fallback de SSR: tela em branco evitada quando o reporter falha

- Adicionada truncagem no client-side do `AuthenticatedErrorBoundary` para mensagens longas (`message` ≤500, `stack` ≤2000, `url` ≤500, `userAgent` ≤300, `route` ≤200), evitando que um `ZodError` no `reportClientError` cause tela em branco.
- Chamada de erro para o servidor agora é envolta em `try/catch`, garantindo que falhas de comunicação ou validação nunca derrubem a UI de fallback.
- Server function `reportClientError` já truncava strings; o client-side trunca antes como camada dupla de defesa.
- Fallback de SSR continua sendo o `renderErrorPage()` em `src/server.ts`, mantendo Incident ID, botão "Tentar novamente" e link "Ir para início" visíveis mesmo em falhas catastróficas.

## 0.20.1 — Pipeline Comercial: modal de oportunidade ampliado com Enriquecer e Insights

- Modal de edição da oportunidade expandido para layout maior (5xl em desktop), com 2 colunas: formulário à esquerda e sidebar de insights à direita.
- Bloco **Enriquecer dados da empresa** no formulário: selecione país (BR/AR/PY/PE/UY/CL/CO/EC/CR/PA) e documento para auto-preencher razão social, e-mail e telefone via fontes oficiais (preserva valores já preenchidos).
- Botão **Promover a cliente** / **Ficha do cliente** no header e na sidebar, que abre o Wizard de conversão para preencher a ficha completa e ativar o cliente.
- Badge **Lead** (âmbar) ou **Cliente ativo** (verde) no header conforme o vínculo com cliente.
- Sidebar de Insights: valor estimado, valor ponderado (valor × probabilidade), dias no estágio atual, idade total da oportunidade, dias até fechamento (alerta amarelo a 7d e vermelho se atrasado), contadores de anotações/anexos e perdas anteriores.
- Cartão de contato rápido com e-mail e telefone clicáveis para copiar.
- Campos `email`, `telefone` e `observacoes` agora são pré-carregados do banco ao abrir o modal.

## 0.20.0 — Pipeline Comercial: Wizard de Conversão em Cliente Ativo

- Novo Wizard em 3 passos abre ao marcar uma oportunidade como ganha: escolher cliente, decidir destino das oportunidades da empresa, confirmar.
- Passo 1: vincular cliente existente (busca por razão social, fantasia, código ou documento) ou criar novo cliente com **Enriquecer** (CNPJ/CUIT/RUT/RUC) para auto-preencher.
- Passo 2: ações em lote sobre todas as oportunidades da empresa — **Ganhar** (cria processo com template opcional), **Manter** ou **Perder** (motivo obrigatório).
- Passo 3: resumo e confirmação. Cliente promovido para `ativo`; processos criados com pilar = responsável; templates `projeto` aplicados quando escolhidos.
- Todas as oportunidades da empresa passam a apontar para o cliente final, mesmo as mantidas.
- Novas server fns `listOportunidadesByEmpresa` e `convertOportunidadesToCliente`.

## 0.19.3 — Templates de Projeto: editor moderno com drag and drop

- **Editor reformulado**: cabeçalho com gradiente sutil, abas com ícones (CheckSquare/ListTodo/CalendarClock/History) e contadores em pill, linhas como cards com hover e sombra.
- **Drag and drop** em Checklist, Tarefas e Eventos (via `@dnd-kit`) — arraste pelo handle para reordenar; nova ordem é persistida no servidor.
- **Tags coloridas** por tipo: tipo do template (projeto/atendimento/instalação), tipo de evento (kickoff, FAT, embarque, marco, reunião, entrega, treinamento, instalação, outro), role responsável (8 perfis), e seções do checklist (cor estável por nome).
- **Tooltips explicativas** nos cabeçalhos **Tarefas** e **Eventos** da listagem (`/admin/templates-projeto`) e em cada badge dentro do editor (obrigatório, requer arquivo, D+dias, role, tipo de evento).
- Novas server fns `reorderTemplateItens`, `reorderTemplateTarefas`, `reorderTemplateEventos`.

## 0.19.2 — Templates de Projeto: histórico, duplicar, restaurar e auditoria

- **Histórico de versões**: toda alteração no template (dados gerais, checklist, tarefas, eventos, arquivamento) gera automaticamente um snapshot na nova tabela `processo_template_versoes`. Botão "Salvar versão" permite anotar marcos com um motivo.
- **Restaurar versão anterior** pela aba **Histórico** do editor — o estado atual é salvo como versão antes da restauração.
- **Duplicar template** (copia checklist + tarefas + eventos) com 1 clique a partir da lista.
- **Restaurar arquivados**: nova aba **Arquivados** lista os templates removidos com botão de restaurar.
- **Auditoria visível**: lista e editor agora mostram **Criado por / Atualizado por** com data/hora.
- **Capitalização automática** do título e subtítulo (nome, descrição, seções, itens, tarefas, eventos) — sempre começa com letra maiúscula.
- Editor maior (5xl) com cabeçalho de autoria e botão de salvar versão.

## 0.19.1 — Templates de Projeto: CRUD e aplicação ao criar processo

- Nova página **Modelos › Templates de Projeto** (`/admin/templates-projeto`) para admin/manager/engineer.
- Editor com três abas: **Checklist** (seção, título, obrigatório, requer arquivo), **Tarefas** (título, D+ dias, role responsável), **Eventos** (título, tipo marco/reunião/entrega/outro, D+ dias).
- Toggle **Ativo/Inativo** e soft delete por template.
- **Aplicar template ao criar processo**: o formulário "Novo Processo" agora oferece selecionar um template do mesmo tipo; ao salvar, as tarefas e eventos do template são copiados para o processo (D+ dias a partir de hoje), e um evento de auditoria é registrado.
- Server fns com `requireSupabaseAuth` + verificação de role no servidor (não confia em UI).
- **Sidebar**: "Templates de Projeto" sai de **Administração** e ganha seu próprio grupo **Modelos**, acessível a admin/manager/engineer.

## 0.19.0 — Projetos/Atendimentos/Instalações: modal grande, assinaturas, anexos no Drive (parcial)

- Modal lateral dos processos substituído por **Dialog grande (5xl)** com aba **Anexos**.
- **Checklist com assinatura**: cada item exibe quem marcou/desmarcou e quando; trigger no banco grava `processo_checklist_acoes` (append-only) automaticamente.
- **Anexos no Google Drive** via conector: upload com modal **drag-and-drop**, organização automática `{cliente}/{processo}/{AAAAMM}/`, limites validados em servidor (PDF/JPG/PNG ≤25MB, ZIP ≤50MB).
- **Sugestões de nome por IA** (Gemini 2.5 Flash, multimodal para imagens e PDF) ao subir um arquivo — 4 sugestões + opção "Manter original".
- Novas tabelas: `processo_checklist_acoes`, `processo_anexos`, `processo_templates` (+ filhos) com RLS, GRANTs e soft delete.
- **Pendente nesta entrega**: página de UI para criar templates (CRUD), aplicar template ao criar processo, e enum de ações `marcou_nok`/`marcou_na` na UI. Backend já está pronto.

## 0.18.3 — Ajustes de layout, seed de processos e padronização de labels

- Layout de `/processos` reorganizado: removidos 2 conjuntos de abas sobrepostos; filtros por tipo (Projeto / Atendimento / Instalação) e status (Ativos / Arquivados) agora convivem em uma única barra de ferramentas clara.
- Seed de dados de exemplo para processos: 5 atendimentos, 5 instalações e 2 processos arquivados (perdidos) inseridos para enriquecer o ambiente de demonstração.
- Pipeline Comercial: label **Responsável** padronizado para **Pilar** na tabela e no modal de edição, alinhado à nomenclatura do sistema.

## 0.18.2 — Pipeline Comercial: perdidas e restauração

- Corrigido o fluxo **Marcar como perdida** para arquivar a oportunidade com motivo obrigatório, data/hora, usuário responsável e auditoria.
- Novo botão **Perdidas** no Pipeline Comercial, exibindo lista de oportunidades arquivadas com quem marcou, quando marcou, motivo e valor perdido.
- Oportunidades perdidas podem ser **restauradas** pela lista ou pela ficha; após restaurar, exibem badge **Restaurado por...** por 48 horas.

## 0.18.1 — Pipeline Comercial: botão de arquivar (perdida) na ficha

- Botão **Marcar como perdida** adicionado ao modal de edição da oportunidade, com campo de motivo obrigatório (até 500 chars) antes de arquivar.
- Oportunidades arquivadas exibem aviso de leitura no modal; podem ser reativadas arrastando para outro estágio no kanban.

## 0.18.0 — Arquivamento e restauração de processos (Lost)

Sistema completo para o pilar (ou manager/admin) marcar um processo como **perdido**, com auditoria, bloqueio de edição enquanto arquivado e restauração com badge temporário.

- Novo enum `lost_category`: preço, prazo, concorrente, escopo, cliente desistiu, técnico, outro.
- Novos campos em `processos`: `lost_at`, `lost_by`, `lost_reason`, `lost_category`, `restored_at`, `restored_by`, `lost_count`.
- Novo trigger `tg_processos_block_when_lost` impede alterar `stage`, `progresso` ou `risco` enquanto o processo está arquivado.
- Auditoria estendida: todas as mudanças nos novos campos são gravadas em `audit_log` via `tg_processos_audit`.
- Server functions `marcarComoPerdido({ id, reason, category })` e `restaurarProcesso({ id, comentario })`, com validação Zod (motivo ≥10 chars) e permissão restrita ao pilar, manager ou admin.
- Eventos `lost` e `restored` gravados em `processo_eventos`; notificações criadas para pilar e managers.
- UI:
 - Novo toggle **Ativos · Arquivados** em `/processos` com contadores.
 - Aba Arquivados com tabela dedicada (categoria, motivo truncado, perdido por/quando) e KPIs (total, valor perdido, top 3 motivos).
 - Drawer ganha botão **Marcar como perdido** (vermelho) / **Restaurar** (verde), banner de status, e desabilita "Avançar estágio" quando arquivado.
 - Card e drawer mostram badge **"Restaurado por X · há Yh"** por 48h após restauração (expira sozinho, sem cron).
 - Dialogs com botões Save / Save & Close / Cancel no topo (regra do design system).

## 0.17.1 — Pipeline Comercial: edição, tabela e responsivo

- Botão **Nova oportunidade** movido para o slot de actions do `PageHeader` (à direita do breadcrumb).
- Click em qualquer card do kanban (ou linha da tabela) abre **modal de edição** com título, contato, valor, probabilidade, data de fechamento e observações; respeita Save / Save & Close / Cancel no topo do formulário (regra do design system).
- Oportunidades já convertidas em processo ficam **somente leitura** no modal.
- Novo toggle de visualização **Kanban / Tabela** no header; a tabela exibe código, título, cliente/lead, estágio, valor, probabilidade, responsável e idade no estágio, com ordenação visual por estágio.
- Layout responsivo:
 - **Tablet**: tabela com colunas essenciais; kanban com scroll horizontal otimizado.
 - **Celular**: kanban com snap por coluna (85vw cada) e versão da tabela em cards empilhados; botão "Nova" compacto.
- Novo server function `updateOportunidade` com validação Zod (titulo 2-200, email, valores, datas) e hook `useUpdateOportunidade`.

## 0.17.0 — Pipeline Comercial (Suspect → Prospect → Cliente)

Primeiro CRM real do sistema: kanban visual de oportunidades com conversão em 1 clique para Processo de engenharia/produção.

- Nova rota `/comercial/pipeline` com kanban arrastável (dnd-kit), 6 colunas operacionais: **Novo · Qualificado · Proposta · Negociação · Ganho · Perdido**, agrupadas conceitualmente em **Suspect / Prospect / Cliente** via badge no card.
- Cards mostram código (OPP-AAAA-####), título, cliente/empresa-lead, valor estimado, probabilidade, responsável e **idade no estágio** (badge amarelo >7d, vermelho >14d).
- KPIs no topo: pipeline ativo, valor total, valor ponderado (Σ valor × prob), taxa de conversão histórica.
- Mover para **Ganho** abre dialog de conversão e cria automaticamente um `processos` herdando título, cliente, responsável e valor; oportunidade marcada com `processo_id` e fica somente-leitura.
- Mover para **Perdido** exige preenchimento de `lost_reason` para análise de funil.
- Updates otimistas via React Query com rollback em caso de erro do server.
- Dialog "Nova oportunidade" com validação Zod (titulo 2-200, email válido, probabilidade 0-100).
- Sidebar CRM atualizado: submenu de Processos agora inclui **Pipeline Comercial** + **Processos (Projetos)** (substitui labels antigos sem rota).

## 0.16.4 — Schema de oportunidades comerciais

Modelo de dados que sustenta o módulo Comercial real, separando jornada de venda (uma empresa pode ter N oportunidades ao longo do tempo) do cadastro de cliente.

- Novos enums:
 - `lifecycle_stage`: `suspect`, `prospect`, `cliente`
 - `pipeline_stage`: `novo`, `qualificado`, `proposta`, `negociacao`, `ganho`, `perdido`
- Nova tabela `oportunidades` com: código sequencial OPP-AAAA-####, título, cliente (opcional até virar prospect), dados de lead (nome/empresa/email/telefone), origem, segmento, responsável, valor estimado, probabilidade (0-100), data prevista de fechamento, motivo da perda, FK para `processos` quando convertida, soft delete e auditoria padrão.
- Nova tabela `oportunidade_stage_history` registrando cada mudança de estágio (de quem para quem, quando, duração em segundos) — base para funil e tempo médio por etapa.
- Triggers automáticos:
 - `tg_oportunidades_set_codigo` gera o código e define `created_by`/`lifecycle_stage` inicial.
 - `tg_oportunidades_before_update` recalcula `lifecycle_stage` a partir do `pipeline_stage` (novo→suspect; qualificado/proposta/negociação→prospect; ganho→cliente) e reseta `stage_entered_at` em cada movimento.
 - `tg_oportunidades_after_update` grava linha em `oportunidade_stage_history`.
 - `tg_oportunidades_audit` grava INSERT/UPDATE/DELETE em `audit_log` com diff por campo.
- Função utilitária `derive_lifecycle(pipeline_stage)` com `search_path` fixo.
- Policies RLS:
 - **Vendedor**: vê e edita só `responsavel_id = auth.uid()` (não-deletado).
 - **Manager/Admin**: acesso completo.
 - **Engenharia/Produção**: leitura apenas de oportunidades `ganho` já convertidas (`processo_id IS NOT NULL`).
 - Histórico segue as mesmas regras de visibilidade.
- GRANTs explícitos para `authenticated` e `service_role` em ambas as tabelas + USAGE na sequence.

## 0.16.3 — Submenu do FAT corrigido

- Submenus inválidos do item **FAT** no sidebar ("Agendados", "Em execução", "Homologados") substituídos por entradas reais e navegáveis:
 - **Lista de FATs** → `/qualidade/fat`
 - **Novo FAT** → `/qualidade/fat/novo`
- Antes os subitens não tinham `to` definido e não levavam a lugar nenhum ao clicar; agora cada filho navega para uma rota existente registrada em `routeTree.gen.ts`.

## 0.16.2 — Cache de role e módulos sempre atualizado

- `useAuth` (`useQuery(["user-role", userId])`) agora usa `staleTime: 0`, `refetchOnMount: "always"`, `refetchOnWindowFocus: true` e `refetchOnReconnect: true`. A role exibida no rodapé do sidebar e usada para filtrar itens não fica mais presa em um valor antigo após login/troca de role.
- `useMyModules` (`useQuery(["my-modules", userId])`) recebeu a mesma estratégia de cache, garantindo que mudanças em `role_module_permissions` apareçam no sidebar sem precisar limpar storage ou recarregar com hard refresh.
- Efeito prático: o item **FAT** (e demais itens dependentes de role/módulo) reaparece imediatamente após o usuário receber a permissão correta.

## 0.16.1 — Role admin no sidebar

- Corrigido o rótulo da role `admin` no rodapé do sidebar de "Geral" para "Admin".
- A resolução da role atual agora considera todas as roles do usuário e prioriza `admin`, evitando que outra role retornada primeiro esconda itens como FAT.

## 0.16.0 — FAT detalhe, novo FAT e homologação validada

- **Rota `/qualidade/fat/novo`**: seletor de processo (busca + lista) que cria o FAT via `createFat` e redireciona para a página de detalhe.
- **Rota `/qualidade/fat/$id`**: página completa com abas Identificação, Checklist, Medições, RNCs, Assinaturas e Histórico.
 - Cabeçalho com código, cliente, processo, badge de status, contadores OK/NOK/N-A, RNCs abertas e progresso.
 - **Identificação**: TAG, OS, data/hora, local, testemunha, temperatura/umidade/tensão, técnicos, motivos da viagem (chips multi) e observações; salva via `updateFatIdentificacao`.
 - **Checklist**: agrupado por seção, botões OK/NOK/N-A, comentário, upload de foto direto para o bucket `fat-evidencias` quando NOK exige evidência. Foto exibida via signed URL.
 - **Medições**: tabela com adicionar/remover, status Aprovado/Reprovado calculado no servidor a partir da tolerância.
 - **RNCs**: lista com edição inline (título/descrição/plano/status), botão "Adicionar RNC". RNCs automáticas continuam sendo criadas a partir de respostas NOK.
 - **Assinaturas**: canvas digital para inspetor e testemunha, com nome/cargo, hash SHA-256 exibido após assinar e botão "Refazer".
 - **Histórico**: lê `audit_log` (admin/manager) e mostra cronologia de alterações no FAT.
- **Homologação validada na UI**: painel "Pendências para homologação" lista bloqueadores por etapa antes mesmo de chamar o servidor — TAG/data faltando, checklist < 100%, NOK sem foto obrigatória, RNCs em aberto, assinaturas faltando. Botão "Homologar" desabilitado enquanto houver pendência; após homologar, o formulário entra em modo somente leitura com alerta de confirmação.

## 0.15.4 — Guarda admin server-side, sugestão de correção e E2E Playwright

- **Guarda admin-only server-side**: `listRoleModulePermissions` agora chama `assertAdmin` antes de qualquer leitura (defesa em profundidade sobre o RLS). `bulkSetRolePermissions` já validava admin via `applyBulkSetRolePermissions`; testes cobrem explicitamente a tentativa de bulk update por non-admin (rejeição imediata, zero `upsert`).
- **Regras com `suggestion`**: cada `RuleViolation` agora carrega `{ action, module, label }` — a "alternativa válida mais próxima". O builder `requires()` e cada regra (`dashboard-required`, `admin-only-manager`, `qualidade-requires-processos`, `comercial-requires-clientes`, `pos_vendas-requires-clientes`) emitem a sugestão correspondente. Novo teste vitest cobre todas as regras.
- **UI do toggle**: o banner de erros agora mostra o **código da regra** (`ruleId`) ao lado da role, a **explicação** (`message` + `hint`) e a **alternativa válida mais próxima** com botão "Aplicar correção" que ajusta o módulo local sem salvar. Botão "Salvar alterações" continua bloqueado enquanto houver violação.
- **Playwright E2E** (`e2e/permissoes.spec.ts` + `playwright.config.ts`): cenários cobrindo (i) habilitar Qualidade sem Processos para engineer → exibe `permissoes-violation-code` = `qualidade-requires-processos`, hint estruturado, botão Salvar desabilitado, e "Aplicar correção" liga Processos; (ii) habilitar Administração para sales → bloqueia com código `admin-only-manager` e sugere desabilitar. Configuração via `E2E_BASE_URL` + `E2E_STORAGE_STATE` (admin logado); ausentes, a suite é pulada.
- Script `bun run test:e2e`; `@playwright/test` adicionado como devDependency.

## 0.15.3 — Regras centralizadas + testes de integração das permissões

- **Regras centralizadas** em `PERMISSION_RULES` (`src/lib/permissoes.functions.ts`) com formato estruturado `{ id, description, check }`. Cada violação devolve `{ ruleId, role, modulesInvolved, message, hint }`, permitindo destacar a célula exata e mostrar o motivo da regra.
- **UI**: cada toggle inválido fica com fundo âmbar, badge "inválido" e `title` com mensagem + hint; o banner do topo lista o motivo de cada bloqueio com a explicação por baixo.
- **Auto-fix de mensagens**: regras de dependência usam o builder `requires(a, b, motivo)` para padronizar texto e hint.
- **Testes de integração** (`src/lib/permissoes.test.ts`, vitest) cobrindo:
 - Pureza das regras (ids únicos, matriz vazia válida, cada regra individual).
 - `applyBulkSetRolePermissions` rejeita não-admin (simula RLS admin-only via mock do `user_roles`), rejeita role `admin`, rejeita combinações inválidas com hint na mensagem, persiste quando válido e propaga erro do `upsert`.
 - `assertAdmin` passa para admin e propaga erro do banco.
- Adicionados scripts `test` e `test:watch`; vitest 4 instalado como devDependency. O servidor continua validando independentemente do cliente (defense in depth).

## 0.15.2 — Auditoria e validação de permissões

- **Painel de auditoria** colapsável dentro da aba Permissões, listando os últimos 100 eventos (`INSERT`/`UPDATE`/`DELETE`) com quem fez, quando, qual role, qual módulo e o valor anterior → novo.
- Server fn `listPermissoesAuditLog` (admin-only) lê `audit_log` filtrado por `role_module_permissions`, resolve nomes via `profiles` e completa role/módulo para eventos `UPDATE` via lookup em `role_module_permissions`.
- **Validação de combinações**: regras `PERMISSION_RULES` aplicadas em tempo real no toggle e revalidadas no servidor (`bulkSetRolePermissions` rejeita combinações inválidas).
 - Qualquer módulo ativo exige `Dashboard` habilitado.
 - Módulo `Administração` só pode ser habilitado para a role `manager`.
 - `Qualidade` requer `Processos`.
 - `Pós-venda` e `Comercial` requerem `Clientes`.
- Banner amarelo lista os erros pendentes por role e desabilita "Salvar alterações" até a correção.

## 0.15.1 — Permissões por módulo

- Nova aba **Permissões** em `/admin/usuarios` com matriz Role × Módulo controlada por toggles, salvamento em lote, descarte e indicador "alterado" por célula.
- Nova tabela `role_module_permissions` (RLS: leitura para todo autenticado, escrita só admin) + enum `app_module` cobrindo os 12 agrupamentos navegáveis. Seed inicial conservador por role; admin sempre total.
- Função `can_access_module(user, module)` e server fns `listRoleModulePermissions`, `bulkSetRolePermissions`, `getMyModules`.
- Hook `useMyModules` consumido pela `AppSidebar`: itens e seções somente aparecem quando a role do usuário tem o módulo habilitado (admin enxerga tudo).
- Trigger dedicada de auditoria grava INSERT/UPDATE/DELETE em `audit_log`.

## 0.15.0 — Tipos de processo + checklists por estágio

- **Três tipos de processo** (`projeto`, `atendimento`, `instalacao`) com pipelines distintos vindos de `PIPELINE_BY_TIPO`. Tabs no topo de `/processos` filtram por tipo (com contagem por aba) e o select de Estágio do modo Tabela passa a usar o pipeline do tipo ativo.
- **`NovoProcessoForm`** ganha campo "Tipo de processo"; o estágio inicial é re-resetado para o primeiro do pipeline ao trocar o tipo. `createProcesso` valida o tipo via Zod e persiste em `processos.tipo`.
- **Checklists por estágio** alimentados por `processo_checklist_template` (65 itens já semeados — 40 projeto / 14 atendimento / 11 instalação) com status individual em `processo_checklist_status` (UPSERT por `(processo_id, template_id)`, RLS via `can_access_processo`).
- Novas server fns `listChecklist` / `toggleChecklistItem`. `moveProcesso` agora consulta os itens obrigatórios do estágio atual e **bloqueia o avanço** com mensagem `"Checklist pendente: …"` quando algum item obrigatório está pendente.
- **Drawer**: nova aba "Checklist" agrupada por estágio, com destaque no estágio atual, contador `feitos/total`, descrição, marcador `*` para obrigatórios e checkbox que dispara `toggleChecklistItem` (RLS + auditoria).
- Versão `APP_VERSION` mantida — bump para 0.15.0 será feito ao fechar a fase 2 (bifurcações e sub-status).

## 0.14.1 — Estados de carregamento e falha dos Processos

- **Rota `/processos`** ganha `pendingComponent` (skeleton de 10 colunas com placeholders animados) e `errorComponent` (mensagem + "Tentar novamente" via `router.invalidate()` e atalho para "Novo processo"), evitando a tela em branco enquanto o React Query carrega ou falha.
- **Kanban** mostra CTA de pipeline vazio (criar primeiro processo / revisar filtros) quando a lista retorna sem registros, mantendo o board interativo.
- **Novo processo**: banner de erro consolidado para falhas em clientes/pilares com botão "Recarregar"; selects exibem placeholders distintos para carregando/erro/vazio; "Salvar" desabilita durante carregamento de dependências ou submit; spinner no botão durante a criação.
- **`/admin/erros-drawer`** mantido como tela oficial de monitoramento (filtros por rota e versão, stack/componentStack expansíveis e contagem por ocorrência).

## 0.14.0 — Processos persistidos no Supabase

- **Persistência real**: removido o store in-memory `src/lib/processos/store.ts`. Novas tabelas no banco — `processos`, `processo_eventos`, `processo_tarefas`, `processo_emails`, `processo_notificacoes` — com RLS escopada por Pilar (vendedor enxerga só os seus; admin/manager enxergam tudo) e GRANTs explícitos para `authenticated` + `service_role`. Trigger de auditoria grava em `audit_log`. Código `PRJ-YYYY-NNN` gerado por sequence.
- **Server functions** (`src/lib/processos.functions.ts`) com `requireSupabaseAuth` + Zod: `listProcessos`, `getProcessoDetalhe`, `createProcesso`, `moveProcesso`, `concluirTarefa`, `runSlaAutomations`, `listPilares`, `seedProcessosDemo` (gate admin/manager).
- **Pipeline 10 estágios** confirmado no enum `processo_stage` (Lead → Pós-venda) — alinhado com o Kanban.
- **Frontend** (`src/lib/processos/queries.ts`): `useSuspenseQuery` para a lista, `useQuery` para o detalhe e mutations (`useMoveProcesso`, `useConcluirTarefa`, `useCreateProcesso`, `useRunSlaAutomations`) com invalidate por chave. Drag & drop no Kanban dispara `moveProcesso` server-side; drawer abre detalhe vindo do banco; novo formulário usa pilares e clientes reais.
- **ErrorBoundary**: substituído o `__getStateForBoundary` por leitura do cache do React Query (`queryClient.getQueryData`) para montar o snapshot do processo no fallback.
- **Pilares dinâmicos**: select de Pilar consome usuários com role `admin|manager|sales` via `listPilares()` — `PILARES_MOCK` aposentado.
- **Telemetria**: `APP_VERSION` atualizada para 0.14.0; eventos de erro do Drawer continuam fluindo para `/admin/erros-drawer`.
- **Pipeline & Pilar**: nova entrada documenta tanto o pipeline (10 estágios persistidos) quanto o pilar (responsável end-to-end vinculado a `auth.users` via `pilar_id`).
- **Regressão**: teste em `src/components/processos/__tests__/ProcessoDrawer.regression.test.ts` agora garante que o Drawer NÃO importa mais o store mock e que consome React Query.
- **Fora desta versão**: realtime (`postgres_changes`), envio real de e-mail, cron server-side de SLA e migração dos erros do Drawer para tabela `client_errors`.

## 0.13.2 — Diagnóstico do Drawer de Processos

- **Fallback rico no `ProcessoDrawerErrorBoundary`**: mostra resumo do processo (código, título, cliente, pilar, estágio, risco, progresso, valor, previsão e badge de SLA), botão "Recarregar dados" (força re-mount), botão "Fechar" e aviso de falhas recorrentes (≥3) com bloqueio do recarregar.
- O Kanban continua interativo mesmo se o drawer falhar várias vezes — o boundary só envolve o painel lateral.
- **Telemetria enriquecida**: cada erro agora carrega `sessionId` (estável por aba via `sessionStorage`), `version` (`APP_VERSION`), `processoCode`, `stage`, `progresso`, `risco` e snapshot de SLA (`status`/`diasNoEstagio`/`limite`). Enviado para o backend (`reportClientError`) e armazenado no store local.
- Novo store `drawer-errors.store.ts` agrupa por `message+stack` (com contagem) e mantém os últimos 200 registros em memória.
- **Tela `/admin/erros-drawer`** lista os erros capturados com tabela (Quando, Mensagem, Rota, Versão, Processo, Estágio/SLA, Ocorrências), linha expansível com stack e componentStack, filtros por busca/rota/versão e botão "Limpar tudo". Restrita a admin/manager.
- Item "Erros do Drawer" adicionado ao menu Administração.
- Constante `APP_VERSION` em `src/lib/app-version.ts` (mantém-se sincronizada com a release vigente).
- TODO: persistir registros em tabela `client_errors` no Supabase (v0.14).

## 0.13.1 — Estabilidade do Drawer de Processos

- Corrigido `Maximum update depth exceeded` em `/processos` causado por seletores `useSyncExternalStore` que retornavam novos arrays a cada chamada (`s.eventos.filter(...)`, `s.processos.find(...)`). Agora o `ProcessoDrawer` lê o estado bruto e deriva via `useMemo`.
- Novo `ProcessoDrawerErrorBoundary` isola falhas do drawer: a lista de processos continua utilizável e o usuário vê o ID do incidente + botão "Tentar novamente".
- Boundary envia stack, `processoId` e `componentStack` ao backend via `trackClientError` (`reportClientError` server fn → server logs).
- Teste de regressão em `src/components/processos/__tests__/ProcessoDrawer.regression.test.ts` (bun test) trava o padrão: proíbe `.filter/.find/.map/.slice/.concat/.reduce` dentro de seletores `useProcessosState` e exige o boundary na rota.
- Validado em `/processos`: Kanban carrega, drawer abre sem loop.

## 0.13.0 — Pipeline de Processos (Kanban + SLA + Pilar)

- **Board Kanban** em `/processos` com 10 colunas (Lead → Pós-venda), cartões com cliente, pilar, progresso, risco, valor e badge de SLA.
- **Drag & drop** entre colunas (via `@dnd-kit`) atualiza o estágio e registra evento na timeline do processo.
- **Toggle Kanban ↔ Tabela** persistido na URL (`?view=`); filtros por busca, risco e pilar também na URL.
- **Conceito de Pilar** (responsável end-to-end) introduzido em todos os processos. Lista mock em `PILARES_MOCK` (próximo passo: persistir `pilar_id` no cadastro de cliente — requer migração).
- **SLA por estágio** configurável em `src/lib/processos/sla.ts`. Badge de SLA com 3 estados (no prazo / risco / atrasado).
- **Automações de follow-up**: quando SLA estoura, dispara — uma única vez por (processo|estágio) — tarefa automática para o Pilar, notificação in-app via toast e log de e-mail (template `sla_estourado`; envio real a integrar com a fila de e-mails).
- **Drawer lateral** com tabs Resumo / Timeline / SLA / Tarefas / E-mails e botão "Avançar estágio".
- **Formulário Novo Processo** funcional substituindo o placeholder, com seleção de cliente, pilar, estágio inicial, risco, valor e previsão.
- Store de processos em memória (singleton `useSyncExternalStore`) — TODO migrar para tabelas `processos`, `processo_eventos`, `processo_tarefas` no Supabase.

## 0.12.6 — Logs detalhados e fallback de queries em PA/UY/PY

- `firecrawlSearchEnrich` agora emite logs estruturados (`[enrich:pa|uy|py]`) com query, status HTTP, URLs candidatas, tamanho do markdown, validação anti-alucinação e JSON extraído por resultado — facilitando diagnosticar por que Panamá/Uruguai falham.
- Provedores PA e UY tentam até três queries (oficiais + opencorporates/guias) antes de desistir; cada miss aparece nos logs.
- Orquestrador `enrichDocumento` registra provider em execução e chaves dos campos retornados antes/depois do `sanitizeResult`.

## 0.12.5 — Correções em enrichment PA/UY/PY

- Máscara de documento aceita `#`, `9` e `0` como placeholders de dígito (além de `X`/`A`), eliminando o efeito "########-#80019270" no campo RUC do Paraguai.
- Sanitizer de enrichment descarta strings tipo `/null/` e `/undefined/` que alguns provedores via Firecrawl retornam, evitando que campos sejam preenchidos com "/null/".
- Provedor Panamá (DGI) migrado para busca web validada pelo RUC — a página oficial é SPA e não era extraível.
- Provedor Uruguai (DGI) migrado para busca web validada pelo RUT — mesma limitação da SPA original.
- Cache de enrichment de PA/UY/PY limpo e máscara do Paraguai reforçada para `XXXXXXXX-X`.

## 0.12.4 — Correção de travamento na segunda consulta de CNPJ

- Corrigido travamento ao consultar um segundo CNPJ no formulário de cliente: a lista de sócios agora é limpa/substituída em uma única operação, evitando loop de atualizações no React.
- Mantida a limpeza automática dos campos enriquecidos antes de cada nova consulta para impedir mistura de dados entre CNPJs diferentes.

## 0.12.3 — Fallback universal de logos e validação de persistência

- **Validação em tempo de salvamento**: ao salvar na aba Configurações, `logo_url` e `logo_url_dark` são automaticamente preenchidas com o valor da versão colapsada quando estiverem vazias, garantindo que a logo expandida nunca fique sem referência.
- **Backfill de registros existentes**: migration para copiar URLs colapsadas (`logo_url_collapsed` / `logo_url_collapsed_dark`) para os campos expandidos de qualquer registro que ainda estivesse incompleto.
- **Fallback em todos os pontos de exibição**: landing page (header e footer), sidebar (expandido e recolhido) e painéis de autenticação (`/auth/*`) agora usam cadeia de fallback (`logo_url` → colapsada → escura → colapsada escura), assegurando que a logo cadastrada apareça em toda a aplicação independentemente de qual campo foi preenchido.

## 0.12.1 — Logos dinâmicas preservadas

- Corrigido carregamento público de `brand_settings` para buscar apenas colunas liberadas, restaurando a logo na página inicial e em todas as telas de autenticação.
- Ajustado salvamento da aba Configurações para ler o registro singleton existente antes de salvar, preservando versões de logo já enviadas e evitando recriar a configuração.

## 0.12.0 — Autocompletar fiscal LATAM com auditoria e auto-busca

- **9 países suportados**: Brasil (BrasilAPI + ReceitaWS), Paraguai (SET), Argentina (CUIT Online), Uruguai (DGI), Peru (apis.net.pe), Costa Rica (Hacienda) e Equador (SRI) ativos por padrão; Chile (SII), Panamá (DGI/MEF) e Colômbia (RUES) cadastrados e desativados por padrão (sujeitos a captcha).
- **Arquitetura**: `src/lib/enrich/*.server.ts` com um provider por país; `enrichDocumento` orquestra ordem de preferência, lê `integracoes_config` e cacheia respostas por 7 dias em `enrich_cache`. Firecrawl integrado via connector para portais sem API. Validação de formato por país antes da consulta.
- **Auditoria**: nova tabela `enrich_log` (RLS admin/manager) registra cada consulta (data, país, documento, provedor, sucesso/erro, fonte, cache hit). Aba **Logs de busca fiscal** em `/admin/configuracoes` com filtros por país e status.
- **UX no formulário**: badge de status do provedor por país (Ativo / Desativado / Sem provedor) ao lado do documento; mensagens inline e toasts distintos para "Consultando…", "Dados preenchidos" e erros; indicador quando vem do cache; botão "Buscar" desabilitado com tooltip explicativo quando não há provedor.
- **Auto-busca Paraguai**: RUC válido (8–9 dígitos) com razão social vazia dispara consulta SET automaticamente (debounce 600 ms).

## 0.11.1 — Aba Integrações no admin

- Nova aba **Integrações** em `/admin/configuracoes` (admin-only) lista todos os provedores fiscais por país com toggle ativo/inativo persistido em `integracoes_config` (com RLS, GRANTs e auditoria). Mostra origem da chave (env var, connector ou sem chave) e estado de disponibilidade.

## 0.11.0 — Clientes: internacionalização e cadastros auxiliares

- **URL canônica por código**: perfil do cliente em `/clientes/CLI-0001` (substitui UUID); listagem e redirect pós-create usam `params: { codigo }`. Nova server function `getClienteByCodigo`.
- **Bandeira do país**: emoji (helper `flagEmoji` via Regional Indicators) no select de país, filtro da listagem e coluna País.
- **Segmentos e Origens de lead**: novas tabelas `segmentos` (41 itens pré-carregados) e `lead_origens`. Combobox com busca + "Adicionar novo" inline; normalização Title Case PT-BR. RLS: leitura `authenticated`, criação `admin/manager/sales`, soft delete `admin/manager`.
- **Campos legados** (todos opcionais): site, e-mail/telefone corporativo + DDI + ramal, apelido, matriz/filial, redes sociais (seção recolhida). Fiscal BR (visível só quando `pais=BR`): regime tributário, CNAE, naturezas jurídicas, situação cadastral, data abertura, capital social, porte. Sócios em tabela própria `cliente_socios`.
- **Autocomplete CNPJ (BR)**: botão "🔄 Buscar dados" consulta BrasilAPI com fallback ReceitaWS via `enrichDocumento`. Só preenche campos vazios e popula sócios quando ainda não há nenhum.
- **UX**: seções colapsáveis para Sócios, Fiscal BR e Redes sociais.

## 0.10.0 — Clientes (Américas)

- **Banco**: `paises_config` (17 países com regex/máscara/moeda ISO 4217 e idioma padrão), `clientes` (país FK, documento fiscal internacional, idioma, moeda, endereço, lat/long, soft delete, código `CLI-XXXX` via trigger) e `cliente_contatos` (DDI + telefone, principal). RLS em todas: SELECT para autenticados, mutações `admin/manager/sales`; soft delete só `admin/manager`.
- **Seed**: 25 clientes de demonstração (15 Brasil/SC, 6 Paraguai, 4 Bolívia) com contatos.
- **Server functions** (`src/lib/clientes.functions.ts`): `listPaises`, `listClientes` (paginação 25/50/100 server-side, busca em razão social/fantasia/código/documento/cidade, filtros por status e país), `getCliente`, `createCliente`, `updateCliente`, `deleteCliente`. Todas com `requireSupabaseAuth`, revalidação de role e `audit_log`.
- **Validação de documento internacional**: normalização preserva `[A-Z0-9Ñ&]` (RFC mexicano), valida contra `documento_regex` do país e bloqueia duplicidade `(país, documento)`. Gravado sem máscara e em maiúsculas; exibido com máscara do país.
- **Telas**: `/clientes` com dados reais, filtro por país e documento mascarado; perfil `/clientes/:codigo` com cabeçalho/breadcrumb/status vindos do banco; formulário `/clientes/novo` com select de país (auto-preenche moeda/idioma), máscara dinâmica, validação on-blur, lookup ViaCEP (BR) com fallback manual, contatos repetíveis e padrão Save / Save & Close / Cancel no topo.

## Avatar — remover e progresso de upload

- Página `/conta`: botão **Remover avatar** (visível apenas quando há avatar) restaura a imagem padrão (iniciais), deleta o arquivo do bucket `avatars` e registra em `audit_log`.
- Upload de avatar agora exibe barra de progresso (`<Progress>`) com porcentagem durante o envio; botão de upload fica desabilitado enquanto envia.

## Minha conta, reset de senha e auditoria com filtros

- Nova página `/conta` para o usuário: editar nome, trocar avatar (upload no bucket `avatars`) e alterar a própria senha (com verificação da senha atual).
- Coluna `avatar_url` adicionada em `profiles`; políticas RLS no bucket `avatars` (leitura para autenticados, escrita apenas na própria pasta).
- Avatar/nome do sidebar agora navega para `/conta` e mostra o avatar do usuário.
- Em `/admin/usuarios`: nova ação **Redefinir senha** com geração segura de senha temporária (16 chars, `crypto.getRandomValues`), revelação única e cópia. Registrada em `audit_log` como `auth.users / password / reset_by_admin`.
- Tela `/admin/auditoria` reescrita: filtros por usuário (busca por nome/email), ação (INSERT/UPDATE/DELETE), tabela, intervalo de datas e busca livre. Paginação server-side (50/pág) e modal de detalhes com `old_value` / `new_value` em JSON. Acesso liberado a admin e manager. Export CSV do resultado filtrado.

## Página de Usuários & Permissões

- Implementada a página `/admin/usuarios` (admin-only) substituindo o placeholder.
- Listagem com busca, filtros por role e status, paginação server-side (50/pág) e contador total.
- Criação direta de usuário (email + senha temporária com gerador, multi-select de roles, e exibição única da senha após criar).
- Edição inline de nome e roles (diff aplicado com insert/delete em `user_roles`).
- Desativar/Reativar com confirmação: soft delete em `profiles`, remoção de roles e bloqueio de login via `ban_duration`; proteção contra autodesativação.
- Toda mutação validada no backend com `requireSupabaseAuth` + checagem de role admin e registrada em `audit_log`.

## Menu lateral reorganizado

- Reestruturado em torno do ciclo CRM → Operação → Pós-venda → Know-how.
- Novos grupos: **CRM** (Processos, Clientes, Orçamentos), **Suprimentos**, **Produção & Qualidade** (Montagem + FAT), **Pós-venda** (Chamados, Base instalada, NPS), **Know-how** (Base, Documentação técnica, Treinamentos).
- Engenharia colapsada em **ETPs** e **Projetos** (Gantt, Mecânico, Elétrico como filhos).
- Removidos do menu global itens redundantes que já são abas do perfil do cliente (Equipamentos, FAT, Documentos, Chamados como pais soltos).
- Filtro de visibilidade por role: admin e manager veem tudo (manager exceto Administração); demais roles veem apenas grupos de sua competência.
- Novas rotas placeholder: `/clientes`, `/pos-vendas/chamados`, `/pos-vendas/base-instalada`, `/pos-vendas/nps`, `/know-how/base`, `/know-how/documentacao`, `/know-how/treinamentos`, `/admin/usuarios`.

# Changelog

## 0.9.3 — Auditoria de segurança
- **Bucket `avatars`**: limite de 8 MB e whitelist de tipos MIME (PNG/JPEG/WEBP/GIF) aplicados no servidor — antes a validação só existia no cliente.
- **`brand_settings`**: visitantes anônimos deixaram de ler colunas sensíveis (`support_email`, `updated_by`); permanecem visíveis apenas campos de marca/SEO necessários para a landing.
- **`reportClientError`**: agora exige sessão autenticada (`requireSupabaseAuth`), valida payload com Zod (tamanhos máximos) e remove quebras de linha de todos os campos antes de logar — fecha vetor de log injection.
- **Open redirect no login**: `?redirect=` agora aceita apenas caminhos internos (`/...`); URLs absolutas e `//evil.com` caem para `/dashboard`.
- **Auditoria geral confirmada**:
 - Todas as 4 tabelas (`audit_log`, `brand_settings`, `profiles`, `user_roles`) com RLS habilitado e policies explícitas.
 - `/setup` re-checa no servidor (`bootstrapAdmin`) a existência de admin antes de criar — não depende da UI.
 - Todas as mutações de `/admin/usuarios` (criar, editar roles, desativar, reativar, reset de senha) revalidam o role admin no servidor via `assertAdmin` antes de qualquer operação.
 - Policies do bucket `avatars` restringem upload/update/delete à pasta `auth.uid()` do próprio usuário.
 - Bundle do client carrega apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`; service-role key fica restrita a `process.env` no runtime do servidor.

## Sidebar
- Itens de menu com submenu agora apenas expandem/colapsam ao clicar (não navegam).
- Estado de expansão dos grupos persiste entre navegações (localStorage).

## Páginas de autenticação
- Removido badge de versão "SLTK · v0.3" do painel escuro e do header mobile.


## Páginas de autenticação — ajustes
- Logos dobradas de tamanho no painel escuro (h-28 × w-72) e no header mobile (h-24 × w-64).
- Rodapé do painel do formulário alinhado verticalmente com o painel escuro em telas xl (py-14).

## 2026-06-09

- Páginas de autenticação (login, esqueci a senha, redefinir senha) agora usam a logo cadastrada em brand_settings em vez da logo antiga estática.
- Aumentado contraste do link "Esqueci a senha" e demais links auxiliares das páginas de autenticação (cor de marca + peso semibold).
- Rodapé das páginas de autenticação agora exibe os dois lados alinhados (esquerda e direita) também em telas pequenas.

## 2026-06-09

- Aumentado novamente o tamanho das logos na landing page: header (h-12 / md:h-14) e footer (h-12).

## 2026-06-09

- Aumentado tamanho das logos no header (h-10 / md:h-12) e no footer (h-10) da landing page.

## 2026-06-09

- Corrigido uso da logomarca oficial Solutek no site inteiro, incluindo landing page, sidebar e prévias da tela de configurações.
- Ajustada landing page para utilizar logo dinâmica via brand_settings com fallback para logo local.
- Ajustado sidebar para utilizar logo dinâmica via brand_settings com fallback para logo local.
- Corrigido ícone de expandir sidebar que não aparecia após colapsar.
- Ajustada exibição da logo recolhida no sidebar quando colapsado.
- Corrigida leitura pública de `brand_settings` para a página inicial exibir a logo nova cadastrada em vez do fallback antigo.
- Ajustada permissão da função interna de RBAC para remover chamada direta por usuários autenticados.
## 0.9.0 — Listagens CRM com paginação server-side
- Componente compartilhado `src/components/data/Pagination.tsx` (primeira/anterior/próxima/última + itens por página).
- `/clientes` (index) com busca, filtros e paginação padronizada.
- `/processos` migrado para o mesmo padrão.
- Mocks de CRM centralizados em `src/mocks/crm.ts`.

## 0.9.1 — Perfil 360º do cliente
- Nova rota `/clientes/:id` com abas (Visão geral, Equipamentos, Projetos, FAT, Documentos, Chamados, Contatos, Financeiro).
- Rota legada `/clientes/acme` migrada para o perfil dinâmico.

## 0.9.2 — Polimento responsivo do perfil do cliente
- Removida barra de rolagem vertical das versões/abas.
- Abas viram Select em mobile/tablet; barra horizontal no desktop.
- Grids e tabelas das abas revisados para mobile/tablet com scroll horizontal contido.
- Labels longas de KPI (ex.: DISPONIBILIDADE) quebram em múltiplas linhas em telas pequenas.
- Sidebar lateral confirmada (fixa no desktop, drawer no mobile).
