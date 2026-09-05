import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useMemo } from "react";
import { Plus, Star, Building2, Search, X } from "lucide-react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { queryOptions } from "@tanstack/react-query";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { CategoriasPicker } from "@/components/fornecedores/CategoriasPicker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pagination } from "@/components/data/Pagination";
import { TableEmpty } from "@/components/data/TableStates";
import { Flag } from "@/components/ui/flag";
import { cn } from "@/lib/utils";
import {
  listFornecedores,
  listCategoriasFornecedor,
  listFiltrosPopulares,
} from "@/lib/fornecedores.functions";
import {
  FORNECEDOR_RANKINGS,
  FORNECEDOR_STATUS,
  FORNECEDOR_STATUS_LABEL,
  FORNECEDOR_STATUS_COLOR,
  FORNECEDOR_RANKING_COLOR,
  INCOTERMS,
  type FornecedorRanking,
  type FornecedorStatus,
} from "@/lib/fornecedores.shared";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  pais: fallback(z.string(), "todos").default("todos"),
  status: fallback(
    z.enum(["todos", ...FORNECEDOR_STATUS] as [string, ...string[]]),
    "todos",
  ).default("todos"),
  ranking: fallback(
    z.enum(["todos", ...FORNECEDOR_RANKINGS] as [string, ...string[]]),
    "todos",
  ).default("todos"),
  categoria: fallback(z.string(), "todos").default("todos"),
  categorias: fallback(z.array(z.string()), []).default([]),
  incoterm: fallback(z.string(), "todos").default("todos"),
  moeda: fallback(z.string(), "todos").default("todos"),
  funcionarios_faixa: fallback(z.string(), "todos").default("todos"),
  lead_time_max: fallback(z.number().int().min(0).max(1000).nullable(), null).default(null),
  tags: fallback(z.array(z.string()), []).default([]),
  palavras_chave: fallback(z.array(z.string()), []).default([]),
  certificacoes: fallback(z.array(z.string()), []).default([]),
  page: fallback(z.number().int().min(1), 1).default(1),
  pageSize: fallback(z.union([z.literal(25), z.literal(50), z.literal(100)]), 25).default(25),
});

type SearchParams = z.infer<typeof searchSchema>;

const emptyFiltrosPopulares = {
  tags: [],
  palavras_chave: [],
  certificacoes: [],
  status: [],
  ranking: [],
  pais: [],
  incoterm: [],
  moeda: [],
  funcionarios_faixa: [],
  lead_time_buckets: [],
  total: 0,
} satisfies {
  tags: ReadonlyArray<{ value: string; count: number }>;
  palavras_chave: ReadonlyArray<{ value: string; count: number }>;
  certificacoes: ReadonlyArray<{ value: string; count: number }>;
  status: ReadonlyArray<{ value: string; count: number }>;
  ranking: ReadonlyArray<{ value: string; count: number }>;
  pais: ReadonlyArray<{ value: string; count: number }>;
  incoterm: ReadonlyArray<{ value: string; count: number }>;
  moeda: ReadonlyArray<{ value: string; count: number }>;
  funcionarios_faixa: ReadonlyArray<{ value: string; count: number }>;
  lead_time_buckets: ReadonlyArray<{ value: string; max: number; count: number }>;
  total: number;
};

function listQueryOptions(p: SearchParams) {
  return queryOptions({
    queryKey: ["fornecedores", "list", p],
    queryFn: () =>
      listFornecedores({
        data: {
          q: p.q,
          pais: p.pais,
          status: p.status as "todos" | FornecedorStatus,
          ranking: p.ranking as "todos" | FornecedorRanking,
          categoria: p.categoria,
          categorias: p.categorias,
          incoterm: p.incoterm,
          moeda: p.moeda,
          funcionarios_faixa: p.funcionarios_faixa,
          lead_time_max: p.lead_time_max,
          tags: p.tags,
          palavras_chave: p.palavras_chave,
          certificacoes: p.certificacoes,
          page: p.page,
          pageSize: p.pageSize,
        },
      }),
    placeholderData: keepPreviousData,
  });
}

const categoriasQueryOptions = queryOptions({
  queryKey: ["fornecedores", "categorias"],
  queryFn: () => listCategoriasFornecedor(),
  staleTime: 1000 * 60 * 10,
});

const filtrosPopularesQueryOptions = queryOptions({
  queryKey: ["fornecedores", "filtros-populares"],
  queryFn: () => listFiltrosPopulares(),
  staleTime: 1000 * 60 * 5,
});

