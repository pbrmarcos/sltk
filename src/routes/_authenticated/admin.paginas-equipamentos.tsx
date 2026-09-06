/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Trash2,
  ExternalLink,
  Sparkles,
  Save,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { AccessDenied } from "@/components/layout/AccessDenied";
import { SeoFieldsCard } from "@/components/admin/SeoFieldsCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  adminListPaginas,
  adminGetPagina,
  adminUpdatePagina,
  adminAddBloco,
  adminUpdateBloco,
  adminDeleteBloco,
  adminReordenarBlocos,
} from "@/lib/equipamento-pagina.functions";
import {
  BLOCO_LABEL,
  type BlocoTipo,
  type EquipamentoBloco,
  type IdiomaPagina,
} from "@/lib/equipamento-pagina.shared";
import { BlocoFormulario } from "@/components/admin/equipamento-pagina/bloco-formularios";
import { RenderBloco } from "@/components/equipamentos/blocos/Blocos";

export const Route = createFileRoute("/_authenticated/admin/paginas-equipamentos")({
  component: Page,
});

function Page() {
  const { role } = useAuth();
  if (role !== "admin") {
    return (
      <PageContainer>
        <AccessDenied message="Esta área é exclusiva para administradores." />
      </PageContainer>
    );
  }
  return <Inner />;
}

