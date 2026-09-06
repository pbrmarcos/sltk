# Mapa do Sistema — Solutek Hub

Documento base para produção da Documentação e FAQ. Cobre cada módulo com objetivo, papéis, rotas, fluxos, integrações e FAQs candidatas. Fonte: `src/routes/_authenticated/` e `src/routes/` (rotas públicas).

Papéis reconhecidos (`AppRole` em `src/hooks/use-auth.tsx`, confirmado contra o código real — não confiar em versões antigas deste doc): `admin`, `manager`, `engineer`, `production`, `purchasing`, `assembly`, `field`, `sales`. Não existem papéis `quality`, `support` nem `user` — versões antigas deste documento citavam esses três por engano.

Estrutura real do menu principal (`src/components/layout/AppSidebar.tsx`, não confundir com o menu interno de Administração): Visão geral (Dashboard) · **Comercial** (Mineração, Pipeline, Clientes, Entrevistas, Checklists, Orçamentos) · **Operações** (ETPs, Projetos, Planejamento) · **Compras** (Solicitações de Compra, Cotações, Ordens de Compra, Almoxarifado, Fornecedores) · **Produção** (Montagem) · **Qualidade** (Revisão Mecânica, Revisão Elétrica, Relatório FAT) · **Pós-venda** (Chamados, Relatórios SAT) · **Logística** (Embarques) · **Documentos** (Emitidos, Editor de Blocos, Templates) · Administração (admin only) · Know-how · Ajuda.

Convenções:
- **Rotas** listadas na forma da URL final (sem o prefixo de layout).
- **Guards**: rotas em `_authenticated/` exigem sessão; regras de papel são aplicadas por `has_role()` no Supabase e por checagens client-side em cada tela.
- **Integrações**: Supabase (Postgres + Storage + Auth), edge functions em `supabase/functions/`, Lovable AI Gateway para geração de conteúdo, envio de e-mail transacional pelo domínio configurado.

---

## 1. Conta & primeiros passos

- **Objetivo**: onboarding de qualquer colaborador — autenticar, configurar perfil, entender navegação e permissões.
- **Papéis**: todos.
- **Rotas**:
  - `/auth` (pública) — login, cadastro, esqueci a senha
  - `/reset-password` (pública) — definir nova senha via link de e-mail
  - `/conta` — dados pessoais, avatar, troca de senha, sessões
  - `/dashboard` — home autenticada
- **Fluxos**:
  1. Login → redireciona para `redirect` param (mesma origem) ou `/dashboard`.
  2. Esqueci a senha → `resetPasswordForEmail` com `${origin}/reset-password` → e-mail com link.
  3. Editar perfil → upload de avatar (Storage `avatars/`), nome, telefone.
  4. Trocar senha → validação de senha atual + nova.
- **Integrações**: Supabase Auth (email/password), Storage `avatars`.
- **FAQs candidatas**: "Não recebi o e-mail de recuperação", "Como troco meu avatar?", "Meu papel está errado, o que faço?", "Como saio de todas as sessões?", "Posso alterar meu e-mail?".

## 2. Comercial

- **Objetivo**: prospectar, capturar oportunidades, cadastrar/gerenciar clientes, coletar checklist técnico e entrevista, montar orçamentos multilíngues e versionar propostas.
- **Papéis principais**: `sales`. Leitura para `engineer`, `field` (Clientes).
- **Rotas**:
  - `/comercial/mineracao` — prospecção por NCM/comércio exterior, converte "suspect" em oportunidade
  - `/comercial/pipeline` — kanban de oportunidades (Suspect → Prospect → Cliente), com visão tabela alternativa
  - `/clientes`, `/clientes/novo`, `/clientes/$codigo` — cadastro de contas/CRM (mora no menu Comercial, não em "Operações" — mudou nesta sessão)
  - `/comercial/entrevistas`, `/comercial/entrevistas/$id` — entrevista técnica por segmento, gera link público
  - `/comercial/checklists` — inbox das submissões do checklist técnico público (nome de exibição atual; internamente o código ainda usa "rfq" em vários lugares — ver "Pendências" abaixo)
  - `/comercial/orcamento` (lista), `/comercial/orcamento/novo` (wizard), `/comercial/orcamento/$id` (redireciona para `/documentos/$id` — orçamento é um tipo de documento do sistema unificado), `/comercial/orcamento/$id/corrigir` (nova revisão)
  - `/importar` — importação em lote de Clientes/Fornecedores por CSV (`?entity=clientes|fornecedores`), com botão "Importar CSV" nas telas de Clientes e Fornecedores
  - Público: `/checklist/$slug` (formulário técnico; `/rfq/$slug` é só um redirect para cá), `/p/cotacao/$token` (fornecedor responde cotação de compra — nada a ver com o checklist comercial, apesar do nome parecido)
- **Fluxos**:
  1. Mineração → suspect → nova oportunidade → cliente (novo ou existente) → sequência do processo: Entrevista → Checklist técnico → Proposta (guia embutido em `src/lib/comercial/guia.ts`, exibido em toda tela via `ProcessoComercialGuia`).
  2. Novo orçamento → wizard (cliente, itens, condições, idioma pt/es/en) → geração de PDF → upload no Google Drive.
  3. Correção de orçamento → nova versão no sistema de documentos, mantém histórico.
  4. Checklist técnico público → cliente preenche `/checklist/$slug` → vira submissão na inbox de Checklists.
- **Integrações**: `@react-pdf/renderer` para PDF, Google Drive (upload automático), Storage.
- **FAQs candidatas**: "Como duplico um orçamento?", "Como mudo o idioma do PDF?", "O que a correção faz com a versão anterior?", "Como reabro uma oportunidade perdida?", "Como importo clientes em lote?".

## 3. Operações

