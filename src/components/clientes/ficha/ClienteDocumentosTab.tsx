import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, FileText, Filter, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { FormField } from "@/components/form/FormField";
import { clienteDocumentosQueryOptions } from "@/lib/clientes.queries";
import {
  uploadClienteDocumento,
  removerClienteDocumento,
  CLIENTE_DOC_CATEGORIAS,
  CLIENTE_DOC_CATEGORIA_LABEL,
} from "@/lib/cliente-documentos.functions";
import { RestrictedNotice, SensitiveOnly } from "@/lib/sensitive";
import { Chip, EmptyState, FichaSection, fileToBase64, fmtDate, formatBytes } from "./ficha-utils";

type Categoria = (typeof CLIENTE_DOC_CATEGORIAS)[number];

export function ClienteDocumentosTab({ clienteId }: { clienteId: string }) {
  return (
    <SensitiveOnly fallback={<RestrictedNotice what="Documentos e anexos do cliente" />}>
      <Documentos clienteId={clienteId} />
    </SensitiveOnly>
  );
}

function Documentos({ clienteId }: { clienteId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(clienteDocumentosQueryOptions(clienteId));
  const [catFilter, setCatFilter] = useState<"todos" | Categoria>("todos");
  const [query, setQuery] = useState("");
  const [confirmDoc, setConfirmDoc] = useState<{ id: string; nome: string } | null>(null);

  // Diálogo de envio: categoria + arquivo, num só lugar.
  const [enviarOpen, setEnviarOpen] = useState(false);
  const [categoria, setCategoria] = useState<Categoria>("outro");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      const b64 = await fileToBase64(file);
      const chosen = file.name.replace(/\.[^.]+$/, "").slice(0, 100) || "arquivo";
      return uploadClienteDocumento({
        data: {
          cliente_id: clienteId,
          filename: file.name,
          mime_type: file.type || "application/octet-stream",
          size_bytes: file.size,
          data_base64: b64,
          chosen_name: chosen,
          categoria,
        },
      });
    },
    onSuccess: () => {
      toast.success("Documento salvo no Drive.");
      qc.invalidateQueries({ queryKey: ["clientes", clienteId, "documentos"] });
      qc.invalidateQueries({ queryKey: ["clientes", clienteId, "timeline"] });
      setEnviarOpen(false);
      setArquivo(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => removerClienteDocumento({ data: { id } }),
    onSuccess: () => {
      toast.success("Documento removido.");
      setConfirmDoc(null);
      qc.invalidateQueries({ queryKey: ["clientes", clienteId, "documentos"] });
      qc.invalidateQueries({ queryKey: ["clientes", clienteId, "timeline"] });
    },
    onError: (e: Error) => toast.error(e.message ?? "Falha ao remover."),
  });

  const docs = data ?? [];
  const catCounts: Record<string, number> = {};
  for (const d of docs) catCounts[d.categoria] = (catCounts[d.categoria] ?? 0) + 1;
  const qstr = query.trim().toLowerCase();
  const filtered = docs
    .filter((d) => catFilter === "todos" || d.categoria === catFilter)
    .filter(
      (d) =>
        !qstr ||
        String(d.nome_final ?? "")
          .toLowerCase()
          .includes(qstr) ||
        String(d.nome_original ?? "")
          .toLowerCase()
          .includes(qstr),
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="space-y-4">
      <FichaSection
        title={`Documentos (${docs.length})`}
        action={
          <div className="flex items-center gap-2">
            {docs.length > 5 && (
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar…"
                className="h-8 w-40 text-[12px]"
              />
            )}
            <Button size="sm" className="h-8" onClick={() => setEnviarOpen(true)}>
              <Upload className="h-3.5 w-3.5" /> Enviar
            </Button>
          </div>
        }
      >
        {docs.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/20 px-4 py-2">
            <Chip active={catFilter === "todos"} onClick={() => setCatFilter("todos")}>
              Todos
            </Chip>
            {CLIENTE_DOC_CATEGORIAS.filter((c) => (catCounts[c] ?? 0) > 0).map((c) => (
              <Chip key={c} active={catFilter === c} onClick={() => setCatFilter(c)}>
                {CLIENTE_DOC_CATEGORIA_LABEL[c]}
                <span className="opacity-60">{catCounts[c]}</span>
              </Chip>
            ))}
          </div>
        )}
        {isLoading ? (
          <div className="p-4 text-[12px] text-muted-foreground">Carregando…</div>
        ) : docs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Sem documentos"
            hint="PDF, JPG, PNG (até 25 MB) e ZIP (até 50 MB), salvos no Drive do cliente."
          />
        ) : filtered.length === 0 ? (
          <EmptyState icon={Filter} title="Nenhum documento no filtro" />
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-4 py-2.5 text-[12.5px]">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{d.nome_final}</div>
                  <div className="text-[10.5px] text-muted-foreground">
                    {CLIENTE_DOC_CATEGORIA_LABEL[d.categoria] ?? d.categoria} ·{" "}
                    {formatBytes(d.size_bytes)} · {d.user_nome ?? "—"} · {fmtDate(d.created_at)}
                  </div>
                </div>
                {d.drive_view_url && (
                  <a
                    href={d.drive_view_url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="Abrir no Drive"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setConfirmDoc({ id: d.id, nome: d.nome_final })}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
                  title="Remover"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </FichaSection>

      <Dialog open={enviarOpen} onOpenChange={(o) => !uploadMut.isPending && setEnviarOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar documento</DialogTitle>
            <DialogDescription>Salvo no Drive na pasta do cliente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <FormField label="Categoria">
              <Select value={categoria} onValueChange={(v) => setCategoria(v as Categoria)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLIENTE_DOC_CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {CLIENTE_DOC_CATEGORIA_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Arquivo" hint="PDF, JPG, PNG até 25 MB · ZIP até 50 MB">
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.zip,application/pdf,image/jpeg,image/png,application/zip"
                className="block w-full text-[12.5px]"
                onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEnviarOpen(false)}
              disabled={uploadMut.isPending}
            >
              Cancelar
            </Button>
            <Button
              disabled={!arquivo || uploadMut.isPending}
              onClick={() => arquivo && uploadMut.mutate(arquivo)}
            >
              {uploadMut.isPending ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-1 h-4 w-4" />
              )}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!confirmDoc}
        onOpenChange={(o) => !o && !delMut.isPending && setConfirmDoc(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover documento</AlertDialogTitle>
            <AlertDialogDescription>
              Remover <span className="font-medium text-foreground">{confirmDoc?.nome}</span>? A
              ação fica registrada no histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={delMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (confirmDoc) delMut.mutate(confirmDoc.id);
              }}
              disabled={delMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
