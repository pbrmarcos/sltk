import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
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
import { Plus, Loader2, FileText, ExternalLink } from "lucide-react";
import { listSATRelatorios, createSATRelatorio } from "@/lib/sat-relatorios.functions";

export const Route = createFileRoute("/_authenticated/pos-vendas/sat/")({
  component: SATListPage,
});

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  preenchendo: "Preenchendo",
  assinado: "Assinado",
  arquivado: "Arquivado",
};

const STATUS_COLOR: Record<string, string> = {
  rascunho:
    "bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)] border-[var(--badge-neutral-border)]",
  preenchendo: "bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300",
  assinado: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-300",
  arquivado:
    "bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)] border-[var(--badge-neutral-border)]",
};

function SATListPage() {
  const nav = useNavigate();
  const listFn = useServerFn(listSATRelatorios);
  const createFn = useServerFn(createSATRelatorio);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("todos");
  const [page, setPage] = useState(1);

  const listQ = useQuery({
    queryKey: ["sat-relatorios", q, status, page],
    queryFn: () =>
      listFn({
        data: {
          q: q || undefined,
          status: status === "todos" ? undefined : status,
          page,
          per_page: 20,
        },
      }),
  });

  const createMut = useMutation({
    mutationFn: () => createFn({ data: {} }),
    onSuccess: (r) => {
      toast.success(`Relatório ${r.codigo} criado.`);
      nav({ to: "/pos-vendas/sat/$id", params: { id: r.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const data = listQ.data;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.per_page)) : 1;

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Pós-venda", href: "/pos-vendas" },
          { label: "Relatórios SAT" },
        ]}
        title="SAT — Serviço de Atendimento Técnico"
        subtitle="Relatórios de atendimento técnico em campo"
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link to="/template-documentos" search={{ aba: "sat" }}>
                Templates de SAT
              </Link>
            </Button>
            <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>
              {createMut.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              <Plus className="mr-1 h-4 w-4" /> Novo SAT
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="min-w-[240px] flex-1">
          <Input
            placeholder="Buscar por código…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="preenchendo">Preenchendo</SelectItem>
            <SelectItem value="assinado">Assinado</SelectItem>
            <SelectItem value="arquivado">Arquivado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)]">
        <table className="w-full text-[13px]">
          <thead className="border-b border-[var(--bg-border)] text-left text-[12px] text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-2.5 font-medium">Código</th>
              <th className="px-4 py-2.5 font-medium">Cliente</th>
              <th className="px-4 py-2.5 font-medium">Processo</th>
              <th className="px-4 py-2.5 font-medium">Período</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">PDF</th>
              <th className="px-4 py-2.5 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {listQ.isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--text-muted)]">
                  <Loader2 className="inline h-4 w-4 animate-spin" />
                </td>
              </tr>
            )}
            {!listQ.isLoading && (data?.items.length ?? 0) === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--text-muted)]">
                  Nenhum relatório encontrado.
                </td>
              </tr>
            )}
            {data?.items.map((r) => (
              <tr
                key={r.id}
                onClick={() => nav({ to: "/pos-vendas/sat/$id", params: { id: r.id } })}
                className="cursor-pointer border-t border-[var(--bg-border)] transition-colors hover:bg-[var(--bg-elevated)]"
              >
                <td className="px-4 py-2.5 font-medium">{r.codigo}</td>
                <td className="px-4 py-2.5">{r.cliente_nome ?? "—"}</td>
                <td className="px-4 py-2.5">{r.processo_codigo ?? "—"}</td>
                <td className="px-4 py-2.5 text-[12px]">
                  {r.periodo_de && r.periodo_ate
                    ? `${r.periodo_de} → ${r.periodo_ate}`
                    : (r.periodo_de ?? "—")}
                </td>
                <td className="px-4 py-2.5">
                  <Badge className={`border ${STATUS_COLOR[r.status] ?? ""}`}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </Badge>
                </td>
                <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                  {r.pdf_drive_view_url ? (
                    <a
                      href={r.pdf_drive_view_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[var(--primary)] hover:underline"
                    >
                      <FileText className="h-3.5 w-3.5" /> PDF
                    </a>
                  ) : (
                    <span className="text-[var(--text-muted)]">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                  <Button asChild size="sm" variant="ghost">
                    <Link to="/pos-vendas/sat/$id" params={{ id: r.id }}>
                      Abrir <ExternalLink className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.total > data.per_page && (
        <div className="flex items-center justify-between mt-3 text-[12px] text-[var(--text-muted)]">
          <div>
            {data.total} resultados — página {page} de {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Anterior
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