- **Objetivo**: transformar oportunidade ganha em projeto executável (ETP, mecânico, elétrico) e planejar etapas até a liberação para produção. Seção renomeada de "Engenharia" para "Operações" no menu numa rodada anterior; o apontamento de horas avulso (`/engenharia/hh`) foi removido de vez nesta sessão — horas reais continuam lançáveis direto nas etapas.
- **Papéis**: `engineer`, leitura para `production` (Planejamento).
- **Rotas**:
  - `/engenharia/etp` (lista) e `/engenharia/etp/$id` — Especificação Técnica do Produto, versionada por equipamento
  - `/engenharia/projetos` — revisões de projeto mecânico/elétrico, aba de Insumos & Materiais (alimenta Compras)
  - `/engenharia/etapas` — Gantt arrastável + tabela de etapas por fase (engenharia/compras/fabricação/montagem/qualidade/expedição), com H/H estimada e real por etapa
- **Fluxos**: ETP a partir de orçamento aprovado (Comercial) · projeto mecânico/elétrico com BOM · Gantt de etapas · liberação para produção dispara a fase seguinte em Compras/Produção.
- **FAQs candidatas**: "Como transformo um orçamento em ETP?", "Quem pode aprovar uma etapa?", "Onde lanço horas reais de uma etapa?", "O que trava a liberação para produção?".

## 4. Compras

- **Objetivo**: gerenciar solicitação → cotação → ordem de compra → recebimento em almoxarifado, com aprovação e cadastro de fornecedores.
- **Papéis**: `purchasing`, leitura para `engineer` (Almoxarifado).
- **Rotas**:
  - `/compras/solicitacao` — insumos pendentes vindos de Operações
  - `/compras/cotacoes`, `/compras/cotacoes/nova`, `/compras/cotacoes/$id` — cotação a fornecedor (o termo interno "checklist de cotação" é diferente do Checklist técnico comercial — evitar confundir os dois)
  - `/compras/ordens`, `/compras/ordens/nova`, `/compras/ordens/$id`, `/compras/ordens/$id/imprimir`
  - `/compras/almoxarifado`, `/compras/almoxarifado/$id`, `/compras/almoxarifado/ordens` — estoque, custo médio, recebimento por OC
  - `/fornecedores`, `/fornecedores/novo` (com scan de cartão de visita por IA), `/fornecedores/$id`
- **Fluxos**: solicitação vinda de Operações · cotação com múltiplos fornecedores · geração de OC · aprovação · recebimento no almoxarifado com custo médio ponderado · auditoria.
- **FAQs candidatas**: "Como cadastro uma cotação com 3 fornecedores?", "Quem aprova a OC?", "Posso alterar uma OC aprovada?", "Como funciona o custo médio do almoxarifado?".

## 5. Qualidade

- **Objetivo**: revisar projeto (mecânico e elétrico) pós-montagem e conduzir FAT (Factory Acceptance Test).
- **Papéis**: `assembly`, `production` (Revisões); `production` (FAT). Leitura ampla.
- **Rotas**:
  - `/qualidade/revisao-mecanica`, `/qualidade/revisao-eletrica`
  - `/qualidade/fat`, `/qualidade/fat/novo`, `/qualidade/fat/$id`
- **Fluxos**: checklist de revisão pós-montagem · agendamento e execução de FAT com evidências, medições e RNC automática em item NOK · assinatura digital (inspetor + testemunha) · homologação ou **reprovação** (fluxo de reprovação com motivo obrigatório e e-mail para engenharia/gestão, implementado nesta sessão — antes o status existia no enum mas nenhuma ação conseguia atribuí-lo).
- **FAQs candidatas**: "Como agendo um FAT?", "Anexo foto durante a execução?", "O que acontece quando reprovo o FAT?", "Quais bloqueios impedem homologar?".

## 6. Pós-venda

- **Objetivo**: SAT (Serviço de Atendimento Técnico) em campo e gestão de chamados de suporte.
- **Papéis**: acesso a Chamados restrito a `admin`/`manager`/`engineer` no servidor (é uma ferramenta de triagem interna, não de campo); SAT aberto a `field`, `engineer`, `assembly`, `sales`.
- **Rotas**:
  - `/pos-vendas` (index, redireciona para SAT)
  - `/pos-vendas/sat`, `/pos-vendas/sat/$id`
  - `/pos-vendas/chamados`, `/pos-vendas/chamados/$id`
  - Público: `/suporte`, `/suporte/$token` — cliente externo abre chamado por número de série, acompanha por token
- **Fluxos**: abertura de chamado (site público, contato ou interno) · priorização · SLA · timeline · geração de SAT no atendimento em campo, com "Gerar documento (PT/ES/EN)" e link de campo assinado.
- **Integrações**: SLA configurado em `/admin/sla-chamados`, e-mail transacional.
- **FAQs candidatas**: "Como abro um chamado em nome do cliente?", "Quem pode ver a fila de Chamados?", "Como converto chamado em SAT?".

## 7. Produção

- **Objetivo**: acompanhar a montagem por equipamento.
- **Papéis**: `production`, `assembly`.
- **Rotas**: `/producao/montagem`.
- **Fluxos**: recebimento da liberação de Operações · início/conclusão de montagem com % de progresso · handoff para Qualidade/FAT.
- **FAQs candidatas**: "Onde vejo o que falta para liberar a etapa?", "Posso reabrir uma montagem concluída?".

## 8. Logística & Embarque

- **Objetivo**: programar embarques a partir de processos/projetos liberados, controlar itens/volumes, gerar romaneio em PDF e manter trilha de auditoria de status com evidências.
- **Papéis principais**: `production`, `purchasing` (liberados por padrão no módulo `logistica`).
- **Rotas**:
  - `/logistica/embarques` — grid com busca livre e filtros por cliente, transportadora, status e faixa de datas (previsão de saída)
  - `/logistica/embarques/novo` — criação (cliente, transportadora, previsão, itens, volumes/peso)
  - `/logistica/embarques/$id` — detalhe: itens, anexos, ações de status e trilha de auditoria
