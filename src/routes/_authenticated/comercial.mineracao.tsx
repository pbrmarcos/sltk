import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Loader2,
  Search,
  Radio,
  RefreshCw,
  Send,
  ArrowLeftRight,
  Building2,
  SlidersHorizontal,
  ChevronDown,
  Globe2,
  AlertTriangle,
  Download,
  History,
  User2,
} from "lucide-react";

import {
  atualizarRestricoes,
  buscaAnterior,
  buscarOperacoes,
  converterLeadEmOportunidade,
  descobrirBaseImportacao,
  getMineracaoStatus,
  listarBases,
  listarCampanhas,
  listarPaises,
  listarPaisesOrigem,
  listarResultados,
  salvarAnotacaoLead,
  sincronizarBases,
  solicitarSincronizacaoBases,
  statusSincronizacaoBases,
} from "@/lib/mineracao.functions";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProcessoComercialGuia } from "@/components/comercial/ProcessoComercialGuia";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { continenteDe, continenteDeQualquer, ordemContinente } from "@/lib/mineracao/continentes";

/** Agrupa opções de país por continente, na ordem de relevância comercial. */
function agruparPorContinente<T extends { valor: string; rotulo: string; pais: string }>(
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
import { exportarResultadosXlsx } from "@/lib/mineracao/exportar";

export const Route = createFileRoute("/_authenticated/comercial/mineracao")({
  component: MineracaoPage,
  head: () => ({
    meta: [
      { title: "Mineração de leads — Solutek Hub" },
      {
        name: "description",
        content:
          "Consulte transações de comércio exterior entre empresas por NCM e período, e envie os melhores leads direto para o pipeline comercial.",
      },
      { property: "og:title", content: "Mineração de leads — Solutek Hub" },
      {
        property: "og:description",
        content:
          "Prospecção por NCM, empresa e contraparte, com conversão em suspects do pipeline.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});
/** Modos de consulta — descrição concreta do que cada um devolve. */
const MODOS = [
  {
    id: "rota" as const,
    titulo: "Rota comercial",
    icone: Globe2,
    descricao:
      "Mostra o par completo: quem vendeu de um país para quem comprou no outro — pronto para virar lead.",
    exemplo: "ACME S.A. (AR) ← Bosch Verpackung (DE) · 24 op. · US$ 1,2 mi",
  },
  {
    id: "pares" as const,
    titulo: "Empresa → contraparte",
    icone: ArrowLeftRight,
    descricao: "Mostra cada empresa e seus principais parceiros comerciais no exterior.",
    exemplo: "ACME S.A. → Bosch · Krones · Tetra · 3 parceiros",
  },
  {
    id: "empresas" as const,
    titulo: "Empresas",
    icone: Building2,
    descricao:
      "Lista simples de empresas que negociaram o NCM, sem cruzar com quem comprou/vendeu.",
    exemplo: "ACME S.A. · 58 operações · US$ 3,4 mi",
  },
];

function rotuloModo(m: unknown) {
  return m === "rota" ? "Rota comercial" : m === "pares" ? "Empresa → contraparte" : "Empresas";
}

const usd = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Períodos prontos — a API limita a janela a 12 meses. */
function presetsPeriodo() {
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
    { label: "Últimos 3 meses", ...ultimos(3) },
    { label: "Últimos 6 meses", ...ultimos(6) },
    { label: "Últimos 12 meses", ...ultimos(12) },
    { label: `${anoAtual} (YTD)`, ...ano(anoAtual) },
    { label: `${anoAtual - 1}`, ...ano(anoAtual - 1) },
    { label: `${anoAtual - 2}`, ...ano(anoAtual - 2) },
    { label: `${anoAtual - 3}`, ...ano(anoAtual - 3) },
  ];
}

/**
 * Aceita NCM em qualquer formato usado no dia a dia (8422, 8422.30, 1006.30.21,
 * "8422 30 90") e reduz para o rubro de 4 dígitos exigido pela consulta.
 */
/** Onde o contexto da tela (aba + filtros + resultado aberto) fica guardado. */
const CTX_KEY = "mineracao:contexto:v1";

function parseNcm(texto: string): { rubros: string[]; invalidos: string[] } {
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

function mesesEntre(inicio: string, fim: string) {
  return (new Date(fim).getTime() - new Date(inicio).getTime()) / (1000 * 60 * 60 * 24 * 30.5);
}

function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const color = pct >= 100 ? "var(--danger)" : pct >= 80 ? "var(--warning)" : "var(--info)";
  return (
    <div className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] text-[var(--text-muted)]">{label}</span>
        <span className="text-[13px] font-semibold text-[var(--text-primary)]">
          {used} / {limit}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      {pct >= 80 && (
        <p className="mt-1.5 text-[11px]" style={{ color }}>
          {pct >= 100 ? "Limite do plano atingido." : "Perto do limite do plano."}
        </p>
      )}
    </div>
  );
}

/** Lista pesquisável do que já foi consultado no contrato. */
function ListaConsultada({ titulo, itens }: { titulo: string; itens: string[] }) {
  const [q, setQ] = React.useState("");
  const filtrados = React.useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? itens.filter((i) => i.toLowerCase().includes(t)) : itens;
  }, [q, itens]);
  return (
    <div className="rounded-md border border-[var(--bg-border)] bg-[var(--bg-base)] p-3">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-semibold text-[var(--text-primary)]">{titulo}</span>
        <span className="text-[11px] text-[var(--text-muted)]">{itens.length}</span>
      </div>
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Filtrar…"
        className="mb-2 h-8 text-[12px]"
      />
      <ul className="max-h-52 space-y-1 overflow-y-auto pr-1">
        {filtrados.length === 0 && (
          <li className="text-[11.5px] text-[var(--text-muted)]">Nada por aqui.</li>
        )}
        {filtrados.map((i) => (
          <li key={i} className="truncate text-[11.5px] text-[var(--text-secondary)]" title={i}>
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Kpi({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-md border border-[var(--bg-border)] bg-[var(--bg-base)] px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
      <div className="text-[15px] font-semibold text-[var(--text-primary)]">{valor}</div>
    </div>
  );
}

function MineracaoPage() {
  const qc = useQueryClient();
  const fetchStatus = useServerFn(getMineracaoStatus);
  const atualizarRestricoesFn = useServerFn(atualizarRestricoes);

  const fetchBases = useServerFn(listarBases);
  const fetchCampanhas = useServerFn(listarCampanhas);
  const fetchResultados = useServerFn(listarResultados);
  const buscar = useServerFn(buscarOperacoes);
  const converter = useServerFn(converterLeadEmOportunidade);
  const descobrirBase = useServerFn(descobrirBaseImportacao);
  const fetchOrigens = useServerFn(listarPaisesOrigem);
  const salvarNota = useServerFn(salvarAnotacaoLead);
  const sincronizar = useServerFn(sincronizarBases);
  const solicitarSync = useServerFn(solicitarSincronizacaoBases);

  const fetchSyncStatus = useServerFn(statusSincronizacaoBases);
  const checarBuscaAnterior = useServerFn(buscaAnterior);

  const status = useQuery({ queryKey: ["mineracao-status"], queryFn: () => fetchStatus() });
  const restricoesMut = useMutation({
    mutationFn: () => atualizarRestricoesFn({} as never),
    onSuccess: (r) => {
      if (r.erro) toast.error(r.erro);
      else toast.success("Limites atualizados com a Penta.");
      qc.setQueryData(["mineracao-status"], r.erro ? status.data : r);
      void qc.invalidateQueries({ queryKey: ["mineracao-status"] });
    },
    onError: (e: unknown) => toast.error((e as Error)?.message ?? "Falha ao atualizar limites."),
  });
  const restricoes = status.data?.dados ?? null;
  const atualizadoEm = status.data?.atualizado_em ?? null;
  const online = restricoes !== null;

  const bases = useQuery({
    queryKey: ["mineracao-bases"],
    queryFn: () => fetchBases({ data: {} }),
    retry: false,
  });

  const sync = useQuery({
    queryKey: ["mineracao-bases-sync"],
    queryFn: () => fetchSyncStatus(),
  });

  const fetchPaises = useServerFn(listarPaises);
  const [syncProgresso, setSyncProgresso] = React.useState<string | null>(null);
  const { role } = useAuth();
  const podeSincronizar = role === "admin" || role === "manager";
  const solicitarSyncMut = useMutation({
    mutationFn: () => solicitarSync({ data: {} }),
    onSuccess: () =>
      toast.success("Pedido enviado — a administração foi avisada para sincronizar as bases."),
    onError: (e: Error) => toast.error(e.message || "Não foi possível enviar o pedido."),
  });

  const sincronizarMut = useMutation({
    mutationFn: async () => {
      const paises = await fetchPaises();
      let bases = 0;
      const erros: string[] = [];
      const lote = 4;
      for (let i = 0; i < paises.length; i += lote) {
        const chunk = paises.slice(i, i + lote);
        setSyncProgresso(
          `Sincronizando ${Math.min(i + lote, paises.length)} de ${paises.length} países…`,
        );
        const r = await sincronizar({ data: { paises: chunk } });
        bases += r.bases;
        erros.push(...r.erros);
        void qc.invalidateQueries({ queryKey: ["mineracao-bases"] });
      }
      return { paises: paises.length, bases, erros };
    },
    onSuccess: (r) => {
      toast.success(`${r.bases} base(s) sincronizadas de ${r.paises} país(es).`);
      if (r.erros.length) toast.warning(`${r.erros.length} país(es) não responderam.`);
      void qc.invalidateQueries({ queryKey: ["mineracao-bases"] });
      void qc.invalidateQueries({ queryKey: ["mineracao-bases-sync"] });
    },
    onError: (e: Error) => toast.error(e.message || "Falha ao sincronizar bases."),
    onSettled: () => setSyncProgresso(null),
  });

  const campanhas = useQuery({
    queryKey: ["mineracao-campanhas"],
    queryFn: () => fetchCampanhas(),
  });

  const presets = React.useMemo(presetsPeriodo, []);

  const [baseKey, setBaseKey] = React.useState("");
  const [baseBusca, setBaseBusca] = React.useState("");
  const [ncm, setNcm] = React.useState("");
  // "rota" é o modo mais usado pelo time comercial (junta as duas pontas).
  const [modo, setModo] = React.useState<"empresas" | "pares" | "rota">("rota");
  const [aba, setAba] = React.useState<"buscar" | "historico">("buscar");

  const [paisDestino, setPaisDestino] = React.useState("");
  const [paisOrigem, setPaisOrigem] = React.useState("");
  const [origemBusca, setOrigemBusca] = React.useState("");
  const [papel, setPapel] = React.useState<"importador" | "fornecedor" | "ambos">("importador");
  const [aviso, setAviso] = React.useState<string | null>(null);
  const [startDate, setStartDate] = React.useState(presets[2]!.inicio);
  const [endDate, setEndDate] = React.useState(presets[2]!.fim);
  const [filtroEmpresa, setFiltroEmpresa] = React.useState("");
  const [filtroContraparte, setFiltroContraparte] = React.useState("");
  const [minOperacoes, setMinOperacoes] = React.useState("0");
  const [minValor, setMinValor] = React.useState("0");
  const [avancado, setAvancado] = React.useState(false);
  const [campanhaId, setCampanhaId] = React.useState<string | null>(null);
  const [selecionados, setSelecionados] = React.useState<string[]>([]);
  const [busca, setBusca] = React.useState("");
  const [expandido, setExpandido] = React.useState<string | null>(null);
  const [notaAberta, setNotaAberta] = React.useState<string | null>(null);
  const [notaTexto, setNotaTexto] = React.useState("");
  const resultadosRef = React.useRef<HTMLElement | null>(null);

  /**
   * Contexto da tela (aba, filtros e resultado aberto) fica guardado no navegador,
   * para não se perder ao trocar de aba ou sair e voltar para a tela.
   */
  const [restaurado, setRestaurado] = React.useState(false);
  React.useEffect(() => {
    try {
      const cru = window.localStorage.getItem(CTX_KEY);
      if (cru) {
        const s = JSON.parse(cru) as Record<string, unknown>;
        const txt = (k: string, set: (v: string) => void) => {
          if (typeof s[k] === "string") set(s[k] as string);
        };
        if (s["aba"] === "buscar" || s["aba"] === "historico") setAba(s["aba"]);
        if (s["modo"] === "empresas" || s["modo"] === "pares" || s["modo"] === "rota")
          setModo(s["modo"]);
        if (s["papel"] === "importador" || s["papel"] === "fornecedor" || s["papel"] === "ambos")
          setPapel(s["papel"]);
        txt("baseKey", setBaseKey);
        txt("baseBusca", setBaseBusca);
        txt("ncm", setNcm);
        txt("paisDestino", setPaisDestino);
        txt("paisOrigem", setPaisOrigem);
        txt("origemBusca", setOrigemBusca);
        txt("startDate", setStartDate);
        txt("endDate", setEndDate);
        txt("filtroEmpresa", setFiltroEmpresa);
        txt("filtroContraparte", setFiltroContraparte);
        txt("minOperacoes", setMinOperacoes);
        txt("minValor", setMinValor);
        txt("busca", setBusca);
        if (typeof s["avancado"] === "boolean") setAvancado(s["avancado"]);
        if (typeof s["campanhaId"] === "string") setCampanhaId(s["campanhaId"]);
      }
    } catch {
      /* contexto inválido — segue com os padrões */
    }
    setRestaurado(true);
  }, []);

  React.useEffect(() => {
    if (!restaurado) return;
    try {
      window.localStorage.setItem(
        CTX_KEY,
        JSON.stringify({
          aba,
          modo,
          papel,
          baseKey,
          baseBusca,
          ncm,
          paisDestino,
          paisOrigem,
          origemBusca,
          startDate,
          endDate,
          filtroEmpresa,
          filtroContraparte,
          minOperacoes,
          minValor,
          avancado,
          busca,
          campanhaId,
        }),
      );
    } catch {
      /* armazenamento indisponível — sem persistência */
    }
  }, [
    restaurado,
    aba,
    modo,
    papel,
    baseKey,
    baseBusca,
    ncm,
    paisDestino,
    paisOrigem,
    origemBusca,
    startDate,
    endDate,
    filtroEmpresa,
    filtroContraparte,
    minOperacoes,
    minValor,
    avancado,
    busca,
    campanhaId,
  ]);

  /** Países com base de importação disponíveis no plano (destino da rota), por continente. */
  const paisesDestino = React.useMemo(() => {
    const mapa = new Map<string, string>();
    for (const b of bases.data ?? []) {
      if (/import/i.test(b.keyOperation) && b.active !== false && b.pais) {
        mapa.set(b.pais, b.keyCountry || b.pais);
      }
    }
    return agruparPorContinente(
      [...mapa.entries()].map(([nome, iso]) => ({ valor: nome, rotulo: nome, pais: iso })),
    );
  }, [bases.data]);

  /** Base de importação do país de destino, descoberta pela API. */
  const rotaBase = useQuery({
    queryKey: ["mineracao-base-import", paisDestino],
    queryFn: () => descobrirBase({ data: { pais: paisDestino } }),
    enabled: modo === "rota" && Boolean(paisDestino),
    retry: false,
  });

  const origens = useQuery({
    queryKey: [
      "mineracao-origens",
      rotaBase.data?.keyCountry,
      rotaBase.data?.keyOperation,
      rotaBase.data?.keyVersion,
      origemBusca,
    ],
    queryFn: () =>
      fetchOrigens({
        data: {
          keyCountry: rotaBase.data!.keyCountry,
          keyOperation: rotaBase.data!.keyOperation,
          keyVersion: rotaBase.data!.keyVersion,
          filtro: origemBusca.trim() || undefined,
        },
      }),
    enabled: modo === "rota" && Boolean(rotaBase.data),
    retry: false,
  });

  const baseManual = (bases.data ?? []).find(
    (b) => `${b.keyCountry}|${b.keyOperation}|${b.keyVersion}` === baseKey,
  );

  /** Base efetiva da consulta (manual nos modos simples, descoberta no modo rota). */
  const baseSel =
    modo === "rota"
      ? rotaBase.data
        ? {
            keyCountry: rotaBase.data.keyCountry,
            keyOperation: rotaBase.data.keyOperation,
            keyVersion: rotaBase.data.keyVersion,
            title: rotaBase.data.title,
            queryLimit: rotaBase.data.queryLimit,
          }
        : undefined
      : baseManual;

  /**
   * Bases filtradas pelo texto e agrupadas por país.
   * O filtro aceita país, sigla, nome e tipo da base (importação/exportação);
   * a base já selecionada permanece sempre na lista para não “se perder”
   * quando o filtro muda.
   */
  const gruposBases = React.useMemo(() => {
    const termo = baseBusca.trim().toLowerCase();
    const termos = termo.split(/\s+/).filter(Boolean);
    const alvo = (b: { pais: string; keyCountry: string; title: string; keyOperation: string }) =>
      `${b.pais} ${b.keyCountry} ${b.title} ${b.keyOperation}`
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const lista = (bases.data ?? []).filter((b) => {
      const chave = `${b.keyCountry}|${b.keyOperation}|${b.keyVersion}`;
      if (chave === baseKey) return true;
      if (!termos.length) return true;
      const texto = alvo(b);
      return termos.every((t) => texto.includes(norm(t)));
    });
    const mapa = new Map<string, typeof lista>();
    for (const b of lista) {
      const rotulo = `${continenteDe(b.keyCountry)} › ${b.pais || "Outros"}`;
      const atual = mapa.get(rotulo) ?? [];
      atual.push(b);
      mapa.set(rotulo, atual);
    }
    return [...mapa.entries()].sort((a, b) => {
      const [ca = "", pa = ""] = a[0].split(" › ");
      const [cb = "", pb = ""] = b[0].split(" › ");
      return ordemContinente(ca) - ordemContinente(cb) || pa.localeCompare(pb, "pt-BR");
    });
  }, [bases.data, baseBusca, baseKey]);

  const totalFiltradas = gruposBases.reduce((s, [, l]) => s + l.length, 0);

  const { rubros, invalidos } = React.useMemo(() => parseNcm(ncm), [ncm]);

  const removerRubro = (r: string) => setNcm(rubros.filter((x) => x !== r).join(", "));

  const presetAtivo = presets.find((p) => p.inicio === startDate && p.fim === endDate)?.label;

  const meses = mesesEntre(startDate, endDate);
  const periodoInvalido =
    meses < 0
      ? "A data final precisa ser posterior à inicial."
      : meses > 12
        ? "O período não pode passar de 12 meses."
        : null;

  const nomeOrigem = (origens.data ?? []).find((o) => o.key === paisOrigem)?.value;

  const impedimento =
    modo === "rota" && !paisDestino
      ? "Escolha o país de destino (quem comprou)."
      : modo === "rota" && rotaBase.isLoading
        ? "Localizando a base de importação…"
        : modo === "rota" && rotaBase.isError
          ? (rotaBase.error as Error).message
          : modo === "rota" && !paisOrigem
            ? "Escolha o país de origem (quem vendeu)."
            : !baseSel
              ? "Selecione a base de dados."
              : rubros.length === 0
                ? "Informe ao menos um NCM."
                : periodoInvalido;

  const resultados = useQuery({
    queryKey: ["mineracao-resultados", campanhaId, busca],
    queryFn: () =>
      fetchResultados({ data: { campanha_id: campanhaId!, busca: busca || undefined } }),
    enabled: Boolean(campanhaId),
  });

  const linhas = resultados.data ?? [];
  const selecionaveis = linhas
    .filter((r) => !r["convertido_oportunidade_id"])
    .map((r) => r["id"] as string);
  const todosSelecionados =
    selecionaveis.length > 0 && selecionaveis.every((id) => selecionados.includes(id));

  const totalValorPagina = linhas.reduce((s, r) => s + Number(r["valor_total"] ?? 0), 0);
  const totalOpsPagina = linhas.reduce((s, r) => s + Number(r["operacoes"] ?? 0), 0);

  const buscarMut = useMutation({
    mutationFn: () =>
      buscar({
        data: {
          keyCountry: baseSel!.keyCountry,
          keyOperation: baseSel!.keyOperation,
          keyVersion: baseSel!.keyVersion,
          baseTitulo: baseSel!.title,
          queryLimit: baseSel!.queryLimit || undefined,
          rubros,
          startDate,
          endDate,
          modo,
          paisOrigem: modo === "rota" ? paisOrigem : undefined,
          paisOrigemNome: modo === "rota" ? (nomeOrigem ?? undefined) : undefined,
          paisDestinoNome: modo === "rota" ? paisDestino : undefined,
          filtroEmpresa: filtroEmpresa.trim() || undefined,
          filtroContraparte: filtroContraparte.trim() || undefined,
          minOperacoes: Number(minOperacoes) || 0,
          minValor: Number(minValor) || 0,
        },
      }),
    onSuccess: (r) => {
      toast.success(
        `${r.total_empresas} ${modo === "empresas" ? "empresas" : "relações"} em ${r.total_operacoes} operações.`,
      );
      setAviso(
        r.truncado
          ? `A base devolveu o máximo de ${(r.limite_base ?? 0).toLocaleString("pt-BR")} operações — o resultado pode estar incompleto. Reduza o período ou a quantidade de NCMs.`
          : null,
      );
      setCampanhaId(r.campanha_id);
      setSelecionados([]);
      void qc.invalidateQueries({ queryKey: ["mineracao-campanhas"] });
      void qc.invalidateQueries({ queryKey: ["mineracao-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  /** Aviso de busca já feita com os mesmos filtros (evita gastar cota). */
  const [repetida, setRepetida] = React.useState<{
    campanha_id: string;
    created_at: string;
    total_empresas: number;
  } | null>(null);
  const [checando, setChecando] = React.useState(false);

  const iniciarBusca = async () => {
    setRepetida(null);
    setChecando(true);
    try {
      const prev = await checarBuscaAnterior({
        data: {
          keyCountry: baseSel!.keyCountry,
          keyOperation: baseSel!.keyOperation,
          keyVersion: baseSel!.keyVersion,
          rubros,
          startDate,
          endDate,
          modo,
          paisOrigem: modo === "rota" ? paisOrigem : undefined,
        },
      });
      if (prev) {
        setRepetida(prev);
        return;
      }
    } catch {
      // se a checagem falhar, segue para a busca normal
    } finally {
      setChecando(false);
    }
    buscarMut.mutate();
  };

  const notaMut = useMutation({
    mutationFn: (v: { resultado_id: string; anotacao: string }) => salvarNota({ data: v }),
    onSuccess: () => {
      toast.success("Anotação salva.");
      setNotaAberta(null);
      void qc.invalidateQueries({ queryKey: ["mineracao-resultados"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const converterMut = useMutation({
    mutationFn: () => converter({ data: { resultado_ids: selecionados, papel } }),

    onSuccess: (r) => {
      toast.success(
        `${r.criadas.length} suspect(s) criado(s) no pipeline${r.ignorados ? ` · ${r.ignorados} já convertido(s)` : ""}.`,
      );
      setSelecionados([]);
      void qc.invalidateQueries({ queryKey: ["mineracao-resultados"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const podeBuscar = !impedimento && !buscarMut.isPending;

  /* ------------------------------------------------- exportação para Excel */
  const [exportandoId, setExportandoId] = React.useState<string | null>(null);

  const metaDaCampanha = (c: Record<string, any>) => ({
    nome: c["nome"] as string,
    base: (c["base_titulo"] as string) || `${c["key_country"]} ${c["key_operation"]}`,
    modo: rotuloModo(c["modo"]),
    pais_destino: (c["pais_destino"] as string) ?? null,
    pais_origem: (c["pais_origem"] as string) ?? null,
    rubros: (c["rubros"] ?? []) as string[],
    periodo: `${c["start_date"]} → ${c["end_date"]}`,
    responsavel: (c["responsavel"] as string) ?? "—",
    data_busca: new Date(c["created_at"]).toLocaleString("pt-BR"),
  });

  const exportarCampanha = async (c: Record<string, any>) => {
    setExportandoId(c["id"]);
    try {
      const dados = await fetchResultados({ data: { campanha_id: c["id"] } });
      await exportarResultadosXlsx(dados as any[], metaDaCampanha(c), `mineracao-${c["nome"]}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível exportar.");
    } finally {
      setExportandoId(null);
    }
  };

  const campanhaAtual = (campanhas.data ?? []).find((c) => c["id"] === campanhaId);

  const exportarAtual = async () => {
    if (!campanhaAtual) return;
    setExportandoId(campanhaId);
    try {
      await exportarResultadosXlsx(
        linhas as any[],
        metaDaCampanha(campanhaAtual),
        `mineracao-${campanhaAtual["nome"]}`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível exportar.");
    } finally {
      setExportandoId(null);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Comercial" }, { label: "Mineração" }]}
        title="Mineração de leads"
        subtitle="Consulte transações de comércio exterior por NCM, empresa e contraparte — e envie as melhores relações como suspects do pipeline."
      />
      <ProcessoComercialGuia destaque="suspect" />

      {/* Status + medidores (dados reais do GET /restrictions, atualizados sob demanda) */}
      <div className="mb-5 space-y-3">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] px-4 py-3">
          <Radio
            className="h-4 w-4"
            style={{ color: online ? "var(--success)" : "var(--text-muted)" }}
          />
          <span className="text-[13px] font-semibold text-[var(--text-primary)]">
            {status.isLoading
              ? "Carregando consumo salvo…"
              : online
                ? "Consumo do contrato"
                : "Consumo ainda não consultado"}
          </span>
          {restricoesMut.data?.erro && (
            <span className="text-[12px] text-[var(--danger)]">{restricoesMut.data.erro}</span>
          )}
          {restricoes && (
            <span className="text-[12px] text-[var(--text-muted)]">
              {restricoes.conta} · contrato {restricoes.estado} de {restricoes.vigencia.inicio} até{" "}
              {restricoes.vigencia.fim}
            </span>
          )}
          <span className="text-[12px] text-[var(--text-muted)]">
            {atualizadoEm
              ? `Atualizado em ${new Date(atualizadoEm).toLocaleString("pt-BR")}`
              : "Clique em Atualizar para consultar os limites na Penta."}
          </span>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => restricoesMut.mutate()}
            disabled={restricoesMut.isPending}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${restricoesMut.isPending ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {restricoes && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Meter
                label="Bases (países)"
                used={restricoes.bases.usadas}
                limit={restricoes.bases.limite}
              />
              <Meter
                label="Rubros (NCM)"
                used={restricoes.rubros.usadas}
                limit={restricoes.rubros.limite}
              />
              <Meter
                label="Empresas"
                used={restricoes.empresas.usadas}
                limit={restricoes.empresas.limite}
              />
              <div className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-3">
                <div className="text-[12px] text-[var(--text-muted)]">Contrato</div>
                <div className="text-[13px] font-semibold text-[var(--text-primary)]">
                  {restricoes.estado}
                </div>
                <div className="mt-1 text-[11.5px] text-[var(--text-muted)]">
                  {restricoes.vigencia.inicio} → {restricoes.vigencia.fim}
                </div>
              </div>
            </div>

            <details className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] px-4 py-3">
              <summary className="cursor-pointer text-[13px] font-semibold text-[var(--text-primary)]">
                Ver o que já foi consultado
              </summary>
              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                <ListaConsultada titulo="Países / bases já usados" itens={restricoes.bases.lista} />
                <ListaConsultada titulo="NCMs já consultados" itens={restricoes.rubros.lista} />
                <ListaConsultada
                  titulo="Empresas já indexadas"
                  itens={restricoes.empresas.lista.map((e) =>
                    e.pais ? `${e.nome} (${e.pais})` : e.nome,
                  )}
                />
              </div>
            </details>
          </>
        )}
      </div>

      {/* Abas principais */}
      <div className="mb-4 inline-flex rounded-md border border-[var(--bg-border)] bg-[var(--bg-surface)] p-0.5">
        <Button
          size="sm"
          variant={aba === "buscar" ? "secondary" : "ghost"}
          className="h-8 px-3"
          onClick={() => setAba("buscar")}
        >
          <Search className="mr-1.5 h-3.5 w-3.5" /> Buscar transações
        </Button>
        <Button
          size="sm"
          variant={aba === "historico" ? "secondary" : "ghost"}
          className="h-8 px-3"
          onClick={() => setAba("historico")}
        >
          <History className="mr-1.5 h-3.5 w-3.5" /> Histórico
          {(campanhas.data ?? []).length > 0 && (
            <span className="ml-1.5 rounded-full bg-[var(--bg-base)] px-1.5 text-[11px] text-[var(--text-muted)]">
              {(campanhas.data ?? []).length}
            </span>
          )}
        </Button>
      </div>

      {/* Consulta */}
      {aba === "buscar" && (
        <section className="mb-5 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4">
          {/* Modo de consulta — cada card diz o que a consulta devolve na prática */}
          <div className="mb-4">
            <span className="text-[12px] text-[var(--text-muted)]">Tipo de consulta</span>
            <div className="mt-2 grid gap-2 md:grid-cols-3">
              {MODOS.map((m) => {
                const Icone = m.icone;
                const ativo = modo === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setModo(m.id)}
                    className={`group relative rounded-md border p-3 text-left transition ${
                      ativo
                        ? "border-[var(--info)] bg-[var(--bg-base)]"
                        : "border-[var(--bg-border)] hover:border-[var(--info)]"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-primary)]">
                      <Icone className="h-4 w-4 text-[var(--text-muted)]" />
                      {m.titulo}
                      {m.id === "rota" && (
                        <span className="rounded-full border border-[var(--bg-border)] px-1.5 text-[10.5px] font-normal text-[var(--text-muted)]">
                          recomendado
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11.5px] leading-snug text-[var(--text-muted)]">
                      {m.descricao}
                    </p>
                    <div className="mt-2 rounded border border-dashed border-[var(--bg-border)] bg-[var(--bg-base)] px-2 py-1 text-[11px] text-[var(--text-muted)]">
                      <span className="text-[10.5px] uppercase tracking-wide">Exemplo</span>
                      <div className="truncate text-[var(--text-primary)]">{m.exemplo}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {modo === "rota" && (
            <div className="mb-4 grid gap-4 rounded-md border border-[var(--bg-border)] bg-[var(--bg-base)] p-3 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-[12.5px]">País de destino (quem comprou)</Label>
                <select
                  value={paisDestino}
                  onChange={(e) => {
                    setPaisDestino(e.target.value);
                    setPaisOrigem("");
                  }}
                  className="h-9 w-full rounded-md border border-[var(--bg-border)] bg-[var(--bg-surface)] px-2 text-[13px] text-[var(--text-primary)]"
                >
                  <option value="">
                    {bases.isLoading ? "Carregando países…" : "Selecione o destino"}
                  </option>
                  {paisesDestino.map((g) => (
                    <optgroup key={g.continente} label={g.continente}>
                      {g.itens.map((p) => (
                        <option key={p.valor} value={p.valor}>
                          {p.rotulo}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {rotaBase.data && (
                  <p className="text-[11.5px] text-[var(--text-muted)]">
                    Base: {rotaBase.data.title} · limite{" "}
                    {(rotaBase.data.queryLimit || 0).toLocaleString("pt-BR")} operações
                  </p>
                )}
                {rotaBase.isError && (
                  <p className="text-[11.5px] text-[var(--danger)]">
                    {(rotaBase.error as Error).message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12.5px]">Filtrar país de origem</Label>
                <Input
                  value={origemBusca}
                  onChange={(e) => setOrigemBusca(e.target.value)}
                  placeholder="Ex.: Argentina"
                  className="h-9"
                  disabled={!rotaBase.data}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12.5px]">País de origem (quem vendeu)</Label>
                <select
                  value={paisOrigem}
                  onChange={(e) => setPaisOrigem(e.target.value)}
                  disabled={!rotaBase.data || origens.isLoading}
                  className="h-9 w-full rounded-md border border-[var(--bg-border)] bg-[var(--bg-surface)] px-2 text-[13px] text-[var(--text-primary)]"
                >
                  <option value="">
                    {!rotaBase.data
                      ? "Escolha o destino primeiro"
                      : origens.isLoading
                        ? "Carregando países…"
                        : origens.isError
                          ? "Não foi possível carregar"
                          : "Selecione a origem"}
                  </option>
                  {agruparPorContinente(
                    (origens.data ?? []).map((o) => ({
                      valor: o.key,
                      rotulo: o.value,
                      pais: o.value,
                    })),
                  ).map((g) => (
                    <optgroup key={g.continente} label={g.continente}>
                      {g.itens.map((o) => (
                        <option key={o.valor} value={o.valor}>
                          {o.rotulo}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Sincronização das bases (manual — consome cota da Penta, restrita à administração) */}
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-md border border-[var(--bg-border)] bg-[var(--bg-base)] px-3 py-2">
            <span className="text-[12px] text-[var(--text-muted)]">
              {syncProgresso
                ? syncProgresso
                : sync.data?.ultima_sincronizacao
                  ? `Bases sincronizadas: ${sync.data.total} · última sincronização em ${new Date(sync.data.ultima_sincronizacao).toLocaleString("pt-BR")}`
                  : podeSincronizar
                    ? "As bases ainda não foram sincronizadas — clique em “Sincronizar bases” para carregar a lista de países e bases."
                    : "As bases ainda não foram sincronizadas — peça a atualização à administração."}
            </span>
            <div className="flex-1" />
            {podeSincronizar ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => sincronizarMut.mutate()}
                disabled={sincronizarMut.isPending}
              >
                {sincronizarMut.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                Sincronizar bases
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => solicitarSyncMut.mutate()}
                disabled={solicitarSyncMut.isPending || solicitarSyncMut.isSuccess}
              >
                {solicitarSyncMut.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                {solicitarSyncMut.isSuccess ? "Pedido enviado" : "Solicitar sincronização"}
              </Button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className={`space-y-1.5 md:col-span-2 ${modo === "rota" ? "hidden" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <Label className="text-[12.5px]">Base de dados</Label>
                {bases.data && (
                  <span className="text-[11px] text-[var(--text-muted)]">
                    {baseBusca.trim()
                      ? `${totalFiltradas} de ${bases.data.length} base(s)`
                      : `${bases.data.length} base(s) disponíveis`}
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  value={baseBusca}
                  onChange={(e) => setBaseBusca(e.target.value)}
                  placeholder="Filtrar por país, sigla ou tipo… (ex.: Brasil import, AR export)"
                  className="h-9 pr-16"
                />
                {baseBusca && (
                  <button
                    type="button"
                    onClick={() => setBaseBusca("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[11.5px] text-[var(--text-muted)] underline hover:no-underline"
                  >
                    limpar
                  </button>
                )}
              </div>
              <select
                value={baseKey}
                onChange={(e) => setBaseKey(e.target.value)}
                disabled={bases.isLoading}
                className="h-9 w-full rounded-md border border-[var(--bg-border)] bg-[var(--bg-base)] px-2 text-[13px] text-[var(--text-primary)]"
              >
                <option value="">
                  {bases.isLoading
                    ? "Carregando bases…"
                    : bases.isError
                      ? "Não foi possível carregar as bases"
                      : gruposBases.length === 0
                        ? "Nenhuma base encontrada para esse filtro"
                        : "Selecione uma base"}
                </option>
                {gruposBases.map(([pais, lista]) => (
                  <optgroup key={pais} label={pais}>
                    {lista.map((b) => (
                      <option
                        key={`${b.keyCountry}|${b.keyOperation}|${b.keyVersion}`}
                        value={`${b.keyCountry}|${b.keyOperation}|${b.keyVersion}`}
                        disabled={b.underMaintenance || !b.active}
                      >
                        {b.title}
                        {b.underMaintenance ? " (em manutenção)" : ""}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {baseManual && (
                <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-[var(--text-muted)]">
                  <span className="rounded-full border border-[var(--bg-border)] px-2 py-0.5 text-[var(--text-secondary)]">
                    {baseManual.pais} · {baseManual.title}
                  </span>
                  {baseManual.queryLimit > 0 && (
                    <span>
                      limite da base: {baseManual.queryLimit.toLocaleString("pt-BR")} operações
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setBaseKey("")}
                    className="underline hover:no-underline"
                  >
                    trocar
                  </button>
                </div>
              )}

              {bases.isError && (
                <div className="flex items-center gap-2 text-[11.5px] text-[var(--danger)]">
                  <span>
                    {online
                      ? "As bases não puderam ser carregadas agora."
                      : "Serviço de consulta indisponível — verifique as credenciais em Configurações › Mineração."}
                  </span>
                  <button
                    type="button"
                    onClick={() => void bases.refetch()}
                    className="underline hover:no-underline"
                  >
                    tentar de novo
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12.5px]">Início</Label>
              <Input
                type="date"
                className="h-9 w-full"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12.5px]">Fim</Label>
              <Input
                type="date"
                className="h-9 w-full"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            {/* Presets de período / anos */}
            <div className="md:col-span-4">
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setStartDate(p.inicio);
                      setEndDate(p.fim);
                    }}
                    className={`rounded-full border px-3 py-1 text-[12px] transition-colors ${
                      presetAtivo === p.label
                        ? "border-[var(--info)] bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                        : "border-[var(--bg-border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {periodoInvalido && (
                <p className="mt-1.5 text-[11.5px] text-[var(--danger)]">{periodoInvalido}</p>
              )}
            </div>

            <div className="space-y-1.5 md:col-span-4">
              <Label className="text-[12.5px]">NCM</Label>
              <Input
                value={ncm}
                onChange={(e) => setNcm(e.target.value)}
                placeholder="Cole como quiser: 8422, 8438.10, 1006.30.21 — usamos os 4 primeiros dígitos"
              />
              {rubros.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {rubros.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => removerRubro(r)}
                      title="Remover este NCM"
                      className="rounded-full border border-[var(--bg-border)] bg-[var(--bg-base)] px-2.5 py-0.5 text-[11.5px] text-[var(--text-primary)] hover:border-[var(--danger)] hover:text-[var(--danger)]"
                    >
                      {r} ×
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setNcm("")}
                    className="px-1 text-[11.5px] text-[var(--text-muted)] underline hover:no-underline"
                  >
                    limpar
                  </button>
                </div>
              )}
              <p className="text-[11.5px] text-[var(--text-muted)]">
                {rubros.length} rubro(s) de 4 dígitos · período máximo de 12 meses ·{" "}
                {baseSel
                  ? `limite da base: ${baseSel.queryLimit.toLocaleString("pt-BR")} operações`
                  : "selecione a base"}
              </p>
              {invalidos.length > 0 && (
                <p className="text-[11.5px] text-[var(--warning)]">
                  Ignorado(s) por ter menos de 4 dígitos: {invalidos.join(", ")}
                </p>
              )}
            </div>
          </div>

          {/* Filtros avançados: consulta entre duas empresas */}
          <div className="mt-4 border-t border-[var(--bg-border)] pt-3">
            <button
              type="button"
              onClick={() => setAvancado((v) => !v)}
              className="flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filtros de empresa e contraparte
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${avancado ? "rotate-180" : ""}`}
              />
            </button>
            {avancado && (
              <div className="mt-3 grid gap-4 md:grid-cols-4">
                <div className="space-y-1.5">
                  <Label className="text-[12.5px]">Empresa local contém</Label>
                  <Input
                    value={filtroEmpresa}
                    onChange={(e) => setFiltroEmpresa(e.target.value)}
                    placeholder="Ex.: NESTLE"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12.5px]">Contraparte no exterior contém</Label>
                  <Input
                    value={filtroContraparte}
                    onChange={(e) => setFiltroContraparte(e.target.value)}
                    placeholder="Ex.: BOSCH"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12.5px]">Mín. de operações</Label>
                  <Input
                    type="number"
                    min={0}
                    value={minOperacoes}
                    onChange={(e) => setMinOperacoes(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12.5px]">Valor mínimo (USD)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={minValor}
                    onChange={(e) => setMinValor(e.target.value)}
                  />
                </div>
                <p className="md:col-span-4 text-[11.5px] text-[var(--text-muted)]">
                  Preencha os dois campos de nome para isolar as transações entre duas empresas
                  específicas.
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button onClick={() => void iniciarBusca()} disabled={!podeBuscar || checando}>
              {buscarMut.isPending || checando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Buscar transações
            </Button>
            {impedimento && (
              <span className="text-[12px] text-[var(--text-muted)]">{impedimento}</span>
            )}
          </div>

          {repetida && (
            <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md border border-[var(--info)] bg-[var(--bg-base)] p-2.5 text-[12px] text-[var(--text-primary)]">
              <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: "var(--info)" }} />
              <span>
                Última busca com estes mesmos filtros feita em{" "}
                {new Date(repetida.created_at).toLocaleString("pt-BR")} · {repetida.total_empresas}{" "}
                resultado(s) salvos.
              </span>
              <div className="flex-1" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setCampanhaId(repetida.campanha_id);
                  setSelecionados([]);
                  setRepetida(null);
                }}
              >
                Ver resultado salvo
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setRepetida(null);
                  buscarMut.mutate();
                }}
              >
                Buscar de novo na API
              </Button>
            </div>
          )}

          {aviso && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-[var(--warning)] bg-[var(--bg-base)] p-2.5 text-[12px] text-[var(--text-primary)]">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0"
                style={{ color: "var(--warning)" }}
              />
              <span>{aviso}</span>
            </div>
          )}
        </section>
      )}

      {/* Histórico de buscas (fica salvo no sistema, com o responsável) */}
      {aba === "historico" && (
        <section className="mb-5 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4">
          <h3 className="mb-3 text-[13px] font-semibold text-[var(--text-primary)]">
            Histórico de buscas
          </h3>
          {campanhas.isLoading && (
            <p className="text-[12.5px] text-[var(--text-muted)]">Carregando…</p>
          )}
          {!campanhas.isLoading && (campanhas.data ?? []).length === 0 && (
            <p className="text-[12.5px] text-[var(--text-muted)]">
              Nenhuma busca salva ainda. As consultas feitas na aba “Buscar transações” aparecem
              aqui.
            </p>
          )}
          <div className="space-y-1.5">
            {(campanhas.data ?? []).map((c) => {
              const selecionada = campanhaId === c["id"];
              return (
                <div
                  key={c["id"]}
                  className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-3 py-2 text-[12px] ${
                    selecionada
                      ? "border-[var(--info)] text-[var(--text-primary)]"
                      : "border-[var(--bg-border)] text-[var(--text-muted)]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setCampanhaId(c["id"]);
                      setSelecionados([]);
                      // fica na aba Histórico — o resultado abre logo abaixo da lista
                      requestAnimationFrame(() =>
                        resultadosRef.current?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        }),
                      );
                    }}
                    className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-left"
                  >
                    <span className="font-medium text-[var(--text-primary)]">{c["nome"]}</span>
                    <span>
                      {c["start_date"]} → {c["end_date"]}
                    </span>
                    <span>NCM {(c["rubros"] ?? []).join(", ") || "—"}</span>
                    <span>
                      {rotuloModo(c["modo"])}
                      {c["pais_destino"] ? ` · destino ${c["pais_destino"]}` : ""}
                      {c["pais_origem"] ? ` · origem ${c["pais_origem"]}` : ""}
                    </span>
                    <span>
                      {c["total_empresas"]} {c["modo"] === "empresas" ? "empresas" : "relações"} ·{" "}
                      {Number(c["total_operacoes"] ?? 0).toLocaleString("pt-BR")} operações
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <User2 className="h-3.5 w-3.5" />
                      {c["responsavel"] ?? "—"}
                    </span>
                    <span>{new Date(c["created_at"]).toLocaleString("pt-BR")}</span>
                  </button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7"
                    disabled={exportandoId === c["id"]}
                    onClick={() => void exportarCampanha(c)}
                  >
                    {exportandoId === c["id"] ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    Excel
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Resultados */}
      {campanhaId && (
        <section
          ref={resultadosRef}
          className="scroll-mt-4 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)]"
        >
          <div className="grid gap-2 border-b border-[var(--bg-border)] p-3 sm:grid-cols-3">
            <Kpi label="Linhas" valor={String(linhas.length)} />
            <Kpi label="Operações" valor={totalOpsPagina.toLocaleString("pt-BR")} />
            <Kpi label="Valor negociado" valor={usd(totalValorPagina)} />
          </div>
          {campanhaAtual && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--bg-border)] px-3 py-2 text-[12px] text-[var(--text-muted)]">
              <span className="font-medium text-[var(--text-primary)]">
                {campanhaAtual["nome"]}
              </span>
              <span>{rotuloModo(campanhaAtual["modo"])}</span>
              <span>
                {campanhaAtual["start_date"]} → {campanhaAtual["end_date"]}
              </span>
              <span className="inline-flex items-center gap-1">
                <User2 className="h-3.5 w-3.5" />
                Buscado por {campanhaAtual["responsavel"] ?? "—"} em{" "}
                {new Date(campanhaAtual["created_at"]).toLocaleString("pt-BR")}
              </span>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 border-b border-[var(--bg-border)] p-3">
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Filtrar empresa ou contraparte…"
              className="h-9 max-w-xs"
            />
            <Button
              size="sm"
              variant="outline"
              disabled={!linhas.length || exportandoId === campanhaId}
              onClick={() => void exportarAtual()}
            >
              {exportandoId === campanhaId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Exportar para Excel
            </Button>
            <div className="flex-1" />

            <div className="flex items-center gap-1.5">
              <span className="text-[12px] text-[var(--text-muted)]">Abordar:</span>
              <select
                value={papel}
                onChange={(e) => setPapel(e.target.value as typeof papel)}
                className="h-8 rounded-md border border-[var(--bg-border)] bg-[var(--bg-base)] px-2 text-[12.5px] text-[var(--text-primary)]"
              >
                <option value="importador">Importador (empresa)</option>
                <option value="fornecedor">Fornecedor (contraparte)</option>
                <option value="ambos">As duas pontas</option>
              </select>
            </div>
            <span className="text-[12px] text-[var(--text-muted)]">
              {selecionados.length} selecionado(s)
            </span>

            <Button
              size="sm"
              disabled={!selecionados.length || converterMut.isPending}
              onClick={() => converterMut.mutate()}
            >
              {converterMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Enviar como suspect
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="text-left text-[12px] text-[var(--text-muted)]">
                <tr className="border-b border-[var(--bg-border)]">
                  <th className="w-10 p-2">
                    <Checkbox
                      checked={todosSelecionados}
                      aria-label="Selecionar todos"
                      onCheckedChange={(v) => setSelecionados(v ? selecionaveis : [])}
                    />
                  </th>
                  <th className="p-2">Empresa</th>
                  <th className="p-2">Contraparte</th>
                  <th className="p-2">NCMs</th>
                  <th className="p-2 text-right">Operações</th>
                  <th className="p-2 text-right">Valor</th>
                  <th className="p-2 text-right">Ticket médio</th>
                  <th className="p-2">Última operação</th>
                  <th className="p-2">Anotação</th>
                  <th className="p-2">Pipeline</th>
                </tr>
              </thead>
              <tbody>
                {resultados.isLoading && (
                  <tr>
                    <td colSpan={10} className="p-6 text-center text-[var(--text-muted)]">
                      Carregando resultados…
                    </td>
                  </tr>
                )}

                {linhas.map((r) => {
                  const id = r["id"] as string;
                  const convertido = Boolean(r["convertido_oportunidade_id"]);
                  const ops = Number(r["operacoes"] ?? 0);
                  const valor = Number(r["valor_total"] ?? 0);
                  const parceiros = (r["parceiros"] ?? []) as Array<{
                    nome: string;
                    operacoes: number;
                    valor: number;
                  }>;
                  const aberto = expandido === id;
                  return (
                    <React.Fragment key={id}>
                      <tr className="border-b border-[var(--bg-border)] last:border-0">
                        <td className="p-2">
                          <Checkbox
                            checked={selecionados.includes(id)}
                            disabled={convertido}
                            onCheckedChange={(v) =>
                              setSelecionados((s) => (v ? [...s, id] : s.filter((x) => x !== id)))
                            }
                          />
                        </td>
                        <td className="p-2 font-medium text-[var(--text-primary)]">
                          {r["empresa"]}
                        </td>
                        <td className="p-2 text-[var(--text-muted)]">
                          {r["contraparte"] ? (
                            String(r["contraparte"])
                          ) : parceiros.length ? (
                            <button
                              type="button"
                              onClick={() => setExpandido(aberto ? null : id)}
                              className="inline-flex items-center gap-1 hover:text-[var(--text-primary)]"
                            >
                              {parceiros.length} parceiro(s)
                              <ChevronDown
                                className={`h-3.5 w-3.5 transition-transform ${aberto ? "rotate-180" : ""}`}
                              />
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-2 text-[var(--text-muted)]">
                          {(r["rubros"] ?? []).join(", ")}
                        </td>
                        <td className="p-2 text-right">{ops}</td>
                        <td className="p-2 text-right">{usd(valor)}</td>
                        <td className="p-2 text-right text-[var(--text-muted)]">
                          {usd(ops > 0 ? valor / ops : 0)}
                        </td>
                        <td className="p-2 text-[var(--text-muted)]">
                          {r["ultima_operacao"] ?? "—"}
                        </td>
                        <td className="p-2 text-[var(--text-muted)]">
                          <button
                            type="button"
                            onClick={() => {
                              setNotaAberta(notaAberta === id ? null : id);
                              setNotaTexto(String(r["anotacao"] ?? ""));
                            }}
                            className="max-w-[180px] truncate text-left underline-offset-2 hover:underline"
                          >
                            {r["anotacao"] ? String(r["anotacao"]) : "anotar"}
                          </button>
                        </td>
                        <td className="p-2 text-[var(--text-muted)]">
                          {convertido ? "Convertido" : "—"}
                        </td>
                      </tr>
                      {notaAberta === id && (
                        <tr className="border-b border-[var(--bg-border)] bg-[var(--bg-base)]">
                          <td />
                          <td colSpan={9} className="p-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <Input
                                value={notaTexto}
                                onChange={(e) => setNotaTexto(e.target.value)}
                                placeholder="Contato encontrado, próximo passo, observações…"
                                className="h-8 max-w-xl"
                              />
                              <Button
                                size="sm"
                                disabled={notaMut.isPending}
                                onClick={() =>
                                  notaMut.mutate({ resultado_id: id, anotacao: notaTexto })
                                }
                              >
                                Salvar
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setNotaAberta(null)}>
                                Cancelar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                      {aberto && parceiros.length > 0 && (
                        <tr className="border-b border-[var(--bg-border)] bg-[var(--bg-base)]">
                          <td />
                          <td colSpan={9} className="p-2">
                            <ul className="space-y-1 text-[12.5px] text-[var(--text-muted)]">
                              {parceiros.map((p) => (
                                <li key={p.nome} className="flex justify-between gap-4">
                                  <span className="text-[var(--text-primary)]">{p.nome}</span>
                                  <span>
                                    {p.operacoes} op. · {usd(p.valor)}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {!resultados.isLoading && linhas.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-6 text-center text-[var(--text-muted)]">
                      Nenhuma empresa nesta busca.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </PageContainer>
  );
}