function Inner() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [selecionada, setSelecionada] = useState<string | null>(null);

  const listQ = useQuery({
    queryKey: ["admin-paginas-equipamentos"],
    queryFn: () => adminListPaginas(),
  });

  const filtradas = useMemo(() => {
    const t = busca.trim().toLowerCase();
    const rows = listQ.data ?? [];
    if (!t) return rows;
    return rows.filter(
      (r: any) =>
        r.nome_pt.toLowerCase().includes(t) ||
        r.slug.toLowerCase().includes(t) ||
        (r.familia ?? "").toLowerCase().includes(t),
    );
  }, [busca, listQ.data]);

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Páginas dos Equipamentos" }]}
        title="Páginas dos Equipamentos"
        subtitle="Edite as páginas públicas de cada equipamento por blocos. Somente administradores."
      />
      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <aside className="rounded-lg border border-border bg-card">
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar equipamento…"
                className="pl-8"
              />
            </div>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {listQ.isLoading && (
              <p className="p-6 text-center text-sm text-muted-foreground">Carregando…</p>
            )}
            {!listQ.isLoading && filtradas.length === 0 && (
              <p className="p-6 text-center text-sm text-muted-foreground">
                Nenhum equipamento encontrado.
              </p>
            )}
            <ul className="divide-y divide-border">
              {filtradas.map((r: any) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelecionada(r.id)}
                    className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-muted/50 ${
                      selecionada === r.id ? "bg-muted" : ""
                    }`}
                  >
                    <div>
                      <div className="text-sm font-medium">{r.nome_pt}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        /{r.slug}
                        {r.familia ? ` · ${r.familia}` : ""}
                      </div>
                    </div>
                    <Badge variant={r.publicado ? "default" : "outline"} className="shrink-0">
                      {r.publicado ? "Publicado" : "Rascunho"}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
        <main>
          {!selecionada ? (
            <div className="flex h-[400px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-center text-sm text-muted-foreground">
              Selecione um equipamento à esquerda para editar sua página.
            </div>
          ) : (
            <Editor
              key={selecionada}
              paginaId={selecionada}
              onSaved={() => qc.invalidateQueries({ queryKey: ["admin-paginas-equipamentos"] })}
            />
          )}
        </main>
      </div>
    </PageContainer>
  );
}

function Editor({ paginaId, onSaved }: { paginaId: string; onSaved: () => void }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-pagina", paginaId],
    queryFn: () => adminGetPagina({ data: { pagina_id: paginaId } }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-pagina", paginaId] });

  const publicar = useMutation({
    mutationFn: (publicado: boolean) =>
      adminUpdatePagina({ data: { pagina_id: paginaId, publicado } }),
    onSuccess: () => {
      toast.success("Página atualizada.");
      invalidate();
      onSaved();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updatePagina = useMutation({
    mutationFn: (patch: any) => adminUpdatePagina({ data: { pagina_id: paginaId, ...patch } }),
    onSuccess: () => {
      toast.success("SEO salvo.");
      invalidate();
      onSaved();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addBloco = useMutation({
    mutationFn: (tipo: BlocoTipo) =>
      adminAddBloco({ data: { pagina_id: paginaId, tipo_bloco: tipo } }),
    onSuccess: () => {
      toast.success("Bloco adicionado.");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (q.isLoading)
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-sm">
        Carregando…
      </div>
    );
  if (!q.data) return null;
  const { pagina, blocos } = q.data;

  const slugPublico = `/equipamentos/${pagina.slug}`;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{pagina.nome_pt}</h2>
            <div className="mt-0.5 text-xs text-muted-foreground">
              slug: <code className="rounded bg-muted px-1.5 py-0.5">{pagina.slug}</code> · código:{" "}
              {pagina.codigo}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch checked={pagina.publicado} onCheckedChange={(v) => publicar.mutate(!!v)} />
              <span className="text-sm font-medium">
                {pagina.publicado ? "Publicada" : "Rascunho"}
              </span>
            </div>
            <Button variant="outline" asChild>
              <a href={slugPublico} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1.5 h-4 w-4" />
                Ver
              </a>
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="blocos">
        <TabsList>
          <TabsTrigger value="blocos">Blocos ({blocos.length})</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>
        <TabsContent value="blocos" className="mt-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Reorganize com as setas, alterne visibilidade com o olho, edite o conteúdo direto no
              cartão.
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Adicionar bloco
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(Object.keys(BLOCO_LABEL) as BlocoTipo[]).map((t) => (
                  <DropdownMenuItem key={t} onClick={() => addBloco.mutate(t)}>
                    {BLOCO_LABEL[t]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-3">
            {blocos.length === 0 && (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                Nenhum bloco. Adicione um para começar.
              </div>
            )}
            {blocos.map((b, i) => (
              <BlocoCard
                key={b.id}
                bloco={b}
                canUp={i > 0}
                canDown={i < blocos.length - 1}
                onMove={(dir) => {
                  const other = blocos[i + dir];
                  if (!other) return;
                  adminReordenarBlocos({
                    data: {
                      ordem: [
                        { bloco_id: b.id, ordem: other.ordem },
                        { bloco_id: other.id, ordem: b.ordem },
                      ],
                    },
                  }).then(invalidate);
                }}
                onChanged={invalidate}
              />
            ))}
          </div>
        </TabsContent>
        <TabsContent value="seo" className="mt-4">
          <SeoForm pagina={pagina} onSave={(patch) => updatePagina.mutate(patch)} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SeoForm({ pagina, onSave }: { pagina: any; onSave: (patch: any) => void }) {
  const [form, setForm] = useState({
    seo_title_pt: pagina.seo_title_pt ?? "",
    seo_description_pt: pagina.seo_description_pt ?? "",
    og_image_url: pagina.og_image_url ?? "",
  });
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="grid gap-4">
        <SeoFieldsCard
          className="grid gap-4"
          title={form.seo_title_pt}
          onTitleChange={(v) => setForm({ ...form, seo_title_pt: v })}
          description={form.seo_description_pt}
          onDescriptionChange={(v) => setForm({ ...form, seo_description_pt: v })}
          ogImage={form.og_image_url}
          onOgImageChange={(v) => setForm({ ...form, og_image_url: v })}
          showOgImagePreview
        />
        <div className="flex justify-end">
          <Button onClick={() => onSave(form)}>
            <Save className="mr-1.5 h-4 w-4" />
            Salvar SEO
          </Button>
        </div>
      </div>
    </div>
  );
}

function BlocoCard({
  bloco,
  canUp,
  canDown,
  onMove,
  onChanged,
}: {
  bloco: EquipamentoBloco;
  canUp: boolean;
  canDown: boolean;
  onMove: (dir: -1 | 1) => void;
  onChanged: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [conteudo, setConteudo] = useState<Record<string, unknown>>(bloco.conteudo_json);
  const [idiomaPreview, setIdiomaPreview] = useState<IdiomaPagina>("pt");
  const [saving, setSaving] = useState(false);

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <div>
            <div className="text-sm font-semibold">{BLOCO_LABEL[bloco.tipo_bloco]}</div>
            <div className="text-xs text-muted-foreground">ordem {bloco.ordem}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" disabled={!canUp} onClick={() => onMove(-1)}>
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" disabled={!canDown} onClick={() => onMove(1)}>
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={async () => {
              await adminUpdateBloco({ data: { bloco_id: bloco.id, visivel: !bloco.visivel } });
              onChanged();
            }}
            title={bloco.visivel ? "Ocultar" : "Mostrar"}
          >
            {bloco.visivel ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={async () => {
              if (!confirm("Remover este bloco?")) return;
              await adminDeleteBloco({ data: { bloco_id: bloco.id } });
              onChanged();
              toast.success("Bloco removido.");
            }}
            title="Remover"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Fechar" : "Editar"}
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="border-t border-border bg-muted/20 p-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <BlocoFormulario tipo={bloco.tipo_bloco} value={conteudo} onChange={setConteudo} />
              <div className="mt-4 flex justify-end">
                <Button
                  disabled={saving}
                  onClick={async () => {
                    try {
                      setSaving(true);
                      await adminUpdateBloco({
                        data: {
                          bloco_id: bloco.id,
                          tipo_bloco: bloco.tipo_bloco,
                          conteudo_json: conteudo,
                        },
                      });
                      toast.success("Bloco salvo.");
                      onChanged();
                    } catch (e: any) {
                      toast.error(e.message);
                    } finally {
                      setSaving(false);
                    }
                  }}
                >
                  <Save className="mr-1.5 h-4 w-4" />
                  Salvar bloco
                </Button>
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Preview</span>
                <div className="flex gap-1">
                  {(["pt", "es", "en"] as const).map((idi) => (
                    <Button
                      key={idi}
                      type="button"
                      size="sm"
                      variant={idiomaPreview === idi ? "default" : "outline"}
                      className="h-7 px-2.5 text-xs uppercase"
                      onClick={() => setIdiomaPreview(idi)}
                    >
                      {idi}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="max-h-[600px] overflow-y-auto overflow-x-auto rounded-md border border-border">
                <div className="min-w-[900px]">
                  <RenderBloco
                    bloco={{ ...bloco, conteudo_json: conteudo }}
                    idioma={idiomaPreview}
                    ctaHref="#"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
