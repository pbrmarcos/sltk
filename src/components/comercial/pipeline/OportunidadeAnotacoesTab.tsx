import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  listOportunidadeNotas,
  addOportunidadeNota,
  removerOportunidadeNota,
} from "@/lib/oportunidade-notas.functions";
import {
  listOportunidadeAnexos,
  uploadOportunidadeAnexo,
  removerOportunidadeAnexo,
} from "@/lib/oportunidade-anexos.functions";

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const res = (r.result as string) || "";
      resolve(res.includes(",") ? res.split(",", 2)[1] : res);
    };
    r.onerror = () => reject(new Error("Falha ao ler arquivo"));
    r.readAsDataURL(file);
  });
}

/** Aba Anotações da oportunidade: notas + anexos (salvos no SLTK Drive). */
export function OportunidadeAnotacoesTab({ oppId }: { oppId: string }) {
  const qc = useQueryClient();
  const [novaNota, setNovaNota] = useState("");

  const listNotasFn = useServerFn(listOportunidadeNotas);
  const addNotaFn = useServerFn(addOportunidadeNota);
  const delNotaFn = useServerFn(removerOportunidadeNota);
  const notasQ = useQuery({
    queryKey: ["op-notas", oppId],
    queryFn: () => listNotasFn({ data: { oportunidade_id: oppId } }),
  });
  const addNotaMut = useMutation({
    mutationFn: (texto: string) => addNotaFn({ data: { oportunidade_id: oppId, texto } }),
    onSuccess: () => {
      setNovaNota("");
      qc.invalidateQueries({ queryKey: ["op-notas", oppId] });
      qc.invalidateQueries({ queryKey: ["oportunidades", "pipeline"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delNotaMut = useMutation({
    mutationFn: (id: string) => delNotaFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["op-notas", oppId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const listAnexosFn = useServerFn(listOportunidadeAnexos);
  const upAnexoFn = useServerFn(uploadOportunidadeAnexo);
  const delAnexoFn = useServerFn(removerOportunidadeAnexo);
  const anexosQ = useQuery({
    queryKey: ["op-anexos", oppId],
    queryFn: () => listAnexosFn({ data: { oportunidade_id: oppId } }),
  });
  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      const b64 = await fileToBase64(file);
      const chosen = file.name.replace(/\.[^.]+$/, "").slice(0, 100) || "arquivo";
      return upAnexoFn({
        data: {
          oportunidade_id: oppId,
          filename: file.name,
          mime_type: file.type || "application/octet-stream",
          size_bytes: file.size,
          data_base64: b64,
          chosen_name: chosen,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["op-anexos", oppId] });
      toast.success("Arquivo salvo no Drive");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delAnexoMut = useMutation({
    mutationFn: (id: string) => delAnexoFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["op-anexos", oppId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const notas = notasQ.data ?? [];
  const anexos = anexosQ.data ?? [];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Textarea
          value={novaNota}
          onChange={(e) => setNovaNota(e.target.value)}
          rows={2}
          maxLength={4000}
          placeholder="Escreva uma anotação…"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            disabled={!novaNota.trim() || addNotaMut.isPending}
            onClick={() => addNotaMut.mutate(novaNota.trim())}
          >
            {addNotaMut.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
            Adicionar
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {notasQ.isLoading && (
          <p className="py-4 text-center text-[12px] text-muted-foreground">
            <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> Carregando…
          </p>
        )}
        {!notasQ.isLoading && notas.length === 0 && (
          <p className="py-4 text-center text-[12px] text-muted-foreground">Sem anotações.</p>
        )}
        {notas.map((n) => (
          <div key={n.id} className="rounded-lg border bg-card p-3 text-[13px]">
            <div className="whitespace-pre-wrap">{n.texto}</div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                {n.user_nome ?? "—"} · {formatDateTime(n.created_at)}
              </span>
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive"
                aria-label="Excluir anotação"
                onClick={() => {
                  if (window.confirm("Excluir esta anotação?")) delNotaMut.mutate(n.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-2 border-t pt-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Anexos {anexos.length > 0 && `(${anexos.length})`}
          </span>
          <input
            id="op-file"
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.zip,application/pdf,image/jpeg,image/png,application/zip"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadMut.mutate(f);
              e.currentTarget.value = "";
            }}
          />
          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            title="PDF, JPG, PNG até 25 MB · ZIP até 50 MB. Salvo no SLTK Drive na pasta da oportunidade."
          >
            <label htmlFor="op-file" className="cursor-pointer">
              {uploadMut.isPending ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="mr-1 h-3.5 w-3.5" />
              )}
              Enviar arquivo
            </label>
          </Button>
        </div>
        {anexos.map((a) => (
          <div
            key={a.id}
            className="flex items-center gap-2 rounded-lg border bg-card p-2 text-[13px]"
          >
            <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{a.nome_final}</div>
              <div className="text-[11px] text-muted-foreground">
                {a.user_nome ?? "—"} · {formatDateTime(a.created_at)} ·{" "}
                {formatBytes(a.tamanho_bytes)}
              </div>
            </div>
            {a.drive_view_url && (
              <Button size="sm" variant="ghost" className="h-7 px-2" asChild>
                <a href={a.drive_view_url} target="_blank" rel="noreferrer" title="Abrir no Drive">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              aria-label="Excluir arquivo"
              onClick={() => {
                if (window.confirm(`Excluir o arquivo "${a.nome_final}"?`)) {
                  delAnexoMut.mutate(a.id);
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
