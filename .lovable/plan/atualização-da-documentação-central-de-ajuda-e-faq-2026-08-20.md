# Atualização da documentação, Central de Ajuda e FAQ

A auditoria (`bun scripts/docs-audit.mjs`) mostra hoje: 90 rotas ativas, 65 no mapa, 73 artigos, 58 FAQs — **0 erros**, mas **7 telas sem documentação**, **33 artigos fora do mapa de rotas** e **71 artigos sem versão registrada ou defasados** (última revisão em 0.96.2, app hoje em 0.99.3-beta).

## 1. Telas novas sem documentação (7)

Criar artigo para cada uma, com print, passos numerados, callouts e "Ver também":

| Tela | Artigo novo |
|---|---|
| `/comercial/mineracao` | comercial / **mineracao-de-leads** — bases por continente, sincronização (admin) vs. solicitar sincronização, limites do contrato Penta (bases/NCM/empresas), histórico de buscas, período válido de cada base, leitura das mensagens de erro do provedor |
| `/comercial/formularios-rfq` e `/admin/rfq-tipos` | comercial / **formularios-checklist-recebidos** + admin / **tipos-de-formulario-checklist** |
| `/admin/formularios-recebidos` | admin / **formularios-recebidos** (triagem, status, alertas) |
| `/admin/emails` | admin / **templates-de-email** (variáveis, prefixo, logs de envio) |
| `/comercial/entrevistas/$id` | ampliar `comercial/entrevistas` com a seção de execução/impressão |
| `/know-how/imprimir/$slug` | ampliar `know-how/publicar-conteudo` com exportação em PDF |

Cada rota nova entra em `src/content/docs/route-map.ts` para ativar o botão "Ajuda desta tela".

## 2. Revisão dos módulos que mudaram desde a 0.96

- **Comercial** — mineração, entrevistas, renomeação de RFQ → Checklist, rotina comercial dentro do card da oportunidade, guias/legendas do processo.
- **Know-how** — favoritos, histórico de leitura, busca/tags, edição de item publicado, impressão.
- **Documentos** — aba Entrevistas na Central, arquivamento no Drive, geração de PDF.
- **Admin** — configurações de marca, chaves/integrações, e-mails, formulários recebidos, SLA.
- **Site público** — soluções, equipamentos, contato (checagem de rotas e prints).

Nesses artigos: revisar passos, corrigir rótulos de UI, atualizar `atualizado_em` e `app_version: 0.99.4`.

## 3. FAQ

- Novas perguntas (~12–15), principalmente Mineração de leads (dropdown vazio, quem sincroniza, "Async"/período fora do intervalo, limites do contrato, busca repetida), Know-how (favoritos, impressão), Documentos (entrevistas no Drive) e Admin (e-mails, formulários recebidos).
- Revisar FAQs que citam "RFQ" para o novo nome "Checklist".

## 4. Mapa de rotas e cross-links

- Adicionar as 7 rotas faltantes e as entradas dos 33 artigos que hoje não têm rota associada (quando fizer sentido; artigos conceituais ficam sem rota, mas ganham link a partir da "Visão geral" da categoria).
- Garantir "Ver também" com 2+ links em todo artigo tocado.

## 5. Prints (todos)

- Captura autenticada com a conta **gestor@sltkamericas.com** (credenciais já salvas como secrets `DOCS_SHOTS_EMAIL` / `DOCS_SHOTS_PASSWORD`; login já validado).
- Rodar `bun scripts/docs-screenshots.mjs` com a lista de alvos ampliada (hoje cobre 18 telas; passar a cobrir também mineração, e-mails, formulários recebidos, entrevistas, know-how, documentos, site público).
- Promover com `bun scripts/docs-promote-shots.mjs` e conferir `alt` descritivo em cada imagem.

## 6. Changelog / versão 0.99.4

- Bump em `src/lib/app-version.ts` para `0.99.4`.
- Nova seção no `CHANGELOG.md` cobrindo o que entrou sem registro: mineração de leads (bases locais Penta, sincronização em lotes, limites reais do contrato, agrupamento por continente, histórico de buscas, mensagens de erro traduzidas), correção do sino de notificações sem sessão, e a própria revisão documental.
- A rota `/changelog` lê o mesmo conteúdo, então fica atualizada junto.

## 7. Verificação final

`bun scripts/docs-audit.mjs --write` deve terminar com **0 rotas sem doc**, **0 links quebrados** e nenhum artigo com versão defasada. Relatório salvo em `/mnt/documents/docs-audit.md`.

## Detalhes técnicos

- Artigos em `src/content/docs/articles/<categoria>/<slug>.md`, frontmatter completo (`title, description, category, slug, tipo, nivel, tags, papeis, atualizado_em, app_version`).
- FAQ em `src/content/docs/faq/<id>.md` com `question, category, tags`.
- Diretivas suportadas: `:::tldr`, `:::step{n title img}`, `:::dica`, `:::atencao`, `:::erro`, `:::nota`.
- Imagens em `src/assets/docs/<categoria>/…` via o fluxo dos scripts de screenshot.
- Nenhuma mudança de banco ou de lógica de negócio — apenas conteúdo, mapa de rotas, lista de alvos de screenshot e versão.