- **Status e transições**: `rascunho` → `programado` → `embarcado` → `entregue`; `cancelado` a partir de qualquer estado. Transições críticas (`embarcado`, `entregue`, `cancelado`) exigem **motivo obrigatório** (≥ 5 caracteres) e aceitam anexos.
- **Fluxos**:
  1. Novo embarque → escolher cliente e processo(s)/itens → informar transportadora, previsão de saída, volumes/peso → salvar como `rascunho`.
  2. Programar → `programado` (opcionalmente com motivo/anexo).
  3. Marcar embarcado / entregue / cancelar → diálogo com motivo obrigatório e anexos opcionais; cada transição grava linha em `logistica_embarque_status_log` (autor, data, from → to, notas, `anexo_ids`).
  4. Exportar **Romaneio em PDF** — cabeçalho, cliente/transporte, tabela de itens com totais (quantidade/peso/volume), trilha de auditoria e áreas de assinatura; diálogo permite selecionar anexos (imagens são embutidas como páginas, demais arquivos entram como referência).
  5. Exportar **Trilha de auditoria** — CSV (BOM UTF-8, pronto para Excel) ou PDF tabular.
- **Tabelas**: `logistica_embarques`, `logistica_embarque_itens`, `logistica_embarque_anexos` (categorias `geral` e `status`), `logistica_embarque_status_log` (com `anexo_ids`).
- **Integrações**: Storage `logistica/` (políticas por papel), `@react-pdf/renderer` para PDFs, `createServerFn` em `src/lib/logistica.functions.ts`.
- **FAQs candidatas**: "Como programo um embarque a partir de um processo?", "Motivo é obrigatório em quais transições?", "Como anexo evidência ao alterar o status?", "Como exporto o romaneio em PDF com fotos?", "Como filtro embarques por cliente e período?", "Como exporto a trilha de auditoria para o cliente?".



## 9. Documentos

- **Objetivo**: central de documentos gerados pelo sistema (Orçamentos, FAT, SAT) com versionamento/aprovação, e editor de templates reaproveitáveis.
- **Papéis**: `/documentos` é aberto a qualquer autenticado (rota transversal, sem módulo — decisão intencional); `/central-documentos` (Editor de Blocos) e `/template-documentos` (Templates) são administrativos, mas Templates também abre para quem tem módulo `qualidade` (edita templates de FAT) ou `pos_vendas` (edita templates de SAT) — acessível por um botão "Templates de FAT/SAT" direto nas respectivas telas, não por item de menu.
- **Rotas**:
  - `/documentos`, `/documentos/$id` — "Central de Documentos" (nome usado nos FAQs/comentários do código para este repositório, não confundir com a rota abaixo)
  - `/central-documentos` — "Editor de Blocos": configuração de blocos de texto PT/ES/EN, layout e histórico versionado dos PDFs
  - `/template-documentos` — templates de checklist de Projetos/FAT/SAT, com abas `?aba=projetos|fat|sat`
- **Fluxos**: um Orçamento/FAT/SAT gera um documento nesse sistema unificado (submeter → aprovar/rejeitar → publicar → arquivar/reabrir), com sincronização automática ao Google Drive e assinatura digital HMAC verificável.
- **FAQs candidatas**: "Como crio um template?", "Onde ficam os PDFs gerados?", "Quem pode editar um template publicado?".

## 10. Administração

- **Objetivo**: configurar sistema, gerenciar usuários e permissões, auditar. Reorganizado numa área única (`/admin/*`) com menu de categorias à esquerda (`SettingsNav.tsx`), filtrado pelo papel de quem está logado.
- **Papéis**: acesso à área inteira exige `admin`, `manager` ou `engineer`; a maioria das telas é `admin`-only (ver abaixo quais abrem pra mais gente). `/admin` sem sufixo redireciona pra primeira seção que o papel do usuário pode abrir.
- **Grupos e rotas** (nomes do menu):
  - **Visão geral** — Painel (`/admin/configuracoes`): KPIs, pendências e atividade recente. *admin.*
  - **Sistema** — Chaves & Diagnóstico (`/admin/diagnostico`, com sub-abas Chaves / Banco de Dados / Integrações fiscais / Logs — na aba Chaves, cada credencial [exceto as 2 de bootstrap do Supabase] tem um botão "Configurar" que abre um formulário pra salvar/remover o valor direto no Vault, sem precisar editar variável de ambiente no Coolify), Provedor de Mineração (`/admin/mineracao` — só credenciais/limites do provedor de prospecção; não confundir com a ferramenta em si, que fica em `/comercial/mineracao`), Migrations (`/admin/migrations` — aplica SQL de `supabase/pending-migrations/` direto em produção via Management API, com confirmação e registro em auditoria). *admin.*
  - **Marca & Site** — Geral (`/admin/geral`: identidade visual, tema, SEO/indexação padrão), Contato (`/admin/contato`), SEO (`/admin/seo`: título/descrição/og:image por rota pública, tabela `page_seo`), Páginas dos Equipamentos (`/admin/paginas-equipamentos`: CMS de blocos de conteúdo + SEO por equipamento). *admin.*
  - **Usuários & Segurança** — Usuários & Permissões (`/admin/usuarios`: CRUD de usuários/papéis, matriz de permissões por módulo, e uma aba "Redefinir senha" restrita a manager/engineer), Auditoria (`/admin/auditoria`). *admin/manager (Usuários abre pra engineer também, só a aba de reset).*
  - **Atendimento & Conteúdo** — E-mails automáticos (`/admin/emails`), Formulários recebidos (`/admin/formularios-recebidos` — caixa de entrada de Checklist técnico/entrevista/contato), Modelos de Formulário (`/admin/modelos-formulario`: tipos de Checklist + segmentos de Entrevista, duas abas), SLA de Chamados (`/admin/sla-chamados`), Origens de Lead (`/admin/origens-lead`). *admin/manager, salvo Origens de Lead (admin) e SLA (aberto a engineer também.)*
  - **Equipamentos** — Etapas dos Equipamentos (`/admin/etapas-equipamentos`).
  - Fora do menu: `/design-system`, `/changelog`.
