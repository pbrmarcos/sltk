# Mapa do Sistema — Solutek Hub

Documento base para produção da Documentação e FAQ. Cobre cada módulo com objetivo, papéis, rotas, fluxos, integrações e FAQs candidatas. Fonte: `src/routes/_authenticated/` e `src/routes/` (rotas públicas).

Papéis reconhecidos (enum `app_role`): `admin`, `manager`, `sales`, `engineer`, `quality`, `purchasing`, `production`, `support`, `user`.

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

- **Objetivo**: capturar oportunidades, montar orçamentos multilíngues, versionar propostas e coletar RFQ público.
- **Papéis principais**: `sales`, `manager`, `admin`. Leitura para `engineer`.
- **Rotas**:
  - `/comercial/pipeline` — kanban de oportunidades
  - `/comercial/orcamento` — lista
  - `/comercial/orcamento/novo` — wizard de criação
  - `/comercial/orcamento/$id` — detalhe/edição/aprovação
  - `/comercial/orcamento/$id/corrigir` — nova revisão
  - `/comercial/formularios-rfq` — links públicos de RFQ por tipo de equipamento
  - Público: `/rfq/$slug`, `/cotacao/$token`
- **Fluxos**:
  1. Nova oportunidade → cliente (novo ou existente) → equipamento → escopo → estágio no pipeline.
  2. Novo orçamento → wizard (cliente, itens, condições, idioma pt/es/en) → geração de PDF → envio.
  3. Correção de orçamento → duplica versão, mantém histórico, marca vigente.
  4. RFQ público → cliente preenche `/rfq/$slug` → cria lead + oportunidade.
- **Integrações**: edge function de geração de PDF, Lovable AI (sugestões de escopo), Storage `orcamentos/`.
- **FAQs candidatas**: "Como duplico um orçamento?", "Como mudo o idioma do PDF?", "O que a correção faz com a versão anterior?", "Como reabro uma oportunidade perdida?", "Onde vejo o link público de RFQ do equipamento?".

## 3. Clientes & Fornecedores

- **Objetivo**: cadastro central de clientes e fornecedores, equipamentos do cliente, homologação.
- **Papéis**: `sales`, `purchasing`, `manager`, `admin`.
- **Rotas**:
  - `/clientes`, `/clientes/novo`, `/clientes/$codigo`
  - `/fornecedores`, `/fornecedores/novo`, `/fornecedores/$id`
  - `/importar` — importação em lote (CSV)
- **Fluxos**: cadastro manual · importação CSV · vinculação com oportunidades · categorias/homologação de fornecedor.
- **FAQs candidatas**: "Como importo clientes em lote?", "Cliente duplicado, como mesclar?", "Como homologo um fornecedor?", "Onde vejo o histórico de compras de um fornecedor?".

## 4. Engenharia

- **Objetivo**: transformar oportunidade fechada em projeto executável (ETP, mecânico, elétrico), planejar H/H e liberar para produção.
- **Papéis**: `engineer`, `manager`, `admin`.
- **Rotas**:
  - `/engenharia/etp` (lista) e `/engenharia/etp/$id`
  - `/engenharia/mecanico`, `/engenharia/eletrico`
  - `/engenharia/etapas` — kanban de etapas do projeto
  - `/engenharia/hh` — apontamento de horas
  - `/engenharia/projetos` — visão consolidada
- **Fluxos**: ETP a partir de orçamento aprovado · avanço de etapas · apontamento H/H · liberação para compras/produção.
- **Integrações**: templates de documento, anexos no Storage.
- **FAQs candidatas**: "Como transformo um orçamento em ETP?", "Quem pode aprovar uma etapa?", "Como aponto horas em vários projetos?", "O que trava a liberação para produção?".

## 5. Compras

- **Objetivo**: gerenciar solicitação → cotação → ordem de compra, com aprovação e impressão.
- **Papéis**: `purchasing`, `manager`, `admin`.
- **Rotas**:
  - `/compras/solicitacao`
  - `/compras/cotacoes`, `/compras/cotacoes/nova`, `/compras/cotacoes/$id`
  - `/compras/ordens`, `/compras/ordens/nova`, `/compras/ordens/$id`, `/compras/ordens/$id/imprimir`
