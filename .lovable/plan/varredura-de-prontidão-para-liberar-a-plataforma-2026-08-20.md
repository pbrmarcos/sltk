# Varredura de prontidão para liberar a plataforma

Objetivo: auditar rota por rota, corrigir o que estiver quebrado e deixar um relatório de liberação (go-live) com o que está pronto e o que ficou pendente.

## O que já foi verificado agora (resultado real)

- Rotas públicas respondem 200: home, contato, equipamentos, 3 páginas de soluções, login, recuperar senha, suporte, sitemap.xml, /api/public/health e /api/public/readiness. Rota inexistente devolve 404 corretamente.
- `/api/public/readiness` retorna `{"status":"ready","admin":"ok"}` — service role ativa.
- Suíte de testes: 33 passam, 1 falha (`src/lib/messages-leak.test.ts`) apontando `sitemap[.]xml.ts:71`. É falso positivo: `BASE_URL` ali é uma constante interna do XML, não uma mensagem ao usuário.
- Log do servidor mostra erro de hidratação em `/login` (o `AuthLayout` renderiza diferente no servidor e no navegador) — a tela funciona, mas React descarta a árvore e re-renderiza, o que gera piscada e ruído no console.
- Log mostra "Invalid server function ID" em funções de Mineração — resíduo de HMR após as últimas edições; precisa ser confirmado com o servidor reiniciado antes de tratar como bug real.
- Não há migrações pendentes em `supabase/pending-migrations/`.

## Etapas do trabalho

### 1. Varredura das telas autenticadas (91 rotas)
Percorrer, autenticado, todas as rotas de `_authenticated` (dashboard, comercial, compras, engenharia, produção, qualidade, logística, pós-vendas, clientes, fornecedores, documentos, know-how, ajuda, conta, admin) e registrar para cada uma: carrega / erro de tela / erro no console / chamada de rede falhando / estado vazio sem explicação. Rotas com parâmetro (`$id`, `$slug`, `$codigo`) são abertas a partir de um registro real existente.

### 2. Correção dos defeitos encontrados
Corrigir os erros que a varredura apontar, em ordem de gravidade: tela quebrada > erro de servidor > erro de console > problema visual. Itens já conhecidos a corrigir:
- Hidratação do `/login` (alinhar render de servidor e cliente no `AuthLayout`).
- Falha do teste `messages-leak` (excluir o gerador de sitemap da regra, que é sobre mensagens ao usuário).
- Reconfirmar as server functions de Mineração com o servidor limpo e corrigir se o erro persistir.

### 3. Permissões e segurança
- Conferir que cada rota está no módulo certo do `ModuleGuard` e que um usuário sem o módulo é bloqueado (não só escondido no menu).
- Rodar a varredura de segurança do banco (RLS, grants, funções) e tratar os achados críticos.
- Conferir que endpoints em `/api/public/*` validam quem chama.

### 4. Fluxos de ponta a ponta
Testar os caminhos que o usuário realmente usa, não só o carregamento da tela: login → dashboard; criar oportunidade no pipeline; gerar orçamento; checklist público; solicitação de compra; abertura e atendimento de chamado; embarque na logística; busca em Mineração de leads.

### 5. Relatório de liberação
Entregar um resumo por módulo: pronto / pronto com ressalva / não liberar, com o motivo. Registrar o resultado no changelog e ajustar a documentação onde a varredura mostrar divergência entre o texto e a tela.

## Detalhes técnicos

- A varredura das telas autenticadas usa Playwright com sessão restaurada, capturando erros de console e respostas HTTP >= 400 por rota.
- Rotas de redirecionamento (`admin.rfq-tipos`, `comercial.formularios-rfq`, `rfq.$slug`, `pos-vendas.index`) são validadas pelo destino final.
- Nenhuma alteração de schema é prevista; se algum defeito exigir migração, ela é criada e aplicada com verificação por consulta.
