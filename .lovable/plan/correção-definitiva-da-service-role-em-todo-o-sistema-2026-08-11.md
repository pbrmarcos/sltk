# Correção definitiva da Service Role em todo o sistema

## Diagnóstico confirmado

- A credencial é lida corretamente como segredo de runtime, mas cerca de 45 arquivos ainda acessam `supabaseAdmin` diretamente.
- Esse acesso direto cria um ponto de falha global: se a chave estiver ausente, inválida ou desatualizada, ações comuns, administrativas e até formulários públicos podem falhar juntas.
- O helper central com fallback RLS e bloqueio seguro já existe e possui testes, porém ainda não foi adotado por todo o sistema.
- Há três categorias diferentes que hoje estão misturadas: operações comuns autenticadas, operações administrativas reais e endpoints públicos sem sessão.

## Implementação

### 1. Garantir a credencial no runtime

- Reexecutar o vínculo seguro da Service Role com o projeto Supabase conectado e validar a credencial por uma chamada real.
- Manter `SUPABASE_SERVICE_ROLE_KEY` como nome canônico; preservar o alias legado apenas durante a transição.
- Confirmar a variável no preview e documentar a configuração equivalente no runtime do Coolify, sem colocar a chave no código, build args ou variáveis `VITE_*`.

### 2. Tornar o helper central a única porta de entrada

- Fazer todo acesso privilegiado passar por `supabase-client.server.ts`.
- Impedir novos imports diretos de `client.server.ts` fora do helper central por teste automatizado/regra de arquitetura.
- Manter três contratos explícitos:
  - `context.supabase` para operações normais do usuário, com RLS;
  - `getDataClient(context.supabase)` apenas quando houver fallback legítimo;
  - `withCriticalServiceRole`/`getCriticalClient` para operações realmente privilegiadas.
- Padronizar erros para que nomes de variáveis, detalhes de infraestrutura e mensagens técnicas nunca cheguem à interface.

### 3. Migrar todos os pontos de uso por categoria

- **Fluxos autenticados comuns:** substituir `supabaseAdmin` por `context.supabase` e validar as políticas RLS necessárias.
- **Ações administrativas reais:** envolver Auth Admin, gestão de usuários, tarefas administrativas, migrations e integrações privilegiadas com a validação global da Service Role antes de iniciar qualquer mutação.
- **Fluxos públicos:** retirar a dependência direta da Service Role de contato, RFQ, entrevista e suporte público; usar funções SQL/RPC restritas ou políticas públicas mínimas, com validação de entrada e sem acesso amplo ao banco.
- **Efeitos secundários:** tornar auditoria, e-mail, geração auxiliar e sincronizações opcionais tolerantes a falha quando a ação principal já tiver sido concluída.

### 4. Corrigir a validação de saúde

- Fazer o health check confirmar que a chave pertence ao projeto correto e consegue executar uma operação privilegiada controlada — não apenas que o endpoint responde.
- Manter cache curto para falhas e permitir recuperação automática após rebind/rotação.
- Expor o diagnóstico somente a administradores, mostrando status seguro: válida, ausente, inválida ou indisponível.
- Registrar logs estruturados no servidor com ação, categoria e ocorrência, sem registrar a chave.

### 5. Cobertura automatizada e prevenção de regressão

- Ampliar os testes atuais para cada categoria de fluxo com chave válida, ausente, malformada e rejeitada.
- Confirmar que operações comuns continuam funcionando por RLS sem Service Role.
- Confirmar que ações críticas são bloqueadas antes da primeira escrita e retornam mensagem amigável.
- Confirmar que endpoints públicos continuam funcionando sem expor acesso administrativo amplo.
- Adicionar uma varredura que falha no CI ao encontrar novo import direto de `client.server.ts` fora da lista técnica permitida.

### 6. Validação ponta a ponta

- Testar preview com a chave válida e repetir os fluxos não críticos simulando chave ausente/inválida.
- Exercitar usuários, clientes/fornecedores, compras, orçamento/PDF, FAT/SAT, documentos, entrevistas, formulários públicos, suporte, compartilhamentos e integrações.
- Verificar banco, Storage, respostas das server functions, toasts e logs após cada ação.
- Repetir os testes com as roles autorizadas e confirmar que o uso de RLS não ampliou permissões.

## Critérios de aceite

- Nenhum arquivo de negócio importa diretamente o cliente administrativo de baixo nível.
- Nenhuma tela exibe `SUPABASE_SERVICE_ROLE_KEY`, “Missing environment variable” ou “Connect Supabase in Lovable Cloud”.
- Rotas não críticas funcionam normalmente com a Service Role ausente ou inválida.
- Ações críticas falham antes de qualquer escrita, com mensagem segura e ocorrência rastreável.
- Formulários públicos funcionam sem depender de um cliente administrativo genérico.
- Com a chave válida, todos os fluxos privilegiados passam nos testes ponta a ponta.
- A chave permanece exclusivamente no runtime do servidor e nunca aparece no repositório, bundle, resposta ou log.

## Banco de dados

- Não serão criadas políticas permissivas para mascarar falhas da Service Role.
- Ajustes de RLS/RPC serão feitos apenas nos fluxos que realmente precisam operar como usuário autenticado ou visitante público, sempre com grants mínimos e validação de autorização.