- **Fluxos**: solicitação vinda de engenharia · cotação com múltiplos fornecedores · geração de OC · aprovação · impressão/PDF · auditoria.
- **FAQs candidatas**: "Como cadastro uma cotação com 3 fornecedores?", "Quem aprova a OC?", "Posso alterar uma OC aprovada?", "Onde vejo a auditoria de mudanças?".

## 6. Qualidade

- **Objetivo**: revisar projeto (mecânico e elétrico) e conduzir FAT.
- **Papéis**: `quality`, `manager`, `admin`.
- **Rotas**:
  - `/qualidade/revisao-mecanica`
  - `/qualidade/revisao-eletrica`
  - `/qualidade/fat`, `/qualidade/fat/novo`, `/qualidade/fat/$id`
- **Fluxos**: checklist de revisão · agendamento de FAT · execução com evidências · homologação/rejeição.
- **FAQs candidatas**: "Como agendo um FAT?", "Anexo foto durante a execução?", "O que acontece quando reprovo um item?", "FAT reprovado gera SAT?".

## 7. Pós-vendas

- **Objetivo**: SAT em campo e gestão de chamados com SLA.
- **Papéis**: `support`, `manager`, `admin`; visualização por `sales`.
- **Rotas**:
  - `/pos-vendas` (index)
  - `/pos-vendas/sat`, `/pos-vendas/sat/$id`
  - `/pos-vendas/chamados`, `/pos-vendas/chamados/$id`
  - Público: chamado por token (link enviado ao cliente)
- **Fluxos**: abertura de chamado (interno ou cliente) · priorização · SLA · timeline com chat · geração de SAT no atendimento em campo.
- **Integrações**: SLA configurado em `/admin/sla-chamados`, e-mail transacional.
- **FAQs candidatas**: "Como abro um chamado em nome do cliente?", "Como calculo SLA?", "O cliente pode responder por e-mail?", "Como converto chamado em SAT?".

## 8. Produção

- **Objetivo**: acompanhar a montagem em kanban de etapas.
- **Papéis**: `production`, `manager`, `admin`.
- **Rotas**: `/producao/montagem`.
- **Fluxos**: recebimento da liberação da engenharia · avanço de etapas · anexos de evidência · handoff para qualidade/FAT.
- **FAQs candidatas**: "Como movo várias etapas de uma vez?", "Onde vejo o que falta para liberar a etapa?", "Posso reabrir uma etapa concluída?".

## 8b. Logística & Embarque

- **Objetivo**: programar embarques a partir de processos/projetos liberados, controlar itens/volumes, gerar romaneio em PDF e manter trilha de auditoria de status com evidências.
- **Papéis principais**: `production`, `manager`, `admin`. Leitura para `sales`, `support`, `quality`.
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

- **Objetivo**: central de documentos e templates reaproveitáveis (SAT, FAT, ETP, blocos).
- **Papéis**: leitura ampla; edição por `manager`/`admin`.
- **Rotas**:
  - `/central-documentos`
  - `/documentos`, `/documentos/$id`
  - `/template-documentos`
- **Fluxos**: criar documento a partir de template · versionar · anexar a projeto/chamado · exportar PDF.
- **FAQs candidatas**: "Como crio um template?", "Onde ficam os PDFs gerados?", "Quem pode editar um template publicado?".

## 10. Administração

