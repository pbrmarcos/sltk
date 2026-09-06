export type DocCategory =
  | "conta"
  | "comercial"
  | "clientes-fornecedores"
  | "importacao"
  | "engenharia"
  | "compras"
  | "qualidade"
  | "pos-vendas"
  | "producao"
  | "logistica"
  | "documentos"
  | "know-how"
  | "ajuda"
  | "admin"
  | "administracao"
  | "site-publico";

export type DocTipo = "guia" | "conceito" | "referencia" | "troubleshooting";
export type DocNivel = "iniciante" | "intermediario" | "avancado";
export type DocPapel =
  | "admin"
  | "manager"
  | "sales"
  | "engineer"
  | "quality"
  | "purchasing"
  | "production"
  | "support";

export interface DocFrontmatter {
  title: string;
  description: string;
  category: DocCategory;
  slug: string;
  tipo: DocTipo;
  nivel: DocNivel;
  tags?: string[];
  papeis?: DocPapel[];
  atualizado_em: string; // ISO date
  app_version?: string; // versão do app em que este artigo foi revisado
}

export interface DocArticle extends DocFrontmatter {
  body: string;
  excerpt: string; // first paragraph plain text
}

export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
  category: DocCategory;
  tags?: string[];
}

export interface CategoryMeta {
  id: DocCategory;
  label: string;
  description: string;
  order: number;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: "conta",
    label: "Conta & primeiros passos",
    description: "Login, perfil, senha, navegação e papéis.",
    order: 1,
  },
  {
    id: "comercial",
    label: "Comercial",
    description: "Pipeline, oportunidades, orçamentos e Checklist.",
    order: 2,
  },
  {
    id: "clientes-fornecedores",
    label: "Clientes & Fornecedores",
    description: "Cadastros, homologação e importação.",
    order: 3,
  },
  {
    id: "engenharia",
    label: "Engenharia",
    description: "ETP, projeto mecânico/elétrico, Planejamento (etapas + H/H).",
    order: 4,
  },
  {
    id: "compras",
    label: "Compras",
    description: "Solicitação, cotações e ordens de compra.",
    order: 5,
  },
  { id: "qualidade", label: "Qualidade", description: "Revisões e FAT.", order: 6 },
  { id: "producao", label: "Produção", description: "Montagem e kanban de etapas.", order: 7 },
  {
    id: "logistica",
    label: "Logística",
    description: "Embarques, transporte e status de entrega.",
    order: 8,
  },
  { id: "pos-vendas", label: "Pós-vendas", description: "SAT e chamados com SLA.", order: 9 },
  {
    id: "documentos",
    label: "Documentos",
    description: "Central, editor de blocos e templates.",
    order: 10,
  },
  {
    id: "know-how",
    label: "Know-how",
    description: "Biblioteca interna, trilhas e certificações.",
    order: 11,
  },
  {
    id: "admin",
    label: "Administração",
    description: "Usuários, permissões, auditoria, Checklist, SLA e páginas dos equipamentos.",
    order: 12,
  },
  {
    id: "site-publico",
    label: "Site público",
    description: "Home, catálogo e captação (Checklist/contato).",
    order: 13,
  },
];

export function getCategory(id: string): CategoryMeta | undefined {
  const normalized = id === "administracao" ? "admin" : id;
  return CATEGORIES.find((c) => c.id === normalized);
}
