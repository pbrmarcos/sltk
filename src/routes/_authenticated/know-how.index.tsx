import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  BookOpen,
  FileText,
  Film,
  ClipboardList,
  FileType2,
  Plus,
  Search,
  ShieldCheck,
  Star,
  History,
  X,
  Printer,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  listColecoes,
  listItens,
  listFavoritos,
  listHistorico,
  toggleFavorito,
} from "@/lib/know-how.functions";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/know-how/")({
  head: () => ({
    meta: [
      { title: "Know-how & Treinamentos — Solutek Hub" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: KnowHowIndex,
});

const TIPO_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  artigo: FileText,
  video: Film,
  pdf: FileType2,
  checklist: ClipboardList,
};

const PAPEIS: Array<{ value: string; label: string }> = [
  { value: "admin", label: "Administração" },
  { value: "manager", label: "Gestão" },
  { value: "engineer", label: "Engenharia" },
  { value: "production", label: "Produção" },
  { value: "assembly", label: "Montagem" },
  { value: "field", label: "Campo / Serviço" },
  { value: "purchasing", label: "Compras" },
  { value: "sales", label: "Comercial" },
];

type Aba = "todos" | "favoritos" | "historico";

function KnowHowIndex() {
  const { role } = useAuth();
  const canAuthor = role === "admin" || role === "manager" || role === "engineer";
  const canReview = role === "admin" || role === "manager";

  const [q, setQ] = useState("");
  const [colecaoId, setColecaoId] = useState<string>("all");
  const [papel, setPapel] = useState<string>("all");
  const [tags, setTags] = useState<string[]>([]);
  const [aba, setAba] = useState<Aba>("todos");

  const qc = useQueryClient();
  const colecoes = useQuery({ queryKey: ["kh", "colecoes"], queryFn: () => listColecoes() });

  const listFn = useServerFn(listItens);
  const itens = useQuery({
    queryKey: ["kh", "itens", { q, colecaoId, papel, tags }],
    queryFn: () =>
      listFn({
        data: {
          q: q || undefined,
          colecaoId: colecaoId === "all" ? undefined : colecaoId,
          papel: papel === "all" ? undefined : papel,
          tags: tags.length > 0 ? tags : undefined,
        },
      }),
  });

  // lista completa apenas para montar o universo de tags disponíveis
  const todos = useQuery({ queryKey: ["kh", "itens", "all"], queryFn: () => listFn({ data: {} }) });
  const tagsDisponiveis = useMemo(() => {
    const set = new Set<string>();
    for (const it of todos.data ?? []) for (const t of it.tags ?? []) set.add(t);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [todos.data]);

  const favoritos = useQuery({ queryKey: ["kh", "favoritos"], queryFn: () => listFavoritos() });
  const historico = useQuery({ queryKey: ["kh", "historico"], queryFn: () => listHistorico() });

  const toggleFn = useServerFn(toggleFavorito);
  const favMut = useMutation({
    mutationFn: (itemId: string) => toggleFn({ data: { itemId } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kh", "favoritos"] }),
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  const favSet = useMemo(() => new Set(favoritos.data ?? []), [favoritos.data]);
  const histMap = useMemo(
    () => new Map((historico.data ?? []).map((h) => [h.item_id, h.viewed_at])),
    [historico.data],
  );

  const visiveis = useMemo(() => {
    const list = itens.data ?? [];
    if (aba === "favoritos") return list.filter((it) => favSet.has(it.id));
    if (aba === "historico") {
      return list
        .filter((it) => histMap.has(it.id))
        .sort((a, b) => (histMap.get(b.id) ?? "").localeCompare(histMap.get(a.id) ?? ""));
    }
    return list;
  }, [itens.data, aba, favSet, histMap]);

  const groupedByCol = useMemo(() => {
    const map = new Map<string, typeof visiveis>();
    for (const it of visiveis) {
      const arr = map.get(it.colecao_id) ?? [];
      arr.push(it);
      map.set(it.colecao_id, arr);
    }
    return map;
  }, [visiveis]);

  const temFiltro = q !== "" || colecaoId !== "all" || papel !== "all" || tags.length > 0;

  function toggleTag(t: string) {
    setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  function Card({ it }: { it: (typeof visiveis)[number] }) {
    const Icon = TIPO_ICON[it.tipo] ?? FileText;
    const fav = favSet.has(it.id);
    const visto = histMap.get(it.id);
    return (
      <div className="group relative flex flex-col gap-2 rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow)]">
        <div className="absolute right-2 top-2 flex gap-1">
          <Link
            to="/know-how/imprimir/$slug"
            params={{ slug: it.slug }}
            title="Exportar em PDF"
            className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
          >
            <Printer className="h-4 w-4" />
          </Link>
          <button
            type="button"
            title={fav ? "Remover dos favoritos" : "Favoritar"}
            aria-pressed={fav}
            onClick={() => favMut.mutate(it.id)}
            className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
          >
            <Star className={`h-4 w-4 ${fav ? "fill-amber-400 text-amber-500" : ""}`} />
          </button>
        </div>

        <Link to="/know-how/$slug" params={{ slug: it.slug }} className="flex flex-col gap-2">
          <div className="flex items-start gap-3 pr-14">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-[var(--bg-elevated)] text-[var(--info)]">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="line-clamp-2 text-sm font-semibold text-[var(--text-primary)]">
                {it.titulo}
              </div>
              {it.resumo && (
                <p className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">{it.resumo}</p>
              )}
            </div>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <Badge variant="outline" className="text-[10px] uppercase">
              {it.tipo}
            </Badge>
            {it.status !== "publicado" && (
              <Badge
                variant="outline"
                className="border-amber-200 bg-amber-50 text-[10px] text-amber-800"
              >
                {it.status}
              </Badge>
            )}
            {visto && (
              <span className="text-[10px] text-[var(--text-muted)]">
                lido em {new Date(visto).toLocaleDateString("pt-BR")}
              </span>
            )}
            <span className="ml-auto text-[10px] text-[var(--text-muted)]">v{it.versao}</span>
          </div>
          {it.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {it.tags.slice(0, 4).map((t) => (
                <span
                  key={t}
                  className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}
        </Link>
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Know-how" }]}
        title="Know-how & Treinamentos"
        subtitle="Biblioteca interna: procedimentos, vídeos e lições aprendidas."
        actions={
          <div className="flex gap-2">
            {canReview && (
              <Button asChild variant="outline" size="sm">
                <Link to="/know-how/revisar">
                  <ShieldCheck className="mr-1.5 h-4 w-4" />
                  Revisar rascunhos
                </Link>
              </Button>
            )}
            {canAuthor && (
              <Button asChild size="sm">
                <Link to="/know-how/novo" search={{ edit: undefined }}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Novo conteúdo
                </Link>
              </Button>
            )}
          </div>
        }
      />

      <Tabs value={aba} onValueChange={(v) => setAba(v as Aba)} className="mb-4">
        <TabsList>
          <TabsTrigger value="todos">
            <BookOpen className="mr-1.5 h-4 w-4" />
            Todos
          </TabsTrigger>
          <TabsTrigger value="favoritos">
            <Star className="mr-1.5 h-4 w-4" />
            Favoritos ({favSet.size})
          </TabsTrigger>
          <TabsTrigger value="historico">
            <History className="mr-1.5 h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] max-w-md flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
          <Input
            placeholder="Buscar em título, resumo e conteúdo…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={colecaoId} onValueChange={setColecaoId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Coleção" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as coleções</SelectItem>
            {(colecoes.data ?? []).map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={papel} onValueChange={setPapel}>
          <SelectTrigger className="w-[190px]">
            <SelectValue placeholder="Perfil-alvo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os perfis</SelectItem>
            {PAPEIS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {temFiltro && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQ("");
              setColecaoId("all");
              setPapel("all");
              setTags([]);
            }}
          >
            <X className="mr-1.5 h-4 w-4" />
            Limpar
          </Button>
        )}
      </div>

      {tagsDisponiveis.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-1.5">
          {tagsDisponiveis.map((t) => {
            const on = tags.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTag(t)}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] transition ${
                  on
                    ? "border-[var(--info)] bg-[var(--info)] text-white"
                    : "border-[var(--bg-border)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                }`}
              >
                #{t}
              </button>
            );
          })}
        </div>
      )}

      {itens.isLoading ? (
        <p className="text-sm text-[var(--text-muted)]">Carregando…</p>
      ) : visiveis.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--bg-border)] bg-[var(--bg-surface)] p-10 text-center">
          <BookOpen className="mx-auto mb-3 h-10 w-10 text-[var(--text-muted)] opacity-40" />
          <p className="text-sm text-[var(--text-muted)]">
            {aba === "favoritos"
              ? "Você ainda não favoritou nenhum material."
              : aba === "historico"
                ? "Nenhum material lido ainda."
                : "Nenhum conteúdo encontrado com esses filtros."}
          </p>
        </div>
      ) : aba === "historico" ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visiveis.map((it) => (
            <Card key={it.id} it={it} />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {(colecoes.data ?? []).map((col) => {
            const list = groupedByCol.get(col.id) ?? [];
            if (list.length === 0) return null;
            return (
              <section key={col.id}>
                <div className="mb-2 flex items-baseline justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    {col.nome}
                  </h2>
                  <span className="text-xs text-[var(--text-muted)]">{list.length} item(s)</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((it) => (
                    <Card key={it.id} it={it} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
