# Renomear "RFQ" para "Checklist" em todo o sistema

Troca da nomenclatura visível ao usuário: "RFQ" passa a ser "Checklist" no menu lateral, nos títulos das telas, nos textos da interface, nas URLs e na documentação da Central de Ajuda.

## O que muda na navegação

| Hoje | Depois |
|---|---|
| Sidebar: Formulários RFQ (`/comercial/formularios-rfq`) | Checklists (`/comercial/checklists`) |
| Sidebar: Tipos de RFQ (`/admin/rfq-tipos`) | Tipos de Checklist (`/admin/checklist-tipos`) |
| Link público `/rfq/{slug}` | `/checklist/{slug}` |
| Compras: "Envio de RFQ", "RFQs abertos", aba "RFQ gerados" | "Envio de Checklist", "Checklists abertos", "Checklists gerados" |

As URLs antigas continuam funcionando por redirecionamento permanente, para que links `/rfq/{slug}` já enviados a clientes não quebrem.

## Escopo dos textos

- Sidebar, cabeçalhos de página e títulos de aba do navegador (`head()`).
- Telas comerciais: aba do cliente, painel de status, renderizador do formulário público, wizard de conversão de oportunidade.
- Compras: cotações, envios ao fornecedor, painel de insumos, diálogos de ação, tooltip explicativo (texto reescrito para "Checklist de cotação").
- Central de Documentos: aba de documentos gerados.
- Dashboards (Sales, Compras, Admin) e dados mock.
- Formulários recebidos e administração de tipos.

## Escopo técnico

1. **Rotas renomeadas** (arquivos em `src/routes/`):
   - `_authenticated/comercial.formularios-rfq.tsx` → `comercial.checklists.tsx`
   - `_authenticated/admin.rfq-tipos.tsx` → `admin.checklist-tipos.tsx`
   - `rfq.$slug.tsx` → `checklist.$slug.tsx`
   - Novas rotas de redirect 301 nos caminhos antigos (`/comercial/formularios-rfq`, `/admin/rfq-tipos`, `/rfq/$slug`).
2. **Endpoints públicos** `src/routes/api/public/rfq.*.ts` mantêm o caminho atual (contrato de integração e uploads já em uso); apenas mensagens visíveis são ajustadas. Renomeá-los quebraria formulários abertos em navegadores de clientes.
3. **Banco de dados sem alterações**: tabelas e enums (`rfq_formulario_tipo`, `rfq_submissao`, `insumo_rfq_envios`, `insumo_rfq_status`...) permanecem com o nome atual. Renomear tabelas exigiria migração de risco alto sem ganho para o usuário — a troca é de rótulo, não de modelo.
4. **Nomes internos de código** (arquivos `src/lib/rfq*.ts`, componentes `src/components/rfq/`) permanecem; apenas as strings exibidas mudam. Isso evita um refactor massivo de imports com risco de quebra.
5. **Route map da documentação** (`src/content/docs/route-map.ts`) atualizado para as novas URLs.

## Documentação (Central de Ajuda)

- `admin/tipos-de-rfq.md` → `admin/tipos-de-checklist.md` (título, slug, tags, passos e URLs).
- `comercial/rfq-publico-e-formularios.md` → `comercial/checklist-publico-e-formularios.md`.
- `site-publico/formularios-rfq-publicos.md` → `site-publico/checklists-publicos.md`.
- FAQ `link-publico-rfq.md` → `link-publico-checklist.md`.
- Atualização das menções em: `comercial/visao-geral.md`, `compras/visao-geral.md`, `compras/cotacao-multiplos-fornecedores.md`, `site-publico/visao-geral.md`, `site-publico/contato-e-captacao.md`, `site-publico/links-publicos-e-seguranca.md`, `site-publico/catalogo-equipamentos.md`, `clientes-fornecedores/cadastrar-cliente.md`, `documentos/*`, `conta/navegacao-e-atalhos.md`, `conta/papeis-e-permissoes.md`, `comercial/entrevistas.md`, `admin/paginas-e-etapas-equipamentos.md`, FAQ `cotacao-3-fornecedores.md`.
- Cross-links dos artigos renomeados corrigidos e auditoria de docs reexecutada.

## Verificação

- Varredura final por "RFQ" no código de interface para garantir que só restem nomes internos/tabelas.
- Conferência no preview: sidebar, `/comercial/checklists`, `/admin/checklist-tipos`, link público `/checklist/{slug}` e o redirect de `/rfq/{slug}`.