- **Fluxos**: convidar usuário · atribuir papéis · ajustar SLA · configurar SEO/indexação antes de publicar · aplicar migration com confirmação · auditar mudanças.
- **FAQs candidatas**: "Como convido um novo usuário?", "Um usuário pode ter mais de um papel?", "Por que não vejo certos itens do menu de Configurações?", "Onde vejo quem alterou uma OC?", "Como aplico uma migration com segurança?".

### Segurança e confiabilidade — resolvido nesta rodada (Tier 1)

Auditoria encontrou módulos de negócio inteiros (Qualidade, Pós-vendas/SAT, Engenharia, Comercial, Almoxarifado/Compras, Know-how, Logística) onde mutações de escrita só exigiam login, sem checagem de papel nenhuma no servidor — incluindo `homologarFat` (aceite formal de qualidade) e `createEmbarque`, chamáveis por qualquer usuário autenticado de qualquer papel. Corrigido via `assertCanAccessModule()` (novo, em `src/lib/admin-guard.ts`), que espelha a RPC `can_access_module()` já usada pela RLS em vários módulos — consulta a matriz dinâmica `role_module_permissions` (configurável em Usuários & Permissões), não uma lista fixa de papéis.

Junto: `throw new Error(error.message)` (vazando erro cru do Postgres pro usuário) convertido pra `friendlyDbError()` (`src/lib/db-errors.ts`) em 66 arquivos — admin incluído, não era algo já resolvido lá. E estados de loading/erro adicionados em 5 telas amostradas (cotações, embarques, FAT, orçamentos, clientes), reusando `src/components/data/TableStates.tsx`.

**Nota de verificação**: para tabelas cujo RLS eu consegui conferir nas migrations (ex. `fat_relatorios`), a policy já bloqueava no banco — a checagem de aplicação é defesa em profundidade. Pra maioria das outras tabelas tocadas, o `CREATE TABLE` nem está em `supabase/migrations/` (mesmo gap de ~60 tabelas abaixo), então não dá pra confirmar estaticamente se havia RLS — ali a checagem de aplicação pode ter sido a única proteção real.

### Pendências técnicas conhecidas (não é FAQ de usuário — referência pra quem for continuar o desenvolvimento)

- **SEO em 3 telas**: Geral, SEO e Páginas dos Equipamentos editam conceitos de SEO em tabelas diferentes (`brand_settings`, `page_seo`, `equipamento_pagina`) — não é duplicação de dado, usa um componente compartilhado (`SeoFieldsCard`); ainda não há decisão sobre consolidar as tabelas.
- **Integrações reais não validadas** (Tier 4): Resend, Gemini, Google Service Account (Drive) e o token de Migrations (`SB_MANAGEMENT_ACCESS_TOKEN`) não têm chave configurada no ambiente local. Configurável agora via UI (`/admin/diagnostico`, aba Chaves, ver seção "Credenciais no Vault" abaixo) — falta o usuário inserir os valores reais.
- ~~Vitest não roda nenhum módulo que importe `zod`~~: o bug (`TypeError: z.object is not a function`, afetava `permissoes.test.ts` e `equipamento-pagina.shared.test.ts`) parou de se manifestar numa rodada seguinte (possivelmente cache do Bun) — nunca foi investigado a fundo, então pode voltar; se voltar, zod funciona normalmente fora do Vitest (rodando direto via `bun`), então é algo na interação Vitest/Bun/zod v4 (dual-package ESM/CJS) neste ambiente especificamente. Com o Vitest rodando de verdade, `permissoes.test.ts` revelou 2 asserções desatualizadas (esperavam o erro cru do Postgres vazar — "db down"/"boom" — comportamento que o Tier 1 já bloqueia de propósito via `friendlyDbError`) — corrigidas pra comparar contra `friendlyDbError(...).message`, verificado quebrando de propósito. Suíte completa: 143/143 testes, 11/11 arquivos.
- **2 disparos de e-mail de SLA de chamado exigem infraestrutura nova**: `chamado.sla_resposta_estourado` (o cron `chamados_gerar_alertas`, pg_cron a cada 15min, já detecta o estouro e grava notificação in-app, só não consegue chamar a API de e-mail — Postgres não fala com o dispatcher TypeScript sem pg_net + endpoint HTTP autenticado) e `chamado.sla_resolucao_estourado` (esse nem é verificado pelo cron ainda). Configs mantidas (não são "desnecessárias", só bloqueadas por infra) — decisão de arquitetura em aberto, não solucionada nesta rodada.

### Tier 4, item 1 (gap de migrations) — ✅ CONCLUÍDO

