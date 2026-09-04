# Auditoria: o que está quebrado e como corrigir

Verifiquei a trilha no banco (489 registros, de 21/06 a hoje), os gatilhos SQL, as chamadas de auditoria no código e a tela `/admin/auditoria`. A trilha existe e é imutável, mas **registra menos do que promete e, na maioria das linhas, não diz quem fez**.

## O que está certo hoje

- A tabela é realmente append-only: só existe política de leitura (admin/manager); não há política de UPDATE/DELETE, então ninguém edita ou apaga pela aplicação.
- A tela filtra por usuário, período, tabela e ação, e o detalhe mostra valor antigo × novo.
- Registros feitos pelas server functions (permissões, marca, perfis, e-mails, clientes, blocos de documento) gravam o autor corretamente.

## Problemas encontrados (medidos)

1. **369 de 489 linhas (75%) estão sem autor.** Os gatilhos SQL (`tg_fat_audit`, `tg_rmp_audit`, e os de oportunidades, processos, chamados, SAT) usam `auth.uid()`. Como o sistema escreve por server function com service role, `auth.uid()` vem nulo e a linha fica anônima. Afetados: `oportunidades` (135), `role_module_permissions` (116), `processos` (53), `fat_relatorios` (36), `sat_relatorio` (21), `chamados`/`chamado_mensagens` (8).
2. **A tela mostra "—" nessas linhas**, sem explicar que a origem foi o próprio sistema.
3. **Exportar CSV exporta só a página atual (50 linhas)** e a exportação **não é auditada** — a documentação afirma que é.
4. **Cobertura faltando** em relação ao que a documentação de auditoria promete: ordens de compra (aprovação, alteração pós-aprovação, cancelamento) e acesso a documentos restritos não geram nenhuma linha; mudanças de status de chamado também não (só há 1 INSERT registrado).
5. **Retenção de 730 dias está documentada mas não existe** — nenhuma rotina de arquivamento/expurgo.

## Correções propostas

### 1. Autor nas linhas dos gatilhos (prioridade)
Migração que reescreve as funções de trigger para resolver o autor por, em ordem: `auth.uid()` → claim `sub` do JWT → variável de sessão `app.audit_user_id`. As server functions que escrevem com service role passam a definir essa variável antes da escrita, num helper único. Onde não houver autor identificável, gravar explicitamente como origem "sistema" em vez de nulo silencioso.

### 2. Cobertura que falta
- Registrar em `ordens_compra`: aprovação, reprovação, cancelamento e alteração após aprovação.
- Registrar mudança de status, reatribuição e reabertura de chamado.
- Registrar acesso/download de documento restrito (metadados apenas).

### 3. Exportação
- Exportar o resultado completo do filtro (não só a página), via server function paginada.
- Registrar a própria exportação no `audit_log` (quem, filtros, quantidade), como a documentação já afirma.

### 4. Tela
- Exibir "Sistema" (com tooltip) quando não houver autor, em vez de traço.
- Mostrar contador de linhas sem autor no topo enquanto a correção 1 não cobrir o histórico antigo.

### 5. Retenção
- Ou implementar o expurgo/arquivamento aos 730 dias, ou corrigir a documentação para descrever a retenção real. Recomendo corrigir a documentação agora e tratar o expurgo quando houver volume.

## Detalhes técnicos

- Migração aplicada por mim via Management API, com verificação por consulta de contagem depois.
- Helper server-side `withAuditActor(userId)` executando `set_config('app.audit_user_id', ...)` na mesma conexão da escrita; os gatilhos leem com `current_setting(..., true)`.
- Sem mudança de schema em `audit_log`; apenas funções de trigger, novas chamadas de log e a server function de exportação.
- Linhas históricas sem autor permanecem sem autor (a trilha é imutável) — passam a ser exibidas como "Sistema (origem não registrada)".