export const Route = createFileRoute("/_authenticated/fornecedores/")({
  validateSearch: zodValidator(searchSchema),
  staleTime: 1000 * 60 * 5,
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(categoriasQueryOptions);
    context.queryClient.ensureQueryData(filtrosPopularesQueryOptions);
  },
  component: FornecedoresListPage,
});

function FornecedoresListPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const categorias = useQuery(categoriasQueryOptions);
  const categoriasData = categorias.data ?? [];
  const filtrosPopularesQ = useQuery(filtrosPopularesQueryOptions);
  const filtrosPopulares = filtrosPopularesQ.data ?? emptyFiltrosPopulares;
  const list = useQuery(listQueryOptions(search));
  const listData = list.data ?? { rows: [], total: 0 };
  const isUpdatingList = list.isFetching && Boolean(list.data);

  const paisesUnicos = useMemo(() => {
    const set = new Set<string>();
    for (const r of listData.rows) set.add(r.pais);
    return Array.from(set).sort();
  }, [listData.rows]);

  const countFor = (arr: ReadonlyArray<{ value: string; count: number }>, v: string) =>
    arr.find((x) => x.value === v)?.count ?? 0;

  const activeFilters: Array<{ key: string; label: string; clear: () => void }> = [];
  const setSearch = (patch: Partial<SearchParams>) =>
    navigate({ search: (s: SearchParams) => ({ ...s, ...patch, page: 1 }) });
  if (search.status !== "todos")
    activeFilters.push({
      key: "status",
      label: `Status: ${search.status}`,
      clear: () => setSearch({ status: "todos" }),
    });
  if (search.ranking !== "todos")
    activeFilters.push({
      key: "ranking",
      label: `Rank ${search.ranking}`,
      clear: () => setSearch({ ranking: "todos" }),
    });
  const selectedCats: string[] =
    search.categorias.length > 0
      ? search.categorias
      : search.categoria !== "todos"
        ? [search.categoria]
        : [];
  const catLabel = (slug: string) => categoriasData.find((c) => c.slug === slug)?.nome_pt ?? slug;
  for (const c of selectedCats)
    activeFilters.push({
      key: `cat-${c}`,
      label: `Categoria: ${catLabel(c)}`,
      clear: () =>
        setSearch({
          categorias: selectedCats.filter((x) => x !== c),
          categoria: "todos",
        }),
    });
  if (search.incoterm !== "todos")
    activeFilters.push({
      key: "incoterm",
      label: `Incoterm: ${search.incoterm}`,
      clear: () => setSearch({ incoterm: "todos" }),
    });
  if (search.moeda !== "todos")
    activeFilters.push({
      key: "moeda",
      label: `Moeda: ${search.moeda}`,
      clear: () => setSearch({ moeda: "todos" }),
    });
  if (search.funcionarios_faixa !== "todos")
    activeFilters.push({
      key: "funcionarios_faixa",
      label: `Funcionários: ${search.funcionarios_faixa}`,
      clear: () => setSearch({ funcionarios_faixa: "todos" }),
    });
  if (search.lead_time_max != null)
    activeFilters.push({
      key: "lead",
      label: `Lead ≤ ${search.lead_time_max}d`,
      clear: () => setSearch({ lead_time_max: null }),
    });
  if (search.pais !== "todos")
    activeFilters.push({
      key: "pais",
      label: `País: ${search.pais}`,
      clear: () => setSearch({ pais: "todos" }),
    });
  for (const t of search.tags)
    activeFilters.push({
      key: `tag-${t}`,
      label: `tag: ${t}`,
      clear: () => setSearch({ tags: (search.tags as string[]).filter((x: string) => x !== t) }),
    });
  for (const t of search.palavras_chave)
    activeFilters.push({
      key: `kw-${t}`,
      label: `kw: ${t}`,
      clear: () =>
        setSearch({
          palavras_chave: (search.palavras_chave as string[]).filter((x: string) => x !== t),
        }),
    });
  for (const t of search.certificacoes)
    activeFilters.push({
      key: `cert-${t}`,
      label: `cert: ${t}`,
      clear: () =>
        setSearch({
          certificacoes: (search.certificacoes as string[]).filter((x: string) => x !== t),
        }),
    });

  const clearAllFilters = () =>
    navigate({
      search: () => ({
        q: "",
        pais: "todos",
        status: "todos",
        ranking: "todos",
        categoria: "todos",
        categorias: [],
        incoterm: "todos",
        moeda: "todos",
        funcionarios_faixa: "todos",
        lead_time_max: null,
        tags: [],
        palavras_chave: [],
        certificacoes: [],
        page: 1,
        pageSize: search.pageSize,
      }),
    });

  const toggleChip = (key: "tags" | "palavras_chave" | "certificacoes", v: string) => {
    navigate({
      search: (s: SearchParams) => {
        const curr = (s[key] ?? []) as string[];
        const next = curr.includes(v) ? curr.filter((x) => x !== v) : [...curr, v];
        return { ...s, [key]: next, page: 1 };
      },
    });
  };

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: "Compras" }, { label: "Fornecedores" }]}
        title="Fornecedores"
        subtitle="Cadastro de fornecedores (China, EUA, Europa, Brasil) e contatos."
        actions={
          <Button asChild>
            <Link to="/fornecedores/novo">
              <Plus className="h-4 w-4" /> Novo fornecedor
            </Link>
          </Button>
        }
      />

      <div
        role="search"
        aria-label="Filtros de fornecedores"
        className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center"
      >
        <div className="relative min-w-0 sm:col-span-2 lg:min-w-[260px] lg:flex-1">
          <Search
            aria-hidden="true"
            className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <Input
            value={search.q}
            onChange={(e) =>
              navigate({
                search: (s: SearchParams) => ({ ...s, q: e.target.value, page: 1 }),
              })
            }
            placeholder="Buscar por nome, código, cidade…"
            aria-label="Buscar fornecedores por nome, código ou cidade"
            className="pl-8"
          />
        </div>

        <Select
          value={search.status}
          onValueChange={(v) =>
            navigate({ search: (s: SearchParams) => ({ ...s, status: v, page: 1 }) })
          }
        >
          <SelectTrigger className="w-full lg:w-[170px]" aria-label="Filtrar por status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos status</SelectItem>
            {FORNECEDOR_STATUS.map((s) => (
              <SelectItem key={s} value={s}>
                {FORNECEDOR_STATUS_LABEL[s]}{" "}
                <span className="text-[10px] opacity-60">
                  ({countFor(filtrosPopulares.status, s)})
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={search.ranking}
          onValueChange={(v) =>
            navigate({ search: (s: SearchParams) => ({ ...s, ranking: v, page: 1 }) })
          }
        >
          <SelectTrigger className="w-full lg:w-[150px]" aria-label="Filtrar por ranking">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos ranks</SelectItem>
            {FORNECEDOR_RANKINGS.map((r) => (
              <SelectItem key={r} value={r}>
                Rank {r}{" "}
                <span className="text-[10px] opacity-60">
                  ({countFor(filtrosPopulares.ranking, r)})
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={search.incoterm}
          onValueChange={(v) =>
            navigate({ search: (s: SearchParams) => ({ ...s, incoterm: v, page: 1 }) })
          }
        >
          <SelectTrigger className="w-full lg:w-[140px]" aria-label="Filtrar por incoterm">
            <SelectValue placeholder="Incoterm" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos incoterms</SelectItem>
            {INCOTERMS.map((i) => (
              <SelectItem key={i} value={i}>
                {i}{" "}
                <span className="text-[10px] opacity-60">
                  ({countFor(filtrosPopulares.incoterm, i)})
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {filtrosPopulares.moeda.length > 0 ? (
          <Select
            value={search.moeda}
            onValueChange={(v) =>
              navigate({ search: (s: SearchParams) => ({ ...s, moeda: v, page: 1 }) })
            }
          >
            <SelectTrigger className="w-full lg:w-[130px]" aria-label="Filtrar por moeda">
              <SelectValue placeholder="Moeda" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas moedas</SelectItem>
              {filtrosPopulares.moeda.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.value} <span className="text-[10px] opacity-60">({m.count})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {filtrosPopulares.funcionarios_faixa.length > 0 ? (
          <Select
            value={search.funcionarios_faixa}
            onValueChange={(v) =>
              navigate({ search: (s: SearchParams) => ({ ...s, funcionarios_faixa: v, page: 1 }) })
            }
          >
            <SelectTrigger
              className="w-full lg:w-[160px]"
              aria-label="Filtrar por faixa de funcionários"
            >
              <SelectValue placeholder="Funcionários" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas faixas</SelectItem>
              {filtrosPopulares.funcionarios_faixa.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.value} <span className="text-[10px] opacity-60">({f.count})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        <Select
          value={search.lead_time_max == null ? "todos" : `≤${search.lead_time_max}`}
          onValueChange={(v) =>
            navigate({
              search: (s: SearchParams) => ({
                ...s,
                lead_time_max: v === "todos" ? null : Number(v.replace("≤", "")),
                page: 1,
              }),
            })
          }
        >
          <SelectTrigger className="w-full lg:w-[160px]" aria-label="Filtrar por lead time">
            <SelectValue placeholder="Lead time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Qualquer lead time</SelectItem>
            {filtrosPopulares.lead_time_buckets.map((b) => (
              <SelectItem key={b.value} value={b.value}>
                Lead time {b.value} d <span className="text-[10px] opacity-60">({b.count})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {paisesUnicos.length > 1 ? (
          <Select
            value={search.pais}
            onValueChange={(v) =>
              navigate({ search: (s: SearchParams) => ({ ...s, pais: v, page: 1 }) })
            }
          >
            <SelectTrigger className="w-full lg:w-[130px]" aria-label="Filtrar por país">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos países</SelectItem>
              {paisesUnicos.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}{" "}
                  <span className="text-[10px] opacity-60">
                    ({countFor(filtrosPopulares.pais, p)})
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      {/* Resultados + filtros ativos */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[12.5px]">
        <span className="text-[var(--text-secondary)]">
          <strong className="text-[var(--text-primary)]">{listData.total}</strong> fornecedor(es)
          {activeFilters.length > 0 ? " (filtrado)" : ""}
        </span>
        {isUpdatingList ? (
          <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">
            Atualizando…
          </span>
        ) : null}
        {activeFilters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={f.clear}
            className="inline-flex items-center gap-1 rounded-full border border-[var(--bg-border)] bg-[var(--bg-surface)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)] hover:border-rose-300 hover:text-rose-700"
          >
            {f.label} <span className="opacity-60">×</span>
          </button>
        ))}
        {activeFilters.length > 0 && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-[11px] font-medium text-[var(--primary)] hover:underline"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Chips de tags / palavras-chave / certificações / categorias */}
      <div className="mb-4 space-y-3">
        {categoriasData.length > 0 && (
          <section
            aria-labelledby="cat-picker-heading"
            className="rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-3"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <span
                id="cat-picker-heading"
                className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]"
              >
                Categorias
                {selectedCats.length > 0 && (
                  <Badge variant="secondary" className="text-[10.5px]">
                    {selectedCats.length} selecionada{selectedCats.length > 1 ? "s" : ""}
                  </Badge>
                )}
              </span>
              {selectedCats.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    navigate({
                      search: (s: SearchParams) => ({
                        ...s,
                        categoria: "todos",
                        categorias: [],
                        page: 1,
                      }),
                    })
                  }
                  className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[var(--primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                >
                  <X aria-hidden="true" className="h-3 w-3" /> Limpar categorias
                </button>
              )}
            </div>
            <div id="cat-picker-panel">
              <CategoriasPicker
                ariaLabel="Filtrar fornecedores por categoria (múltipla seleção)"
                categorias={categoriasData}
                selected={selectedCats}
                onToggle={(slug) =>
                  navigate({
                    search: (s: SearchParams) => {
                      const base: string[] =
                        s.categorias.length > 0
                          ? s.categorias
                          : s.categoria !== "todos"
                            ? [s.categoria]
                            : [];
                      const next = base.includes(slug)
                        ? base.filter((x) => x !== slug)
                        : [...base, slug];
                      return { ...s, categorias: next, categoria: "todos", page: 1 };
                    },
                    replace: true,
                  })
                }
              />
            </div>
          </section>
        )}
        {filtrosPopulares.tags.length > 0 && (
          <ChipRow
            label="Tags"
            items={filtrosPopulares.tags}
            selected={search.tags}
            onToggle={(v) => toggleChip("tags", v)}
          />
        )}
        {filtrosPopulares.palavras_chave.length > 0 && (
          <ChipRow
            label="Palavras-chave"
            items={filtrosPopulares.palavras_chave}
            selected={search.palavras_chave}
            onToggle={(v) => toggleChip("palavras_chave", v)}
          />
        )}
        {filtrosPopulares.certificacoes.length > 0 && (
          <ChipRow
            label="Certificações"
            items={filtrosPopulares.certificacoes}
            selected={search.certificacoes}
            onToggle={(v) => toggleChip("certificacoes", v)}
          />
        )}
      </div>

      {/* Mobile: cards · md+ : tabela */}
      {listData.rows.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-surface)]">
          <TableEmpty
            title="Sem fornecedores"
            description="Comece cadastrando um fornecedor — pode escanear o cartão de visita ou folder."
            action={
              <Button asChild size="sm">
                <Link to="/fornecedores/novo">
                  <Plus className="h-4 w-4" /> Novo fornecedor
                </Link>
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <ul aria-label="Lista de fornecedores" className="space-y-2 md:hidden">
            {listData.rows.map((row) => (
              <li key={row.id}>
                <Link
                  to="/fornecedores/$id"
                  params={{ id: row.id }}
                  className="block rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-3 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 hover:border-[var(--primary)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[11px] text-[var(--text-muted)]">
                        {row.codigo}
                      </div>
                      <div className="truncate font-medium text-[var(--text-primary)]">
                        {row.nome}
                      </div>
                      {row.nome_fantasia ? (
                        <div className="truncate text-[11.5px] text-[var(--text-muted)]">
                          {row.nome_fantasia}
                        </div>
                      ) : null}
                      <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
                        <Flag code={row.pais} className="h-3 w-4" aria-hidden="true" />
                        <span>{row.cidade ?? "—"}</span>
                      </div>
                    </div>
                    <span
                      aria-label={`Ranking ${row.ranking}`}
                      className={cn(
                        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                        FORNECEDOR_RANKING_COLOR[row.ranking as FornecedorRanking],
                      )}
                    >
                      {row.ranking}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                        FORNECEDOR_STATUS_COLOR[row.status as FornecedorStatus],
                      )}
                    >
                      {FORNECEDOR_STATUS_LABEL[row.status as FornecedorStatus]}
                    </span>
                    {(row.tags ?? []).slice(0, 3).map((t) => (
                      <Badge key={t} variant="secondary" className="text-[10.5px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-x-auto rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-surface)] md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">Código</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead className="w-[140px]">País / Cidade</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[90px]">Rank</TableHead>
                  <TableHead className="hidden lg:table-cell">Tags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listData.rows.map((row) => (
                  <TableRow
                    key={row.id}
                    tabIndex={0}
                    role="link"
                    aria-label={`Abrir ficha de ${row.nome}`}
                    className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset"
                    onClick={() => navigate({ to: "/fornecedores/$id", params: { id: row.id } })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate({ to: "/fornecedores/$id", params: { id: row.id } });
                      }
                    }}
                  >
                    <TableCell className="font-mono text-[12px]">{row.codigo}</TableCell>
                    <TableCell>
                      <div className="font-medium text-[var(--text-primary)]">{row.nome}</div>
                      {row.nome_fantasia ? (
                        <div className="text-[11.5px] text-[var(--text-muted)]">
                          {row.nome_fantasia}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-[12.5px]">
                        <Flag code={row.pais} className="h-3.5 w-5" aria-hidden="true" />
                        <span>{row.cidade ?? "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                          FORNECEDOR_STATUS_COLOR[row.status as FornecedorStatus],
                        )}
                      >
                        {FORNECEDOR_STATUS_LABEL[row.status as FornecedorStatus]}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        aria-label={`Ranking ${row.ranking}`}
                        className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
                          FORNECEDOR_RANKING_COLOR[row.ranking as FornecedorRanking],
                        )}
                      >
                        {row.ranking}
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {(row.tags ?? []).slice(0, 4).map((t) => (
                          <Badge key={t} variant="secondary" className="text-[10.5px]">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {listData.total > 0 ? (
        <div className="mt-4">
          <Pagination
            page={search.page}
            pageSize={search.pageSize}
            total={listData.total}
            onPageChange={(p) => navigate({ search: (s: SearchParams) => ({ ...s, page: p }) })}
            onPageSizeChange={(sz) =>
              navigate({
                search: (s: SearchParams) => ({
                  ...s,
                  pageSize: sz as 25 | 50 | 100,
                  page: 1,
                }),
              })
            }
          />
        </div>
      ) : null}
    </PageContainer>
  );
}

function ChipRow({
  label,
  items,
  selected,
  onToggle,
}: {
  label: string;
  items: ReadonlyArray<{ value: string; count: number }>;
  selected: string[];
  onToggle: (v: string) => void;
}) {
  const groupId = `chiprow-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div role="group" aria-labelledby={groupId} className="flex flex-wrap items-center gap-1.5">
      <span
        id={groupId}
        className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]"
      >
        {label}
      </span>
      {items.slice(0, 18).map((it) => {
        const active = selected.includes(it.value);
        return (
          <button
            key={it.value}
            type="button"
            aria-pressed={active}
            aria-label={`${label}: ${it.value} (${it.count})${active ? " — selecionado" : ""}`}
            onClick={() => onToggle(it.value)}
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              active
                ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                : "border-[var(--bg-border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:border-[var(--primary)]",
            )}
          >
            {it.value}
            <span className="ml-1 text-[10px] opacity-70">{it.count}</span>
          </button>
        );
      })}
    </div>
  );
}
