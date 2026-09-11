import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, Paperclip, Loader2 } from "lucide-react";
import { useCameraCaptureInputs } from "@/hooks/useCameraCaptureInputs";
import {
  listMontagemEtapas,
  updateMontagemEtapaAtribuicao,
  setChecklistItemMontagem,
  registerMontagemEvidencia,
  removeMontagemEvidencia,
  getMontagemEvidenciaSignedUrl,
  concluirMontagemEtapa,
  MONTAGEM_ETAPA_TIPOS,
  MONTAGEM_ETAPA_TIPO_LABEL,
  type MontagemEtapaTipo,
} from "@/lib/equipamento-montagem-etapas.functions";
import { listUsuariosParaEtapa } from "@/lib/equipamento-disciplina-etapas.functions";

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

const STATUS_LABEL: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluida: "Concluída",
};
const STATUS_COLOR: Record<string, string> = {
  pendente: "bg-stone-100 text-stone-600 border-stone-200",
  em_andamento: "bg-amber-50 text-amber-700 border-amber-200",
  concluida: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function MontagemDetailDrawer({
  montagemId,
  titulo,
  subtitulo,
  open,
  onClose,
}: {
  montagemId: string;
  titulo: string;
  subtitulo?: string;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const fetchFn = useServerFn(listMontagemEtapas);
  const { data, isLoading } = useQuery({
    queryKey: ["montagem-etapas", montagemId],
    queryFn: () => fetchFn({ data: { montagem_id: montagemId } }),
    enabled: open,
  });

  const usersFn = useServerFn(listUsuariosParaEtapa);
  const { data: usuarios } = useQuery({
    queryKey: ["montagem-etapas", "usuarios"],
    queryFn: () => usersFn(),
    enabled: open,
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["montagem-etapas", montagemId] });
    qc.invalidateQueries({ queryKey: ["producao", "montagens"] });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] w-full max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          {subtitulo && <DialogDescription>{subtitulo}</DialogDescription>}
        </DialogHeader>

        {isLoading ? (
          <div className="p-6 text-center text-sm text-[var(--text-muted)]">Carregando…</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {MONTAGEM_ETAPA_TIPOS.map((tipo) => {
              const etapa = (data?.etapas ?? []).find((e: any) => e.tipo === tipo);
              if (!etapa) return null;
              return (
                <EtapaCard
                  key={tipo}
                  etapa={etapa}
                  templates={(data?.templates ?? []).filter((t: any) => t.tipo === tipo)}
                  respostas={(data?.respostas ?? []).filter((r: any) => r.etapa_id === etapa.id)}
                  evidencias={(data?.evidencias ?? []).filter((e: any) => e.etapa_id === etapa.id)}
                  usuarios={usuarios ?? []}
                  onSaved={refresh}
                />
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EtapaCard({
  etapa,
  templates,
  respostas,
  evidencias,
  usuarios,
  onSaved,
}: {
  etapa: {
    id: string;
    tipo: MontagemEtapaTipo;
    status: string;
    responsavel_id: string | null;
    prazo: string | null;
  };
  templates: Array<{ id: string; titulo: string }>;
  respostas: Array<{ template_id: string; ok: boolean }>;
  evidencias: Array<{ id: string; nome_arquivo: string }>;
  usuarios: Array<{ id: string; full_name: string | null; email: string | null }>;
  onSaved: () => void;
}) {
  const atribFn = useServerFn(updateMontagemEtapaAtribuicao);
  const checklistFn = useServerFn(setChecklistItemMontagem);
  const evidFn = useServerFn(registerMontagemEvidencia);
  const removeEvidFn = useServerFn(removeMontagemEvidencia);
  const concluirFn = useServerFn(concluirMontagemEtapa);

  const [prazo, setPrazo] = useState(etapa.prazo ?? "");
  const [uploading, setUploading] = useState(false);
  const disabled = etapa.status === "concluida";

  const atribMut = useMutation({
    mutationFn: (patch: { responsavel_id?: string | null; prazo?: string | null }) =>
      atribFn({ data: { id: etapa.id, ...patch } }),
    onSuccess: onSaved,
    onError: (e: Error) => toast.error(e.message),
  });

  const checklistMut = useMutation({
    mutationFn: (vars: { template_id: string; ok: boolean }) =>
      checklistFn({ data: { etapa_id: etapa.id, ...vars } }),
    onSuccess: onSaved,
    onError: (e: Error) => toast.error(e.message),
  });

  const removeEvidMut = useMutation({
    mutationFn: (id: string) => removeEvidFn({ data: { id } }),
    onSuccess: onSaved,
    onError: (e: Error) => toast.error(e.message),
  });

  const concluirMut = useMutation({
    mutationFn: () => concluirFn({ data: { etapa_id: etapa.id } }),
    onSuccess: () => {
      toast.success("Etapa concluída.");
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const capture = useCameraCaptureInputs(
    (files) => {
      const file = files[0];
      if (!file) return;
      setUploading(true);
      (async () => {
        try {
          const b64 = await fileToBase64(file);
          await evidFn({
            data: {
              etapa_id: etapa.id,
              nome_arquivo: file.name,
              mime: (file.type || "image/jpeg") as "image/jpeg" | "image/png" | "application/pdf",
              tamanho_bytes: file.size,
              conteudo_base64: b64,
            },
          });
          onSaved();
        } catch (e) {
          toast.error(e instanceof Error ? e.message : "Erro ao enviar evidência");
        } finally {
          setUploading(false);
        }
      })();
    },
    { accept: "image/*,application/pdf" },
  );

  const okCount = respostas.filter((r) => r.ok).length;

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{MONTAGEM_ETAPA_TIPO_LABEL[etapa.tipo]}</h3>
        <Badge variant="outline" className={STATUS_COLOR[etapa.status]}>
          {STATUS_LABEL[etapa.status]}
        </Badge>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <Select
          value={etapa.responsavel_id ?? "none"}
          onValueChange={(v) => atribMut.mutate({ responsavel_id: v === "none" ? null : v })}
          disabled={disabled || atribMut.isPending}
        >
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem responsável</SelectItem>
            {usuarios.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.full_name ?? u.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          className="h-9 text-xs"
          value={prazo}
          disabled={disabled}
          onChange={(e) => setPrazo(e.target.value)}
          onBlur={() => atribMut.mutate({ prazo: prazo || null })}
        />
      </div>

      <div className="mb-3 space-y-1.5">
        <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
          Checklist ({okCount}/{templates.length})
        </div>
        {templates.map((t) => {
          const r = respostas.find((x) => x.template_id === t.id);
          return (
            <label key={t.id} className="flex items-center gap-2 text-[12.5px]">
              <Checkbox
                checked={!!r?.ok}
                disabled={disabled || checklistMut.isPending}
                onCheckedChange={(v) => checklistMut.mutate({ template_id: t.id, ok: !!v })}
              />
              {t.titulo}
            </label>
          );
        })}
      </div>

      <div className="mb-3">
        <div className="mb-1.5 text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
          Evidências ({evidencias.length})
        </div>
        {evidencias.length > 0 && (
          <ul className="mb-2 space-y-1">
            {evidencias.map((ev) => (
              <li key={ev.id} className="flex items-center justify-between gap-2 text-[12px]">
                <EvidenciaLink id={ev.id} nome={ev.nome_arquivo} />
                {!disabled && (
                  <button
                    type="button"
                    className="shrink-0 text-[var(--danger,#ef4444)]"
                    onClick={() => removeEvidMut.mutate(ev.id)}
                  >
                    remover
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {!disabled && (
          <div className="flex gap-1.5">
            {capture.renderInputs()}
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={uploading}
              onClick={capture.openGaleria}
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Paperclip className="h-3.5 w-3.5" />
              )}
            </Button>
            {capture.isTouch && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={uploading}
                onClick={capture.openCamera}
                title="Abrir câmera"
              >
                <Camera className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {!disabled && (
        <Button
          size="sm"
          className="w-full"
          disabled={concluirMut.isPending}
          onClick={() => concluirMut.mutate()}
        >
          {concluirMut.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
          Concluir etapa
        </Button>
      )}
    </section>
  );
}

function EvidenciaLink({ id, nome }: { id: string; nome: string }) {
  const signFn = useServerFn(getMontagemEvidenciaSignedUrl);
  const { data } = useQuery({
    queryKey: ["montagem-evidencia", id],
    queryFn: () => signFn({ data: { id } }),
  });
  if (!data?.url) return <span className="truncate text-[var(--text-muted)]">{nome}</span>;
  return (
    <a href={data.url} target="_blank" rel="noreferrer" className="truncate underline">
      {nome}
    </a>
  );
}
