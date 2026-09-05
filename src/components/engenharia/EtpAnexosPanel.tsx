import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Eye,
  FileUp,
  Loader2,
  Paperclip,
  RefreshCw,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  listEtpAnexos,
  uploadEtpAnexo,
  removerEtpAnexo,
  reindexEtpAnexos,
} from "@/lib/equipamento-etp-anexos.functions";
import { useAuth } from "@/hooks/use-auth";

const ACCEPT = ".pdf,.jpg,.jpeg,.png,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv";

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

async function fileToBase64(file: File, onProgress?: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    fr.onload = () => {
      const res = fr.result as string;
      const i = res.indexOf(",");
      resolve(i >= 0 ? res.slice(i + 1) : res);
    };
    fr.onerror = () => reject(fr.error ?? new Error("Falha ao ler arquivo"));
    fr.readAsDataURL(file);
  });
}

export function EtpAnexosPanel({ etpId, readOnly }: { etpId: string; readOnly?: boolean }) {
  const qc = useQueryClient();
  const { role } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<File | null>(null);
  const [openPreview, setOpenPreview] = useState<Record<string, boolean>>({});
  const list = useServerFn(listEtpAnexos);
  const remove = useServerFn(removerEtpAnexo);
  const reindex = useServerFn(reindexEtpAnexos);
  const canReindex = role === "admin" || role === "manager";

  const { data: anexos = [], isLoading } = useQuery({
    queryKey: ["engenharia", "etp", etpId, "anexos"],
    queryFn: () => list({ data: { etp_id: etpId } }),
    enabled: !!etpId,
  });

  const removeMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Anexo removido.");
      qc.invalidateQueries({ queryKey: ["engenharia", "etp", etpId, "anexos"] });
      qc.invalidateQueries({ queryKey: ["engenharia", "etp", etpId, "historico"] });
    },
    onError: (e: Error) => toast.error(e?.message ?? "Falha ao remover."),
  });

  const reindexMut = useMutation({
    mutationFn: () => reindex({ data: { etp_id: etpId } }),
    onSuccess: (r) => {
      const res = r as { moved: number; skipped: number; errors: string[] };
      const errPart = res.errors.length ? ` · ${res.errors.length} erro(s)` : "";
      toast.success(
        `Reindex concluído: ${res.moved} movido(s), ${res.skipped} já estavam corretos${errPart}.`,
      );
      qc.invalidateQueries({ queryKey: ["engenharia", "etp", etpId, "anexos"] });
    },
    onError: (e: Error) => toast.error(e?.message ?? "Falha ao reindexar."),
  });

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-sm)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
          <Paperclip className="h-4 w-4 text-[var(--text-muted)]" />
          Anexos
          <span className="text-[11px] font-normal text-[var(--text-muted)]">
            ({anexos.length})
          </span>
        </h3>
        <div className="flex items-center gap-2">
          {canReindex && anexos.length > 0 ? (
            <Button
              size="sm"
              variant="ghost"
              disabled={reindexMut.isPending}
              onClick={() => {
                if (
                  confirm(
                    "Reindexar todos os anexos deste ETP no Google Drive? Os arquivos serão movidos para a pasta correta (cliente → AAAAMM → etps → v{n}).",
                  )
                ) {
                  reindexMut.mutate();
                }
              }}
              title="Reindexar pastas do Drive para esta versão"
            >
              {reindexMut.isPending ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-1.5 h-4 w-4" />
              )}
              Reindexar
            </Button>
          ) : null}
          {!readOnly && (
            <>
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setPending(f);
                  if (inputRef.current) inputRef.current.value = "";
                }}
              />
              <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
                <FileUp className="mr-1.5 h-4 w-4" /> Anexar arquivo
              </Button>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <p className="text-xs text-[var(--text-muted)]">Carregando…</p>
      ) : anexos.length === 0 ? (
        <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--bg-border)] bg-[var(--bg-elevated)]/30 p-3 text-xs text-[var(--text-muted)]">
          Nenhum anexo. Arquivos enviados ficam organizados no Google Drive (cliente → AAAAMM → etps
          → este ETP).
        </p>
      ) : (
        <ul className="divide-y divide-[var(--bg-border)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--bg-border)]">
          {anexos.map((a) => {
            const isPdf = a.mime_type === "application/pdf";
            const isImg = a.mime_type.startsWith("image/");
            const canPreview = !!a.drive_file_id && (isPdf || isImg);
            const isOpen = !!openPreview[a.id];
            return (
              <li key={a.id} className="p-3">
                <div className="flex items-start gap-3">
                  <Paperclip className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {a.nome_final}
                      </span>
                      <span className="text-[10px] uppercase text-[var(--text-muted)]">
                        {fmtBytes(a.tamanho_bytes)}
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 break-words text-xs text-[var(--text-secondary)]">
                      {a.descricao}
                    </p>
                    <p className="mt-1 text-[10px] text-[var(--text-muted)]">
                      Original: <span className="font-mono">{a.nome_original}</span> ·{" "}
                      {a.user_nome ?? "—"} · {new Date(a.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {canPreview ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        title={isOpen ? "Fechar pré-visualização" : "Pré-visualizar aqui"}
                        onClick={() => setOpenPreview((s) => ({ ...s, [a.id]: !s[a.id] }))}
                      >
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    ) : null}
                    {a.drive_view_url ? (
                      <Button
                        size="icon"
                        variant="ghost"
                        asChild
                        title="Abrir no Google Drive"
                        className="h-8 w-8"
                      >
                        <a href={a.drive_view_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    ) : null}
                    {!readOnly && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-rose-600 hover:bg-rose-50"
                        title="Remover"
                        disabled={removeMut.isPending}
                        onClick={() => {
                          if (
                            confirm(
                              `Remover "${a.nome_final}"? O arquivo irá para a lixeira do Drive.`,
                            )
                          ) {
                            removeMut.mutate(a.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {canPreview && isOpen ? (
                  <div className="mt-3 overflow-hidden rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-elevated)]/30">
                    <iframe
                      title={a.nome_final}
                      src={`https://drive.google.com/file/d/${a.drive_file_id}/preview`}
                      className="block h-[520px] w-full bg-white"
                      allow="autoplay"
                      loading="lazy"
                    />
                    <div className="flex items-center gap-1 px-2 py-1 text-[10px] text-[var(--text-muted)]">
                      <ChevronRight className="h-3 w-3" /> Pré-visualização do Google Drive (requer
                      login na mesma conta do workspace).
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <UploadDialog
        etpId={etpId}
        file={pending}
        onClose={() => setPending(null)}
        onUploaded={() => {
          setPending(null);
          qc.invalidateQueries({ queryKey: ["engenharia", "etp", etpId, "anexos"] });
          qc.invalidateQueries({ queryKey: ["engenharia", "etp", etpId, "historico"] });
        }}
      />
    </section>
  );
}

function UploadDialog({
  etpId,
  file,
  onClose,
  onUploaded,
}: {
  etpId: string;
  file: File | null;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const upload = useServerFn(uploadEtpAnexo);
  const [name, setName] = useState("");
  const [descricao, setDescricao] = useState("");
  const [readPct, setReadPct] = useState(0);
  const [phase, setPhase] = useState<"idle" | "reading" | "sending">("idle");
  const [attempt, setAttempt] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  // Reset on file change
  const lastFileRef = useRef<File | null>(null);
  if (file !== lastFileRef.current) {
    lastFileRef.current = file;
    setName(
      file
        ? file.name
            .replace(/\.[^.]+$/, "")
            .replace(/[^a-zA-Z0-9._\- ]/g, " ")
            .trim()
        : "",
    );
    setDescricao("");
    setReadPct(0);
    setPhase("idle");
    setAttempt(0);
    setLastError(null);
  }

  const ext = file?.name.includes(".") ? "." + file.name.split(".").pop() : "";

  const uploadMut = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Nenhum arquivo selecionado.");
      setLastError(null);
      setPhase("reading");
      setReadPct(0);
      const b64 = await fileToBase64(file, (p) => setReadPct(p));
      setPhase("sending");
      try {
        const res = await upload({
          data: {
            etp_id: etpId,
            filename: file.name,
            mime_type: file.type || "application/octet-stream",
            size_bytes: file.size,
            data_base64: b64,
            chosen_name: name,
            descricao,
          },
        });
        return res;
      } finally {
        setPhase("idle");
      }
    },
    onSuccess: () => {
      toast.success("Arquivo enviado ao Google Drive.");
      onUploaded();
    },
    onError: (e: Error) => {
      const msg = e?.message ?? "Falha no upload.";
      setLastError(msg);
      setAttempt((a) => a + 1);
      toast.error(msg);
    },
  });

  const nameInvalid = name.trim().length < 3 || !/^[a-zA-Z0-9._\- ]+$/.test(name);
  const descInvalid = descricao.trim().length < 5;
  const looksGeneric =
    /^(img|image|photo|foto|document|doc|scan|untitled|sem[-_ ]?nome|new)/i.test(name.trim()) ||
    /^\d{6,}$/.test(name.trim().replace(/[._-]/g, ""));

  const busy = uploadMut.isPending || phase !== "idle";

  return (
    <Dialog open={!!file} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-4 w-4" /> Anexar arquivo ao ETP
          </DialogTitle>
        </DialogHeader>

        {file && (
          <div className="space-y-4 text-sm">
            <div className="rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-elevated)]/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-xs font-medium" title={file.name}>
                    {file.name}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
                    {file.type || "tipo desconhecido"} · {fmtBytes(file.size)}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={onClose}
                  title="Cancelar"
                  disabled={busy}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-[var(--text-primary)]">
                Renomeie o arquivo <span className="text-rose-600">*</span>
              </span>
              <div className="flex items-stretch overflow-hidden rounded-[var(--radius-md)] border border-[var(--bg-border)] focus-within:ring-2 focus-within:ring-blue-500/30">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: layout_montagem_envasadora_v2"
                  className="border-0 focus-visible:ring-0"
                  maxLength={120}
                  disabled={busy}
                />
                {ext && (
                  <span className="flex items-center bg-[var(--bg-elevated)] px-3 text-xs text-[var(--text-muted)]">
                    {ext}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Use apenas letras, números, espaços, ponto, hífen e underline.
              </p>
              {nameInvalid ? (
                <p className="text-[11px] text-rose-600">
                  Nome inválido (3-120 caracteres, sem símbolos).
                </p>
              ) : looksGeneric ? (
                <p className="text-[11px] text-amber-600">
                  Esse nome parece genérico. Use algo descritivo do conteúdo.
                </p>
              ) : null}
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-[var(--text-primary)]">
                Descrição <span className="text-rose-600">*</span>
              </span>
              <Textarea
                rows={3}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Explique o que é este arquivo (ex: P&ID revisão 02 aprovada pelo cliente)"
                maxLength={500}
                disabled={busy}
              />
              <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                <span>{descricao.length} / 500</span>
                {descInvalid ? <span className="text-rose-600">Mínimo 5 caracteres.</span> : null}
              </div>
            </label>

            {busy ? (
              <div className="space-y-1.5 rounded-[var(--radius-md)] border border-blue-200 bg-blue-50/60 p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-blue-800">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {phase === "reading" ? `Lendo arquivo… ${readPct}%` : "Enviando ao Google Drive…"}
                </div>
                <Progress value={phase === "reading" ? readPct : undefined} className="h-1.5" />
                <p className="text-[10px] text-blue-700/80">
                  Não feche esta janela. Se falhar, nenhum registro é criado no banco.
                </p>
              </div>
            ) : null}

            {!busy && lastError ? (
              <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">Falha ao enviar (tentativa {attempt})</div>
                  <div className="mt-0.5 break-words text-rose-700/90">{lastError}</div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          {lastError && !busy ? (
            <Button
              variant="secondary"
              disabled={nameInvalid || descInvalid || looksGeneric}
              onClick={() => uploadMut.mutate()}
            >
              <RefreshCw className="mr-1.5 h-4 w-4" /> Tentar novamente
            </Button>
          ) : (
            <Button
              disabled={busy || nameInvalid || descInvalid || looksGeneric}
              onClick={() => uploadMut.mutate()}
            >
              {busy ? "Enviando…" : "Enviar para o Drive"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
