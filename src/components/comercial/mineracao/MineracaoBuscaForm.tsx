import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, ChevronDown, Loader2, RefreshCw, Search, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { continenteDe, ordemContinente } from "@/lib/mineracao/continentes";
import {
  buscaAnterior,
  buscarOperacoes,
  descobrirBaseImportacao,
  listarBases,
  listarPaises,
  listarPaisesOrigem,
  sincronizarBases,
  solicitarSincronizacaoBases,
  statusSincronizacaoBases,
} from "@/lib/mineracao.functions";
import { cn } from "@/lib/utils";
import {
  CTX_KEY,
  MODOS,
  SELECT_CLS,
  agruparPorContinente,
  mesesEntre,
  parseNcm,
  presetsPeriodo,
  type Modo,
} from "./mineracao-utils";

/**
 * Busca padrão em um card: tipo de consulta (seletor pequeno) · base/países ·
 * período · NCM · Buscar. Modo rota, filtros de empresa e sincronização das
 * bases ficam em "Mais opções".
 */
export function MineracaoBuscaForm({
  onCampanha,
  onAviso,
}: {
  onCampanha: (id: string) => void;
  onAviso: (msg: string | null) => void;
}) {
  const qc = useQueryClient();
  const fetchBases = useServerFn(listarBases);
  const buscar = useServerFn(buscarOperacoes);
  const descobrirBase = useServerFn(descobrirBaseImportacao);
  const fetchOrigens = useServerFn(listarPaisesOrigem);
  const fetchPaises = useServerFn(listarPaises);
  const sincronizar = useServerFn(sincronizarBases);
  const solicitarSync = useServerFn(solicitarSincronizacaoBases);
  const fetchSyncStatus = useServerFn(statusSincronizacaoBases);
  const checarBuscaAnterior = useServerFn(buscaAnterior);
  const { role } = useAuth();
  const podeSincronizar = role === "admin" || role === "manager";

  const presets = React.useMemo(presetsPeriodo, []);
  const [modo, setModo] = React.useState<Modo>("rota");
  const [baseKey, setBaseKey] = React.useState("");
  const [baseBusca, setBaseBusca] = React.useState("");
  const [ncm, setNcm] = React.useState("");
  const [paisDestino, setPaisDestino] = React.useState("");
  const [paisOrigem, setPaisOrigem] = React.useState("");
  const [origemBusca, setOrigemBusca] = React.useState("");
  const [startDate, setStartDate] = React.useState(presets[2]!.inicio);
  const [endDate, setEndDate] = React.useState(presets[2]!.fim);
  const [filtroEmpresa, setFiltroEmpresa] = React.useState("");
  const [filtroContraparte, setFiltroContraparte] = React.useState("");
  const [minOperacoes, setMinOperacoes] = React.useState("0");
  const [minValor, setMinValor] = React.useState("0");
  const [maisOpcoes, setMaisOpcoes] = React.useState(false);
  const [syncProgresso, setSyncProgresso] = React.useState<string | null>(null);

  // Persistência leve dos filtros.
  const [restaurado, setRestaurado] = React.useState(false);
  React.useEffect(() => {
    try {
      const cru = window.localStorage.getItem(CTX_KEY);
      if (cru) {
        const s = JSON.parse(cru) as Record<string, unknown>;
        const txt = (k: string, set: (v: string) => void) => {
          if (typeof s[k] === "string") set(s[k] as string);
        };
        if (s["modo"] === "empresas" || s["modo"] === "pares" || s["modo"] === "rota")
          setModo(s["modo"]);
        txt("baseKey", setBaseKey);
        txt("ncm", setNcm);
        txt("paisDestino", setPaisDestino);
        txt("paisOrigem", setPaisOrigem);
        txt("startDate", setStartDate);
        txt("endDate", setEndDate);
        txt("filtroEmpresa", setFiltroEmpresa);
        txt("filtroContraparte", setFiltroContraparte);
        txt("minOperacoes", setMinOperacoes);
        txt("minValor", setMinValor);
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
          modo,
          baseKey,
          ncm,
          paisDestino,
          paisOrigem,
          startDate,
          endDate,
          filtroEmpresa,
          filtroContraparte,
          minOperacoes,
          minValor,
        }),
      );
    } catch {
      /* sem persistência */
    }
  }, [
    restaurado,
    modo,
    baseKey,
    ncm,
    paisDestino,
    paisOrigem,
    startDate,
    endDate,
    filtroEmpresa,
    filtroContraparte,
    minOperacoes,
    minValor,
  ]);

  const bases = useQuery({
    queryKey: ["mineracao-bases"],
    queryFn: () => fetchBases({ data: {} }),
    retry: false,
  });
  const sync = useQuery({ queryKey: ["mineracao-bases-sync"], queryFn: () => fetchSyncStatus() });

  const solicitarSyncMut = useMutation({
    mutationFn: () => solicitarSync({ data: {} }),
    onSuccess: () => toast.success("Pedido enviado à administração."),
    onError: (e: Error) => toast.error(e.message || "Não foi possível enviar o pedido."),
  });
  const sincronizarMut = useMutation({
    mutationFn: async () => {
      const paises = await fetchPaises();
      let total = 0;
      const erros: string[] = [];
      const lote = 4;
      for (let i = 0; i < paises.length; i += lote) {
        const chunk = paises.slice(i, i + lote);
        setSyncProgresso(`Sincronizando ${Math.min(i + lote, paises.length)} de ${paises.length}…`);
        const r = await sincronizar({ data: { paises: chunk } });
        total += r.bases;
        erros.push(...r.erros);
        void qc.invalidateQueries({ queryKey: ["mineracao-bases"] });
      }
      return { paises: paises.length, bases: total, erros };
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

  const paisesDestino = React.useMemo(() => {
    const mapa = new Map<string, string>();
    for (const b of bases.data ?? []) {
      if (/import/i.test(b.keyOperation) && b.active !== false && b.pais) {
        mapa.set(b.pais, b.keyCountry || b.pais);
      }
    }
    return agruparPorContinente(
      [...mapa.entries()].map(([nome, isoPais]) => ({ valor: nome, rotulo: nome, pais: isoPais })),
    );
  }, [bases.data]);

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

  const gruposBases = React.useMemo(() => {
    const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const termos = norm(baseBusca.trim()).split(/\s+/).filter(Boolean);
    const lista = (bases.data ?? []).filter((b) => {
      if (`${b.keyCountry}|${b.keyOperation}|${b.keyVersion}` === baseKey) return true;
      if (!termos.length) return true;
      const texto = norm(`${b.pais} ${b.keyCountry} ${b.title} ${b.keyOperation}`);
      return termos.every((t) => texto.includes(t));
    });
    const mapa = new Map<string, typeof lista>();
    for (const b of lista) {
      const rotulo = `${continenteDe(b.keyCountry)} › ${b.pais || "Outros"}`;
      mapa.set(rotulo, [...(mapa.get(rotulo) ?? []), b]);
    }
    return [...mapa.entries()].sort((a, b) => {
      const [ca = "", pa = ""] = a[0].split(" › ");
      const [cb = "", pb = ""] = b[0].split(" › ");
      return ordemContinente(ca) - ordemContinente(cb) || pa.localeCompare(pb, "pt-BR");
    });
  }, [bases.data, baseBusca, baseKey]);

  const { rubros, invalidos } = React.useMemo(() => parseNcm(ncm), [ncm]);
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
      ? "Escolha o país de destino."
      : modo === "rota" && rotaBase.isLoading
        ? "Localizando a base de importação…"
        : modo === "rota" && rotaBase.isError
          ? (rotaBase.error as Error).message
          : modo === "rota" && !paisOrigem
            ? "Escolha o país de origem."
            : !baseSel
              ? "Selecione a base."
              : rubros.length === 0
                ? "Informe ao menos um NCM."
                : periodoInvalido;

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
      onAviso(
        r.truncado
          ? `A base devolveu o máximo de ${(r.limite_base ?? 0).toLocaleString("pt-BR")} operações — reduza o período ou os NCMs.`
          : null,
      );
      onCampanha(r.campanha_id);
      void qc.invalidateQueries({ queryKey: ["mineracao-campanhas"] });
      void qc.invalidateQueries({ queryKey: ["mineracao-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

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

  const podeBuscar = !impedimento && !buscarMut.isPending && !checando;

  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="grid gap-3 lg:grid-cols-12">
        {/* Tipo de consulta: seletor pequeno, explicação no tooltip */}
        <div className="space-y-1.5 lg:col-span-3">
          <Label className="text-xs text-muted-foreground">Tipo de consulta</Label>
          <div className="inline-flex w-full rounded-md border bg-background p-0.5">
            {MODOS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setModo(m.id)}
                title={`${m.descricao}\nEx.: ${m.exemplo}`}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1 rounded px-2 py-1.5 text-[12px]",
                  modo === m.id ? "bg-muted font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                <m.icone className="h-3.5 w-3.5" />
                <span className="hidden xl:inline">{m.titulo.split(" ")[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {modo === "rota" ? (
          <>
            <div className="space-y-1.5 lg:col-span-3">
              <Label className="text-xs text-muted-foreground">Destino (quem comprou)</Label>
              <select
                value={paisDestino}
                onChange={(e) => {
                  setPaisDestino(e.target.value);
                  setPaisOrigem("");
                }}
                className={SELECT_CLS}
              >
                <option value="">{bases.isLoading ? "Carregando…" : "Selecione"}</option>
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
            </div>
            <div className="space-y-1.5 lg:col-span-3">
              <Label className="text-xs text-muted-foreground">Origem (quem vendeu)</Label>
              <select
                value={paisOrigem}
                onChange={(e) => setPaisOrigem(e.target.value)}
                disabled={!rotaBase.data || origens.isLoading}
                className={SELECT_CLS}
              >
                <option value="">
                  {!rotaBase.data
                    ? "Escolha o destino primeiro"
                    : origens.isLoading
                      ? "Carregando…"
                      : "Selecione"}
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
          </>
        ) : (
          <div className="space-y-1.5 lg:col-span-6">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Base de dados</Label>
              {bases.data && (
                <Input
                  value={baseBusca}
                  onChange={(e) => setBaseBusca(e.target.value)}
                  placeholder="filtrar país…"
                  className="h-6 w-36 text-[11px]"
                />
              )}
            </div>
            <select
              value={baseKey}
              onChange={(e) => setBaseKey(e.target.value)}
              disabled={bases.isLoading}
              className={SELECT_CLS}
            >
              <option value="">
                {bases.isLoading
                  ? "Carregando bases…"
                  : bases.isError
                    ? "Não foi possível carregar"
                    : gruposBases.length === 0
                      ? "Nenhuma base para esse filtro"
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
          </div>
        )}

        <div className="space-y-1.5 lg:col-span-3">
          <Label className="text-xs text-muted-foreground">Período</Label>
          <div className="flex gap-1">
            <Input
              type="date"
              className="h-9"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              type="date"
              className="h-9"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 lg:col-span-12">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                setStartDate(p.inicio);
                setEndDate(p.fim);
              }}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11.5px]",
                presetAtivo === p.label
                  ? "border-[var(--info)] bg-muted text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          ))}
          {periodoInvalido && (
            <span className="text-[11.5px] text-[var(--danger)]">{periodoInvalido}</span>
          )}
        </div>

        <div className="space-y-1.5 lg:col-span-9">
          <Label className="text-xs text-muted-foreground">
            NCM{" "}
            <span
              className="font-normal"
              title="8422, 8438.10, 1006.30.21 — usamos os 4 primeiros dígitos"
            >
              (4 dígitos)
            </span>
          </Label>
          <Input
            value={ncm}
            onChange={(e) => setNcm(e.target.value)}
            placeholder="8422, 8438.10, 1006.30.21…"
          />
          {(rubros.length > 0 || invalidos.length > 0) && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11.5px]">
              {rubros.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setNcm(rubros.filter((x) => x !== r).join(", "))}
                  title="Remover"
                  className="rounded-full border bg-muted/40 px-2 py-0.5 hover:border-[var(--danger)] hover:text-[var(--danger)]"
                >
                  {r} ×
                </button>
              ))}
              {invalidos.length > 0 && (
                <span className="text-[var(--warning)]">ignorados: {invalidos.join(", ")}</span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-end lg:col-span-3">
          <Button
            className="w-full"
            onClick={() => void iniciarBusca()}
            disabled={!podeBuscar}
            title={impedimento ?? undefined}
          >
            {buscarMut.isPending || checando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Buscar
          </Button>
        </div>
      </div>

      {repetida && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-[var(--info)] bg-muted/30 px-3 py-2 text-[12px]">
          <AlertTriangle className="h-4 w-4 shrink-0" style={{ color: "var(--info)" }} />
          <span>
            Mesma busca feita em {new Date(repetida.created_at).toLocaleString("pt-BR")} ·{" "}
            {repetida.total_empresas} resultado(s) salvos.
          </span>
          <div className="flex-1" />
          <Button
            size="sm"
            variant="outline"
            className="h-7"
            onClick={() => {
              onCampanha(repetida.campanha_id);
              setRepetida(null);
            }}
          >
            Ver resultado salvo
          </Button>
          <Button
            size="sm"
            className="h-7"
            onClick={() => {
              setRepetida(null);
              buscarMut.mutate();
            }}
          >
            Buscar de novo
          </Button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setMaisOpcoes((v) => !v)}
        className="mt-3 flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
        aria-expanded={maisOpcoes}
      >
        <ChevronDown className={cn("h-4 w-4 transition-transform", maisOpcoes && "rotate-180")} />
        Mais opções
      </button>
      {maisOpcoes && (
        <div className="mt-3 space-y-3 border-t pt-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Empresa contém</Label>
              <Input
                value={filtroEmpresa}
                onChange={(e) => setFiltroEmpresa(e.target.value)}
                placeholder="NESTLE"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Contraparte contém</Label>
              <Input
                value={filtroContraparte}
                onChange={(e) => setFiltroContraparte(e.target.value)}
                placeholder="BOSCH"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Mín. operações</Label>
              <Input
                type="number"
                min={0}
                value={minOperacoes}
                onChange={(e) => setMinOperacoes(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Valor mínimo (USD)</Label>
              <Input
                type="number"
                min={0}
                value={minValor}
                onChange={(e) => setMinValor(e.target.value)}
                className="h-9"
              />
            </div>
            {modo === "rota" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Filtrar país de origem</Label>
                <Input
                  value={origemBusca}
                  onChange={(e) => setOrigemBusca(e.target.value)}
                  placeholder="Argentina"
                  className="h-9"
                  disabled={!rotaBase.data}
                />
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted-foreground">
            <span>
              {syncProgresso
                ? syncProgresso
                : sync.data?.ultima_sincronizacao
                  ? `${sync.data.total} bases · sincronizadas em ${new Date(sync.data.ultima_sincronizacao).toLocaleDateString("pt-BR")}`
                  : "Bases ainda não sincronizadas."}
              {baseSel?.queryLimit
                ? ` · limite da base: ${baseSel.queryLimit.toLocaleString("pt-BR")} operações`
                : ""}
            </span>
            <div className="flex-1" />
            {podeSincronizar ? (
              <Button
                variant="outline"
                size="sm"
                className="h-7"
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
                className="h-7"
                onClick={() => solicitarSyncMut.mutate()}
                disabled={solicitarSyncMut.isPending || solicitarSyncMut.isSuccess}
              >
                <Send className="h-3.5 w-3.5" />
                {solicitarSyncMut.isSuccess ? "Pedido enviado" : "Solicitar sincronização"}
              </Button>
            )}
          </div>
          {bases.isError && (
            <p className="text-[11.5px] text-[var(--danger)]">
              As bases não puderam ser carregadas — verifique as credenciais em Configurações ›
              Mineração.{" "}
              <button type="button" className="underline" onClick={() => void bases.refetch()}>
                tentar de novo
              </button>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