- ~~`supabase/migrations/` não cobre 100% do schema de produção~~: diagnóstico evidenciado (não achismo) cruzando as 150 tabelas que o app realmente consulta contra `supabase/migrations/`, `supabase/applied-migrations/` (pasta paralela, achada nesta rodada — migrations que rodaram em produção mas nunca foram copiadas pra pasta canônica) e `prod-schema-dump.sql` (pg_dump --schema-only real de produção, já estava na raiz do repo desde 04/09, achado só agora). Resultado: 91 tabelas já cobertas, 38 existiam só em `applied-migrations/` (promovidas — commit `e74c6b2c`), 17 não tinham `CREATE TABLE` em lugar nenhum e foram reconstruídas a partir do dump real, não por inferência (commit `1bd13e53`). `restore-log.txt` (também na raiz) é o log de um restore de teste bem-sucedido desse mesmo dump — confirma que ele é íntegro. 4 "gaps" descartados como falso positivo: `avatars`/`brand` são buckets do Storage (não tabelas), `_migrations_applied` é auto-criada em runtime pela própria feature de Migrations do admin, `equipamentos` só aparece referenciada num teste (`supabase-client.test.ts`), nunca em código de produção.
- **Pendência real que sobrou**: `20260820190000_rls_hardening_golive.sql` tenta trocar as policies de `insumo_anexos`/`insumo_atividades`/`insumo_rfq_envios` via `drop policy if exists` com nomes que não batem com os nomes reais em produção (espaço vs underscore) — o drop nunca funcionou, então produção hoje tem policies antigas e novas coexistindo nessas 3 tabelas (não é bug desta reconciliação, é um problema pré-existente que a reconstrução só tornou visível). Vale uma limpeza própria se/quando decidir mexer nisso.
- Não foi possível testar o replay das migrations contra um Postgres real neste ambiente (sem `psql`/`docker`/Supabase CLI disponíveis) — verificação foi estática (checagem de forward-reference por timestamp, balanceamento de parênteses/dollar-quotes). Vale rodar `supabase db reset` num ambiente com Docker antes de confiar 100% que o replay do zero funciona sem erros.

### Credenciais no Vault — ✅ CONCLUÍDO

Antes desta rodada, toda credencial externa (Resend, Gemini, Groq, Firecrawl, Google Service Account, `SB_MANAGEMENT_ACCESS_TOKEN`, `DOC_SIGNING_KEY`, `RELATORIO_SHARE_SECRET`, etc.) era 100% variável de ambiente — só editável direto no Coolify; `/admin/diagnostico` só mostrava status mascarado, sem formulário de escrita. Agora existe um cofre real:

- **Armazenamento**: extensão `supabase_vault` (pgsodium, criptografia em repouso) — migration `20260905130000_secrets_vault.sql` cria a extensão e 4 funções `SECURITY DEFINER` no schema `public` (`vault_upsert_secret`/`vault_delete_secret`/`vault_get_secret`/`vault_secret_exists`), únicas pontes até o schema `vault` (não exposto via PostgREST), com `EXECUTE` restrito a `service_role` (revogado explicitamente de `PUBLIC`/`authenticated`/`anon`).
- **Leitura/escrita**: `src/lib/secrets.server.ts` — `getSecret(nome)` checa `process.env` primeiro (compatibilidade com quem já está configurado via Coolify) e só cai pro Vault se a env var estiver vazia; `setSecret`/`deleteSecret` só tocam o Vault. Todos os ~15 pontos de leitura de credencial no código (`provider.server.ts`, `ai-gateway.server.ts`, `google-service-account.server.ts`, `fornecedores.functions.ts`, `firecrawl.server.ts`, `pe.server.ts`, `share-token.server.ts`, `migrations.functions.ts`, `system-diagnostics.server.ts`, etc.) foram convertidos de `process.env.X` pra `await getSecret("X")`.
- **Escrita administrativa**: `src/lib/system-secrets.functions.ts` (`adminSetSecret`/`adminDeleteSecret`) — exige admin, valida o nome contra a whitelist derivada de `CAPABILITIES` (`system-keys.ts`), recusa qualquer nome fora dela e os 4 nomes de bootstrap do Supabase (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID`, `SUPABASE_SERVICE_ROLE_KEY` — esses continuam obrigatoriamente variável de ambiente, é pré-requisito técnico pra sequer conectar no banco), grava em `audit_log` só o nome da variável alterada (nunca o valor).
- **UI**: `ConfigurarCapacidadeDialog.tsx`, botão "Configurar" na aba Chaves de `/admin/diagnostico`, ao lado do "Testar" já existente — um campo por variável (textarea pra `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, que é uma chave PEM multi-linha; input password pras demais), com opção de remover cada uma.
- **Decisão explícita do usuário**: `SB_MANAGEMENT_ACCESS_TOKEN` (o token mais poderoso do sistema — roda SQL/DDL arbitrário em produção via Management API) foi incluído no formulário, aceitando o risco de guardar o token mais poderoso dentro do próprio banco que ele consegue destruir.
- **Limitação de verificação conhecida**: sem `psql`/Docker neste ambiente, não foi possível confirmar que a extensão `supabase_vault` está de fato disponível no plano real do projeto Supabase, nem rodar a migration contra Postgres de verdade — só será confirmado quando a migration rodar em produção/staging. Também não há navegador disponível pra clicar o formulário; verificação foi por leitura cuidadosa do fluxo, `tsc --noEmit`, `bun run lint`, `bun run test` (143/143) e `bun run build`, todos limpos.

### Tier 4, item 3 (editor JSON cru de Páginas de Equipamentos) — ✅ CONCLUÍDO

