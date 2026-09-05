import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import { Link } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { ARTICLES, FAQS } from "@/content/docs/loader";
import { CATEGORIES, getCategory, type DocTipo, type DocNivel } from "@/content/docs/types";

type Hit =
  | {
      kind: "article";
      category: string;
      slug: string;
      title: string;
      excerpt: string;
      description: string;
      tipo: DocTipo;
      nivel: DocNivel;
      tags: string[];
      atualizadoEm: string;
    }
  | {
      kind: "faq";
      category: string;
      id: string;
      question: string;
      excerpt: string;
      tags: string[];
    };

type SortMode = "relevance" | "updated" | "az";

type DocSearchProps = {
  placeholder?: string;
  mode?: "compact" | "filters";
  maxResults?: number;
};

const ARTICLE_TYPE_OPTIONS: Array<{ value: "all" | DocTipo | "faq"; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "guia", label: "Guias" },
  { value: "conceito", label: "Conceitos" },
  { value: "referencia", label: "Referências" },
  { value: "troubleshooting", label: "Troubleshooting" },
  { value: "faq", label: "FAQ" },
];

const NIVEL_OPTIONS: Array<{ value: "all" | DocNivel; label: string }> = [
  { value: "all", label: "Todos os níveis" },
  { value: "iniciante", label: "Iniciante" },
  { value: "intermediario", label: "Intermediário" },
  { value: "avancado", label: "Avançado" },
];

const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: "relevance", label: "Relevância" },
  { value: "updated", label: "Atualizado recentemente" },
  { value: "az", label: "A → Z" },
];

