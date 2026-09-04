/**
 * Mapa canônico Rota → Artigo de documentação.
 *
 * Usado para:
 *  - Botão "Ajuda desta tela" no PageHeader (link contextual).
 *  - Backlink "Nesta tela do app" dentro do artigo.
 *  - Script de auditoria (`scripts/docs-audit.mjs`) que compara rotas ativas
 *    com artigos existentes e sinaliza gaps.
 *
 * Cada entrada mapeia um padrão de rota (com `$param` do TanStack Router) para
 * um par `{ category, slug }` de artigo. Rotas dinâmicas usam o mesmo padrão
 * do arquivo em `src/routes/_authenticated/`.
 */
export interface DocRouteEntry {
  route: string; // ex.: "/comercial/pipeline" ou "/clientes/$codigo"
  category: string;
  slug: string;
}

export const ROUTE_DOC_MAP: DocRouteEntry[] = [
  // Comercial
  { route: "/comercial/pipeline", category: "comercial", slug: "pipeline-de-oportunidades" },
  { route: "/comercial/orcamento", category: "comercial", slug: "novo-orcamento" },
  { route: "/comercial/orcamento/novo", category: "comercial", slug: "novo-orcamento" },
  { route: "/comercial/orcamento/$id", category: "comercial", slug: "novo-orcamento" },
  { route: "/comercial/orcamento/$id/corrigir", category: "comercial", slug: "corrigir-orcamento" },
  { route: "/comercial/checklists", category: "comercial", slug: "checklist-publico-e-formularios" },
  { route: "/comercial/entrevistas", category: "comercial", slug: "entrevistas" },

  // Clientes & Fornecedores
  { route: "/clientes", category: "clientes-fornecedores", slug: "cadastrar-cliente" },
  { route: "/clientes/novo", category: "clientes-fornecedores", slug: "cadastrar-cliente" },
  { route: "/clientes/$codigo", category: "clientes-fornecedores", slug: "cadastrar-cliente" },
  { route: "/fornecedores", category: "clientes-fornecedores", slug: "cadastrar-fornecedor" },
  { route: "/fornecedores/novo", category: "clientes-fornecedores", slug: "cadastrar-fornecedor" },
  { route: "/fornecedores/$id", category: "clientes-fornecedores", slug: "categorias-e-homologacao" },
  { route: "/importar", category: "clientes-fornecedores", slug: "importar-clientes-em-lote" },

  // Engenharia
  { route: "/engenharia/projetos", category: "engenharia", slug: "visao-geral" },
  { route: "/engenharia/etp", category: "engenharia", slug: "criar-etp" },
  { route: "/engenharia/etp/$id", category: "engenharia", slug: "criar-etp" },
  { route: "/engenharia/etapas", category: "engenharia", slug: "etapas-e-kanban" },
  { route: "/engenharia/hh", category: "engenharia", slug: "etapas-e-kanban" },

  // Compras
  { route: "/compras/solicitacao", category: "compras", slug: "criar-solicitacao" },
  { route: "/compras/cotacoes", category: "compras", slug: "cotacao-multiplos-fornecedores" },
  { route: "/compras/cotacoes/nova", category: "compras", slug: "cotacao-multiplos-fornecedores" },
  { route: "/compras/cotacoes/$id", category: "compras", slug: "cotacao-multiplos-fornecedores" },
  { route: "/compras/ordens", category: "compras", slug: "emitir-e-aprovar-oc" },
  { route: "/compras/ordens/nova", category: "compras", slug: "emitir-e-aprovar-oc" },
  { route: "/compras/ordens/$id", category: "compras", slug: "emitir-e-aprovar-oc" },
  { route: "/compras/almoxarifado", category: "compras", slug: "almoxarifado" },
  { route: "/compras/almoxarifado/ordens", category: "compras", slug: "almoxarifado" },
  { route: "/compras/almoxarifado/$id", category: "compras", slug: "almoxarifado" },

  // Produção
  { route: "/producao/montagem", category: "producao", slug: "kanban-montagem" },

  // Qualidade
  { route: "/qualidade/fat", category: "qualidade", slug: "agendar-e-preparar-fat" },
  { route: "/qualidade/fat/novo", category: "qualidade", slug: "agendar-e-preparar-fat" },
  { route: "/qualidade/fat/$id", category: "qualidade", slug: "executar-fat" },
  { route: "/qualidade/revisao-mecanica", category: "qualidade", slug: "visao-geral" },
  { route: "/qualidade/revisao-eletrica", category: "qualidade", slug: "visao-geral" },

  // Logística
  { route: "/logistica/embarques", category: "logistica", slug: "visao-geral" },
  { route: "/logistica/embarques/novo", category: "logistica", slug: "criar-embarque" },
  { route: "/logistica/embarques/$id", category: "logistica", slug: "acompanhar-status" },

  // Pós-vendas
  { route: "/pos-vendas", category: "pos-vendas", slug: "visao-geral" },
  { route: "/pos-vendas/chamados", category: "pos-vendas", slug: "atender-chamado" },
  { route: "/pos-vendas/chamados/$id", category: "pos-vendas", slug: "atender-chamado" },
  { route: "/pos-vendas/sat", category: "pos-vendas", slug: "sat-em-campo" },
  { route: "/pos-vendas/sat/$id", category: "pos-vendas", slug: "sat-em-campo" },

  // Documentos
  { route: "/central-documentos", category: "documentos", slug: "visao-geral" },
  { route: "/documentos", category: "documentos", slug: "visao-geral" },
  { route: "/documentos/$id", category: "documentos", slug: "editor-de-blocos" },
  { route: "/template-documentos", category: "documentos", slug: "templates-e-versionamento" },

  // Know-how
  { route: "/know-how", category: "know-how", slug: "visao-geral" },
  { route: "/know-how/novo", category: "know-how", slug: "publicar-conteudo" },
  { route: "/know-how/revisar", category: "know-how", slug: "publicar-conteudo" },
  { route: "/know-how/$slug", category: "know-how", slug: "busca-e-organizacao" },

  // Administração
  { route: "/admin", category: "admin", slug: "visao-geral" },
  { route: "/admin/usuarios", category: "admin", slug: "gerenciar-usuarios" },
  { route: "/admin/auditoria", category: "admin", slug: "auditoria" },
  { route: "/admin/configuracoes", category: "admin", slug: "configuracoes" },
  { route: "/admin/modelos-formulario", category: "admin", slug: "tipos-de-checklist" },
  { route: "/admin/entrevistas/$segmentoId", category: "admin", slug: "formularios-entrevista" },
  { route: "/admin/sla-chamados", category: "admin", slug: "sla-chamados" },
  { route: "/admin/etapas-equipamentos", category: "admin", slug: "paginas-e-etapas-equipamentos" },
  { route: "/admin/etapas-equipamentos/$id", category: "admin", slug: "paginas-e-etapas-equipamentos" },
  { route: "/admin/paginas-equipamentos", category: "admin", slug: "paginas-e-etapas-equipamentos" },
  { route: "/admin/suporte", category: "admin", slug: "visao-geral" },

  // Conta
  { route: "/conta", category: "conta", slug: "editar-perfil-e-avatar" },

  // Telas adicionadas na 0.99.4
  { route: "/comercial/mineracao", category: "comercial", slug: "mineracao-de-leads" },
  { route: "/comercial/entrevistas/$id", category: "comercial", slug: "entrevistas" },
  { route: "/admin/emails", category: "admin", slug: "emails-automaticos" },
  { route: "/admin/formularios-recebidos", category: "admin", slug: "formularios-recebidos" },
  { route: "/know-how/imprimir/$slug", category: "know-how", slug: "publicar-conteudo" },
];

