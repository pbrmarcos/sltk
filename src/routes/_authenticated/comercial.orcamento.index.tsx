import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Download, FileText, Search } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listDocumentos, getDocumento, getSignedUrl } from "@/lib/docs/docs.functions";
import { toast } from "sonner";
import { TableError } from "@/components/data/TableStates";

export const Route = createFileRoute("/_authenticated/comercial/orcamento/")({
  component: OrcamentosListPage,
});

function OrcamentosListPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const list = useQuery({
    queryKey: ["documentos", "orcamento", q],
    queryFn: () => listDocumentos({ data: { tipo: "orcamento", q: q || undefined } }),
  });

  const fetchDoc = useServerFn(getDocumento);
  const sign = useServerFn(getSignedUrl);

  const handleDownload = async (id: string, lang: "pt" | "es" | "en") => {
    try {
      const { documento, versoes } = await fetchDoc({ data: { id } });
      const latest = versoes[0];
      if (!latest) throw new Error("Sem versão gerada.");
      const path = (latest.arquivos as Record<string, string>)?.[lang];
      if (!path) throw new Error(`Idioma ${lang.toUpperCase()} não disponível.`);
      const { url } = await sign({ data: { path } });
      window.open(url, "_blank");
      void documento;
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Comercial" },
          { label: "Orçamentos" },
        ]}
        title="Orçamentos"
        subtitle="Geração de propostas comerciais em PT, ES e EN com versionamento."
        actions={
          <Button onClick={() => navigate({ to: "/comercial/orcamento/novo" })}>
            <Plus className="mr-2 h-4 w-4" /> Novo orçamento
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
          <Input
            placeholder="Buscar por código…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      <div className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>Versão</TableHead>
              <TableHead>Idiomas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Emitido em</TableHead>
              <TableHead className="text-right">Download</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.isLoading ? (
              <TableRow><TableCell colSpan={8} className="py-8 text-center text-[var(--text-muted)]">Carregando…</TableCell></TableRow>
            ) : list.error ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <TableError
                    description={(list.error as Error).message}
                    onRetry={() => list.refetch()}
                  />
                </TableCell>
              </TableRow>
            ) : (list.data ?? []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-[var(--text-muted)]">
                  <FileText className="mx-auto mb-2 h-8 w-8 opacity-40" />
                  Nenhum orçamento ainda. Crie o primeiro.
                </TableCell>
              </TableRow>
            ) : (
              (list.data ?? []).map((d: any) => {
                const STATUS_META: Record<string, { label: string; cls: string }> = {
                  rascunho:    { label: "Rascunho",     cls: "bg-slate-100 text-slate-700 border-slate-200" },
                  emitido:     { label: "Emitido",      cls: "bg-slate-100 text-slate-700 border-slate-200" },
                  em_revisao:  { label: "Em revisão",   cls: "bg-amber-50 text-amber-800 border-amber-200" },
                  aprovado:    { label: "Aprovado",     cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
                  publicado:   { label: "Publicado",    cls: "bg-sky-50 text-sky-800 border-sky-200" },
                  arquivado:   { label: "Arquivado",    cls: "bg-rose-50 text-rose-800 border-rose-200" },
                };
                const sm = STATUS_META[d.status] ?? { label: d.status, cls: "" };
                return (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-xs">
                    <Link to="/documentos/$id" params={{ id: d.id }} className="hover:underline">{d.codigo}</Link>
                  </TableCell>
                  <TableCell className="text-sm">
                    {d.cliente_codigo ? (
                      <Link to="/clientes/$codigo" params={{ codigo: d.cliente_codigo }} className="hover:underline">
                        {d.cliente_razao || d.cliente_codigo}
                      </Link>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-sm">{d.titulo || "—"}</TableCell>
                  <TableCell className="font-mono text-xs">v{d.versao}</TableCell>
                  <TableCell className="text-xs">
                    {(d.idiomas_gerados || []).map((l: string) => (
                      <Badge key={l} variant="outline" className="mr-1 uppercase">{l}</Badge>
                    ))}
                  </TableCell>
                  <TableCell><Badge variant="outline" className={sm.cls}>{sm.label}</Badge></TableCell>
                  <TableCell className="text-xs text-[var(--text-muted)]">
                    {new Date(d.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {(["pt", "es", "en"] as const).map((l) => (
                        <Button
                          key={l}
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs uppercase"
                          onClick={() => handleDownload(d.id, l)}
                        >
                          <Download className="mr-1 h-3 w-3" />
                          {l}
                        </Button>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              );})
            )}
          </TableBody>
        </Table>
      </div>
    </PageContainer>
  );
}

// Avoid unused import warning
void useMutation;
