/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  Send,
  Check,
  X,
  Send as SendIcon,
  Archive,
  Undo2,
  FileText,
  Loader2,
  FolderSymlink,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import {
  getDocumento,
  getSignedUrl,
  submitForReview,
  approveDocument,
  rejectDocument,
  publishDocument,
  archiveDocument,
  reopenDocument,
  syncDocumentoToDrive,
  listAssinaturas,
  verifyAssinatura,
} from "@/lib/docs/docs.functions";

export const Route = createFileRoute("/_authenticated/documentos/$id")({
  component: DocumentoDetailPage,
  errorComponent: ({ error, reset }) => (
    <PageContainer>
      <div className="p-12 text-center text-rose-600 space-y-3">
        <div>Erro ao carregar documento.</div>
        <div className="text-xs text-[var(--text-muted)]">{error?.message}</div>
        <Button variant="outline" size="sm" onClick={() => reset()}>
          Tentar novamente
        </Button>
      </div>
    </PageContainer>
  ),
  notFoundComponent: () => (
    <PageContainer>
      <div className="p-12 text-center text-[var(--text-muted)]">Documento não encontrado.</div>
    </PageContainer>
  ),
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

const ACAO_META: Record<string, { label: string; cls: string }> = {
  submeter: { label: "Submetido para revisão", cls: "text-amber-700" },
  aprovar: { label: "Aprovado", cls: "text-emerald-700" },
  rejeitar: { label: "Rejeitado", cls: "text-rose-700" },
  publicar: { label: "Publicado", cls: "text-sky-700" },
  arquivar: { label: "Arquivado", cls: "text-rose-700" },
  reabrir: { label: "Reaberto", cls: "text-[var(--text-primary)]" },
};

// Breadcrumb dinâmico por tipo de documento.
function tipoBreadcrumb(tipo: string | null | undefined): { label: string; href?: string }[] {
  switch (tipo) {
    case "orcamento":
      return [{ label: "Comercial" }, { label: "Orçamentos", href: "/comercial/orcamento" }];
    case "fat":
      return [{ label: "Qualidade" }, { label: "Relatórios FAT", href: "/qualidade/fat" }];
    case "sat":
      return [{ label: "Pós-Venda" }, { label: "Relatórios SAT", href: "/pos-vendas/sat" }];
    default:
      return [{ label: "Documentos", href: "/documentos" }];
  }
}

function DocumentoDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const docQ = useQuery({
    queryKey: ["documento", id],
    queryFn: () => getDocumento({ data: { id } }),
  });

  const sign = useServerFn(getSignedUrl);

  const refetch = () => {
    qc.invalidateQueries({ queryKey: ["documento", id] });
    qc.invalidateQueries({ queryKey: ["documentos"] });
  };

  const handleDownload = async (path: string) => {
    try {
      const { url } = await sign({ data: { path } });
      window.open(url, "_blank");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (docQ.isLoading) {
    return (
      <PageContainer>
        <div className="p-12 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
        </div>
      </PageContainer>
    );
  }
  if (docQ.isError || !docQ.data || (docQ.data as any).notFound || !(docQ.data as any).documento) {
    return (
      <PageContainer>
        <div className="p-12 text-center text-[var(--text-muted)]">Documento não encontrado.</div>
      </PageContainer>
    );
  }

  const { documento: d, versoes, aprovacoes } = docQ.data as any;

  const statusMeta = STATUS_META[d.status] ?? { label: d.status, cls: "" };
  const latest = versoes[0];
  const isOrcamento = d.tipo_codigo === "orcamento";

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          ...tipoBreadcrumb(d.tipo_codigo),
          { label: d.codigo },
        ]}
        title={d.titulo || d.codigo}
        subtitle={`${d.codigo} · v${d.versao}`}
        actions={
          <Badge variant="outline" className={statusMeta.cls}>
            {statusMeta.label}
          </Badge>
        }
      />

      {/* Ações */}
      <div className="mb-6 flex flex-wrap gap-2">
        {d.status === "rascunho" && (
          <AcaoDialog
            title="Submeter para revisão"
            icon={Send}
            variant="default"
            actionFn={submitForReview}
            documento_id={d.id}
            onDone={refetch}
            placeholder="Comentário opcional para o aprovador"
          />
        )}
        {d.status === "em_revisao" && (
          <>
            <AcaoDialog
              title="Aprovar"
              icon={Check}
              variant="default"
              actionFn={approveDocument}
              documento_id={d.id}
              onDone={refetch}
              placeholder="Comentário de aprovação (opcional)"
            />
            <AcaoDialog
              title="Rejeitar"
              icon={X}
              variant="destructive"
              actionFn={rejectDocument}
              documento_id={d.id}
              onDone={refetch}
              placeholder="Motivo da rejeição"
              requireComment
            />
          </>
        )}
        {d.status === "aprovado" && (
          <AcaoDialog
            title="Publicar"
            icon={SendIcon}
            variant="default"
            actionFn={publishDocument}
            documento_id={d.id}
            onDone={refetch}
            placeholder="Comentário de publicação (opcional)"
          />
        )}
        {d.status !== "arquivado" && (
          <AcaoDialog
            title="Arquivar"
            icon={Archive}
            variant="outline"
            actionFn={archiveDocument}
            documento_id={d.id}
            onDone={refetch}
            placeholder="Motivo do arquivamento"
          />
        )}
        {(d.status === "publicado" || d.status === "arquivado") && (
          <AcaoDialog
            title="Reabrir"
            icon={Undo2}
            variant="outline"
            actionFn={reopenDocument}
            documento_id={d.id}
            onDone={refetch}
            placeholder="Justificativa para reabrir"
            requireComment
          />
        )}
        {isOrcamento && (
          <Button
            variant="default"
            onClick={() =>
              navigate({ to: "/comercial/orcamento/$id/corrigir", params: { id: d.id } })
            }
          >
            Corrigir / Nova versão
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Versões + downloads */}
        <div className="lg:col-span-2 space-y-4">
          <section className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4">
            <h3 className="mb-3 text-sm font-medium">Versão atual · v{d.versao}</h3>
            {latest ? (
              <div className="grid grid-cols-3 gap-2">
                {(["pt", "es", "en"] as const).map((l) => {
                  const path = (latest.arquivos as any)?.[l];
                  return (
                    <Button
                      key={l}
                      variant="outline"
                      size="sm"
                      disabled={!path}
                      onClick={() => path && handleDownload(path)}
                    >
                      <Download className="mr-2 h-4 w-4" /> {l.toUpperCase()}
                    </Button>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-[var(--text-muted)]">Nenhuma versão gerada ainda.</div>
            )}
          </section>

          <section className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)]">
            <div className="border-b border-[var(--bg-border)] px-4 py-3 text-sm font-medium">
              Histórico de versões
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Versão</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Gerada em</TableHead>
                  <TableHead>Idiomas</TableHead>
                  <TableHead className="text-right">Download</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(versoes ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-6 text-center text-sm text-[var(--text-muted)]"
                    >
                      Sem versões.
                    </TableCell>
                  </TableRow>
                ) : (
                  (versoes as any[]).map((v) => {
                    const meta = (v.payload as any)?._revisao_meta as
                      | { kind?: "major" | "minor" | "patch"; motivo?: string | null }
                      | undefined;
                    const kind = meta?.kind;
                    const kindCls =
                      kind === "major"
                        ? "bg-rose-100 text-rose-800 border-rose-200"
                        : kind === "minor"
                          ? "bg-amber-100 text-amber-800 border-amber-200"
                          : kind === "patch"
                            ? "bg-sky-100 text-sky-800 border-sky-200"
                            : "bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)] border-[var(--badge-neutral-border)]";
                    return (
                      <TableRow key={v.id}>
                        <TableCell className="font-mono text-xs">v{v.versao}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] uppercase ${kindCls}`}>
                            {kind ?? (v.versao === "1.0.0" ? "inicial" : "—")}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className="max-w-[260px] truncate text-xs"
                          title={meta?.motivo ?? ""}
                        >
                          {meta?.motivo || <span className="text-[var(--text-muted)]">—</span>}
                        </TableCell>
                        <TableCell className="text-xs text-[var(--text-muted)]">
                          {new Date(v.gerado_em).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-xs">
                          {Object.keys(v.arquivos || {}).map((l) => (
                            <Badge key={l} variant="outline" className="mr-1 uppercase">
                              {l}
                            </Badge>
                          ))}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {Object.entries((v.arquivos || {}) as Record<string, string>).map(
                              ([l, path]) => (
                                <Button
                                  key={l}
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs uppercase"
                                  onClick={() => handleDownload(path)}
                                >
                                  {l}
                                </Button>
                              ),
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </section>
        </div>

        {/* Timeline */}
        <aside className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4">
          <h3 className="mb-3 text-sm font-medium">Histórico de aprovações</h3>
          {aprovacoes.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-[var(--text-muted)]">
              <FileText className="h-6 w-6 opacity-40" />
              Nenhuma ação registrada ainda.
            </div>
          ) : (
            <ol className="space-y-3">
              {(aprovacoes as any[]).map((a) => {
                const meta = ACAO_META[a.acao] ?? { label: a.acao, cls: "" };
                return (
                  <li key={a.id} className="border-l-2 border-[var(--bg-border)] pl-3">
                    <div className={`text-xs font-medium ${meta.cls}`}>{meta.label}</div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {a.actor_nome || "—"} · {new Date(a.created_at).toLocaleString("pt-BR")}
                      {a.versao ? ` · v${a.versao}` : ""}
                    </div>
                    {a.comentario && <div className="mt-1 text-xs">{a.comentario}</div>}
                  </li>
                );
              })}
            </ol>
          )}
        </aside>

        {/* Drive + Assinaturas */}
        <div className="lg:col-span-3">
          <DrivePanel doc={d} refetch={refetch} />
          <AssinaturasPanel documentoId={d.id} />
        </div>
      </div>
    </PageContainer>
  );
}

function DrivePanel({ doc, refetch }: { doc: any; refetch: () => void }) {
  const syncFn = useServerFn(syncDocumentoToDrive);
  const [busy, setBusy] = useState(false);
  const handleSync = async () => {
    setBusy(true);
    try {
      const r = await syncFn({ data: { documento_id: doc.id } });
      toast.success("Sincronizado com o Drive.");
      void r;
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="mt-6 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <FolderSymlink className="h-4 w-4" /> Google Drive
        </h3>
        <Button size="sm" variant="outline" disabled={busy} onClick={handleSync}>
          <RefreshCw className={`mr-2 h-4 w-4 ${busy ? "animate-spin" : ""}`} />
          {doc.drive_synced_at ? "Re-sincronizar" : "Enviar para Drive"}
        </Button>
      </div>
      {doc.drive_url ? (
        <div className="space-y-1 text-xs">
          <div className="text-[var(--text-muted)]">
            Sincronizado em{" "}
            {doc.drive_synced_at ? new Date(doc.drive_synced_at).toLocaleString("pt-BR") : "—"}
          </div>
          <a
            href={doc.drive_url}
            target="_blank"
            rel="noreferrer"
            className="text-sky-600 hover:underline break-all"
          >
            {doc.drive_url}
          </a>
        </div>
      ) : (
        <div className="text-xs text-[var(--text-muted)]">
          Ainda não enviado. Publicar o documento aciona o envio automático.
        </div>
      )}
      {doc.drive_sync_error && (
        <div className="mt-2 rounded border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
          Erro na última sincronização: {doc.drive_sync_error}
        </div>
      )}
    </section>
  );
}

function AssinaturasPanel({ documentoId }: { documentoId: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["assinaturas", documentoId],
    queryFn: () => listAssinaturas({ data: { documento_id: documentoId } }),
  });
  const verifyFn = useServerFn(verifyAssinatura);
  const [verifying, setVerifying] = useState<string | null>(null);

  const handleVerify = async (id: string) => {
    setVerifying(id);
    try {
      const r = (await verifyFn({ data: { assinatura_id: id } })) as any;
      toast[r.ok ? "success" : "error"](
        r.ok
          ? "Integridade OK — SHA-256 e HMAC válidos."
          : "Falha: documento foi alterado ou chave inválida.",
      );
      void qc;
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setVerifying(null);
    }
  };

  const rows = (q.data as any[]) || [];
  return (
    <section className="mt-6 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)]">
      <div className="border-b border-[var(--bg-border)] px-4 py-3 text-sm font-medium flex items-center gap-2">
        <ShieldCheck className="h-4 w-4" /> Assinaturas digitais (HMAC-SHA256)
      </div>
      {rows.length === 0 ? (
        <div className="p-6 text-center text-xs text-[var(--text-muted)]">
          Nenhuma assinatura registrada. Publicar o documento gera assinaturas automáticas por
          idioma.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Versão</TableHead>
              <TableHead>Idioma</TableHead>
              <TableHead>SHA-256</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>Quando</TableHead>
              <TableHead className="text-right">Verificar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-mono text-xs">v{a.versao}</TableCell>
                <TableCell className="text-xs uppercase">{a.idioma}</TableCell>
                <TableCell className="font-mono text-[10px]" title={a.sha256}>
                  {(a.sha256 as string).slice(0, 16)}…
                </TableCell>
                <TableCell className="text-xs">{a.signed_by_nome || "—"}</TableCell>
                <TableCell className="text-xs text-[var(--text-muted)]">
                  {new Date(a.signed_at).toLocaleString("pt-BR")}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={verifying === a.id}
                    onClick={() => handleVerify(a.id)}
                  >
                    {verifying === a.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Verificar"
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </section>
  );
}

function AcaoDialog({
  title,
  icon: Icon,
  variant,
  actionFn,
  documento_id,
  onDone,
  placeholder,
  requireComment,
}: {
  title: string;
  icon: any;
  variant: "default" | "outline" | "destructive";
  actionFn: any;
  documento_id: string;
  onDone: () => void;
  placeholder: string;
  requireComment?: boolean;
}) {
  const fn = useServerFn(actionFn);
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (requireComment && !comment.trim()) {
      toast.error("Comentário obrigatório.");
      return;
    }
    setBusy(true);
    try {
      await fn({ data: { documento_id, comentario: comment || undefined } });
      toast.success(`${title} com sucesso.`);
      setOpen(false);
      setComment("");
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size="sm">
          <Icon className="mr-2 h-4 w-4" /> {title}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Textarea
          placeholder={placeholder}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button variant={variant} disabled={busy} onClick={submit}>
            {busy ? "Processando…" : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