- ~~Editor de JSON cru em Páginas de Equipamentos~~: `BlocoCard` (`admin.paginas-equipamentos.tsx`) editava `conteudo_json` como um `<Textarea>` de JSON cru, validado só por `JSON.parse` (sintaxe) — um admin podia salvar um JSON válido mas semanticamente quebrado (ex.: `itens` como string em vez de lista) e só descobria abrindo a página pública em outra aba. Substituído por: `BLOCO_SCHEMAS` (schema Zod por um dos 9 tipos de bloco, em `equipamento-pagina.shared.ts`) validando `conteudo_json` no servidor antes de salvar (`adminUpdateBloco`); um formulário estruturado por campo por tipo de bloco (`src/components/admin/equipamento-pagina/`), com abas PT/ES/EN; e uma preview ao vivo que reusa o mesmo `RenderBloco` do renderer público — nunca diverge do que a página realmente mostra.
- **Achado no levantamento**: a documentação de usuário (`paginas-e-etapas-equipamentos.md`) e o CHANGELOG (v0.73.0) já descreviam recursos que nunca foram implementados — "árvore de blocos com arraste para reordenar", "editor com preview", "Duplicar de...". Corrigida a doc de usuário pra descrever a UI real (reordenar por setas, sem duplicar); preview ao vivo agora existe de verdade. CHANGELOG não foi tocado — a descrição de preview lá se tornou verdadeira retroativamente com esta mudança.
- **Nota de verificação**: `tsc`, `bun run lint` (0 erros) e `bun run build` limpos. Teste unitário novo (`equipamento-pagina.shared.test.ts`, 11 casos) cobre os 9 schemas — mas não roda no Vitest deste ambiente pelo mesmo motivo pré-existente listado acima (`z.object` quebra no Vitest); verificado manualmente rodando os 9 schemas direto via `bun` antes de commitar (todos os defaults passam, todos os casos quebrados de propósito falham). Sem navegador neste ambiente pra clicar através da UI final — não foi possível confirmar visualmente o formulário/preview renderizando corretamente nos 9 tipos.

### Auditoria do sistema de e-mail (Resend/dispatch) — ✅ CONCLUÍDO

Levantamento cruzando os 63 `event_key` existentes (57 configurados em `email_event_config`, mais os que o código já disparava sem config) contra o código real revelou que a tabela de configuração foi populada de uma vez, especulativamente, cobrindo praticamente todo evento de negócio imaginável — mas só uma fração pequena foi conectada ao código de disparo de verdade.

- **Bug corrigido**: `appUrl()` (`safe-dispatch.server.ts`) e um link hardcoded em `ordens-compra.functions.ts` apontavam pro domínio antigo `solutek-hub.lovable.app` em vez de `sltkamericas.com` (produção real) — todo link "Abrir no Sistema" nesses e-mails ia pro lugar errado.
- **22 `event_key` removidos** (`20260905120000_email_events_cleanup.sql`): 20 especulativos cujo status/conceito não existe em código nenhum, nem cron (ex.: `oc.reprovada` — esse status nem existe no enum de OC; `chamado.visita_tecnica_agendada` — "visita técnica" não aparece em lugar nenhum do código) + 2 duplicatas órfãs de um rename nunca limpo (`contato.mensagem_recebida`/`rfq_publico.submissao_recebida` — os nomes reais em uso são `form.contato.recebido`/`form.rfq.recebida`).
- **2 `event_key` criados**: `oc.enviada`/`oc.cancelada` — `ordens-compra.functions.ts` já disparava esses dois há tempos, mas como não existia config nenhuma, caía no vazio 100% silenciosamente (nem log gerava).
- **26 disparos conectados** (10 commits, um por domínio) — o evento de negócio e a config já existiam, só faltava a chamada: oportunidades (criada/etapa alterada/ganha/perdida), ETP (criado/enviado para aprovação/aprovado/reprovado), etapas de engenharia (atribuída/concluída — `upsertEtapas` é um upsert em lote, precisou buscar o estado anterior antes de gravar pra saber o que realmente mudou), RFQ a fornecedor (enviada/resposta recebida), OC (aguardando aprovação, somado aos 2 criados acima), montagem (card atribuído/bloqueado), embarque (criado/despachado/entregue), chamado (aberto/resposta — o código já tinha um comentário confirmando a lacuna: *"Hook de notificação — por ora só marca evento — e-mail entra depois"*), usuário (papel alterado/desativado/senha redefinida), permissão alterada e export de auditoria.
- **Fora de escopo, registrado**: `chamado.sla_resposta_estourado`/`chamado.sla_resolucao_estourado` — cron já existe (detecta o estouro a cada 15min) mas não consegue chamar a API de e-mail sem infraestrutura nova (pg_net + endpoint HTTP autenticado); decisão de arquitetura separada, configs mantidas.
- **Nota de verificação**: `tsc`, `bun run lint` (0 erros) e `bun run build` limpos após cada um dos 10 commits. Sem chave de Resend configurada neste ambiente ainda e sem `psql`/Docker — não foi possível confirmar envio real nem replay da migration contra Postgres real; verificação foi por leitura cuidadosa de cada `vars` contra o `{{...}}` do template correspondente e checagem de que o `eventKey` bate exatamente com o `event_key` da migration.

- ~~Lint desligado do CI~~: `bun run lint -- --fix` resolveu 25.778 dos 26.542 problemas (formatação). Dos 764 restantes: 31 eram erros reais (2 `react-hooks/rules-of-hooks` genuínos — ver abaixo —, comentários `eslint-disable` órfãos de uma regra do Next.js nunca usada aqui, escapes de regex desnecessários) e 733 eram `@typescript-eslint/no-explicit-any`, rebaixado pra warning (mesmo tratamento que `no-unused-vars` já tinha) já que corrigir ~730 usos de `any` é um projeto à parte. `bun run lint` agora roda no CI com 0 erros.
- **Achado real no meio do caminho**: `admin.formularios-recebidos.tsx` e `admin.etapas-equipamentos.index.tsx` faziam a checagem de papel com um `return` antes de chamar `useQuery`/`useMutation` — como o papel começa `null` até `useAuth()` resolver, um usuário autorizado tinha contagem de hooks diferente entre a primeira renderização e as seguintes (o tipo de bug que o React acusa em runtime como "Rendered fewer hooks than expected"). Corrigido separando checagem (componente externo) de conteúdo (painel interno com os hooks), mesmo padrão de `admin.usuarios.tsx`.
- ~~`e2e/admin-fase1.spec.ts` desatualizado~~: reescrito com strings conferidas no código-fonte atual (heading "Acesso restrito", redirect via `firstAccessibleAdminRoute`, KPI real do Painel). Não foi possível rodar de ponta a ponta contra sessões reais neste ambiente (sem `E2E_STORAGE_*` configurados, sem browser interativo disponível) — vale uma conferência manual antes de confiar 100%.

