/**
 * Regras compartilhadas dos logs de acesso: quais funções do servidor contam
 * como "ação" e como mostrar o nome delas em português.
 */

/** Leituras não entram no log (seriam centenas por minuto). */
const LEITURA =
  /^(list|get|search|count|fetch|load|check|preview|resumo|buscar|listar|obter|ver|my|current|necessidades|is|has|can|pode|calc|estimar|sugerir|validar|validate|lookup|find|read|stats|dashboard|kpi|pendencias|minhas|meus|minha|meu)[A-Z_]|^(listar|buscar|obter)$/;

export function ehAcaoRegistravel(nome: string) {
  return !!nome && !LEITURA.test(nome);
}

const VERBOS: Array<[RegExp, string]> = [
  [/^(create|criar|novo|nova|add|adicionar|insert|registrar)/i, "Criou"],
  [
    /^(update|atualizar|editar|edit|salvar|save|upsert|set|alterar|definir|mudar|change)/i,
    "Alterou",
  ],
  [/^(delete|remove|remover|excluir|apagar)/i, "Removeu"],
  [/^(archive|arquivar|deactivate|desativar)/i, "Arquivou"],
  [/^(restore|restaurar|reactivate|reativar|reabrir)/i, "Restaurou"],
  [/^(upload|anexar)/i, "Enviou arquivo"],
  [/^(gerar|generate|render)/i, "Gerou"],
  [/^(send|enviar|notificar|notify|email)/i, "Enviou"],
  [/^(aprovar|approve|liberar)/i, "Aprovou"],
  [/^(reprovar|reject|rejeitar)/i, "Reprovou"],
  [/^(move|mover)/i, "Moveu"],
  [/^(convert|converter)/i, "Converteu"],
  [/^(import|importar|apply)/i, "Importou"],
  [/^(export|exportar|download|baixar)/i, "Exportou"],
  [/^(reset|redefinir)/i, "Redefiniu"],
  [/^(scan|ler)/i, "Leu por foto"],
  [/^(minerar|enrich|enriquecer)/i, "Enriqueceu"],
  [/^(assinar|sign)/i, "Assinou"],
  [/^(agendar|schedule)/i, "Agendou"],
];

/** "src/lib/oportunidades.functions.ts" → "oportunidades" */
export function moduloDoArquivo(arquivo?: string | null) {
  if (!arquivo) return null;
  const base = arquivo.split(/[\\/]/).pop() ?? "";
  return (
    base
      .replace(/\.(functions|server)?\.?tsx?$/, "")
      .replace(/[-_.]/g, " ")
      .trim() || null
  );
}

/** "createOportunidade" → "Criou · oportunidade" */
export function descreverAcao(funcao?: string | null) {
  if (!funcao) return "Ação";
  const verbo = VERBOS.find(([re]) => re.test(funcao));
  const resto = funcao
    .replace(verbo?.[0] ?? /^$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim()
    .toLowerCase();
  if (!verbo) return funcao.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return resto ? `${verbo[1]} · ${resto}` : verbo[1];
}

/** Navegador e sistema a partir do user agent (sem biblioteca). */
export function descreverDispositivo(ua?: string | null) {
  if (!ua) return "—";
  const nav = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Chrome\//.test(ua)
        ? "Chrome"
        : /Firefox\//.test(ua)
          ? "Firefox"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Navegador";
  const so = /iPad/.test(ua)
    ? "iPad"
    : /iPhone/.test(ua)
      ? "iPhone"
      : /Android/.test(ua)
        ? /Mobile/.test(ua)
          ? "Android"
          : "Tablet Android"
        : /Windows/.test(ua)
          ? "Windows"
          : /Mac OS X/.test(ua)
            ? "Mac"
            : /Linux/.test(ua)
              ? "Linux"
              : "";
  return so ? `${nav} · ${so}` : nav;
}
