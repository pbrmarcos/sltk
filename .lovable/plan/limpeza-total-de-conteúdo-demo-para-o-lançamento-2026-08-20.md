# Limpeza total de conteúdo demo para o lançamento

Objetivo: entregar a plataforma "zerada" ao cliente — apenas usuários, permissões, catálogos, templates e configurações de marca. Nada de dados fictícios no banco, nenhum botão de seed na interface e nenhum painel alimentado por números inventados.

## 1. Remover os geradores de demo da interface

- Tirar da aba **Banco de dados** (`/admin/configuracoes?tab=banco`) os blocos "Dados de demonstração" e "Ciclo demo: orçamento → equipamento" com todos os botões (Restaurar dados DEMO, Rodar ciclo demo, Limpar demo).
- Excluir as funções de servidor de seed (`seed-demo.functions.ts`, `seed-ciclo.functions.ts`) e remover do banco as funções `seed_demo_data` e as auxiliares de ciclo demo, para que ninguém consiga recriar o conteúdo.

## 2. Limpar o banco (migração de dados, em uma transação)

Apagado (inclui tudo que depende em cascata):

- Comercial: clientes (22, inclusive CLI-0001), contatos, sócios, documentos, interações, equipamentos do cliente, oportunidades, notas, anexos, histórico de estágio.
- Processos: processos, tarefas, eventos, checklists, e-mails, notificações.
- Engenharia: projetos, revisões, etapas e etapas por disciplina, anexos e comentários, ETPs e histórico, montagens, páginas de equipamento.
- Suprimentos: fornecedores (3) e vínculos, insumos de projeto e histórico, cotações e propostas, ordens de compra e itens, RFQ/checklists e submissões.
- Qualidade e pós-venda: FAT (relatórios, medições, RNCs, assinaturas, anexos), SAT, chamados e mensagens, mensagens/respostas do site, embarques de logística.
- Conteúdo: Know-how (14 itens, versões, favoritos, visualizações), documentos gerados, entrevistas e respostas.
- Mineração de leads: campanhas, buscas, resultados e uso.
- `audit_log` zerado (o histórico atual é quase todo de seeds), e a limpeza registrada como o primeiro evento novo.

Preservado: `profiles` e `user_roles` (10 usuários), `role_module_permissions`, `brand_settings`, `page_seo`, catálogos (segmentos, países, origens de lead, categorias de fornecedor, condições de pagamento, transportadoras), todos os templates (projeto, FAT, SAT, documentos, processos, entrevistas, checklist/RFQ), configuração de e-mails e SLA, e `penta_bases` (bases sincronizadas da Penta, que são configuração e não conteúdo).

Arquivos de storage órfãos (anexos de FAT/SAT/Know-how/embarques) são removidos junto com os registros.

## 3. Painéis com dados reais

Hoje os sete painéis (`AdminDashboard`, `SalesDashboard`, `EngineeringDashboard`, `ProductionDashboard`, `AssemblyDashboard`, `PurchasingDashboard`, `FieldDashboard`) leem de `src/mocks/*`. Serão reescritos para consultar o banco:

- Uma função de servidor por painel, agregando contagens e listas reais (oportunidades por estágio e valor, processos por fase, etapas atrasadas, ETPs pendentes, OCs por status, FAT/SAT do período, chamados abertos e SLA, atividade recente de auditoria).
- Com o banco vazio os painéis mostram zero e um estado vazio explicativo ("Nenhum dado ainda — comece cadastrando um cliente"), em vez de números falsos.
- `src/mocks/dashboard/*` e `src/mocks/admin-overview.mock.ts` são excluídos; `src/mocks/crm.ts` também, se não houver outro consumidor.

## 4. Verificação e fechamento

- Contagem pós-limpeza tabela a tabela, reportada no chat.
- Varredura Playwright autenticada nas rotas principais para confirmar que nenhuma tela quebra com banco vazio (listas em estado vazio, detalhes sem 404 inesperado).
- Changelog 0.99.7 com a limpeza de dados demo e os painéis ligados aos dados reais; artigo de administração atualizado (sem menção ao botão de seed).

## Detalhes técnicos

- A remoção de dados vai como migração SQL versionada em `supabase/migrations/`, com `DELETE` em ordem de dependência dentro de um `BEGIN/COMMIT`, aplicada por mim via Management API e verificada com `information_schema`/contagens.
- Sequências de código (`clientes.codigo`, `numero` de OC, FAT etc.) reiniciadas para que o primeiro registro real comece do 1.
- Os painéis seguem o padrão do projeto: `createServerFn` + `requireSupabaseAuth` em arquivo `*.functions.ts`, consumidos com `useQuery`/`ensureQueryData`.
