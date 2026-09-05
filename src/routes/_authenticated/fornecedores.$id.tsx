import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";

import {
  ArrowLeft,
  Edit2,
  Save,
  X,
  Archive,
  Plus,
  Trash2,
  MessageSquare,
  Paperclip,
  Download,
  Loader2,
  Phone,
  Mail,
  Globe,
  MapPin,
  Sparkles,
  History,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  MoreHorizontal,
} from "lucide-react";

import { toast } from "sonner";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Flag } from "@/components/ui/flag";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  addNotaFornecedor,
  archiveFornecedor,
  getFornecedor,
  getAnexoSignedUrl,
  listCategoriasFornecedor,
  registerAnexoFornecedor,
  removeAnexoFornecedor,
  removeContatoFornecedor,
  upsertContatoFornecedor,
  upsertFornecedor,
  listScanSubmissoes,
  reenriquecerFornecedor,
  type ScanSubmissaoRow,
} from "@/lib/fornecedores.functions";

import { supabase } from "@/integrations/supabase/client";
import {
  FORNECEDOR_RANKINGS,
  FORNECEDOR_RANKING_COLOR,
  FORNECEDOR_STATUS,
  FORNECEDOR_STATUS_COLOR,
  FORNECEDOR_STATUS_LABEL,
  type ContatoFornecedorInput,
  type FornecedorInput,
  type FornecedorRanking,
  type FornecedorStatus,
} from "@/lib/fornecedores.shared";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/fornecedores/$id")({
  loader: async ({ params, context }) => {
    await context.queryClient.prefetchQuery({
      queryKey: ["fornecedor", params.id],
      queryFn: () => getFornecedor({ data: { id: params.id } }),
    });
    await context.queryClient.prefetchQuery({
      queryKey: ["fornecedores", "categorias"],
      queryFn: () => listCategoriasFornecedor(),
    });
  },
  component: FornecedorDetailPage,
});

function FornecedorDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const detail = useSuspenseQuery({
    queryKey: ["fornecedor", id],
    queryFn: () => getFornecedor({ data: { id } }),
  });
  const categorias = useSuspenseQuery({
    queryKey: ["fornecedores", "categorias"],
    queryFn: () => listCategoriasFornecedor(),
  });

  const f = detail.data.fornecedor;

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FornecedorInput>(() => toForm(f, detail.data.categorias));
  const [novaNota, setNovaNota] = useState("");
  const [contatoOpen, setContatoOpen] = useState(false);
  const [contatoEdit, setContatoEdit] = useState<{
    id?: string;
    patch: ContatoFornecedorInput;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  function reset() {
    setForm(toForm(f, detail.data.categorias));
    setEditing(false);
  }

  const save = useMutation({
    mutationFn: () => upsertFornecedor({ data: { id, patch: form } }),
    onSuccess: () => {
      toast.success("Atualizado");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["fornecedor", id] });
      qc.invalidateQueries({ queryKey: ["fornecedores"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const archive = useMutation({
    mutationFn: () => archiveFornecedor({ data: { id } }),
    onSuccess: () => {
      toast.success("Arquivado");
      navigate({ to: "/fornecedores" });
    },
  });

  const addNota = useMutation({
    mutationFn: () =>
      addNotaFornecedor({
        data: { fornecedor_id: id, texto: novaNota.trim() },
      }),
    onSuccess: () => {
      setNovaNota("");
      qc.invalidateQueries({ queryKey: ["fornecedor", id] });
    },
  });

  const saveContato = useMutation({
    mutationFn: () => {
      if (!contatoEdit) throw new Error("sem contato");
      return upsertContatoFornecedor({
        data: {
          fornecedor_id: id,
          id: contatoEdit.id,
          patch: contatoEdit.patch,
        },
      });
    },
    onSuccess: () => {
      toast.success("Contato salvo");
      setContatoOpen(false);
      setContatoEdit(null);
      qc.invalidateQueries({ queryKey: ["fornecedor", id] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const removeContato = useMutation({
    mutationFn: (cid: string) => removeContatoFornecedor({ data: { id: cid } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fornecedor", id] }),
  });

  const removeAnexo = useMutation({
    mutationFn: (aid: string) => removeAnexoFornecedor({ data: { id: aid } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fornecedor", id] }),
  });

  const submissoes = useQuery({
    queryKey: ["fornecedor", id, "submissoes"],
    queryFn: () => listScanSubmissoes({ data: { fornecedor_id: id } }),
  });

  const reenrich = useMutation({
    mutationFn: () => reenriquecerFornecedor({ data: { fornecedor_id: id } }),
    onSuccess: (res) => {
      if (res.ok && res.web) {
        toast.success("Fornecedor re-enriquecido.");
      } else if (!res.ok) {
        toast.error(res.error ?? "Falha ao re-enriquecer.");
      } else {
        toast.warning("Nenhum dado novo encontrado na web.");
      }
      qc.invalidateQueries({ queryKey: ["fornecedor", id] });
      qc.invalidateQueries({ queryKey: ["fornecedor", id, "submissoes"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  async function downloadAnexo(aid: string) {
    try {
      const { url, nome } = await getAnexoSignedUrl({ data: { id: aid } });
      const a = document.createElement("a");
      a.href = url;
      a.download = nome;
      a.target = "_blank";
      a.rel = "noopener";
      a.click();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function onUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop() ?? "bin";
        const safe = file.name.replace(/[^\w.-]+/g, "_");
        const path = `${id}/${Date.now()}_${safe}`;
        const { error: upErr } = await supabase.storage.from("fornecedores").upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || undefined,
        });
        if (upErr) throw upErr;
        await registerAnexoFornecedor({
          data: {
            fornecedor_id: id,
            storage_path: path,
            nome_original: file.name,
            nome_final: safe,
            mime: file.type || null,
            tamanho: file.size,
            tipo: file.type.startsWith("image/")
              ? "imagem"
              : ext.toLowerCase() === "pdf"
                ? "pdf"
                : "documento",
          },
        });
      }
      qc.invalidateQueries({ queryKey: ["fornecedor", id] });
      toast.success("Anexos enviados");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function toggleCategoria(slug: string) {
    setForm((prev) => ({
      ...prev,
      categorias: prev.categorias.includes(slug)
        ? prev.categorias.filter((s) => s !== slug)
        : [...prev.categorias, slug],
    }));
  }

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Compras", href: "/fornecedores" },
          { label: "Fornecedores", href: "/fornecedores" },
          { label: f.nome },
        ]}
        title={f.nome}
        subtitle={`${f.codigo} · ${FORNECEDOR_STATUS_LABEL[f.status as FornecedorStatus]} · Rank ${f.ranking}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/fornecedores">
                <ArrowLeft className="h-4 w-4" /> Voltar
              </Link>
            </Button>
            {editing ? (
              <>
                <Button variant="outline" onClick={reset}>
                  <X className="h-4 w-4" /> Cancelar
                </Button>
                <Button onClick={() => save.mutate()} disabled={save.isPending}>
                  {save.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}{" "}
                  Salvar
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Edit2 className="h-4 w-4" /> Editar
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" aria-label="Mais ações">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {(() => {
                      const last = (submissoes.data?.rows ?? []).find((r) => r.drive_folder_id);
                      if (!last?.drive_folder_id) return null;
                      const url = `https://drive.google.com/drive/folders/${last.drive_folder_id}`;
                      return (
                        <DropdownMenuItem
                          onSelect={() => {
                            const w = window.open(url, "_blank", "noopener,noreferrer");
                            if (!w) {
                              try {
                                (window.top ?? window).location.href = url;
                              } catch {
                                window.location.href = url;
                              }
                            }
                          }}
                        >
                          <FolderOpen className="h-4 w-4" /> Pasta no Drive
                        </DropdownMenuItem>
                      );
                    })()}
                    <DropdownMenuItem
                      disabled={reenrich.isPending}
                      onSelect={(e) => {
                        e.preventDefault();
                        reenrich.mutate();
                      }}
                    >
                      {reenrich.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}{" "}
                      Re-enriquecer dados
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => {
                        if (confirm("Arquivar fornecedor?")) archive.mutate();
                      }}
                    >
                      <Archive className="h-4 w-4" /> Arquivar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* ===== Coluna principal ===== */}
        <div className="space-y-6">
          <section className="rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-5">
            <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Identificação
            </h3>
            {editing ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <Label>Razão social</Label>
                  <Input
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Nome fantasia</Label>
                  <Input
                    value={form.nome_fantasia ?? ""}
                    onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Site</Label>
                  <Input
                    value={form.site ?? ""}
                    onChange={(e) => setForm({ ...form, site: e.target.value })}
                  />
                </div>
                <div>
                  <Label>País</Label>
                  <Input
                    value={form.pais}
                    maxLength={3}
                    onChange={(e) => setForm({ ...form, pais: e.target.value.toUpperCase() })}
                  />
                </div>
                <div>
                  <Label>Cidade</Label>
                  <Input
                    value={form.cidade ?? ""}
                    onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Endereço</Label>
                  <Input
                    value={form.endereco ?? ""}
                    onChange={(e) => setForm({ ...form, endereco: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <dl className="grid gap-3 text-[13px] md:grid-cols-2">
                <InfoRow icon={<Globe className="h-3.5 w-3.5" />} label="Site">
                  {f.site ? (
                    <a
                      href={f.site.startsWith("http") ? f.site : `https://${f.site}`}
                      target="_blank"
                      rel="noopener"
                      className="text-[var(--primary)] underline"
                    >
                      {f.site}
                    </a>
                  ) : (
                    "—"
                  )}
                </InfoRow>
                <InfoRow icon={<MapPin className="h-3.5 w-3.5" />} label="Localização">
                  <span className="inline-flex items-center gap-1.5">
                    <Flag code={f.pais} className="h-3 w-4.5" />
                    {[f.cidade, f.pais].filter(Boolean).join(" · ") || "—"}
                  </span>
                </InfoRow>
                <InfoRow icon={<Mail className="h-3.5 w-3.5" />} label="E-mail">
                  {f.email_corporativo ? (
                    <a
                      href={`mailto:${f.email_corporativo}`}
                      className="text-[var(--primary)] underline"
                    >
                      {f.email_corporativo}
                    </a>
                  ) : (
                    "—"
                  )}
                </InfoRow>
                <InfoRow icon={<Phone className="h-3.5 w-3.5" />} label="Telefone">
                  {f.telefone_ddi || f.telefone_numero
                    ? `+${f.telefone_ddi ?? ""} ${f.telefone_numero ?? ""}`
                    : "—"}
                </InfoRow>
                {f.endereco ? (
                  <div className="md:col-span-2 text-[12.5px] text-[var(--text-muted)]">
                    {f.endereco}
                  </div>
                ) : null}
              </dl>
            )}
          </section>

          <section className="rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                Contatos
              </h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setContatoEdit({ patch: emptyContato() });
                  setContatoOpen(true);
                }}
              >
                <Plus className="h-3.5 w-3.5" /> Novo contato
              </Button>
            </div>
            {detail.data.contatos.length === 0 ? (
              <p className="text-[12.5px] text-[var(--text-muted)]">Nenhum contato cadastrado.</p>
            ) : (
              <ul className="divide-y divide-[var(--bg-border)]">
                {detail.data.contatos.map((c) => (
                  <li key={c.id} className="flex items-start justify-between gap-3 py-2.5">
                    <div>
                      <div className="text-[13px] font-medium text-[var(--text-primary)]">
                        {c.nome}{" "}
                        {c.principal ? (
                          <Badge variant="secondary" className="ml-1 text-[10px]">
                            principal
                          </Badge>
                        ) : null}
                      </div>
                      <div className="text-[11.5px] text-[var(--text-muted)]">{c.cargo ?? "—"}</div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px] text-[var(--text-secondary)]">
                        {c.email ? <span>{c.email}</span> : null}
                        {c.telefone_numero ? (
                          <span>
                            +{c.telefone_ddi ?? ""} {c.telefone_numero}
                          </span>
                        ) : null}
                        {c.whatsapp ? <span>WA: {c.whatsapp}</span> : null}
                        {c.wechat ? <span>WeChat: {c.wechat}</span> : null}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          setContatoEdit({
                            id: c.id,
                            patch: {
                              nome: c.nome,
                              cargo: c.cargo ?? "",
                              email: c.email ?? "",
                              telefone_ddi: c.telefone_ddi ?? "",
                              telefone_numero: c.telefone_numero ?? "",
                              whatsapp: c.whatsapp ?? "",
                              wechat: c.wechat ?? "",
                              principal: !!c.principal,
                            },
                          });
                          setContatoOpen(true);
                        }}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("Remover contato?")) removeContato.mutate(c.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Tabs defaultValue="anexos">
            <TabsList>
              <TabsTrigger value="anexos">
                <Paperclip className="mr-1.5 h-3.5 w-3.5" /> Anexos
              </TabsTrigger>
              <TabsTrigger value="notas">
                <MessageSquare className="mr-1.5 h-3.5 w-3.5" /> Notas
              </TabsTrigger>
              <TabsTrigger value="submissoes">
                <History className="mr-1.5 h-3.5 w-3.5" /> Submissões
              </TabsTrigger>
              <TabsTrigger value="obs">Observações</TabsTrigger>
            </TabsList>

            <TabsContent value="anexos" className="mt-4">
              <div className="rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                    Anexos ({detail.data.anexos.length})
                  </h3>
                  <label>
                    <input
                      ref={fileRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => onUpload(e.target.files)}
                    />
                    <Button size="sm" variant="outline" asChild disabled={uploading}>
                      <span className="cursor-pointer">
                        {uploading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                        Anexar
                      </span>
                    </Button>
                  </label>
                </div>
                {detail.data.anexos.length === 0 ? (
                  <p className="text-[12.5px] text-[var(--text-muted)]">Nenhum anexo.</p>
                ) : (
                  <ul className="divide-y divide-[var(--bg-border)]">
                    {detail.data.anexos.map((a) => (
                      <li key={a.id} className="flex items-center justify-between py-2">
                        <div>
                          <div className="text-[12.5px] text-[var(--text-primary)]">
                            {a.nome_original}
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)]">
                            {a.tipo} · {formatBytes(a.tamanho ?? 0)}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => downloadAnexo(a.id)}>
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              if (confirm("Remover anexo?")) removeAnexo.mutate(a.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </TabsContent>

            <TabsContent value="notas" className="mt-4">
              <div className="rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-5">
                <div className="flex gap-2">
                  <Textarea
                    rows={2}
                    placeholder="Adicione uma nota interna…"
                    value={novaNota}
                    onChange={(e) => setNovaNota(e.target.value)}
                  />
                  <Button
                    onClick={() => addNota.mutate()}
                    disabled={novaNota.trim().length < 2 || addNota.isPending}
                  >
                    <Plus className="h-4 w-4" /> Adicionar
                  </Button>
                </div>
                <ul className="mt-4 space-y-3">
                  {detail.data.notas.length === 0 ? (
                    <p className="text-[12.5px] text-[var(--text-muted)]">Nenhuma nota ainda.</p>
                  ) : (
                    detail.data.notas.map((n) => (
                      <li
                        key={n.id}
                        className="rounded-md border border-[var(--bg-border)] bg-[var(--bg-base)] p-3"
                      >
                        <div className="mb-1 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                          <span>{n.user_nome ?? "Usuário"}</span>
                          <span>{new Date(n.created_at).toLocaleString("pt-BR")}</span>
                        </div>
                        <div className="whitespace-pre-wrap text-[13px] text-[var(--text-primary)]">
                          {n.texto}
                        </div>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="submissoes" className="mt-4">
              <SubmissoesPanel rows={submissoes.data?.rows ?? []} loading={submissoes.isLoading} />
            </TabsContent>

            <TabsContent value="obs" className="mt-4">
              <div className="rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-5">
                {editing ? (
                  <Textarea
                    rows={6}
                    value={form.observacoes ?? ""}
                    onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-[13px] text-[var(--text-secondary)]">
                    {f.observacoes || "Sem observações."}
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* ===== Coluna lateral ===== */}
        <aside className="space-y-6">
          <section className="rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-5">
            <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Classificação
            </h3>
            {editing ? (
              <div className="space-y-3">
                <div>
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        status: v as FornecedorInput["status"],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FORNECEDOR_STATUS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {FORNECEDOR_STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Ranking</Label>
                  <Select
                    value={form.ranking}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        ranking: v as FornecedorInput["ranking"],
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FORNECEDOR_RANKINGS.map((r) => (
                        <SelectItem key={r} value={r}>
                          Rank {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-[13px]">
                <div>
                  Status:{" "}
                  <span
                    className={cn(
                      "ml-1 inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
                      FORNECEDOR_STATUS_COLOR[f.status as FornecedorStatus],
                    )}
                  >
                    {FORNECEDOR_STATUS_LABEL[f.status as FornecedorStatus]}
                  </span>
                </div>
                <div>
                  Ranking:{" "}
                  <span
                    className={cn(
                      "ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10.5px] font-bold",
                      FORNECEDOR_RANKING_COLOR[f.ranking as FornecedorRanking],
                    )}
                  >
                    {f.ranking}
                  </span>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-5">
            <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Categorias
            </h3>
            {editing ? (
              <div className="flex flex-wrap gap-1.5">
                {categorias.data.map((c) => {
                  const active = form.categorias.includes(c.slug);
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => toggleCategoria(c.slug)}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11.5px] transition",
                        active
                          ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                          : "border-[var(--bg-border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]",
                      )}
                    >
                      {c.nome_pt}
                    </button>
                  );
                })}
              </div>
            ) : detail.data.categorias.length === 0 ? (
              <p className="text-[12.5px] text-[var(--text-muted)]">Sem categorias.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {detail.data.categorias.map((slug) => {
                  const c = categorias.data.find((x) => x.slug === slug);
                  return (
                    <Badge key={slug} variant="secondary">
                      {c?.nome_pt ?? slug}
                    </Badge>
                  );
                })}
              </div>
            )}
          </section>

          <SidebarChipsEditor
            title="Tags"
            editing={editing}
            values={editing ? (form.tags ?? []) : (f.tags ?? [])}
            onChange={(v) => setForm((p) => ({ ...p, tags: v }))}
            placeholder="adicione tag e pressione Enter"
          />

          <SidebarChipsEditor
            title="Palavras-chave"
            editing={editing}
            values={
              editing
                ? (form.palavras_chave ?? [])
                : ((f as unknown as { palavras_chave?: string[] | null }).palavras_chave ?? [])
            }
            onChange={(v) => setForm((p) => ({ ...p, palavras_chave: v }))}
            placeholder="ex.: válvula, inox 304, fundição"
          />

          <SidebarChipsEditor
            title="Certificações"
            editing={editing}
            values={
              editing
                ? (form.certificacoes ?? [])
                : ((f as unknown as { certificacoes?: string[] | null }).certificacoes ?? [])
            }
            onChange={(v) => setForm((p) => ({ ...p, certificacoes: v }))}
            placeholder="ex.: ISO 9001, CE, RoHS"
          />

          <CommercialCard editing={editing} form={form} f={f} setForm={setForm} />
        </aside>
      </div>

      {/* Contato modal */}
      <Dialog
        open={contatoOpen}
        onOpenChange={(o) => {
          setContatoOpen(o);
          if (!o) setContatoEdit(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{contatoEdit?.id ? "Editar contato" : "Novo contato"}</DialogTitle>
          </DialogHeader>
          {contatoEdit ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label>Nome *</Label>
                <Input
                  value={contatoEdit.patch.nome}
                  onChange={(e) =>
                    setContatoEdit({
                      ...contatoEdit,
                      patch: { ...contatoEdit.patch, nome: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label>Cargo</Label>
                <Input
                  value={contatoEdit.patch.cargo ?? ""}
                  onChange={(e) =>
                    setContatoEdit({
                      ...contatoEdit,
                      patch: { ...contatoEdit.patch, cargo: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input
                  value={contatoEdit.patch.email ?? ""}
                  onChange={(e) =>
                    setContatoEdit({
                      ...contatoEdit,
                      patch: { ...contatoEdit.patch, email: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label>DDI</Label>
                <Input
                  value={contatoEdit.patch.telefone_ddi ?? ""}
                  onChange={(e) =>
                    setContatoEdit({
                      ...contatoEdit,
                      patch: {
                        ...contatoEdit.patch,
                        telefone_ddi: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input
                  value={contatoEdit.patch.telefone_numero ?? ""}
                  onChange={(e) =>
                    setContatoEdit({
                      ...contatoEdit,
                      patch: {
                        ...contatoEdit.patch,
                        telefone_numero: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input
                  value={contatoEdit.patch.whatsapp ?? ""}
                  onChange={(e) =>
                    setContatoEdit({
                      ...contatoEdit,
                      patch: { ...contatoEdit.patch, whatsapp: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <Label>WeChat</Label>
                <Input
                  value={contatoEdit.patch.wechat ?? ""}
                  onChange={(e) =>
                    setContatoEdit({
                      ...contatoEdit,
                      patch: { ...contatoEdit.patch, wechat: e.target.value },
                    })
                  }
                />
              </div>
              <label className="md:col-span-2 mt-1 inline-flex cursor-pointer items-center gap-2 text-[12.5px]">
                <input
                  type="checkbox"
                  checked={contatoEdit.patch.principal}
                  onChange={(e) =>
                    setContatoEdit({
                      ...contatoEdit,
                      patch: {
                        ...contatoEdit.patch,
                        principal: e.target.checked,
                      },
                    })
                  }
                />
                Marcar como contato principal
              </label>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setContatoOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => saveContato.mutate()} disabled={saveContato.isPending}>
              {saveContato.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 text-[13px] text-[var(--text-primary)]">{children}</dd>
    </div>
  );
}

function toForm(
  f: Awaited<ReturnType<typeof getFornecedor>>["fornecedor"],
  cats: string[],
): FornecedorInput {
  const x = f as unknown as Record<string, unknown>;
  const s = (k: string) => (x[k] as string | null | undefined) ?? "";
  const n = (k: string) =>
    (x[k] as number | null | undefined) ?? (null as unknown as number | null);
  const arr = (k: string) => (x[k] as string[] | null | undefined) ?? [];
  return {
    nome: f.nome,
    nome_fantasia: f.nome_fantasia ?? "",
    pais: f.pais,
    cidade: f.cidade ?? "",
    endereco: f.endereco ?? "",
    site: f.site ?? "",
    email_corporativo: f.email_corporativo ?? "",
    telefone_ddi: f.telefone_ddi ?? "",
    telefone_numero: f.telefone_numero ?? "",
    idioma: f.idioma ?? "en",
    ranking: f.ranking as FornecedorRanking,
    status: f.status as FornecedorStatus,
    observacoes: f.observacoes ?? "",
    tags: f.tags ?? [],
    palavras_chave: arr("palavras_chave"),
    categorias: cats,
    certificacoes: arr("certificacoes"),
    tax_id: s("tax_id"),
    tax_id_tipo: s("tax_id_tipo"),
    incorporation_year: n("incorporation_year"),
    legal_name_local: s("legal_name_local"),
    moeda_padrao: s("moeda_padrao"),
    incoterm_padrao: s("incoterm_padrao"),
    porto_origem: s("porto_origem"),
    lead_time_dias: n("lead_time_dias"),
    moq: n("moq"),
    payment_terms: s("payment_terms"),
    condicao_pagamento_dias: n("condicao_pagamento_dias"),
    funcionarios_faixa: s("funcionarios_faixa"),
    fabrica_area_m2: n("fabrica_area_m2"),
    capacidade_mensal: s("capacidade_mensal"),
    auditado_em: s("auditado_em"),
    auditor: s("auditor"),
    score_qualidade: n("score_qualidade"),
    score_entrega: n("score_entrega"),
    score_preco: n("score_preco"),
    whatsapp_corp: s("whatsapp_corp"),
    wechat_corp: s("wechat_corp"),
    linkedin_url: s("linkedin_url"),
    alibaba_url: s("alibaba_url"),
    made_in_china_url: s("made_in_china_url"),
    endereco_cep: s("endereco_cep"),
    endereco_estado_provincia: s("endereco_estado_provincia"),
    fuso_horario: s("fuso_horario"),
    responsavel_interno_user_id: s("responsavel_interno_user_id"),
    proxima_revisao_em: s("proxima_revisao_em"),
    motivo_bloqueio: s("motivo_bloqueio"),
    inscricao_estadual: s("inscricao_estadual"),
    inscricao_municipal: s("inscricao_municipal"),
    regime_tributario: s("regime_tributario"),
    situacao_cadastral: s("situacao_cadastral"),
    data_abertura: s("data_abertura"),
    capital_social: n("capital_social"),
    natureza_juridica: s("natureza_juridica"),
    cnae_principal: s("cnae_principal"),
    cnaes_secundarios: arr("cnaes_secundarios"),
  };
}

function emptyContato(): ContatoFornecedorInput {
  return {
    nome: "",
    cargo: "",
    email: "",
    telefone_ddi: "",
    telefone_numero: "",
    whatsapp: "",
    wechat: "",
    principal: false,
  };
}

function formatBytes(n: number) {
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(n) / Math.log(1024));
  return `${(n / Math.pow(1024, i)).toFixed(1)} ${u[i]}`;
}

function SubmissoesPanel({ rows, loading }: { rows: ScanSubmissaoRow[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[12.5px] text-[var(--text-muted)]">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando histórico…
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--bg-border)] bg-[var(--bg-surface)] p-6 text-center text-[12.5px] text-[var(--text-muted)]">
        Nenhuma submissão registrada ainda.
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const ext = (r.extracted ?? null) as null | Record<string, unknown>;
        const enr = (r.enrichment ?? null) as null | Record<string, unknown>;
        const files = Array.isArray(r.drive_files)
          ? (r.drive_files as Array<{ id: string; url: string; nome: string }>)
          : [];
        const folderUrl = r.drive_folder_id
          ? `https://drive.google.com/drive/folders/${r.drive_folder_id}`
          : null;
        return (
          <li
            key={r.id}
            className="rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4"
          >
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {r.ok ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-rose-600" />
                )}
                <span className="text-[12.5px] font-medium text-[var(--text-primary)]">
                  {r.origem === "reenrich" ? "Re-enriquecimento" : "Scan"}
                </span>
                <span className="text-[11.5px] text-[var(--text-muted)]">
                  {new Date(r.created_at).toLocaleString("pt-BR")}
                </span>
                {r.created_by_email && (
                  <span className="text-[11.5px] text-[var(--text-muted)]">
                    · {r.created_by_email}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {r.imagens_count > 0 && (
                  <span className="rounded bg-[var(--bg-elevated)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)]">
                    {r.imagens_count} imagem(ns)
                  </span>
                )}
                {folderUrl && (
                  <a
                    href={folderUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    onClick={(e) => {
                      const w = window.open(folderUrl, "_blank", "noopener,noreferrer");
                      if (!w) {
                        e.preventDefault();
                        try {
                          (window.top ?? window).location.href = folderUrl;
                        } catch {
                          window.location.href = folderUrl;
                        }
                      }
                    }}
                    className="inline-flex items-center gap-1 text-[11.5px] text-blue-700 hover:underline"
                  >
                    Pasta Drive <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            {r.error && (
              <p className="rounded bg-rose-50 px-2 py-1 text-[11.5px] text-rose-700">{r.error}</p>
            )}

            <div className="mt-2 grid gap-3 lg:grid-cols-2">
              {ext && (
                <div className="rounded border border-[var(--bg-border)] bg-[var(--bg-base)] p-2">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    OCR / Traduzido
                  </div>
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-[11.5px] text-[var(--text-secondary)]">
                    {JSON.stringify(ext, null, 2)}
                  </pre>
                  {r.endereco_original && (
                    <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                      Endereço original: <span className="font-mono">{r.endereco_original}</span>
                    </p>
                  )}
                </div>
              )}
              {enr && (
                <div className="rounded border border-[var(--bg-border)] bg-[var(--bg-base)] p-2">
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                    Enriquecimento web
                  </div>
                  <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words text-[11.5px] text-[var(--text-secondary)]">
                    {JSON.stringify(enr, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {files.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 text-[11.5px]">
                {files.map((f) => (
                  <a
                    key={f.id}
                    href={f.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded border border-[var(--bg-border)] bg-[var(--bg-base)] px-2 py-1 text-blue-700 hover:bg-[var(--bg-elevated)]"
                  >
                    {f.nome} <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// ============================================================
// Sidebar helpers — chips editor + comercial/qualidade card
// ============================================================

function SidebarChipsEditor({
  title,
  editing,
  values,
  onChange,
  placeholder,
}: {
  title: string;
  editing: boolean;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  if (!editing && (!values || values.length === 0)) return null;
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (values.includes(v)) {
      setDraft("");
      return;
    }
    onChange([...values, v]);
    setDraft("");
  };
  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-5">
      <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
        {title}
      </h3>
      <div className="flex flex-wrap gap-1">
        {values.map((t) => (
          <Badge key={t} variant="outline" className="text-[10.5px] gap-1 pr-1">
            {t}
            {editing && (
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== t))}
                className="ml-0.5 rounded p-0.5 hover:bg-rose-100 hover:text-rose-700"
                aria-label={`remover ${t}`}
              >
                ×
              </button>
            )}
          </Badge>
        ))}
        {editing && values.length === 0 && (
          <span className="text-[11.5px] text-[var(--text-muted)]">nenhum ainda</span>
        )}
      </div>
      {editing && (
        <div className="mt-2 flex gap-1.5">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder={placeholder}
            className="h-7 text-[12px]"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={add}
            className="h-7 px-2 text-[11.5px]"
          >
            +
          </Button>
        </div>
      )}
    </section>
  );
}

function CommercialCard({
  editing,
  form,
  f,
  setForm,
}: {
  editing: boolean;
  form: FornecedorInput;
  f: Awaited<ReturnType<typeof getFornecedor>>["fornecedor"];
  setForm: React.Dispatch<React.SetStateAction<FornecedorInput>>;
}) {
  const x = f as unknown as Record<string, unknown>;
  const fields: Array<{
    label: string;
    key: keyof FornecedorInput;
    type?: "text" | "number";
    placeholder?: string;
  }> = [
    { label: "Incoterm", key: "incoterm_padrao", placeholder: "FOB, EXW…" },
    { label: "Moeda", key: "moeda_padrao", placeholder: "USD" },
    { label: "Porto de origem", key: "porto_origem", placeholder: "Shanghai" },
    { label: "Lead time (dias)", key: "lead_time_dias", type: "number" },
    { label: "MOQ", key: "moq", type: "number" },
    { label: "Payment terms", key: "payment_terms", placeholder: "T/T 30/70" },
    { label: "Funcionários", key: "funcionarios_faixa", placeholder: "50-200" },
    { label: "Fábrica (m²)", key: "fabrica_area_m2", type: "number" },
    { label: "Capacidade mensal", key: "capacidade_mensal" },
    { label: "Tax ID", key: "tax_id" },
    { label: "Tipo Tax ID", key: "tax_id_tipo", placeholder: "USCC, EIN…" },
    {
      label: "Ano fundação",
      key: "incorporation_year",
      type: "number",
    },
    { label: "LinkedIn", key: "linkedin_url" },
    { label: "Alibaba", key: "alibaba_url" },
    { label: "Made-in-China", key: "made_in_china_url" },
  ];
  const hasAnyValue = fields.some((fd) => {
    const v = x[fd.key as string];
    return v !== null && v !== undefined && v !== "";
  });
  if (!editing && !hasAnyValue) return null;
  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-5">
      <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
        Comercial & identidade
      </h3>
      {editing ? (
        <div className="grid grid-cols-2 gap-2">
          {fields.map((fd) => {
            const v = (form as unknown as Record<string, unknown>)[fd.key as string];
            return (
              <div key={fd.key as string} className="col-span-1">
                <Label className="text-[11px]">{fd.label}</Label>
                <Input
                  className="h-7 text-[12px]"
                  type={fd.type ?? "text"}
                  placeholder={fd.placeholder}
                  value={v === null || v === undefined ? "" : (v as string | number).toString()}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      [fd.key]:
                        fd.type === "number"
                          ? e.target.value === ""
                            ? null
                            : Number(e.target.value)
                          : e.target.value,
                    }))
                  }
                />
              </div>
            );
          })}
        </div>
      ) : (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
          {fields.map((fd) => {
            const v = x[fd.key as string];
            if (v === null || v === undefined || v === "") return null;
            const isLink = typeof v === "string" && /^https?:\/\//.test(v);
            return (
              <div key={fd.key as string}>
                <dt className="text-[10.5px] uppercase tracking-wide text-[var(--text-muted)]">
                  {fd.label}
                </dt>
                <dd className="truncate text-[var(--text-primary)]">
                  {isLink ? (
                    <a
                      href={v as string}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-700 hover:underline"
                    >
                      abrir
                    </a>
                  ) : (
                    String(v)
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </section>
  );
}
