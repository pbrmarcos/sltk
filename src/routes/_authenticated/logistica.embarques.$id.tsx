import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Save,
  Trash2,
  Truck,
  Upload,
  Package,
  CheckCircle2,
  ExternalLink,
  FileText,
  History,
  Loader2,
  Paperclip,
  Download,
  X,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getEmbarque,
  updateEmbarque,
  setStatus,
  addItem,
  removeItem,
  registrarAnexo,
  removerAnexo,
  getAnexoSignedUrl,
  listTransportadoras,
  listStatusLog,
  generateRomaneioPdf,
  exportStatusLog,
  LOGISTICA_ANEXOS_BUCKET,
  type EmbarqueAnexo,
  type LogisticaStatus,
  type StatusLogEntry,
} from "@/lib/logistica.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/logistica/embarques/$id")({
  component: EmbarqueDetalhe,
});

const STATUS_TONE: Record<LogisticaStatus, string> = {
  rascunho: "bg-slate-100 text-slate-700 border-slate-200",
  programado: "bg-blue-50 text-blue-700 border-blue-200",
  embarcado: "bg-amber-50 text-amber-800 border-amber-200",
  entregue: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelado: "bg-rose-50 text-rose-700 border-rose-200",
};

function EmbarqueDetalhe() {
  const { id } = Route.useParams();
  const { role } = useAuth();
  const canEdit = role === "admin" || role === "manager" || role === "field";
  const qc = useQueryClient();

  const getFn = useServerFn(getEmbarque);
  const q = useQuery({
    queryKey: ["logistica", "embarque", id],
    queryFn: () => getFn({ data: { id } }),
  });

  const transportadoras = useQuery({
    queryKey: ["logistica", "transportadoras"],
    queryFn: () => listTransportadoras(),
    enabled: canEdit,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["logistica", "embarque", id] });

  // Cabeçalho
  const updateFn = useServerFn(updateEmbarque);
  const setStatusFn = useServerFn(setStatus);
  const registrarAnexoFn = useServerFn(registrarAnexo);
  type StatusDialogState = {
    target: LogisticaStatus;
    notas: string;
    files: File[];
    uploading: boolean;
  };
  const [statusDialog, setStatusDialog] = useState<StatusDialogState | null>(null);
  const CRITICAL_STATUS: LogisticaStatus[] = ["embarcado", "entregue", "cancelado"];
  const isCritical = statusDialog ? CRITICAL_STATUS.includes(statusDialog.target) : false;
  const reasonValid = !statusDialog
    ? true
    : !CRITICAL_STATUS.includes(statusDialog.target) || statusDialog.notas.trim().length >= 5;

  const statusMut = useMutation({
    mutationFn: async (payload: { s: LogisticaStatus; notas?: string; files: File[] }) => {
      // 1) Fazer upload dos anexos (se houver) e registrar cada um
      const anexoIds: string[] = [];
      for (const f of payload.files) {
        if (f.size > 100 * 1024 * 1024) {
          throw new Error(`Arquivo "${f.name}" excede 100 MB.`);
        }
        const ext = (f.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
        const path = `${id}/status/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(LOGISTICA_ANEXOS_BUCKET)
          .upload(path, f, { cacheControl: "3600", upsert: false, contentType: f.type });
        if (upErr) throw new Error(`Falha no upload de "${f.name}": ${upErr.message}`);
        const created = await registrarAnexoFn({
          data: {
            embarque_id: id,
            categoria: "status",
            nome_arquivo: f.name,
            storage_path: path,
            tamanho_bytes: f.size,
            mime_type: f.type || null,
          },
        });
        anexoIds.push(created.id);
      }
      return setStatusFn({
        data: {
          id,
          status: payload.s,
          notas: payload.notas?.trim() || null,
          anexo_ids: anexoIds,
        },
      });
    },
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["logistica", "embarques"] });
      qc.invalidateQueries({ queryKey: ["logistica", "embarque", id, "status-log"] });
      setStatusDialog(null);
      toast.success("Status atualizado.");
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  // Itens
  const addFn = useServerFn(addItem);
  const removeFn = useServerFn(removeItem);
  const [newDesc, setNewDesc] = useState("");
  const [newQtd, setNewQtd] = useState("1");
  const [newSerial, setNewSerial] = useState("");
  const [newPeso, setNewPeso] = useState("");
  const [newVolume, setNewVolume] = useState("");
  const addMut = useMutation({
    mutationFn: async () => {
      if (!newDesc.trim()) throw new Error("Descrição obrigatória.");
      return addFn({
        data: {
          embarque_id: id,
          descricao: newDesc.trim(),
          quantidade: Number(newQtd) || 1,
          serial: newSerial.trim() || null,
          peso_kg: newPeso ? Number(newPeso) : null,
          volume_m3: newVolume ? Number(newVolume) : null,
        },
      });
    },
    onSuccess: () => {
      setNewDesc("");
      setNewQtd("1");
      setNewSerial("");
      setNewPeso("");
      setNewVolume("");
      invalidate();
      toast.success("Item adicionado.");
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });
  const removeMut = useMutation({
    mutationFn: (itemId: string) => removeFn({ data: { id: itemId } }),
    onSuccess: () => {
      invalidate();
      toast.success("Item removido.");
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  // Anexos
  const registrarFn = useServerFn(registrarAnexo);
  const removerAnexoFn = useServerFn(removerAnexo);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [categoria, setCategoria] = useState<"foto" | "nf" | "comprovante" | "outro">("foto");

  async function handleUpload(f: File) {
    if (f.size > 100 * 1024 * 1024) {
      toast.error("Arquivo excede 100 MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = (f.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${id}/${categoria}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from(LOGISTICA_ANEXOS_BUCKET)
        .upload(path, f, { cacheControl: "3600", upsert: false, contentType: f.type });
      if (error) throw error;
      await registrarFn({
        data: {
          embarque_id: id,
          categoria,
          nome_arquivo: f.name,
          storage_path: path,
          tamanho_bytes: f.size,
          mime_type: f.type || null,
        },
      });
      invalidate();
      toast.success("Anexo enviado.");
    } catch (e) {
      toast.error(`Falha no upload: ${(e as Error).message}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const removeAnexoMut = useMutation({
    mutationFn: (a: EmbarqueAnexo) =>
      removerAnexoFn({ data: { id: a.id, storage_path: a.storage_path } }),
    onSuccess: () => {
      invalidate();
      toast.success("Anexo removido.");
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  // Trilha de auditoria
  const statusLogFn = useServerFn(listStatusLog);
  const statusLogQ = useQuery({
    queryKey: ["logistica", "embarque", id, "status-log"],
    queryFn: () => statusLogFn({ data: { embarque_id: id } }),
  });

  // Exportação da trilha (PDF / CSV) e abertura de anexos do log via signed URL
  const exportStatusLogFn = useServerFn(exportStatusLog);
  const getSignedUrlFn = useServerFn(getAnexoSignedUrl);
  const [exportingTrail, setExportingTrail] = useState<"csv" | "pdf" | null>(null);

  async function handleExportTrail(format: "csv" | "pdf") {
    setExportingTrail(format);
    try {
      const res = await exportStatusLogFn({ data: { embarque_id: id, format } });
      const bin = atob(res.base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: res.mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Trilha exportada.");
    } catch (e) {
      toast.error(`Falha ao exportar: ${(e as Error).message}`);
    } finally {
      setExportingTrail(null);
    }
  }

  async function openLogAnexo(storage_path: string) {
    try {
      const { url } = await getSignedUrlFn({ data: { path: storage_path } });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(`Falha ao abrir anexo: ${(e as Error).message}`);
    }
  }

  // PDF do romaneio
  const pdfFn = useServerFn(generateRomaneioPdf);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [pdfSelected, setPdfSelected] = useState<Record<string, boolean>>({});
  const [pdfLoading, setPdfLoading] = useState(false);

  async function handleGeneratePdf() {
    setPdfLoading(true);
    try {
      const ids = Object.entries(pdfSelected)
        .filter(([, v]) => v)
        .map(([k]) => k);
      const res = await pdfFn({ data: { embarque_id: id, anexo_ids: ids } });
      const bin = atob(res.base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setPdfOpen(false);
      toast.success("Romaneio gerado.");
    } catch (e) {
      toast.error(`Falha ao gerar PDF: ${(e as Error).message}`);
    } finally {
      setPdfLoading(false);
    }
  }

  if (q.isLoading) {
    return (
      <PageContainer>
        <p className="text-sm text-[var(--text-muted)]">Carregando…</p>
      </PageContainer>
    );
  }
  if (q.isError || !q.data) {
    return (
      <PageContainer>
        <p className="text-sm text-[var(--text-muted)]">Embarque não encontrado.</p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to="/logistica/embarques">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
          </Link>
        </Button>
      </PageContainer>
    );
  }

  const { embarque, itens, anexos } = q.data as any;
  const cli = embarque.projeto?.cliente;
  const eq = embarque.projeto?.equipamento;
  const s = embarque.status as LogisticaStatus;

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Logística", href: "/logistica/embarques" },
          { label: embarque.numero },
        ]}
        title={embarque.numero}
        subtitle={`${cli?.nome_fantasia || cli?.razao_social || "Cliente"} · ${eq?.apelido || eq?.modelo || "Equipamento"}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={`text-[11px] uppercase ${STATUS_TONE[s]}`}>
              {s}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setPdfSelected({});
                setPdfOpen(true);
              }}
            >
              <FileText className="mr-1.5 h-4 w-4" /> Exportar PDF
            </Button>
            {canEdit && s === "rascunho" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setStatusDialog({ target: "programado", notas: "", files: [], uploading: false })
                }
              >
                Programar
              </Button>
            )}
            {canEdit && (s === "rascunho" || s === "programado") && (
              <Button
                size="sm"
                onClick={() =>
                  setStatusDialog({ target: "embarcado", notas: "", files: [], uploading: false })
                }
              >
                <Truck className="mr-1.5 h-4 w-4" /> Marcar embarcado
              </Button>
            )}
            {canEdit && s === "embarcado" && (
              <Button
                size="sm"
                onClick={() =>
                  setStatusDialog({ target: "entregue", notas: "", files: [], uploading: false })
                }
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Marcar entregue
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          {/* Cabeçalho editável */}
          <section className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4">
            <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
              Informações do embarque
            </h2>
            <CabecalhoForm
              embarque={embarque}
              transportadoras={transportadoras.data ?? []}
              canEdit={canEdit}
              onSave={async (patch) => {
                await updateFn({ data: { id, ...patch } });
                invalidate();
                toast.success("Salvo.");
              }}
            />
          </section>

          {/* Itens do romaneio */}
          <section className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                <Package className="mr-1.5 inline h-4 w-4" /> Romaneio ({itens.length})
              </h2>
            </div>

            {itens.length === 0 && (
              <p className="mb-3 text-sm text-[var(--text-muted)]">Nenhum item lançado ainda.</p>
            )}

            {itens.length > 0 && (
              <div className="mb-4 overflow-hidden rounded border border-[var(--bg-border)]">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg-elevated)] text-left text-xs uppercase text-[var(--text-muted)]">
                    <tr>
                      <th className="px-2 py-1.5">Descrição</th>
                      <th className="px-2 py-1.5 w-16 text-right">Qtd</th>
                      <th className="px-2 py-1.5 w-24">Serial</th>
                      <th className="px-2 py-1.5 w-20 text-right">Peso (kg)</th>
                      <th className="px-2 py-1.5 w-20 text-right">Vol (m³)</th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((it: any) => (
                      <tr key={it.id} className="border-t border-[var(--bg-border)]">
                        <td className="px-2 py-1.5">{it.descricao}</td>
                        <td className="px-2 py-1.5 text-right">{Number(it.quantidade)}</td>
                        <td className="px-2 py-1.5 text-xs">{it.serial || "—"}</td>
                        <td className="px-2 py-1.5 text-right">{it.peso_kg ?? "—"}</td>
                        <td className="px-2 py-1.5 text-right">{it.volume_m3 ?? "—"}</td>
                        <td className="px-2 py-1.5 text-right">
                          {canEdit && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => removeMut.mutate(it.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {canEdit && (
              <div className="grid gap-2 sm:grid-cols-[2fr_60px_120px_80px_80px_auto]">
                <Input
                  placeholder="Descrição"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                />
                <Input
                  placeholder="Qtd"
                  type="number"
                  min="0"
                  step="0.001"
                  value={newQtd}
                  onChange={(e) => setNewQtd(e.target.value)}
                />
                <Input
                  placeholder="Serial"
                  value={newSerial}
                  onChange={(e) => setNewSerial(e.target.value)}
                />
                <Input
                  placeholder="Peso kg"
                  type="number"
                  min="0"
                  step="0.001"
                  value={newPeso}
                  onChange={(e) => setNewPeso(e.target.value)}
                />
                <Input
                  placeholder="Vol m³"
                  type="number"
                  min="0"
                  step="0.001"
                  value={newVolume}
                  onChange={(e) => setNewVolume(e.target.value)}
                />
                <Button size="sm" onClick={() => addMut.mutate()} disabled={addMut.isPending}>
                  <Plus className="mr-1 h-4 w-4" /> Adicionar
                </Button>
              </div>
            )}
          </section>

          {/* Trilha de auditoria de status */}
          <section className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                <History className="mr-1.5 inline h-4 w-4" /> Trilha de auditoria
              </h2>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--text-muted)]">
                  {statusLogQ.data ? `${statusLogQ.data.length} evento(s)` : ""}
                </span>
                {(statusLogQ.data?.length ?? 0) > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" disabled={!!exportingTrail}>
                        {exportingTrail ? (
                          <>
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Exportando…
                          </>
                        ) : (
                          <>
                            <Download className="mr-1.5 h-4 w-4" /> Exportar
                          </>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleExportTrail("pdf")}>
                        <FileText className="mr-2 h-4 w-4" /> PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExportTrail("csv")}>
                        <FileText className="mr-2 h-4 w-4" /> CSV
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
            {statusLogQ.isLoading ? (
              <p className="text-xs text-[var(--text-muted)]">Carregando…</p>
            ) : (statusLogQ.data?.length ?? 0) === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">
                Nenhuma mudança de status registrada ainda. Ações futuras aparecerão aqui.
              </p>
            ) : (
              <ol className="space-y-2">
                {(statusLogQ.data ?? []).map((l: StatusLogEntry) => (
                  <li
                    key={l.id}
                    className="flex flex-wrap items-center gap-2 border-b border-dashed border-[var(--bg-border)] pb-2 text-sm last:border-b-0 last:pb-0"
                  >
                    <span className="text-xs text-[var(--text-muted)]">
                      {new Date(l.changed_at).toLocaleString("pt-BR")}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">·</span>
                    {l.from_status ? (
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase ${STATUS_TONE[l.from_status]}`}
                      >
                        {l.from_status}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] uppercase">
                        novo
                      </Badge>
                    )}
                    <span className="text-xs text-[var(--text-muted)]">→</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] uppercase ${STATUS_TONE[l.to_status]}`}
                    >
                      {l.to_status}
                    </Badge>
                    <span className="text-xs">
                      por{" "}
                      <span className="font-medium">{l.actor_nome || l.actor_email || "—"}</span>
                    </span>
                    {l.notas && (
                      <span className="w-full text-xs text-[var(--text-muted)]">“{l.notas}”</span>
                    )}
                    {l.anexos && l.anexos.length > 0 && (
                      <div className="flex w-full flex-wrap gap-1.5 pt-1">
                        {l.anexos.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => openLogAnexo(a.storage_path)}
                            className="inline-flex items-center gap-1 rounded border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[11px] hover:bg-[var(--bg-elevated)]"
                            title={a.nome_arquivo}
                          >
                            <Paperclip className="h-3 w-3" />
                            <span className="max-w-[180px] truncate">{a.nome_arquivo}</span>
                            <ExternalLink className="h-3 w-3 opacity-60" />
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        {/* Anexos */}
        <aside>
          <section className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4">
            <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
              Anexos ({anexos.length})
            </h2>

            {canEdit && (
              <div className="mb-4 space-y-2 rounded border border-dashed border-[var(--bg-border)] p-3">
                <Select value={categoria} onValueChange={(v) => setCategoria(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="foto">Foto de embarque</SelectItem>
                    <SelectItem value="nf">Nota fiscal / XML</SelectItem>
                    <SelectItem value="comprovante">Comprovante de entrega</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleUpload(f);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="mr-1.5 h-4 w-4" />
                  {uploading ? "Enviando…" : "Selecionar arquivo"}
                </Button>
              </div>
            )}

            <ul className="space-y-2">
              {anexos.map((a: EmbarqueAnexo) => (
                <AnexoRow
                  key={a.id}
                  anexo={a}
                  canEdit={canEdit}
                  onRemove={() => removeAnexoMut.mutate(a)}
                />
              ))}
              {anexos.length === 0 && (
                <li className="text-xs text-[var(--text-muted)]">Nenhum anexo.</li>
              )}
            </ul>
          </section>
        </aside>
      </div>

      {/* Diálogo — Exportar romaneio em PDF */}
      <Dialog open={pdfOpen} onOpenChange={(v) => (!pdfLoading ? setPdfOpen(v) : null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Exportar romaneio em PDF</DialogTitle>
            <DialogDescription>
              O PDF inclui o cabeçalho, os itens, a trilha de auditoria e a área de assinaturas.
              Selecione anexos abaixo para incluí-los no documento (imagens são embutidas; demais
              arquivos são apenas referenciados).
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[300px] space-y-2 overflow-y-auto rounded border border-[var(--bg-border)] p-2">
            {anexos.length === 0 ? (
              <p className="p-2 text-xs text-[var(--text-muted)]">Nenhum anexo disponível.</p>
            ) : (
              anexos.map((a: EmbarqueAnexo) => (
                <label
                  key={a.id}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-[var(--bg-elevated)]"
                >
                  <Checkbox
                    checked={!!pdfSelected[a.id]}
                    onCheckedChange={(v) =>
                      setPdfSelected((prev) => ({ ...prev, [a.id]: Boolean(v) }))
                    }
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate">{a.nome_arquivo}</div>
                    <div className="text-[10px] uppercase text-[var(--text-muted)]">
                      {a.categoria} · {a.mime_type || "arquivo"}
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPdfOpen(false)} disabled={pdfLoading}>
              Cancelar
            </Button>
            <Button onClick={handleGeneratePdf} disabled={pdfLoading}>
              {pdfLoading ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Gerando…
                </>
              ) : (
                <>
                  <FileText className="mr-1.5 h-4 w-4" /> Gerar PDF
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de mudança de status com motivo/comentário + anexos */}
      <Dialog
        open={!!statusDialog}
        onOpenChange={(o) => !o && !statusMut.isPending && setStatusDialog(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Alterar status para <span className="uppercase">{statusDialog?.target}</span>
            </DialogTitle>
            <DialogDescription>
              {isCritical
                ? "Esta transição é crítica — motivo obrigatório (mínimo 5 caracteres). Ficará registrado na trilha de auditoria."
                : "Registre um motivo ou comentário. Ficará registrado na trilha de auditoria."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-[var(--text-muted)]">
                Motivo / comentário{" "}
                {isCritical ? <span className="text-rose-600">*</span> : "(opcional)"}
              </Label>
              <Textarea
                rows={4}
                placeholder="Ex.: Coleta confirmada pela transportadora, previsão de saída às 14h."
                value={statusDialog?.notas ?? ""}
                onChange={(e) =>
                  setStatusDialog((prev) => (prev ? { ...prev, notas: e.target.value } : prev))
                }
              />
              {isCritical && !reasonValid && (
                <p className="text-xs text-rose-600">
                  Informe um motivo com pelo menos 5 caracteres.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-[var(--text-muted)]">
                Anexos (opcional)
              </Label>
              <label className="flex cursor-pointer items-center gap-2 rounded border border-dashed border-[var(--bg-border)] p-2 text-xs hover:bg-[var(--bg-elevated)]">
                <Paperclip className="h-4 w-4" />
                <span>Selecionar arquivos (foto, NF, comprovante…)</span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const picked = Array.from(e.target.files ?? []);
                    if (picked.length === 0) return;
                    setStatusDialog((prev) =>
                      prev ? { ...prev, files: [...prev.files, ...picked] } : prev,
                    );
                    e.target.value = "";
                  }}
                />
              </label>
              {statusDialog && statusDialog.files.length > 0 && (
                <ul className="space-y-1">
                  {statusDialog.files.map((f, idx) => (
                    <li
                      key={idx}
                      className="flex items-center justify-between rounded bg-[var(--bg-elevated)] px-2 py-1 text-xs"
                    >
                      <span className="truncate">
                        {f.name}{" "}
                        <span className="text-[var(--text-muted)]">
                          ({Math.round(f.size / 1024)} KB)
                        </span>
                      </span>
                      <button
                        type="button"
                        className="text-[var(--text-muted)] hover:text-rose-600"
                        onClick={() =>
                          setStatusDialog((prev) =>
                            prev
                              ? { ...prev, files: prev.files.filter((_, i) => i !== idx) }
                              : prev,
                          )
                        }
                        aria-label="Remover arquivo"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setStatusDialog(null)}
              disabled={statusMut.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={() =>
                statusDialog &&
                statusMut.mutate({
                  s: statusDialog.target,
                  notas: statusDialog.notas,
                  files: statusDialog.files,
                })
              }
              disabled={statusMut.isPending || !reasonValid}
            >
              {statusMut.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Salvando…
                </>
              ) : (
                "Confirmar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

function CabecalhoForm({
  embarque,
  transportadoras,
  canEdit,
  onSave,
}: {
  embarque: any;
  transportadoras: Array<{ id: string; nome: string }>;
  canEdit: boolean;
  onSave: (patch: {
    transportadora_id?: string | null;
    previsao_saida?: string | null;
    nf_saida?: string | null;
    destino?: string | null;
    observacoes?: string | null;
  }) => Promise<void>;
}) {
  const [transportadoraId, setTransportadoraId] = useState<string>(
    embarque.transportadora_id ?? "none",
  );
  const [previsao, setPrevisao] = useState<string>(embarque.previsao_saida ?? "");
  const [nf, setNf] = useState<string>(embarque.nf_saida ?? "");
  const [destino, setDestino] = useState<string>(embarque.destino ?? "");
  const [obs, setObs] = useState<string>(embarque.observacoes ?? "");
  const [saving, setSaving] = useState(false);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="mb-1 block text-xs uppercase text-[var(--text-muted)]">
            Transportadora
          </Label>
          <Select value={transportadoraId} onValueChange={setTransportadoraId} disabled={!canEdit}>
            <SelectTrigger>
              <SelectValue placeholder="A definir" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">A definir</SelectItem>
              {transportadoras.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1 block text-xs uppercase text-[var(--text-muted)]">
            Previsão de saída
          </Label>
          <Input
            type="date"
            value={previsao ?? ""}
            onChange={(e) => setPrevisao(e.target.value)}
            disabled={!canEdit}
          />
        </div>
        <div>
          <Label className="mb-1 block text-xs uppercase text-[var(--text-muted)]">
            NF de saída
          </Label>
          <Input value={nf} onChange={(e) => setNf(e.target.value)} disabled={!canEdit} />
        </div>
        <div>
          <Label className="mb-1 block text-xs uppercase text-[var(--text-muted)]">Destino</Label>
          <Input value={destino} onChange={(e) => setDestino(e.target.value)} disabled={!canEdit} />
        </div>
      </div>
      <div>
        <Label className="mb-1 block text-xs uppercase text-[var(--text-muted)]">Observações</Label>
        <Textarea
          rows={3}
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          disabled={!canEdit}
        />
      </div>
      {canEdit && (
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave({
                  transportadora_id: transportadoraId === "none" ? null : transportadoraId,
                  previsao_saida: previsao || null,
                  nf_saida: nf.trim() || null,
                  destino: destino.trim() || null,
                  observacoes: obs.trim() || null,
                });
              } finally {
                setSaving(false);
              }
            }}
          >
            <Save className="mr-1.5 h-4 w-4" /> Salvar
          </Button>
        </div>
      )}
      {embarque.data_saida && (
        <p className="text-xs text-[var(--text-muted)]">
          Embarcado em {new Date(embarque.data_saida).toLocaleString("pt-BR")}.
        </p>
      )}
      {embarque.data_entrega && (
        <p className="text-xs text-[var(--text-muted)]">
          Entregue em {new Date(embarque.data_entrega).toLocaleString("pt-BR")}. Janela de garantia
          iniciada.
        </p>
      )}
    </div>
  );
}

function AnexoRow({
  anexo,
  canEdit,
  onRemove,
}: {
  anexo: EmbarqueAnexo;
  canEdit: boolean;
  onRemove: () => void;
}) {
  const signFn = useServerFn(getAnexoSignedUrl);
  const [loading, setLoading] = useState(false);

  async function open() {
    setLoading(true);
    try {
      const { url } = await signFn({ data: { path: anexo.storage_path } });
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <li className="flex items-center justify-between gap-2 rounded border border-[var(--bg-border)] px-2 py-1.5 text-sm">
      <div className="min-w-0 flex-1">
        <div className="truncate">{anexo.nome_arquivo}</div>
        <div className="text-[10px] uppercase text-[var(--text-muted)]">{anexo.categoria}</div>
      </div>
      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={open} disabled={loading}>
        <ExternalLink className="h-3.5 w-3.5" />
      </Button>
      {canEdit && (
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </li>
  );
}
