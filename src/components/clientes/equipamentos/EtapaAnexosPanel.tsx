import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Paperclip, FileText, Image as ImageIcon, Trash2, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  listEtapaAnexos,
  uploadEtapaAnexo,
  deleteEtapaAnexo,
  getEtapaAnexoUrl,
} from "@/lib/etapa-anexos.functions";

const MAX_BYTES = 25 * 1024 * 1024;
const ALLOWED = ["application/pdf", "image/png", "image/jpeg"];

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  let bin = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export function EtapaAnexosPanel({ etapaId }: { etapaId: string }) {
  const qc = useQueryClient();
  const { role } = useAuth();
  const canManage = role === "admin" || role === "manager" || role === "engineer";
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const { data: anexos = [], isLoading } = useQuery({
    queryKey: ["etapa-anexos", etapaId],
    queryFn: () => listEtapaAnexos({ data: { etapa_id: etapaId } }),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteEtapaAnexo({ data: { anexo_id: id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["etapa-anexos", etapaId] });
      toast.success("Anexo removido.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao remover"),
  });

  async function onFiles(files: FileList | null) {
    if (!files || !files.length) return;
    setBusy(true);
    try {
      for (const f of Array.from(files)) {
        if (!ALLOWED.includes(f.type)) {
          toast.error(`${f.name}: formato não suportado (aceita PDF, PNG, JPG).`);
          continue;
        }
        if (f.size > MAX_BYTES) {
          toast.error(`${f.name}: excede 25MB.`);
          continue;
        }
        const b64 = await fileToBase64(f);
        await uploadEtapaAnexo({
          data: {
            etapa_id: etapaId,
            nome_arquivo: f.name,
            mime: f.type as any,
            tamanho_bytes: f.size,
            conteudo_base64: b64,
          },
        });
      }
      qc.invalidateQueries({ queryKey: ["etapa-anexos", etapaId] });
      toast.success("Anexo(s) enviados.");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao enviar");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function openAnexo(id: string) {
    try {
      const r = await getEtapaAnexoUrl({ data: { anexo_id: id } });
      window.open(r.url, "_blank", "noopener");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao abrir");
    }
  }

  const rows = anexos as any[];

  return (
    <div className="mt-4 border-t border-border/40 pt-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-[12px] font-semibold">
          <Paperclip className="h-3.5 w-3.5" />
          Anexos ({rows.length})
        </h4>
        {canManage && (
          <Button
            size="sm"
            variant="outline"
            className="h-6 gap-1 px-2 text-[10.5px]"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-3 w-3" /> {busy ? "Enviando…" : "Enviar arquivo"}
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
      </div>
      {isLoading ? (
        <div className="text-[11px] text-muted-foreground">Carregando…</div>
      ) : rows.length === 0 ? (
        <div className="text-[11px] text-muted-foreground">
          {canManage ? "Envie PDF, PNG ou JPG (até 25MB)." : "Nenhum anexo nesta etapa."}
        </div>
      ) : (
        <ul className="space-y-1">
          {rows.map((a: any) => (
            <li
              key={a.id}
              className="flex items-center gap-2 rounded border border-border/40 bg-card/50 px-2 py-1"
            >
              {a.mime === "application/pdf" ? (
                <FileText className="h-3.5 w-3.5 shrink-0 text-red-500" />
              ) : (
                <ImageIcon className="h-3.5 w-3.5 shrink-0 text-blue-500" />
              )}
              <button
                type="button"
                className="flex-1 truncate text-left text-[11.5px] hover:underline"
                onClick={() => openAnexo(a.id)}
                title={a.nome_arquivo}
              >
                {a.nome_arquivo}
              </button>
              <span className="text-[10px] text-muted-foreground">
                {humanSize(a.tamanho_bytes)}
              </span>
              <button
                type="button"
                className="p-1 text-muted-foreground hover:text-foreground"
                onClick={() => openAnexo(a.id)}
                title="Abrir"
              >
                <Download className="h-3 w-3" />
              </button>
              {canManage && (
                <button
                  type="button"
                  className="p-1 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    if (confirm(`Remover "${a.nome_arquivo}"?`)) del.mutate(a.id);
                  }}
                  title="Excluir"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