/** Converte um pathname real em um padrão `/foo/$id` procurável no mapa. */
function toPattern(pathname: string): string[] {
  const parts = pathname.split("?")[0].split("#")[0].split("/").filter(Boolean);
  // Gera candidatos: exato + substituindo trechos por $-placeholder de trás pra frente,
  // permitindo casar tanto `/clientes/ABC-1` quanto `/clientes/$codigo`.
  const patterns: string[] = ["/" + parts.join("/")];
  const isDynamicish = (seg: string) =>
    /^\d+$/.test(seg) || /-/.test(seg) || seg.length > 12 || /^[0-9a-f]{8}-/.test(seg);
  const generic = parts.map((seg, i) => (i > 0 && isDynamicish(seg) ? "$id" : seg));
  patterns.push("/" + generic.join("/"));
  return Array.from(new Set(patterns));
}

export function getDocForRoute(
  pathname: string,
): { category: string; slug: string; route: string } | undefined {
  const candidates = toPattern(pathname);
  for (const p of candidates) {
    const hit = ROUTE_DOC_MAP.find((e) => e.route === p);
    if (hit) return hit;
  }
  // Fallback: match por prefixo mais longo (ex.: /admin/etapas-equipamentos/abc → /admin/etapas-equipamentos/$id)
  const parts = pathname.split("/").filter(Boolean);
  for (let i = parts.length; i > 0; i--) {
    const prefix = "/" + parts.slice(0, i).join("/");
    const hit = ROUTE_DOC_MAP.find((e) => e.route === prefix);
    if (hit) return hit;
  }
  return undefined;
}
