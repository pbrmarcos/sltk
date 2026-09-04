import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Save, Upload, X } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listColecoes, createItem, updateItem, getItemBySlug, KH_TIPOS, KH_MEDIA_BUCKET, type KhTipo } from "@/lib/know-how.functions";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/know-how/novo")({
  validateSearch: (search: Record<string, unknown>) => ({
    edit: typeof search["edit"] === "string" ? (search["edit"] as string) : undefined,
  }),
  component: KnowHowNovo,
});

const PAPEIS = [
  "admin",
  "manager",
  "engineer",
  "production",
  "purchasing",
  "assembly",
  "field",
  "sales",
] as const;

function KnowHowNovo() {
  const { role } = useAuth();
  const canAuthor = role === "admin" || role === "manager" || role === "engineer";
  const navigate = useNavigate();
  const { edit } = Route.useSearch();
  const isEdit = Boolean(edit);

  const colecoes = useQuery({
    queryKey: ["kh", "colecoes"],
    queryFn: () => listColecoes(),
    enabled: canAuthor,
  });

  const [colecaoId, setColecaoId] = useState<string>("");
  const [tipo, setTipo] = useState<KhTipo>("artigo");
  const [titulo, setTitulo] = useState("");
  const [resumo, setResumo] = useState("");
  const [corpo, setCorpo] = useState("");
  const [midiaUrl, setMidiaUrl] = useState("");
  const [midiaFileName, setMidiaFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [tags, setTags] = useState("");
  const [papeis, setPapeis] = useState<string[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const existente = useQuery({
    queryKey: ["kh", "item", edit],
    queryFn: () => getItemBySlug({ data: { slug: edit as string } }),
    enabled: canAuthor && isEdit,
  });

  useEffect(() => {
    const it = existente.data;
    if (!it || hydrated) return;
    setEditId(it.id);
    setColecaoId(it.colecao_id);
    setTipo(it.tipo);
    setTitulo(it.titulo);
    setResumo(it.resumo ?? "");
    setCorpo(it.corpo ?? "");
    setMidiaUrl(it.midia_url ?? "");
    setTags((it.tags ?? []).join(", "));
    setPapeis(it.papeis_alvo ?? []);
    setHydrated(true);
  }, [existente.data, hydrated]);

  const MAX_MB = 500;
  const acceptAttr = tipo === "video" ? "video/mp4,video/webm,video/quicktime" : tipo === "pdf" ? "application/pdf" : "*/*";

  async function handleFile(f: File) {
    if (!f) return;
    if (tipo === "video" && !f.type.startsWith("video/")) {
      toast.error("Selecione um arquivo de vídeo (MP4/WebM/MOV).");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      toast.error(`Arquivo excede ${MAX_MB} MB. Use YouTube não listado para vídeos maiores.`);
      return;
    }
    setUploading(true);
    setUploadPct(0);
    try {
      const ext = (f.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${tipo}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from(KH_MEDIA_BUCKET)
        .upload(path, f, { cacheControl: "3600", upsert: false, contentType: f.type });
      if (error) throw error;
      setMidiaUrl(path);
      setMidiaFileName(f.name);
      setUploadPct(100);
      toast.success("Upload concluído.");
    } catch (e) {
      toast.error(`Falha no upload: ${(e as Error).message}`);
    } finally {
      setUploading(false);
    }
  }

  function clearMidia() {
    setMidiaUrl("");
    setMidiaFileName(null);
    setUploadPct(0);
    if (fileRef.current) fileRef.current.value = "";
  }

  const createFn = useServerFn(createItem);
  const updateFn = useServerFn(updateItem);
  const mut = useMutation({
    mutationFn: async (): Promise<{ slug: string }> => {
      if (!colecaoId) throw new Error("Escolha uma coleção.");
      if (titulo.trim().length < 3) throw new Error("Título muito curto.");
      const tagList = tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
        .slice(0, 5);
      if (isEdit && editId) {
        await updateFn({
          data: {
            id: editId,
            titulo: titulo.trim(),
            resumo: resumo.trim() || null,
            corpo: corpo.trim() || null,
            midia_url: midiaUrl.trim() || null,
            tags: tagList,
            papeis_alvo: papeis,
          },
        });
        return { slug: (edit as string) };
      }
      return createFn({
        data: {
          colecao_id: colecaoId,
          tipo,
          titulo: titulo.trim(),
          resumo: resumo.trim() || null,
          corpo: corpo.trim() || null,
          midia_url: midiaUrl.trim() || null,
          tags: tags
            .split(",")
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean)
            .slice(0, 5),
          papeis_alvo: papeis,
        },
      });
    },
    onSuccess: (row) => {
      toast.success(isEdit ? "Alterações salvas." : "Rascunho criado.");
      navigate({ to: "/know-how/$slug", params: { slug: row.slug } });
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  if (!canAuthor) {
    return (
      <PageContainer>
        <p className="text-sm text-[var(--text-muted)]">
          Apenas engenharia, gestão ou administração podem publicar conteúdo.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to="/know-how">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Know-how", href: "/know-how" },
          { label: isEdit ? "Editar conteúdo" : "Novo conteúdo" },
        ]}
        title={isEdit ? "Editar conteúdo" : "Novo conteúdo"}
        subtitle={
          isEdit
            ? "Atualize o material — o fluxo de revisão continua o mesmo."
            : "Publica como rascunho — a revisão de um gestor libera para os papéis-alvo."
        }
      />

      <div className="max-w-3xl space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="mb-1 block text-xs uppercase text-[var(--text-muted)]">Coleção</Label>
            <Select value={colecaoId} onValueChange={setColecaoId}>
              <SelectTrigger><SelectValue placeholder="Escolha…" /></SelectTrigger>
              <SelectContent>
                {(colecoes.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1 block text-xs uppercase text-[var(--text-muted)]">Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as KhTipo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {KH_TIPOS.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="mb-1 block text-xs uppercase text-[var(--text-muted)]">Título</Label>
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={200} />
        </div>

        <div>
          <Label className="mb-1 block text-xs uppercase text-[var(--text-muted)]">Resumo</Label>
          <Textarea
            value={resumo}
            onChange={(e) => setResumo(e.target.value)}
            maxLength={500}
            rows={2}
            placeholder="Uma frase sobre o que a pessoa saberá fazer após consumir."
          />
        </div>

        <div>
          <Label className="mb-1 block text-xs uppercase text-[var(--text-muted)]">
            {tipo === "artigo" ? "Corpo (markdown / texto)" : "Descrição"}
          </Label>
          <Textarea value={corpo} onChange={(e) => setCorpo(e.target.value)} rows={10} />
        </div>

        {tipo !== "artigo" && (
          <div className="space-y-2">
            <Label className="mb-1 block text-xs uppercase text-[var(--text-muted)]">
              Mídia ({tipo === "video" ? "vídeo MP4/WebM/MOV até 500 MB" : tipo === "pdf" ? "arquivo PDF" : "arquivo"})
            </Label>

            {(tipo === "video" || tipo === "pdf") && (
              <div className="rounded-lg border border-dashed border-[var(--bg-border)] bg-[var(--bg-surface)] p-4">
                {midiaUrl && !/^https?:\/\//i.test(midiaUrl) ? (
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{midiaFileName ?? midiaUrl}</p>
                      <p className="text-xs text-[var(--text-muted)]">Enviado para o storage privado</p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={clearMidia}>
                      <X className="mr-1 h-4 w-4" /> Remover
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <input
                      ref={fileRef}
                      type="file"
                      accept={acceptAttr}
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleFile(f);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploading}
                      onClick={() => fileRef.current?.click()}
                    >
                      <Upload className="mr-1.5 h-4 w-4" />
                      {uploading ? `Enviando… ${uploadPct}%` : "Selecionar arquivo"}
                    </Button>
                    <span className="text-xs text-[var(--text-muted)]">
                      ou cole uma URL abaixo (YouTube/Vimeo)
                    </span>
                  </div>
                )}
              </div>
            )}

            <Input
              type="url"
              value={/^https?:\/\//i.test(midiaUrl) ? midiaUrl : ""}
              onChange={(e) => {
                setMidiaUrl(e.target.value);
                setMidiaFileName(null);
              }}
              placeholder="https://youtube.com/… (opcional se já enviou arquivo)"
              disabled={!!midiaUrl && !/^https?:\/\//i.test(midiaUrl)}
            />
          </div>
        )}

        <div>
          <Label className="mb-1 block text-xs uppercase text-[var(--text-muted)]">Tags (separadas por vírgula)</Label>
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="envasadora, eletrica, solda" />
        </div>

        <div>
          <Label className="mb-1 block text-xs uppercase text-[var(--text-muted)]">Papéis-alvo</Label>
          <div className="flex flex-wrap gap-2">
            {PAPEIS.map((p) => {
              const on = papeis.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() =>
                    setPapeis((prev) => (on ? prev.filter((x) => x !== p) : [...prev, p]))
                  }
                  className={
                    "rounded-full border px-2.5 py-1 text-xs capitalize " +
                    (on
                      ? "border-[var(--info)] bg-[var(--info)]/10 text-[var(--info)]"
                      : "border-[var(--bg-border)] text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]")
                  }
                >
                  {p}
                </button>
              );
            })}
          </div>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Vazio = visível para todos os papéis autenticados após publicação.
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={() => mut.mutate()} disabled={mut.isPending || uploading || (isEdit && !editId)}>
            <Save className="mr-1.5 h-4 w-4" />
            {isEdit ? "Salvar alterações" : "Salvar rascunho"}
          </Button>
          <Button asChild variant="outline">
            <Link to="/know-how">Cancelar</Link>
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
