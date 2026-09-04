# Correção definitiva do vínculo Service Role

## Diagnóstico confirmado

- O erro nasce no cliente administrativo do servidor quando nenhuma credencial privilegiada está disponível no runtime.
- No sandbox atual, `SUPABASE_SERVICE_ROLE_KEY` não está vinculada pelo nome canônico; existe apenas o alias `DEST_SUPABASE_SERVICE_ROLE_KEY`. O cliente aceita os dois nomes, mas a implantação que gerou o aviso não recebeu nenhum deles ou ainda está executando com um ambiente antigo.
- Há **41 arquivos** que carregam o cliente administrativo. A maioria não possui fallback; portanto, corrigir somente uma tela não resolve o problema global.
- O `.env.example` documenta apenas as variáveis públicas. O Dockerfile comenta a variável privada, mas não existe validação de prontidão do Supabase administrativo.
- Algumas funções usam Service Role para operações que podem e devem rodar com a sessão autenticada e RLS; outras realmente precisam dela, como Auth Admin, links públicos por token, geração/armazenamento de documentos e determinados fluxos administrativos.

## Implementação

1. **Restabelecer o segredo correto no ambiente Lovable**
   - Rebuscar e vincular a credencial canônica do projeto Supabase conectado, sem revelar ou gravar o valor no repositório.
   - Atualizar o runtime e verificar uma operação administrativa real antes de alterar os fluxos.
   - Manter compatibilidade temporária com `DEST_SUPABASE_SERVICE_ROLE_KEY`, mas usar `SUPABASE_SERVICE_ROLE_KEY` como nome oficial.

2. **Centralizar o acesso administrativo**
   - Criar um único helper server-only para construir/obter o cliente privilegiado e validar URL + chave no momento da requisição.
   - Remover inicializações e tratamentos duplicados espalhados pelas funções.
   - Produzir erro interno claro e seguro, sem instrução incorreta para “conectar Lovable Cloud” e sem jamais enviar chave ou detalhes sensíveis ao navegador.

3. **Revisar todos os 41 pontos de uso**
   - Trocar por `context.supabase` as operações normais de usuário que já possuem autenticação e políticas RLS adequadas.
   - Preservar Service Role somente em operações realmente privilegiadas, sempre após validar a sessão, role/hierarquia ou token público correspondente.
   - Manter Auth Admin, rotas públicas controladas, documentos, storage privilegiado e tarefas administrativas no servidor.

4. **Impedir falso erro depois de uma ação concluída**
   - Separar a mutação principal de efeitos secundários, como e-mail, auditoria enriquecida, sincronização e geração auxiliar.
   - Efeitos opcionais deverão registrar falha sem transformar uma ação já salva em erro visual; efeitos obrigatórios deverão falhar antes da confirmação ou usar uma transação/RPC apropriada.
   - Padronizar os retornos para evitar que o frontend mostre “falhou” quando o banco já confirmou a ação.

5. **Blindar preview e Coolify**
   - Completar a documentação de ambiente com `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SERVICE_ROLE_KEY` como variáveis de runtime, deixando explícito que a chave privada nunca é build arg nem `VITE_*`.
   - Adicionar uma verificação server-only de prontidão administrativa, sem expor o valor, para detectar configuração ausente antes dos usuários executarem ações.
   - Confirmar que o bundle Docker lê a variável no runtime do container, e não durante o build.

6. **Validação ponta a ponta**
   - Testar no preview as ações que hoje mais exercitam o cliente privilegiado: usuários, fornecedores/clientes, compras, FAT/SAT, documentos, compartilhamentos, suporte, formulários públicos e administração.
   - Repetir os testes com as roles permitidas e confirmar bloqueio das roles não autorizadas.
   - Verificar banco, resposta da função, ausência do toast de Service Role e logs do servidor após cada ação.

## Critérios de aceite

- Nenhuma ação do sistema exibe `Missing Supabase environment variable(s): SUPABASE_SERVICE_ROLE_KEY`.
- Ações concluídas não terminam com toast de erro causado por e-mail, auditoria ou outro efeito secundário.
- Operações administrativas continuam protegidas por sessão, role/hierarquia ou token validado.
- A chave permanece exclusivamente no runtime do servidor e não aparece em código, logs, respostas ou bundle do navegador.
- Preview e imagem Docker possuem um procedimento verificável de configuração e diagnóstico.

## Banco de dados

Não há migração prevista inicialmente. Só será criada uma migração se a auditoria demonstrar que uma operação de usuário precisa de ajuste específico de RLS/RPC; não serão adicionadas políticas permissivas para contornar uma Service Role ausente.
