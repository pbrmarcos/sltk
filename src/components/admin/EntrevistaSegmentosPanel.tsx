/* eslint-disable @typescript-eslint/no-explicit-any */
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, MessageSquareText, ListChecks, Users, Pencil, ChevronRight, Search } from "lucide-react";
import {
  listSegmentosAdmin, upsertSegmento, toggleSegmento,
  type SegmentoAdminRow,
} from "@/lib/entrevistas-admin.functions";

/** Segmentos e perguntas de Entrevista — antes era /admin/entrevistas, agora vive em Modelos de Formulário. */
export function EntrevistaSegmentosPanel({ isAdmin }: { isAdmin: boolean }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const listFn = useServerFn(listSegmentosAdmin);
  const upsertFn = useServerFn(upsertSegmento);
  const toggleFn = useServerFn(toggleSegmento);

  const q = useQuery({ queryKey: ["admin-entrev-segs"], queryFn: () => listFn() });
  const [busca, setBusca] = useState("");
  const [openNovo, setOpenNovo] = useState(false);
  const [edit, setEdit] = useState<SegmentoAdminRow | null>(null);

  const [slug, setSlug] = useState("");
  const [nomePt, setNomePt] = useState("");
  const [nomeEs, setNomeEs] = useState("");
  const [nomeEn, setNomeEn] = useState("");

  const openNovoDlg = () => {
    setSlug(""); setNomePt(""); setNomeEs(""); setNomeEn("");
    setOpenNovo(true);
  };
  const openEditDlg = (s: SegmentoAdminRow) => {
    setEdit(s);
    setSlug(s.slug); setNomePt(s.nome_pt); setNomeEs(s.nome_es ?? ""); setNomeEn(s.nome_en ?? "");
  };

  const salvar = useMutation({
    mutationFn: (payload: any) => upsertFn({ data: payload }),
    onSuccess: () => {
      toast.success("Segmento salvo.");
      setOpenNovo(false); setEdit(null);
      qc.invalidateQueries({ queryKey: ["admin-entrev-segs"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao salvar."),
  });

  const alternar = useMutation({
    mutationFn: (v: { id: string; ativo: boolean }) => toggleFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-entrev-segs"] }),
    onError: (e: any) => toast.error(e?.message ?? "Falha ao alternar."),
  });

  const rows = (q.data ?? []).filter((s) => {
    const t = busca.trim().toLowerCase();
    if (!t) return true;
    return [s.nome_pt, s.nome_es, s.nome_en, s.slug].filter(Boolean).some((v) => String(v).toLowerCase().includes(t));
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar segmento…" className="pl-8" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        {isAdmin && (
          <Button onClick={openNovoDlg}><Plus className="mr-2 h-4 w-4" /> Novo segmento</Button>
        )}
      </div>

      {q.isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum segmento encontrado.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {rows.map((s) => (
            <Card key={s.id} className={`hover:shadow-md hover:border-primary/30 transition ${!s.ativo ? "opacity-60" : ""}`}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <button
                    className="text-left min-w-0 flex-1"
                    onClick={() => navigate({ to: "/admin/entrevistas/$segmentoId", params: { segmentoId: s.id } })}
                  >
                    <div className="font-mono text-[11px] text-muted-foreground truncate">{s.slug}</div>
                    <div className="font-semibold text-base leading-tight mt-0.5 truncate">{s.nome_pt}</div>
                    <div className="text-xs text-muted-foreground truncate">{[s.nome_es, s.nome_en].filter(Boolean).join(" · ") || "—"}</div>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditDlg(s)} title="Editar nome/slug">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center flex-wrap gap-2 text-xs">
                  <Badge variant="outline"><ListChecks className="h-3 w-3 mr-1" /> {s.total_perguntas} pergunta{s.total_perguntas === 1 ? "" : "s"}</Badge>
                  <Badge variant="outline"><Users className="h-3 w-3 mr-1" /> {s.total_entrevistas} entrevista{s.total_entrevistas === 1 ? "" : "s"}</Badge>
                  {!s.ativo && (
                    <Badge
                      variant="outline"
                      className="bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)] border-[var(--badge-neutral-border)]"
                    >
                      Inativo
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch checked={s.ativo} disabled={!isAdmin || alternar.isPending} onCheckedChange={(v) => alternar.mutate({ id: s.id, ativo: v })} />
                    Ativo
                  </label>
                  <Button size="sm" variant="ghost" className="text-xs" onClick={() => navigate({ to: "/admin/entrevistas/$segmentoId", params: { segmentoId: s.id } })}>
                    Editar perguntas <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={openNovo || !!edit} onOpenChange={(o) => { if (!o) { setOpenNovo(false); setEdit(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><MessageSquareText className="h-4 w-4" /> {edit ? "Editar segmento" : "Novo segmento"}</DialogTitle>
            <DialogDescription>Nome e slug do segmento. As perguntas são editadas na tela seguinte.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Slug (identificador)</Label>
              <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="ex.: trigo, laticinios" />
              <p className="text-[11px] text-muted-foreground mt-1">Somente minúsculas, números e hífen.</p>
            </div>
            <div>
              <Label>Nome (PT) *</Label>
              <Input value={nomePt} onChange={(e) => setNomePt(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nombre (ES)</Label>
                <Input value={nomeEs} onChange={(e) => setNomeEs(e.target.value)} />
              </div>
              <div>
                <Label>Name (EN)</Label>
                <Input value={nomeEn} onChange={(e) => setNomeEn(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpenNovo(false); setEdit(null); }}>Cancelar</Button>
            <Button
              disabled={!slug || !nomePt || salvar.isPending}
              onClick={() => salvar.mutate({
                id: edit?.id, slug, nome_pt: nomePt,
                nome_es: nomeEs || null, nome_en: nomeEn || null,
              })}
            >{salvar.isPending ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