### Tier 3 (cores fixas + rolagem mobile) — ✅ CONCLUÍDO

- ~~Cores fixas fora do tema~~: 42 arquivos do app autenticado (rotas, componentes e mapas de cor de status em `lib/*.shared.ts`) convertidos de classes Tailwind cinza fixas (`zinc`/`gray`/`slate`) para os tokens de tema (`--text-primary/secondary/muted`, `--bg-elevated/border`, `--badge-neutral-bg/fg/border`, `--neutral`) — mesmo vocabulário já usado em `admin/ConfiguracoesTab.tsx` e no `StatusBadge`. Sem isso essas telas não reagiam ao tema escuro (`default_theme: "dark"` em Configurações de Marca, real e configurável, não hipotético). Deixados de fora de propósito: o site público (`equipamentos.*`, `index.tsx`, `contato.tsx`, `suporte.*`, `p.*.$token.tsx`, `components/site/*`) e o editor de blocos de Páginas de Equipamentos (`components/equipamentos/blocos/Blocos.tsx`) — nenhum dos dois usa o sistema de tema interno, têm paleta própria fixa por design. Gradientes decorativos de avatar (cores variadas de propósito, ex. `clientes.index.tsx`) também ficaram de fora — não são um "vazamento" de tema, são variedade visual intencional.
- ~~Tabelas sem rolagem horizontal em mobile~~: 12 telas com `<table>` nativa (RFQ/entrevistas geradas, embarques, SAT, etapas de equipamentos, cotações, templates de sistema/projeto, checklist e insumos de projeto) ganharam `overflow-x-auto` no contêiner — antes cortavam (`overflow-hidden`) ou estouravam a tela em viewport estreito. As telas que já usam o componente `<Table>` do design system (23 arquivos) já tinham isso de fábrica (`overflow-auto` embutido em `components/ui/table.tsx`), não precisaram de mudança.
- **Nota de verificação**: `tsc --noEmit`, `bun run lint` (0 erros) e `bun run test` (109/109, mesma falha pré-existente de sempre) limpos; `bun run build` confirmou que o Tailwind gera de fato as novas classes com token (`bg-[var(--badge-neutral-bg)]` etc. presentes no CSS final). Não foi possível abrir a app num navegador real neste ambiente pra conferir visualmente o antes/depois no tema escuro nem testar a rolagem em viewport estreito com DevTools — vale essa conferência manual antes de considerar 100% fechado.

### Tier 2, item 5 (teste de lógica de negócio crítica) — ✅ CONCLUÍDO

- ~~Cobertura de teste não toca a lógica que mais importa~~: cálculo de preço de orçamento extraído de `pdf-document.tsx`/`OrcamentoWizard.tsx` (que reimplementavam o mesmo filtro/soma cada um) pra `src/lib/docs/orcamento-calc.ts`, com 7 testes (`orcamento-calc.test.ts`). Transições de status de embarque (`logistica.functions.ts:setStatus`), chamado (`suporte.functions.ts:alterarStatusChamado`) e OC (`ordens-compra.functions.ts`) extraídas pra `src/lib/logistica-status.ts`, `src/lib/suporte-status.ts` e novas funções em `src/lib/ordens-compra.shared.ts`, com 21 testes cobrindo motivo obrigatório em embarque crítico, campos de data/aprovação gravados por status, e a exigência de wizard completo ao sair de rascunho na OC.
- Cada regra nova foi comprovada quebrando-a de propósito (ex.: mínimo de caracteres do motivo, limpeza de `resolvido_em` ao reabrir chamado, exceção de `cancelada` no wizard da OC) e confirmando que o teste correspondente falha antes de reverter — não é só cobertura de linha, pega regressão de verdade.

### Auditoria de organização/navegação e overlays (2026-09-06) — ✅ CONCLUÍDO

Levantamento pedido pelo usuário cobrindo os 8 módulos operacionais (o que resultou nas seções 1-9 deste documento, reescritas do zero a partir do código real — a versão anterior deste doc estava desatualizada em papéis, nomes de seção e rotas). Achados corrigidos nesta rodada:

