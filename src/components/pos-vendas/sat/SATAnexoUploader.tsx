import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Paperclip, Camera, Loader2, X, FileText } from "lucide-react";
import { uploadSATAnexo, deleteSATAnexo, type SATAnexo } from "@/lib/sat-relatorios.functions";
import { useIsTouchDevice } from "@/hooks/useIsTouchDevice";

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

export function SATAnexoUploader({
  relatorioId,
  itemId,
  secaoId,
  anexos,
  compact,
}: {
  relatorioId: string;
  itemId?: string;
  secaoId?: string;
  anexos: SATAnexo[];
  compact?: boolean;
}) {
  const qc = useQueryClient();
  const uploadFn = useServerFn(uploadSATAnexo);
  const delFn = useServerFn(deleteSATAnexo);
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const isTouch = useIsTouchDevice();

  const upload = useMutation({
    mutationFn: async (files: FileList) => {
      setBusy(true);
      try {
        for (const file of Array.from(files)) {
          const b64 = await fileToBase64(file);
          await uploadFn({
            data: {
              relatorio_id: relatorioId,
              item_id: itemId ?? null,
              secao_id: secaoId ?? null,
              filename: file.name,
              mime_type: file.type || "application/octet-stream",
              size_bytes: file.size,
              data_base64: b64,
            },
          });
        }
      } finally {
        setBusy(false);
      }
    },
    onSuccess: () => {
      toast.success("Anexo enviado.");
      qc.invalidateQueries({ queryKey: ["sat-anexos", relatorioId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sat-anexos", relatorioId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,application/pdf,application/zip"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) upload.mutate(e.target.files);
            e.target.value = "";
          }}
        />
        {isTouch && (
          <input
            ref={camRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) upload.mutate(e.target.files);
              e.target.value = "";
            }}
          />
        )}
        <Button
          type="button"
          variant="outline"
          size={compact ? "sm" : "default"}
          onClick={() => fileRef.current?.click()}
          disabled={busy}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          <span className="ml-1">Anexar</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size={compact ? "sm" : "default"}
          onClick={() => (isTouch ? camRef.current?.click() : fileRef.current?.click())}
          disabled={busy}
          title={isTouch ? "Abrir câmera" : "Selecionar imagem"}
        >
          <Camera className="h-4 w-4" />
          <span className="ml-1">{isTouch ? "Foto" : "Imagem"}</span>
        </Button>
      </div>

      {anexos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {anexos.map((a) => {
            const isImg = a.mime_type.startsWith("image/");
            return (
              <div
                key={a.id}
                className="relative group flex items-center gap-2 rounded-md border border-[var(--bg-border)] p-1.5 pr-2 bg-[var(--bg-surface)]"
              >
                {isImg ? (
                  <a href={a.drive_view_url} target="_blank" rel="noreferrer">
                    <div className="h-10 w-10 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] text-[var(--text-muted)] uppercase">
                      IMG
                    </div>
                  </a>
                ) : (
                  <a href={a.drive_view_url} target="_blank" rel="noreferrer">
                    <div className="h-10 w-10 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-[var(--text-muted)]" />
                    </div>
                  </a>
                )}
                <div className="text-[11px] max-w-[140px] truncate" title={a.nome_final}>
                  {a.nome_final}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Remover este anexo?")) del.mutate(a.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition text-[var(--danger)]"
                  title="Remover"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
