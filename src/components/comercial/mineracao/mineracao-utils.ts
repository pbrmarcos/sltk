import { ArrowLeftRight, Building2, Globe2 } from "lucide-react";
import { continenteDeQualquer, ordemContinente } from "@/lib/mineracao/continentes";

export type Modo = "empresas" | "pares" | "rota";
export type Papel = "importador" | "fornecedor" | "ambos";

/** Modos de consulta — a descrição e o exemplo viram tooltip do seletor. */
export const MODOS = [
  {
    id: "rota" as const,
    titulo: "Rota comercial",
    icone: Globe2,
    descricao: "Quem vendeu de um país para quem comprou no outro — pronto para virar lead.",
    exemplo: "ACME S.A. (AR) ← Bosch Verpackung (DE) · 24 op. · US$ 1,2 mi",
  },
  {
    id: "pares" as const,
    titulo: "Empresa → contraparte",
    icone: ArrowLeftRight,
    descricao: "Cada empresa e seus principais parceiros comerciais no exterior.",
    exemplo: "ACME S.A. → Bosch · Krones · Tetra · 3 parceiros",
  },
  {
    id: "empresas" as const,
    titulo: "Empresas",
    icone: Building2,
    descricao: "Lista simples de empresas que negociaram o NCM.",
    exemplo: "ACME S.A. · 58 operações · US$ 3,4 mi",
  },
];

export function rotuloModo(m: unknown) {
  return m === "rota" ? "Rota comercial" : m === "pares" ? "Empresa → contraparte" : "Empresas";
}

export const usd = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Períodos prontos — a API limita a janela a 12 meses. */
export function presetsPeriodo() {
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const ultimos = (meses: number) => {
    const ini = new Date(hoje);
    ini.setMonth(ini.getMonth() - meses);
    return { inicio: iso(ini), fim: iso(hoje) };
  };
  const ano = (a: number) => ({
    inicio: `${a}-01-01`,
    fim: a === anoAtual ? iso(hoje) : `${a}-12-31`,
  });
  return [
    { label: "3 meses", ...ultimos(3) },
    { label: "6 meses", ...ultimos(6) },
    { label: "12 meses", ...ultimos(12) },
    { label: `${anoAtual}`, ...ano(anoAtual) },
    { label: `${anoAtual - 1}`, ...ano(anoAtual - 1) },
    { label: `${anoAtual - 2}`, ...ano(anoAtual - 2) },
  ];
}

/**
 * Aceita NCM em qualquer formato (8422, 8422.30, 1006.30.21, "8422 30 90") e
 * reduz para o rubro de 4 dígitos exigido pela consulta.
 */
export function parseNcm(texto: string): { rubros: string[]; invalidos: string[] } {
  const rubros: string[] = [];
  const invalidos: string[] = [];
  for (const bruto of texto.split(/[\s,;]+/)) {
    const token = bruto.trim();
    if (!token) continue;
    const digitos = token.replace(/\D/g, "");
    if (digitos.length < 4) {
      invalidos.push(token);
      continue;
    }
    const rubro = digitos.slice(0, 4);
    if (!rubros.includes(rubro)) rubros.push(rubro);
  }
  return { rubros, invalidos };
}

export function mesesEntre(inicio: string, fim: string) {
  return (new Date(fim).getTime() - new Date(inicio).getTime()) / (1000 * 60 * 60 * 24 * 30.5);
}

/** Agrupa opções de país por continente, na ordem de relevância comercial. */
export function agruparPorContinente<T extends { valor: string; rotulo: string; pais: string }>(
  itens: T[],
): Array<{ continente: string; itens: T[] }> {
  const mapa = new Map<string, T[]>();
  for (const it of itens) {
    const c = continenteDeQualquer(it.pais);
    const lista = mapa.get(c) ?? [];
    lista.push(it);
    mapa.set(c, lista);
  }
  return [...mapa.entries()]
    .map(([continente, lista]) => ({
      continente,
      itens: lista.sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR")),
    }))
    .sort((a, b) => ordemContinente(a.continente) - ordemContinente(b.continente));
}

/** Filtros da busca ficam no navegador para não se perderem ao sair e voltar. */
export const CTX_KEY = "mineracao:contexto:v2";
export const CAMPANHA_KEY = "mineracao:campanha:v2";

export const SELECT_CLS =
  "h-9 w-full rounded-md border border-[var(--bg-border)] bg-[var(--bg-surface)] px-2 text-[13px] text-[var(--text-primary)]";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Campanha = Record<string, any>;

export function metaDaCampanha(c: Campanha) {
  return {
    nome: c["nome"] as string,
    base: (c["base_titulo"] as string) || `${c["key_country"]} ${c["key_operation"]}`,
    modo: rotuloModo(c["modo"]),
    pais_destino: (c["pais_destino"] as string) ?? null,
    pais_origem: (c["pais_origem"] as string) ?? null,
    rubros: (c["rubros"] ?? []) as string[],
    periodo: `${c["start_date"]} → ${c["end_date"]}`,
    responsavel: (c["responsavel"] as string) ?? "—",
    data_busca: new Date(c["created_at"]).toLocaleString("pt-BR"),
  };
}
