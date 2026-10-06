import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Download, FileText, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { orcamentoStatusMeta } from "@/lib/orcamentos.shared";
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
import { TableError, TableLoading } from "@/components/data/TableStates";

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
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Versão</TableHead>
              <TableHead className="hidden md:table-cell">Emitido em</TableHead>
              <TableHead className="w-[48px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.isLoading ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <TableLoading />
                </TableCell>
              </TableRow>
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
                const sm = orcamentoStatusMeta(d.status);
                const idiomas: string[] = d.idiomas_gerados || [];
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs">
                      <Link to="/documentos/$id" params={{ id: d.id }} className="hover:underline">
                        {d.codigo}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">
                      {d.cliente_codigo ? (
                        <Link
                          to="/clientes/$codigo"
                          params={{ codigo: d.cliente_codigo }}
                          className="hover:underline"
                        >
                          {d.cliente_razao || d.cliente_codigo}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{d.titulo || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={sm.cls}>
                        {sm.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell font-mono text-xs">
                      v{d.versao}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-[var(--text-muted)]">
                      {new Date(d.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      {idiomas.length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              aria-label="Baixar PDF"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {idiomas.map((l) => (
                              <DropdownMenuItem
                                key={l}
                                onSelect={() => handleDownload(d.id, l as "pt" | "es" | "en")}
                              >
                                PDF em {l.toUpperCase()}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </PageContainer>
  );
}

// Avoid unused import warning
void useMutation;