- **Objetivo**: configurar sistema, gerenciar usuários e permissões, auditar. Reorganizado numa área única (`/admin/*`) com menu de categorias à esquerda (`SettingsNav.tsx`), filtrado pelo papel de quem está logado.
- **Papéis**: acesso à área inteira exige `admin`, `manager` ou `engineer`; a maioria das telas é `admin`-only (ver abaixo quais abrem pra mais gente). `/admin` sem sufixo redireciona pra primeira seção que o papel do usuário pode abrir.
- **Grupos e rotas** (nomes do menu):
  - **Visão geral** — Painel (`/admin/configuracoes`): KPIs, pendências e atividade recente. *admin.*
  - **Sistema** — Chaves & Diagnóstico (`/admin/diagnostico`, com sub-abas Chaves / Banco de Dados / Integrações fiscais / Logs), Mineração (`/admin/mineracao`), Migrations (`/admin/migrations` — aplica SQL de `supabase/pending-migrations/` direto em produção via Management API, com confirmação e registro em auditoria). *admin.*
  - **Marca & Site** — Geral (`/admin/geral`: identidade visual, tema, SEO/indexação padrão), Contato (`/admin/contato`), SEO (`/admin/seo`: título/descrição/og:image por rota pública, tabela `page_seo`), Páginas dos Equipamentos (`/admin/paginas-equipamentos`: CMS de blocos de conteúdo + SEO por equipamento). *admin.*
  - **Usuários & Segurança** — Usuários & Permissões (`/admin/usuarios`: CRUD de usuários/papéis, matriz de permissões por módulo, e uma aba "Redefinir senha" restrita a manager/engineer), Auditoria (`/admin/auditoria`). *admin/manager (Usuários abre pra engineer também, só a aba de reset).*
  - **Atendimento & Conteúdo** — E-mails automáticos (`/admin/emails`), Formulários recebidos (`/admin/formularios-recebidos` — caixa de entrada de RFQ/entrevista/contato), Modelos de Formulário (`/admin/modelos-formulario`: tipos de Checklist RFQ + segmentos de Entrevista, duas abas), SLA de Chamados (`/admin/sla-chamados`), Origens de Lead (`/admin/origens-lead`). *admin/manager, salvo Origens de Lead (admin) e SLA (aberto a engineer também.)*
  - **Equipamentos** — Etapas dos Equipamentos (`/admin/etapas-equipamentos`).
  - Fora do menu: `/design-system`, `/changelog`.
- **Fluxos**: convidar usuário · atribuir papéis · ajustar SLA · configurar SEO/indexação antes de publicar · aplicar migration com confirmação · auditar mudanças.
- **FAQs candidatas**: "Como convido um novo usuário?", "Um usuário pode ter mais de um papel?", "Por que não vejo certos itens do menu de Configurações?", "Onde vejo quem alterou uma OC?", "Como aplico uma migration com segurança?".

### Segurança e confiabilidade — resolvido nesta rodada (Tier 1)

Auditoria encontrou módulos de negócio inteiros (Qualidade, Pós-vendas/SAT, Engenharia, Comercial, Almoxarifado/Compras, Know-how, Logística) onde mutações de escrita só exigiam login, sem checagem de papel nenhuma no servidor — incluindo `homologarFat` (aceite formal de qualidade) e `createEmbarque`, chamáveis por qualquer usuário autenticado de qualquer papel. Corrigido via `assertCanAccessModule()` (novo, em `src/lib/admin-guard.ts`), que espelha a RPC `can_access_module()` já usada pela RLS em vários módulos — consulta a matriz dinâmica `role_module_permissions` (configurável em Usuários & Permissões), não uma lista fixa de papéis.

Junto: `throw new Error(error.message)` (vazando erro cru do Postgres pro usuário) convertido pra `friendlyDbError()` (`src/lib/db-errors.ts`) em 66 arquivos — admin incluído, não era algo já resolvido lá. E estados de loading/erro adicionados em 5 telas amostradas (cotações, embarques, FAT, orçamentos, clientes), reusando `src/components/data/TableStates.tsx`.

**Nota de verificação**: para tabelas cujo RLS eu consegui conferir nas migrations (ex. `fat_relatorios`), a policy já bloqueava no banco — a checagem de aplicação é defesa em profundidade. Pra maioria das outras tabelas tocadas, o `CREATE TABLE` nem está em `supabase/migrations/` (mesmo gap de ~60 tabelas abaixo), então não dá pra confirmar estaticamente se havia RLS — ali a checagem de aplicação pode ter sido a única proteção real.

### Pendências técnicas conhecidas (não é FAQ de usuário — referência pra quem for continuar o desenvolvimento)

