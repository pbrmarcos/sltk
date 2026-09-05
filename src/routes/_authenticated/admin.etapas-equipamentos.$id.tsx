/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  ShieldAlert,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  History,
  RotateCcw,
  CheckCircle2,
  Download,
  Upload,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getEtapaTemplate,
  updateEtapaTemplate,
  deleteEtapaTemplateItem,
  reorderEtapaTemplateItens,
  deleteEtapaTemplateBomItem,
  publishEtapaTemplate,
  revertEtapaTemplateVersao,
  DISCIPLINAS,
} from "@/lib/etapa-templates.functions";
import { EtapaDialog } from "@/components/admin/etapas/EtapaDialog";
import { BomDialog } from "@/components/admin/etapas/BomDialog";
import { ExcelSyncDialog, downloadTemplateXlsx } from "@/components/admin/etapas/ExcelSyncDialog";

export const Route = createFileRoute("/_authenticated/admin/etapas-equipamentos/$id")({
  component: Page,
});

const DISCIPLINA_LABEL: Record<string, string> = {
  planejamento: "Planejamento",
  engenharia: "Engenharia",
  producao: "Automação/Elétrica",
  qualidade: "Qualidade",
  pos_venda: "Pós-venda",
};

function Page() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [openHist, setOpenHist] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editingBom, setEditingBom] = useState<any | null>(null);
  const [excelOpen, setExcelOpen] = useState(false);

  const authorized = role === "admin" || role === "manager" || role === "engineer";

  const { data, isLoading } = useQuery({
    queryKey: ["etapa-tpl", id],
    queryFn: () => getEtapaTemplate({ data: { id } }),
    enabled: authorized,
  });

  const patch = useMutation({
    mutationFn: (v: any) => updateEtapaTemplate({ data: { id, ...v } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["etapa-tpl", id] });
      qc.invalidateQueries({ queryKey: ["etapa-tpl-list"] });
    },
  });

  const publishMut = useMutation({
    mutationFn: (comentario: string) => publishEtapaTemplate({ data: { id, comentario } }),
    onSuccess: (r: any) => {
      toast.success(`Publicado v${r.versao}.`);
      qc.invalidateQueries({ queryKey: ["etapa-tpl", id] });
      qc.invalidateQueries({ queryKey: ["etapa-tpl-list"] });
    },
  });

  const reorderMut = useMutation({
    mutationFn: (v: { disciplina: string; idsInOrder: string[] }) =>
      reorderEtapaTemplateItens({
        data: { templateId: id, disciplina: v.disciplina as any, idsInOrder: v.idsInOrder },
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["etapa-tpl", id] }),
  });

  const deleteItem = useMutation({
    mutationFn: (itemId: string) => deleteEtapaTemplateItem({ data: { id: itemId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["etapa-tpl", id] });
      toast.success("Etapa removida.");
    },
  });

  const deleteBom = useMutation({
    mutationFn: (bomId: string) => deleteEtapaTemplateBomItem({ data: { id: bomId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["etapa-tpl", id] });
      toast.success("Item BOM removido.");
    },
  });

  const itens = (data?.itens ?? []) as any[];
  const bom = (data?.bom ?? []) as any[];
  const tpl = data?.template;

  const itensByDisc = useMemo(() => {
    const m: Record<string, any[]> = {};
    for (const d of DISCIPLINAS) m[d] = [];
    for (const it of itens) m[it.disciplina]?.push(it);
    for (const d of DISCIPLINAS) m[d].sort((a, b) => a.ordem - b.ordem);
    return m;
  }, [itens]);

  function move(disc: string, itemId: string, delta: number) {
    const arr = [...(itensByDisc[disc] ?? [])];
    const idx = arr.findIndex((x) => x.id === itemId);
    const to = idx + delta;
    if (idx < 0 || to < 0 || to >= arr.length) return;
    const [x] = arr.splice(idx, 1);
    arr.splice(to, 0, x);
    reorderMut.mutate({ disciplina: disc, idsInOrder: arr.map((y) => y.id) });
  }

  if (!authorized) {
    return (
      <PageContainer>
        <div className="mx-auto max-w-md rounded-lg border border-border bg-card p-6 text-center">
          <ShieldAlert className="mx-auto mb-2 h-6 w-6 text-amber-600" />
          <p className="text-sm font-medium">Acesso restrito</p>
        </div>
      </PageContainer>
    );
  }

  if (isLoading || !data || !tpl)
    return (
      <PageContainer>
        <p className="text-muted-foreground text-sm">Carregando…</p>
      </PageContainer>
    );

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Etapas dos Equipamentos", href: "/admin/etapas-equipamentos" },
          { label: tpl.nome },
        ]}
        title={tpl.nome}
        subtitle={`Slug: ${tpl.slug} • v${tpl.versao_atual}`}
        actions={
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin/etapas-equipamentos">
                <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setOpenHist(true)}>
              <History className="mr-1 h-4 w-4" /> Histórico
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                downloadTemplateXlsx(tpl, itens, bom).catch((e) =>
                  toast.error(e?.message ?? "Falha no download"),
                )
              }
            >
              <Download className="mr-1 h-4 w-4" /> Baixar Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => setExcelOpen(true)}>
              <Upload className="mr-1 h-4 w-4" /> Importar Excel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const c = prompt("Comentário da publicação:", "");
                if (c !== null) publishMut.mutate(c);
              }}
            >
              <CheckCircle2 className="mr-1 h-4 w-4" /> Publicar nova versão
            </Button>
          </div>
        }
      />

      {/* Cabeçalho editável */}
      <div className="mb-6 grid gap-3 rounded-lg border border-border bg-card p-4 md:grid-cols-2">
        <div>
          <Label>Nome</Label>
          <Input
            defaultValue={tpl.nome}
            onBlur={(e) => e.target.value !== tpl.nome && patch.mutate({ nome: e.target.value })}
          />
        </div>
        <div>
          <Label>Família</Label>
          <Input
            defaultValue={tpl.familia ?? ""}
            onBlur={(e) => patch.mutate({ familia: e.target.value || null })}
          />
        </div>
        <div className="md:col-span-2">
          <Label>Descrição</Label>
          <Textarea
            defaultValue={tpl.descricao ?? ""}
            rows={2}
            onBlur={(e) => patch.mutate({ descricao: e.target.value || null })}
          />
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={tpl.publicado} onCheckedChange={(v) => patch.mutate({ publicado: v })} />
          <Label className="cursor-pointer">Publicado (usado por orçamentos aprovados)</Label>
        </div>
      </div>

      <Tabs defaultValue="planejamento">
        <TabsList className="flex flex-wrap">
          {DISCIPLINAS.map((d) => (
            <TabsTrigger key={d} value={d}>
              {DISCIPLINA_LABEL[d]}{" "}
              <Badge variant="secondary" className="ml-2">
                {itensByDisc[d].length}
              </Badge>
            </TabsTrigger>
          ))}
          <TabsTrigger value="bom">
            BOM sugerido{" "}
            <Badge variant="secondary" className="ml-2">
              {bom.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {DISCIPLINAS.map((d) => (
          <TabsContent key={d} value={d} className="mt-4">
            <div className="mb-3 flex justify-end">
              <Button
                size="sm"
                onClick={() => setEditingItem({ disciplina: d, prioridade: "media" })}
              >
                <Plus className="mr-1 h-4 w-4" /> Nova etapa
              </Button>
            </div>
            <div className="rounded-lg border border-border bg-card">
              {itensByDisc[d].length === 0 && (
                <p className="p-4 text-center text-sm text-muted-foreground">Sem etapas.</p>
              )}
              {itensByDisc[d].map((it, idx) => (
                <div
                  key={it.id}
                  className="flex items-start gap-2 border-b border-border p-3 last:border-b-0"
                >
                  <div className="flex flex-col">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => move(d, it.id, -1)}
                      disabled={idx === 0}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => move(d, it.id, 1)}
                      disabled={idx === itensByDisc[d].length - 1}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <button
                        className="font-medium text-left hover:underline"
                        onClick={() => setEditingItem(it)}
                      >
                        {it.titulo}
                      </button>
                      <PrioridadeBadge p={it.prioridade} />
                    </div>
                    {it.descricao && (
                      <p className="text-xs text-muted-foreground mt-0.5">{it.descricao}</p>
                    )}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => confirm("Remover etapa?") && deleteItem.mutate(it.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>
        ))}

        <TabsContent value="bom" className="mt-4">
          <div className="mb-3 flex justify-end">
            <Button
              size="sm"
              onClick={() =>
                setEditingBom({
                  disciplinaProjeto: "mecanico",
                  criticidade: "media",
                  quantidade: 1,
                  unidade: "un",
                })
              }
            >
              <Plus className="mr-1 h-4 w-4" /> Novo item BOM
            </Button>
          </div>
          <div className="rounded-lg border border-border bg-card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Descrição</th>
                  <th className="px-3 py-2 text-left">Disciplina</th>
                  <th className="px-3 py-2 text-left">Qtd</th>
                  <th className="px-3 py-2 text-left">Unid.</th>
                  <th className="px-3 py-2 text-left">Criticidade</th>
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {bom.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">
                      Sem itens.
                    </td>
                  </tr>
                )}
                {bom.map((b) => (
                  <tr key={b.id} className="border-b last:border-b-0">
                    <td className="px-3 py-2">
                      <button
                        className="text-left hover:underline"
                        onClick={() => setEditingBom(b)}
                      >
                        {b.descricao}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary">{b.disciplina_projeto}</Badge>
                    </td>
                    <td className="px-3 py-2">{b.quantidade}</td>
                    <td className="px-3 py-2">{b.unidade}</td>
                    <td className="px-3 py-2">
                      <PrioridadeBadge p={b.criticidade} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => confirm("Remover item?") && deleteBom.mutate(b.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {editingItem && (
        <EtapaDialog
          templateId={id}
          item={editingItem}
          outrasEtapas={itens.map((i: any) => ({
            id: i.id,
            titulo: i.titulo,
            disciplina: i.disciplina,
          }))}
          onClose={() => setEditingItem(null)}
          onSaved={() => {
            setEditingItem(null);
            qc.invalidateQueries({ queryKey: ["etapa-tpl", id] });
          }}
        />
      )}
      {editingBom && (
        <BomDialog
          templateId={id}
          item={editingBom}
          onClose={() => setEditingBom(null)}
          onSaved={() => {
            setEditingBom(null);
            qc.invalidateQueries({ queryKey: ["etapa-tpl", id] });
          }}
        />
      )}
      {excelOpen && (
        <ExcelSyncDialog
          templateId={id}
          tpl={tpl}
          itens={itens}
          bom={bom}
          onClose={() => setExcelOpen(false)}
          onApplied={() => qc.invalidateQueries({ queryKey: ["etapa-tpl", id] })}
        />
      )}
      {openHist && (
        <HistoricoDialog
          templateId={id}
          versoes={data.versoes as any[]}
          onClose={() => setOpenHist(false)}
          onReverted={() => {
            setOpenHist(false);
            qc.invalidateQueries({ queryKey: ["etapa-tpl", id] });
          }}
        />
      )}
    </PageContainer>
  );
}

function PrioridadeBadge({ p }: { p: string }) {
  const map: Record<string, string> = {
    baixa: "bg-slate-500/15 text-slate-700",
    media: "bg-blue-500/15 text-blue-700",
    alta: "bg-amber-500/15 text-amber-700",
    urgente: "bg-red-500/15 text-red-700",
  };
  return <Badge className={`${map[p] ?? ""} text-xs`}>{p}</Badge>;
}

function HistoricoDialog({
  templateId,
  versoes,
  onClose,
  onReverted,
}: {
  templateId: string;
  versoes: any[];
  onClose: () => void;
  onReverted: () => void;
}) {
  const revertMut = useMutation({
    mutationFn: (versao: number) => revertEtapaTemplateVersao({ data: { templateId, versao } }),
    onSuccess: (r: any) => {
      toast.success(`Revertido — nova v${r.versao} criada.`);
      onReverted();
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro."),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Histórico de versões</DialogTitle>
        </DialogHeader>
        <div className="max-h-[400px] overflow-y-auto">
          {versoes.length === 0 && <p className="text-sm text-muted-foreground">Sem versões.</p>}
          {versoes.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between border-b py-2 last:border-b-0"
            >
              <div>
                <p className="font-medium">v{v.versao}</p>
                <p className="text-xs text-muted-foreground">
                  {v.actor_nome ?? "—"} • {new Date(v.created_at).toLocaleString("pt-BR")}
                </p>
                {v.comentario && <p className="text-xs italic">{v.comentario}</p>}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  confirm(
                    `Reverter para v${v.versao}? Isso substitui o conteúdo atual e cria uma nova versão.`,
                  ) && revertMut.mutate(v.versao)
                }
              >
                <RotateCcw className="mr-1 h-4 w-4" /> Reverter
              </Button>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
