/**
 * Variáveis-exemplo para prévia de templates.
 * Cobre todos os placeholders usados nos templates padrão do sistema.
 * Se um template referenciar uma variável não listada aqui, `renderTemplate`
 * substitui por string vazia — a prévia mostra o resultado real dessa lacuna.
 */
export const SAMPLE_VARS: Record<string, string> = {
  destinatario_nome: "Maria Souza",
  usuario: "João Silva",
  titulo: "Envasadora Vertical 1014",
  codigo: "OC-2026-0451",
  numero: "OC-2026-0451",
  cliente_nome: "Cliente Exemplo Ltda.",
  fornecedor: "Fornecedor Beta S/A",
  valor: "R$ 42.850,00",
  motivo: "Fornecedor não homologado — aguardando parecer da Qualidade.",
  observacao: "Prazo de entrega antecipado em 3 dias úteis.",
  link: "https://solutek-hub.lovable.app/compras/ordens/exemplo",
  prazo: "28/07/2026",
  data: new Date().toLocaleString("pt-BR"),
  tag_equipamento: "ENV-1014",
  equipamento: "Envasadora Vertical 1014",
  status_anterior: "Em análise",
  status_novo: "Aprovada",
  stage_anterior: "Proposta",
  stage_novo: "Ganho",
  chamado_codigo: "CHM-2026-0088",
  assunto: "Sensor de nível intermitente",
  atendente: "Carla Mendes",
  fat_codigo: "FAT-2026-0012",
  etp_codigo: "ETP-2026-0007",
  embarque_codigo: "EMB-2026-0031",
  destino: "Recife, PE",
  transportadora: "Transbrasil Logística",
};

/** Extrai as chaves `{{var}}` de um template (ignora fallbacks e blocos #if). */
export function extractTemplateVars(tpl: string): string[] {
  const set = new Set<string>();
  const re = /\{\{\s*(?:#if\s+)?([a-zA-Z0-9_]+)(?:\s*\|[^}]*)?\s*\}\}/g;
  let m;
  while ((m = re.exec(tpl)) !== null) {
    if (m[1] !== "if") set.add(m[1]);
  }
  return Array.from(set);
}