- **Cobertura de teste não toca a lógica que mais importa** (Tier 2): os 6 arquivos de teste cobrem estoque, validação de documento fiscal e RBAC de permissões — nada testa cálculo de preço de orçamento nem transição de status de embarque/chamado/OC.
- **Tabelas sem rolagem horizontal em mobile** (Tier 3): só `compras.cotacoes.$id.tsx` usa `overflow-x-auto`; cotações/embarques/orçamentos em lista quebram em tela estreita.
- **Cores fixas fora do tema** (Tier 3): ~54 arquivos (182 ocorrências) ainda usam cinza/slate/zinc fixo do Tailwind em vez dos tokens de tema — só importa se/quando o tema escuro for ativado. Uma primeira fatia (9 arquivos de Compras/Engenharia) já foi convertida.
- **SEO em 3 telas**: Geral, SEO e Páginas dos Equipamentos editam conceitos de SEO em tabelas diferentes (`brand_settings`, `page_seo`, `equipamento_pagina`) — não é duplicação de dado, usa um componente compartilhado (`SeoFieldsCard`); ainda não há decisão sobre consolidar as tabelas.
- **Gap de migrations** (Tier 4): `supabase/migrations/` (87 arquivos) não cobre 100% do schema de produção — existem tabelas criadas via SQL Editor da Lovable nunca capturadas como migration (`prod-schema-dump.sql`/`restore-log.txt` na raiz documentam uma reconciliação parcial via staging, ainda não fechada). É essa mesma lacuna que impediu confirmar RLS pra boa parte das correções de segurança acima.
- **Integrações reais não validadas** (Tier 4): Resend, Gemini, Google Service Account (Drive) e o token de Migrations (`SB_MANAGEMENT_ACCESS_TOKEN`) não têm chave configurada no ambiente local.
- **Lint desligado do CI** (Tier 2): `bun run lint` acusa ~26 mil problemas pré-existentes (quase todos formatação/prettier) — precisa de um `prettier --write .` dedicado antes de fazer sentido ligar no CI.
- **`e2e/admin-fase1.spec.ts` desatualizado** (Tier 2): testa uma estrutura de `/admin` anterior a esta reorganização; precisa de reescrita contra uma instância rodando.

## 11. Site público (referência para admins)

- **Objetivo**: página institucional, catálogo de equipamentos e captação (RFQ/contato/chamado por token).
- **Rotas**:
  - `/` (home), `/contato`
  - `/equipamentos`, `/equipamentos/$slug`, `/equipamentos/envasadora`
  - `/rfq/$slug` — formulário público de RFQ
  - `/cotacao/$token` — visualização pública de cotação
  - `/chamado/$token` — chamado por token
- **SEO**: cada rota tem `head()` com `title`, `description`, `og:*`, `canonical`. `og:image` só em rotas-folha. Domínio-alvo: `https://sltkamericas.com`.
- **FAQs candidatas** (para admins): "Como troco a imagem da home?", "Como adiciono um equipamento no catálogo?", "Como gero um link público de RFQ?".

---

## Matriz papel × módulo (resumo)

| Módulo          | admin | manager | sales | engineer | quality | purchasing | production | support |
| --------------- | :---: | :-----: | :---: | :------: | :-----: | :--------: | :--------: | :-----: |
| Conta           |   ✓   |    ✓    |   ✓   |    ✓     |    ✓    |     ✓      |     ✓      |    ✓    |
| Comercial       |   ✓   |    ✓    |   ✓   |    R     |         |            |            |         |
| Clientes/Forn.  |   ✓   |    ✓    |   ✓   |    R     |         |     ✓      |            |         |
| Engenharia      |   ✓   |    ✓    |   R   |    ✓     |    R    |     R      |     R      |         |
| Compras         |   ✓   |    ✓    |       |    R     |         |     ✓      |            |         |
| Qualidade       |   ✓   |    ✓    |       |    R     |    ✓    |            |     R      |         |
| Pós-vendas      |   ✓   |    ✓    |   R   |          |         |            |            |    ✓    |
| Produção        |   ✓   |    ✓    |       |    R     |    R    |            |     ✓      |         |
| Logística       |   ✓   |    ✓    |   R   |          |    R    |            |     ✓      |    R    |
| Documentos      |   ✓   |    ✓    |   R   |    R     |    R    |     R      |     R      |    R    |
| Administração   |   ✓   |   (P)   |       |          |         |            |            |         |

Legenda: ✓ acesso completo · R somente leitura · (P) parcial.

---

## Backlog imediato de artigos (para Etapa 3, piloto "Conta")

1. Login e recuperação de senha
2. Editar perfil e avatar
3. Trocar senha e sessões ativas
4. Entendendo papéis e permissões
5. Navegação e atalhos do sidebar
6. Notificações e preferências

Cada artigo segue o template: pré-requisitos · passo-a-passo com screenshots · campos e regras · permissões · erros comuns · links relacionados.