export function DocSearch({
  placeholder = "Buscar na ajuda…",
  mode = "compact",
  maxResults = 10,
}: DocSearchProps) {
  const [q, setQ] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<"all" | DocTipo | "faq">("all");
  const [nivelFilter, setNivelFilter] = useState<"all" | DocNivel>("all");
  const [sort, setSort] = useState<SortMode>("relevance");

  const items = useMemo<(Hit & { body?: string })[]>(() => {
    const a = ARTICLES.map((x) => ({
      kind: "article" as const,
      category: x.category,
      slug: x.slug,
      title: x.title,
      excerpt: x.excerpt || x.description,
      description: x.description,
      tipo: x.tipo,
      nivel: x.nivel,
      tags: x.tags ?? [],
      atualizadoEm: x.atualizado_em ?? "",
      body: x.body,
    }));
    const f = FAQS.map((x) => ({
      kind: "faq" as const,
      category: x.category,
      id: x.id,
      question: x.question,
      excerpt: x.answer.slice(0, 160),
      tags: x.tags ?? [],
      body: x.answer,
    }));
    return [...a, ...f];
  }, []);

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        const moduleOk = moduleFilter === "all" || item.category === moduleFilter;
        const typeOk =
          typeFilter === "all" ||
          (typeFilter === "faq"
            ? item.kind === "faq"
            : item.kind === "article" && item.tipo === typeFilter);
        const nivelOk =
          nivelFilter === "all" || (item.kind === "article" && item.nivel === nivelFilter);
        return moduleOk && typeOk && nivelOk;
      }),
    [items, moduleFilter, typeFilter, nivelFilter],
  );

  const fuse = useMemo(
    () =>
      new Fuse(filteredItems, {
        includeScore: true,
        threshold: 0.35,
        ignoreLocation: true,
        keys: [
          { name: "title", weight: 3 },
          { name: "question", weight: 3 },
          { name: "description", weight: 2 },
          { name: "tags", weight: 2 },
          { name: "excerpt", weight: 1 },
          { name: "body", weight: 1 },
        ],
      }),
    [filteredItems],
  );

  const sortItems = (list: (Hit & { body?: string })[]) => {
    if (sort === "az") {
      return [...list].sort((a, b) => {
        const ta = a.kind === "article" ? a.title : a.question;
        const tb = b.kind === "article" ? b.title : b.question;
        return ta.localeCompare(tb, "pt-BR");
      });
    }
    if (sort === "updated") {
      return [...list].sort((a, b) => {
        const da = a.kind === "article" ? a.atualizadoEm : "";
        const db = b.kind === "article" ? b.atualizadoEm : "";
        return db.localeCompare(da);
      });
    }
    return list; // relevance = keep incoming order (fuse or natural)
  };

  const rawResults = q.trim()
    ? fuse.search(q).map((r) => r.item)
    : mode === "filters"
      ? filteredItems
      : [];

  const limit = mode === "compact" ? 10 : maxResults;
  const results = sortItems(rawResults).slice(0, limit);

  const hasActiveFilters =
    !!q.trim() ||
    moduleFilter !== "all" ||
    typeFilter !== "all" ||
    nivelFilter !== "all" ||
    sort !== "relevance";

  const resetFilters = () => {
    setQ("");
    setModuleFilter("all");
    setTypeFilter("all");
    setNivelFilter("all");
    setSort("relevance");
  };

  const renderHitContent = (r: Hit) => {
    const cat = getCategory(r.category);
    const title = r.kind === "article" ? r.title : r.question;
    return (
      <>
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium text-[var(--text-primary)]">{title}</span>
          <span className="shrink-0 rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
            {r.kind === "article" ? r.tipo : "FAQ"}
          </span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-[var(--text-muted)]">{r.excerpt}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
          <span className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5">
            {cat?.label ?? r.category}
          </span>
          {r.kind === "article" && (
            <span className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5">{r.nivel}</span>
          )}
        </div>
      </>
    );
  };

  const renderHitLink = (r: Hit, className: string) => {
    if (r.kind === "article") {
      return (
        <Link
          to="/ajuda/documentacao/$categoria/$slug"
          params={{ categoria: r.category, slug: r.slug }}
          onClick={() => mode === "compact" && setQ("")}
          className={className}
        >
          {renderHitContent(r)}
        </Link>
      );
    }

    return (
      <Link
        to="/ajuda/faq"
        hash={r.id}
        onClick={() => mode === "compact" && setQ("")}
        className={className}
      >
        {renderHitContent(r)}
      </Link>
    );
  };

  if (mode === "filters") {
    return (
      <section className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-sm)]">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_190px_auto] lg:items-end">
          <label className="grid gap-1 text-xs font-medium text-[var(--text-muted)]">
            <span className="invisible">Buscar</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={placeholder}
                className="h-10 w-full rounded-md border border-[var(--bg-border)] bg-[var(--bg-base)] pl-9 pr-3 text-sm font-normal text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--info)]"
              />
            </div>
          </label>
          <label className="grid gap-1 text-xs font-medium text-[var(--text-muted)]">
            Módulo
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="h-10 rounded-md border border-[var(--bg-border)] bg-[var(--bg-base)] px-3 text-sm font-normal text-[var(--text-primary)] outline-none focus:border-[var(--info)]"
            >
              <option value="all">Todos os módulos</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-[var(--text-muted)]">
            Categoria
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "all" | DocTipo | "faq")}
              className="h-10 rounded-md border border-[var(--bg-border)] bg-[var(--bg-base)] px-3 text-sm font-normal text-[var(--text-primary)] outline-none focus:border-[var(--info)]"
            >
              {ARTICLE_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
            className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-md border border-[var(--bg-border)] px-3 text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-4 w-4" />
            Limpar
          </button>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-[220px_220px_1fr]">
          <label className="grid gap-1 text-xs font-medium text-[var(--text-muted)]">
            Nível
            <select
              value={nivelFilter}
              onChange={(e) => setNivelFilter(e.target.value as "all" | DocNivel)}
              className="h-10 rounded-md border border-[var(--bg-border)] bg-[var(--bg-base)] px-3 text-sm font-normal text-[var(--text-primary)] outline-none focus:border-[var(--info)]"
            >
              {NIVEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-[var(--text-muted)]">
            Ordenar por
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="h-10 rounded-md border border-[var(--bg-border)] bg-[var(--bg-base)] px-3 text-sm font-normal text-[var(--text-primary)] outline-none focus:border-[var(--info)]"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
            Resultados
          </h2>
          <span className="text-xs text-[var(--text-muted)]">
            {results.length} de {filteredItems.length} conteúdo(s)
          </span>
        </div>

        {results.length > 0 ? (
          <ul className="mt-2 grid gap-2 md:grid-cols-2">
            {results.map((r) => (
              <li key={`${r.kind}-${r.category}-${"slug" in r ? r.slug : r.id}`}>
                {renderHitLink(
                  r,
                  "block h-full rounded-md border border-[var(--bg-border)] bg-[var(--bg-base)] p-3 hover:bg-[var(--bg-elevated)]",
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 rounded-md border border-dashed border-[var(--bg-border)] p-4 text-center text-sm text-[var(--text-muted)]">
            Nenhum artigo encontrado com os filtros selecionados.
          </p>
        )}
      </section>
    );
  }

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="h-10 w-full rounded-md border border-[var(--bg-border)] bg-[var(--bg-surface)] pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--info)]"
        />
      </div>
      {results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-[var(--bg-border)] bg-[var(--bg-surface)] shadow-[var(--shadow)]">
          <ul className="max-h-96 overflow-auto">
            {results.map((r) => {
              return (
                <li key={`${r.kind}-${r.category}-${"slug" in r ? r.slug : r.id}`}>
                  {renderHitLink(
                    r,
                    "block border-b border-[var(--bg-border)] px-3 py-2 last:border-b-0 hover:bg-[var(--bg-elevated)]",
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
