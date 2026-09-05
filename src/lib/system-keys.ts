// Catálogo declarativo das chaves/capacidades externas do sistema.
// Client-safe: NÃO lê process.env — apenas descreve o que existe.
// O status real vem de `src/lib/system-diagnostics.functions.ts`.

export type CapabilityArea =
  | "banco"
  | "ia"
  | "documentos"
  | "email"
  | "fiscal"
  | "assinatura";

export const AREA_LABEL: Record<CapabilityArea, string> = {
  banco: "Banco de dados",
  ia: "Inteligência artificial",
  documentos: "Documentos & Google Drive",
  email: "E-mail transacional",
  fiscal: "Enriquecimento fiscal",
  assinatura: "Assinatura & links públicos",
};

export type Criticidade = "critica" | "importante" | "opcional";

export type CapabilityDef = {
  id: string;
  label: string;
  descricao: string;
  /** O que deixa de funcionar quando a capacidade está indisponível. */
  impacto: string;
  area: CapabilityArea;
  criticidade: Criticidade;
  /** Variáveis de ambiente exigidas (todas obrigatórias) e opcionais. */
  envs: string[];
  envsOpcionais?: string[];
  /** Se `true`, o diagnóstico faz uma chamada real ao provedor. */
  testavel: boolean;
};

export const CAPABILITIES: CapabilityDef[] = [
  {
    id: "supabase_core",
    label: "Conexão com o banco (Supabase)",
    descricao: "URL do projeto e chave pública usadas por todo o app.",
    impacto: "Sem isso o sistema não abre nenhuma tela autenticada.",
    area: "banco",
    criticidade: "critica",
    envs: ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"],
    envsOpcionais: ["SUPABASE_PROJECT_ID"],
    testavel: true,
  },
  {
    id: "supabase_service_role",
    label: "Acesso administrativo (service role)",
    descricao: "Permite ações privilegiadas: criar usuários, tokens públicos e rotinas sem sessão.",
    impacto: "Sem isso as telas continuam funcionando por RLS, mas ações administrativas ficam bloqueadas.",
    area: "banco",
    criticidade: "critica",
    envs: ["SUPABASE_SERVICE_ROLE_KEY"],
    testavel: true,
  },
  {
    id: "sb_management",
    label: "Migrations (Supabase Management API)",
    descricao: "Token usado pela tela de Migrations para executar SQL diretamente em produção.",
    impacto: "A tela de Migrations não consegue aplicar nem listar o estado real das migrations pendentes.",
    area: "banco",
    criticidade: "critica",
    envs: ["SB_MANAGEMENT_ACCESS_TOKEN"],
    testavel: true,
  },
  {
    id: "lovable_ai",
    label: "Lovable AI Gateway",
    descricao: "Porta de entrada para modelos de IA.",
    impacto: "Resumos e traduções automáticas ficam indisponíveis.",
    area: "ia",
    criticidade: "importante",
    envs: ["LOVABLE_API_KEY"],
    testavel: false,
  },
  {
    id: "groq",
    label: "Groq (OCR e extração)",
    descricao: "Leitura de cartões, folders e PDFs de fornecedores por visão computacional.",
    impacto: "O preenchimento automático a partir de imagens deixa de funcionar.",
    area: "ia",
    criticidade: "opcional",
    envs: ["GROQ_API_KEY"],
    testavel: true,
  },
  {
    id: "gemini",
    label: "Google Gemini",
    descricao: "Modelo alternativo usado em traduções e extrações de texto.",
    impacto: "Alguns recursos de IA usam apenas o provedor principal.",
    area: "ia",
    criticidade: "opcional",
    envs: ["GEMINI_API_KEY"],
    testavel: false,
  },
  {
    id: "google_drive",
    label: "Google Drive",
    descricao: "Arquiva automaticamente PDFs de orçamentos, entrevistas e relatórios nas pastas do Drive, via conta de serviço.",
    impacto: "Documentos continuam sendo gerados e baixados normalmente, mas não são arquivados no Drive.",
    area: "documentos",
    criticidade: "importante",
    envs: ["GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"],
    envsOpcionais: ["GOOGLE_DRIVE_ROOT_FOLDER_ID"],
    testavel: true,
  },
  {
    id: "resend",
    label: "Resend (envio de e-mails)",
    descricao: "Provedor de disparo dos e-mails automáticos do sistema.",
    impacto: "Nenhum e-mail automático é enviado; os eventos ficam registrados como falha.",
    area: "email",
    criticidade: "importante",
    envs: ["RESEND_API_KEY"],
    envsOpcionais: ["PUBLIC_APP_URL"],
    testavel: true,
  },
  {
    id: "firecrawl",
    label: "Firecrawl",
    descricao: "Busca web usada no enriquecimento de clientes e fornecedores.",
    impacto: "O preenchimento automático por CNPJ/RUT/RUC volta a ser manual.",
    area: "fiscal",
    criticidade: "opcional",
    envs: ["FIRECRAWL_API_KEY"],
    testavel: true,
  },
  {
    id: "apis_net_pe",
    label: "APIs.net.pe (Peru)",
    descricao: "Consulta de RUC peruano.",
    impacto: "A busca fiscal do Peru fica indisponível.",
    area: "fiscal",
    criticidade: "opcional",
    envs: ["APIS_NET_PE_TOKEN"],
    testavel: false,
  },
  {
    id: "doc_signing",
    label: "Assinatura de documentos",
    descricao: "Chave usada para assinar os links públicos de documentos gerados.",
    impacto: "Links públicos de documentos não podem ser emitidos nem validados.",
    area: "assinatura",
    criticidade: "importante",
    envs: ["DOC_SIGNING_KEY"],
    testavel: false,
  },
  {
    id: "relatorio_share",
    label: "Links públicos de relatório",
    descricao: "Segredo dos links compartilháveis de FAT/SAT.",
    impacto: "O compartilhamento externo de relatórios fica indisponível.",
    area: "assinatura",
    criticidade: "importante",
    envs: ["RELATORIO_SHARE_SECRET"],
    testavel: false,
  },
];

export function capabilityById(id: string): CapabilityDef | undefined {
  return CAPABILITIES.find((c) => c.id === id);
}

/**
 * Mensagem amigável, sem citar nomes de variáveis de ambiente,
 * usada quando uma capacidade externa está indisponível.
 */
export function capabilityUnavailableMessage(id: string): string {
  const cap = capabilityById(id);
  if (!cap) return "Esta integração não está configurada no momento.";
  return `${cap.label} indisponível — a integração não está configurada. ${cap.impacto}`;
}
