import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Download, FileText, Search, FolderOpen } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CotacaoGeradosTab } from "@/components/central-documentos/CotacaoGeradosTab";
import { EntrevistasGeradasTab } from "@/components/central-documentos/EntrevistasGeradasTab";
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

export const Route = createFileRoute("/_authenticated/documentos/")({
  component: CentralDocumentosPage,
});

const STATUS_META: Record<string, { label: string; cls: string }> = {
  rascunho: {
    label: "Rascunho",
    cls: "bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)] border-[var(--badge-neutral-border)]",
  },
  emitido: {
    label: "Emitido",
    cls: "bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)] border-[var(--badge-neutral-border)]",
  },
  em_revisao: { label: "Em revisão", cls: "bg-amber-50 text-amber-800 border-amber-200" },
  aprovado: { label: "Aprovado", cls: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  publicado: { label: "Publicado", cls: "bg-sky-50 text-sky-800 border-sky-200" },
  arquivado: { label: "Arquivado", cls: "bg-rose-50 text-rose-800 border-rose-200" },
};

const TIPO_META: Record<string, { label: string; cls: string }> = {
  orcamento: { label: "Orçamento", cls: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  fat: { label: "Relatório FAT", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  sat: { label: "Relatório SAT", cls: "bg-amber-50 text-amber-700 border-amber-200" },
};

function CentralDocumentosPage() {
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<string>("all");
  // Todo documento gerado num só lugar; cotações de compra e entrevistas têm
  // listas próprias (antes ficavam escondidas no editor de modelos).
  const [grupo, setGrupo] = useState<"principais" | "cotacoes" | "entrevistas">("principais");
  const [status, setStatus] = useState<string>("all");

  const list = useQuery({
    queryKey: ["documentos", "central", tipo, q],
    queryFn: () =>
      listDocumentos({ data: { tipo: tipo === "all" ? undefined : tipo, q: q || undefined } }),
  });

  const fetchDoc = useServerFn(getDocumento);
  const sign = useServerFn(getSignedUrl);

  const handleDownload = async (id: string, lang: "pt" | "es" | "en") => {
    try {
      const { documento, versoes } = await fetchDoc({ data: { id } });
      const latest = (versoes as any[])[0];
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

  const rows = useMemo(() => {
    const data = (list.data ?? []) as any[];
    if (status === "all") return data;
    return data.filter((d) => d.status === status);
  }, [list.data, status]);

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: "Documentos" }, { label: "Emitidos" }]}
        title="Documentos emitidos"
        actions={
          <Tabs value={grupo} onValueChange={(v) => setGrupo(v as typeof grupo)}>
            <TabsList className="h-8">
              <TabsTrigger value="principais" className="text-xs">
                Orçamentos, FAT e SAT
              </TabsTrigger>
              <TabsTrigger value="cotacoes" className="text-xs">
                Cotações de compra
              </TabsTrigger>
              <TabsTrigger value="entrevistas" className="text-xs">
                Entrevistas
              </TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      {grupo === "cotacoes" && <CotacaoGeradosTab />}
      {grupo === "entrevistas" && <EntrevistasGeradasTab />}
      {grupo === "principais" && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative max-w-sm flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-[var(--text-muted)]" />
              <Input
                placeholder="Buscar por código…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="orcamento">Orçamentos</SelectItem>
                <SelectItem value="fat">Relatórios FAT</SelectItem>
                <SelectItem value="sat">Relatórios SAT</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="emitido">Emitido</SelectItem>
                <SelectItem value="em_revisao">Em revisão</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="publicado">Publicado</SelectItem>
                <SelectItem value="arquivado">Arquivado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Versão</TableHead>
                  <TableHead>Idiomas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Gerado em</TableHead>
                  <TableHead className="text-right">Download</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-[var(--text-muted)]">
                      Carregando…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-12 text-center text-[var(--text-muted)]">
                      <FolderOpen className="mx-auto mb-2 h-8 w-8 opacity-40" />
                      Nenhum documento encontrado para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((d: any) => {
                    const sm = STATUS_META[d.status] ?? { label: d.status, cls: "" };
                    const tm = TIPO_META[d.tipo_codigo] ?? { label: d.tipo_codigo || "—", cls: "" };
                    return (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono text-xs">
                          <Link
                            to="/documentos/$id"
                            params={{ id: d.id }}
                            className="hover:underline"
                          >
                            {d.codigo}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={tm.cls}>
                            {tm.label}
                          </Badge>
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
                        <TableCell className="text-sm max-w-[280px] truncate" title={d.titulo}>
                          {d.titulo || "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">v{d.versao}</TableCell>
                        <TableCell className="text-xs">
                          {(d.idiomas_gerados || []).map((l: string) => (
                            <Badge key={l} variant="outline" className="mr-1 uppercase">
                              {l}
                            </Badge>
                          ))}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={sm.cls}>
                            {sm.label}
                          </Badge>
                        </TableCell>
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
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </PageContainer>
  );
}