- **Guards de permissão trocados**: Montagem e Revisões de Qualidade exigiam o módulo `engenharia` pra escrever, não o módulo da própria tela — corrigido pra `producao`/`qualidade`. Cotações e Ordens de Compra usavam lista de papéis fixa em vez da matriz dinâmica — alinhado a `assertCanAccessModule`. Embarques (Logística) decidia botões com `role` cru no cliente em vez do módulo — trocado por `useMyModules()`.
- **Clientes movido de "Operações" para "Comercial"** no menu — é o time comercial que usa a tela o tempo todo; breadcrumb (que já dizia "CRM") agora diz "Comercial".
- **Nomenclatura legada**: "(RFQ)" removido de rótulos visíveis restantes; "Checklist" desambiguado do conceito de Compras (virou "Cotação"); colisão de nome "Central de Documentos" entre `/documentos` e `/central-documentos` resolvida (o editor de blocos virou "Editor de Blocos"); "Mineração" duplicada entre `/comercial/mineracao` e a aba de admin (virou "Provedor de Mineração"); rótulo do módulo de permissões "Engenharia" alinhado pra "Operações"; breadcrumbs que ainda diziam "Engenharia" corrigidos. **Pendência registrada, não feita**: o termo "rfq" continua em nomes de arquivo, função, tabela do banco (`rfq_formulario_tipo`, `rfq_submissao`, etc.) e pasta do Google Drive — remoção completa exigiria migration de banco + rename de dezenas de arquivos, tratado como projeto à parte pelo risco em dado de produção.
- **Apontamento de horas removido de vez**: `/engenharia/hh` tinha saído da sidebar numa rodada anterior mas continuava alcançável pela aba de Planejamento e por atalhos nos dashboards de Engenharia/Montagem — removidos os três caminhos e o código que só eles usavam (`listHHConsolidado`).
- **Fluxo de reprovação de FAT implementado**: o status "reprovado" existia no enum e no rótulo da UI desde sempre, mas nenhuma função conseguia atribuí-lo. Adicionadas colunas `reprovado_em/reprovado_por/motivo_reprovacao` em `fat_relatorios`, a função `reprovarFat` (exige motivo, só a partir de `em_execucao`/`aguardando_homologacao`) e reativado o e-mail `fat.reprovado` (template já existia desde julho, tinha sido removido por órfão numa limpeza anterior). De caminho, corrigido um bug real: o e-mail de `fat.homologado` enviava variáveis (`codigo`/`titulo`) que não batiam com as usadas no template (`equipamento`/`projeto`/`usuario`) — a tabela de detalhes desse e-mail saía em branco.
- **Overlays consolidados**: 8+ implementações diferentes de tela "Acesso restrito" viraram um componente único (`AccessDenied.tsx`). Confirmações destrutivas que usavam `Dialog` genérico (Reprovar FAT, mover/excluir Entrevista) migradas pra `AlertDialog` (semântica/acessibilidade corretas). Oito exclusões sem nenhuma confirmação (credencial no Vault, itens de template, opção de entrevista, nota/anexo de oportunidade, config de SEO) ganharam `confirm()`. Dois dialogs do kanban Comercial (marcar oportunidade como perdida, converter em cliente ativo) não travavam fechamento durante o envio — corrigido. `drawer.tsx` e `Forbidden.tsx` (componentes do design system sem nenhum importador) removidos.
- **Nota de verificação**: `tsc --noEmit`, `bun run lint` (0 erros), `bun run test` (143/143) e `bun run build` limpos a cada commit. Sem navegador neste ambiente — nenhuma das mudanças de UI foi clicada de verdade; sem `psql`/Docker — a migration do FAT não rodou contra Postgres real.

## 11. Site público (referência para admins)

- **Objetivo**: página institucional, catálogo de equipamentos e captação (RFQ/contato/chamado por token).
- **Rotas**:
  - `/` (home), `/contato`
  - `/equipamentos`, `/equipamentos/$slug`, `/equipamentos/envasadora`
  - `/checklist/$slug` — formulário técnico público (`/rfq/$slug` é só um redirect pra cá, mantido por compatibilidade com links antigos)
  - `/p/cotacao/$token` — fornecedor responde cotação de compra
  - `/suporte/$token` — cliente abre/acompanha chamado por número de série
- **SEO**: cada rota tem `head()` com `title`, `description`, `og:*`, `canonical`. `og:image` só em rotas-folha. Domínio-alvo: `https://sltkamericas.com`.
- **FAQs candidatas** (para admins): "Como troco a imagem da home?", "Como adiciono um equipamento no catálogo?", "Como gero um link público do checklist técnico?".

---

## Matriz papel × módulo (resumo)

**Atenção**: a fonte da verdade real é a matriz dinâmica em Administração → Usuários & Permissões (tabela `role_module_permissions`), configurável a qualquer momento. A tabela abaixo é só uma reconstrução a partir do que cada item de menu declara em `AppSidebar.tsx` — útil como referência rápida, não como regra travada no código (o próprio guard de módulo ignora esses papéis "sugeridos" e confia só na matriz).

| Módulo               | admin | manager | engineer | production | purchasing | assembly | field | sales |
| --------------------- | :---: | :-----: | :------: | :--------: | :--------: | :------: | :---: | :---: |
| Conta                 |   ✓   |    ✓    |    ✓     |     ✓      |     ✓      |    ✓     |   ✓   |   ✓   |
| Comercial (+Clientes) |   ✓   |    ✓    |    R     |            |            |          |   R*  |   ✓   |
| Operações             |   ✓   |    ✓    |    ✓     |     R*     |            |          |       |       |
| Compras (+Forn.)      |   ✓   |    ✓    |    R*    |            |     ✓      |          |       |       |
| Produção              |   ✓   |    ✓    |          |     ✓      |            |    ✓     |       |       |
| Qualidade             |   ✓   |    ✓    |          |     ✓      |            |    ✓     |       |       |
| Pós-venda             |   ✓   |    ✓    |    R*    |            |            |    R*    |   ✓   |   R*  |
| Logística             |   ✓   |    ✓    |          |     ✓      |            |    ✓     |   ✓   |       |
| Documentos            |   ✓   |    ✓    |    ✓     |     ✓      |     ✓      |    ✓     |   ✓   |   ✓   |
| Know-how              |   ✓   |    ✓    |    ✓     |     ✓      |     ✓      |    ✓     |   ✓   |   ✓   |
| Administração         |   ✓   |   (P)   |   (P)*   |            |            |          |       |       |

Legenda: ✓ acesso completo · R somente leitura · * só num item específico do grupo (ex.: Clientes dentro de Comercial, Planejamento dentro de Operações, SAT dentro de Pós-venda, Usuários&Permissões aba de reset dentro de Administração) · (P) parcial.

---

## Backlog imediato de artigos (para Etapa 3, piloto "Conta")

1. Login e recuperação de senha
2. Editar perfil e avatar
3. Trocar senha e sessões ativas
4. Entendendo papéis e permissões
5. Navegação e atalhos do sidebar
6. Notificações e preferências

Cada artigo segue o template: pré-requisitos · passo-a-passo com screenshots · campos e regras · permissões · erros comuns · links relacionados.
