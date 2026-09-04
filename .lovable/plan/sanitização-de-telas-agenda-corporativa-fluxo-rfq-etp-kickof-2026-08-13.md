# Sanitização de telas, agenda corporativa, fluxo RFQ→ETP→Kickoff e mineração de leads

Entrega em 4 fases. Cada fase é utilizável sozinha; a seguinte só começa depois da sua aprovação.

## Fase 1 — Sanitização de telas + sitemap + correções em Fornecedores

Telas densas hoje (contagem real de linhas): ficha do cliente (1.804 linhas), ficha do fornecedor (1.486), além de páginas de equipamento e ETP.

- Padronizar a "ficha completa" em um layout de duas colunas com abas: cabeçalho enxuto (identificação, status, ações principais), coluna lateral com resumo/atalhos e conteúdo pesado dentro de abas carregadas sob demanda.
- Recolher blocos secundários em seções expansíveis, com densidade e espaçamentos únicos para todas as fichas (cliente, fornecedor, equipamento).
- Quebrar os arquivos gigantes em componentes por aba, sem alterar regras de negócio nem consultas.
- Criar `public/robots.txt` e gerar o `sitemap.xml` público (rota de servidor) cobrindo home, soluções, equipamentos (incluindo os dinâmicos por slug) e contato. Rotas internas autenticadas ficam fora.

Fornecedores — dois problemas relatados:
- Filtro por tag/busca não retorna resultados: investigar a consulta de busca (texto + categorias) e corrigir; hoje há busca por texto e vínculo de categorias em tabelas separadas, o que costuma quebrar a combinação dos filtros.
- "API não funciona": o enriquecimento de fornecedor depende de serviços externos configurados em Configurações › Chaves & Diagnóstico. O primeiro passo é rodar o diagnóstico e identificar qual capacidade está falhando (chave ausente, cota, ou erro do provedor) e então corrigir a causa. A causa ainda não está confirmada; não vou assumir uma.

## Fase 2 — Agenda corporativa (Google Agenda / Microsoft 365)

Conta única da empresa, conectada uma vez pelo administrador.

- Nova conexão em Configurações › Chaves & Diagnóstico: "Agenda corporativa", com escolha do provedor (Google Agenda ou Microsoft 365/Teams) e teste de conectividade.
- No card do Suspect (pipeline comercial): botão **Agendar entrevista** — abre um diálogo com data/hora, duração, participantes (e-mails), título e descrição pré-preenchidos com os dados da oportunidade.
- O evento é criado na agenda corporativa; quando o provedor for Microsoft, o link de reunião do Teams é gerado automaticamente (Google Meet no caso do Google).
- O evento criado fica registrado na oportunidade (data, link, participantes) e aparece na timeline.
- No perfil do usuário: campo para o e-mail que ele quer receber os convites (não é uma conexão individual, já que a agenda é corporativa).

## Fase 3 — Fluxo RFQ → Checklist → ETP → Kickoff

Encadeamento explícito das etapas que hoje existem soltas:

1. Entrevista do Suspect respondida gera um RFQ público pré-preenchido.
2. O RFQ respondido vira checklist técnico do cliente.
3. O checklist alimenta o ETP do cliente, vinculado ao equipamento.
4. Dentro do equipamento: campo de **busca de ETP** (por código, cliente ou título) para localizar e vincular ETPs existentes; ETPs vinculados aparecem em lista na ficha do equipamento.
5. Ao aprovar o ETP, o sistema oferece **Agendar kickoff** usando a agenda da Fase 2, com participantes sugeridos (comercial, engenharia, cliente).

Cada transição registra origem e destino, para que a rastreabilidade fique visível na timeline.

## Fase 4 — Mineração de leads (API Penta)

Página nova em Comercial › Mineração de leads, preparada para a API Penta:

- Painel de filtros: país de origem, país de destino, produto/NCM, faixa de volume, período.
- Resultado em tabela: empresa exportadora, empresa importadora, produto, volume, data da operação.
- Cada linha tem **Criar suspect** (exportador, importador ou ambos), gerando oportunidade no pipeline com origem "Mineração Penta" e os dados da transação anexados na nota inicial.
- Deduplicação: se a empresa já existir como cliente/oportunidade, o sistema aponta o registro existente em vez de duplicar.
- Enquanto a chave da Penta não estiver configurada, a tela funciona com uma fonte de dados de exemplo e exibe aviso de "integração não configurada" — sem citar nomes técnicos de variáveis.

## Detalhes técnicos

- Agenda: conector server-side com credencial única (Google Calendar API ou Microsoft Graph), chamado por server function autenticada; nenhuma credencial no navegador. Eventos persistidos em nova tabela `agenda_eventos` (vínculo polimórfico com oportunidade/ETP), com RLS + GRANTs.
- Penta: cliente HTTP server-side, resultados não persistidos por padrão; apenas o que virar suspect grava no banco. Nova tabela `lead_mineracao_buscas` para histórico de consultas.
- ETP↔equipamento: usar o vínculo já existente em `equipamento_etps`, adicionando busca por texto e ação de vincular/desvincular.
- Sitemap: rota `src/routes/sitemap[.]xml.ts` com entradas estáticas + equipamentos publicados; `lastmod` só onde houver data de atualização real da página.
- Sanitização: apenas frontend/apresentação — sem mudança de consultas, permissões ou regras.
