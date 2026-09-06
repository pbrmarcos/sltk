import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  Save,
  History,
  Languages,
  RotateCcw,
  Loader2,
  GitCompare,
  AlertTriangle,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Columns2,
  Square,
} from "lucide-react";
import { diffLines } from "diff";
import { useAuth } from "@/hooks/use-auth";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { AccessDenied } from "@/components/layout/AccessDenied";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { SYSTEM_LOGO_DATA_URL } from "@/lib/docs/system-logo";
import { Slider } from "@/components/ui/slider";
import { parseLogoUrl, buildLogoUrl, DEFAULT_LOGO_OPTS } from "@/lib/docs/logo-opts";
import { Upload, X as XIcon } from "lucide-react";
import {
  listBlocos,
  listDocumentoTipos,
  getLayoutConfig,
  updateLayoutConfig,
  updateBloco,
  listBlocoHistorico,
  restoreBlocoVersao,
  translateBloco,
} from "@/lib/docs/admin-docs.functions";
import { CotacaoGeradosTab } from "@/components/central-documentos/CotacaoGeradosTab";
import { EntrevistasGeradasTab } from "@/components/central-documentos/EntrevistasGeradasTab";

export const Route = createFileRoute("/_authenticated/central-documentos")({
  component: AdminDocumentosPage,
});

const AUTO_TR_KEY = "admin.docs.autoTranslate";

function AdminDocumentosPage() {
  const { role } = useAuth();
  if (role !== "admin" && role !== "manager") {
    return (
      <PageContainer>
        <PageHeader
          breadcrumbs={[{ label: "Documentos" }, { label: "Editor de Blocos" }]}
          title="Editor de Blocos"
        />
        <AccessDenied message="Esta área é exclusiva para administradores e gestores." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: "Documentos" }, { label: "Editor de Blocos" }]}
        title="Editor de Blocos"
        subtitle="Configuração do motor de documentos: blocos por tipo, layout, histórico e tradução automática."
      />

      <Tabs defaultValue="blocos">
        <TabsList>
          <TabsTrigger value="blocos">Blocos</TabsTrigger>
          <TabsTrigger value="layout">Layout</TabsTrigger>
          <TabsTrigger value="tipos">Tipos</TabsTrigger>
          <TabsTrigger value="cotacao-gerados">Cotações geradas</TabsTrigger>
          <TabsTrigger value="entrevistas">Entrevistas</TabsTrigger>
        </TabsList>
        <TabsContent value="blocos" className="mt-4">
          <BlocosTab />
        </TabsContent>
        <TabsContent value="layout" className="mt-4">
          <LayoutTab />
        </TabsContent>
        <TabsContent value="tipos" className="mt-4">
          <TiposTab />
        </TabsContent>
        <TabsContent value="cotacao-gerados" className="mt-4">
          <CotacaoGeradosTab />
        </TabsContent>
        <TabsContent value="entrevistas" className="mt-4">
          <EntrevistasGeradasTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

// =====================================================================
// Blocos
// =====================================================================
function BlocosTab() {
  const tiposQ = useQuery({ queryKey: ["doc-tipos"], queryFn: () => listDocumentoTipos() });
  const [tipo, setTipo] = useState<string>("orcamento");
  const [autoTr, setAutoTr] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(AUTO_TR_KEY) !== "0";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(AUTO_TR_KEY, autoTr ? "1" : "0");
  }, [autoTr]);

  const tipos = tiposQ.data ?? [];

  useEffect(() => {
    if (tipos.length && !tipos.find((t) => t.codigo === tipo)) {
      setTipo(tipos[0].codigo);
    }
  }, [tipos, tipo]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <Label className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
            Tipo de documento
          </Label>
          <div className="flex items-center gap-2">
            <Switch checked={autoTr} onCheckedChange={setAutoTr} id="auto-tr" />
            <Label htmlFor="auto-tr" className="cursor-pointer text-sm">
              Auto-traduzir ES/EN vazios ao salvar
            </Label>
          </div>
        </div>
        <TipoTabs tipos={tipos} value={tipo} onChange={setTipo} />
      </div>
      <BlocosList tipo={tipo} autoTr={autoTr} />
    </div>
  );
}

function TipoTabs({
  tipos,
  value,
  onChange,
}: {
  tipos: Array<{ codigo: string; nome: string; prefixo_codigo: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  if (!tipos.length) {
    return <div className="text-sm text-[var(--text-muted)]">Nenhum tipo cadastrado.</div>;
  }
  return (
    <div className="-mx-1 flex flex-wrap gap-1 overflow-x-auto">
      {tipos.map((t) => {
        const active = t.codigo === value;
        return (
          <button
            key={t.codigo}
            type="button"
            onClick={() => onChange(t.codigo)}
            className={
              "inline-flex items-center gap-2 whitespace-nowrap rounded-md border px-3 py-1.5 text-sm transition-colors " +
              (active
                ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                : "border-[var(--bg-border)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]")
            }
          >
            <span className="font-medium">{t.nome}</span>
            <span className="font-mono text-[10px] text-[var(--text-muted)]">
              {t.prefixo_codigo}
            </span>
          </button>
        );
      })}
    </div>
  );
}

type EditState = {
  pt: string;
  es: string;
  en: string;
  titulo_pt: string;
  titulo_es: string;
  titulo_en: string;
  comentario: string;
};

function BlocosList({ tipo, autoTr }: { tipo: string; autoTr: boolean }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["blocos", tipo], queryFn: () => listBlocos({ data: { tipo } }) });
  const upd = useServerFn(updateBloco);
  const tr = useServerFn(translateBloco);
  const [editing, setEditing] = useState<Record<string, EditState>>({});
  const [busy, setBusy] = useState<Record<string, "save" | "tr" | null>>({});
  const [historicoBloco, setHistoricoBloco] = useState<any | null>(null);

  useEffect(() => {
    if (!q.data) return;
    const next: typeof editing = {};
    for (const b of q.data as any[]) {
      next[b.id] = {
        pt: (b.conteudo_pt?.texto as string) || "",
        es: (b.conteudo_es?.texto as string) || "",
        en: (b.conteudo_en?.texto as string) || "",
        titulo_pt: (b.conteudo_pt?.titulo as string) || "",
        titulo_es: (b.conteudo_es?.titulo as string) || "",
        titulo_en: (b.conteudo_en?.titulo as string) || "",
        comentario: "",
      };
    }
    setEditing(next);
  }, [q.data]);

  const handleSave = async (b: any) => {
    const e = editing[b.id];
    if (!e) return;
    setBusy((s) => ({ ...s, [b.id]: "save" }));
    try {
      await upd({
        data: {
          id: b.id,
          conteudo_pt: { ...b.conteudo_pt, titulo: e.titulo_pt, texto: e.pt },
          conteudo_es: { ...b.conteudo_es, titulo: e.titulo_es, texto: e.es },
          conteudo_en: { ...b.conteudo_en, titulo: e.titulo_en, texto: e.en },
          comentario: e.comentario || undefined,
        },
      });
      toast.success(`Bloco "${b.nome}" salvo.`);

      // Auto-translate vazios após salvar
      if (autoTr && e.pt.trim()) {
        const needES = !e.es.trim();
        const needEN = !e.en.trim();
        if (needES || needEN) {
          const alvo = needES && needEN ? "both" : needES ? "es" : "en";
          try {
            await tr({ data: { bloco_id: b.id, alvo, sobrescrever: false } });
            toast.success(`Traduções automáticas geradas (${alvo}).`);
          } catch (terr) {
            toast.error(`Tradução automática falhou: ${(terr as Error).message}`);
          }
        }
      }
      await qc.invalidateQueries({ queryKey: ["blocos", tipo] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy((s) => ({ ...s, [b.id]: null }));
    }
  };

  const handleTranslate = async (b: any) => {
    setBusy((s) => ({ ...s, [b.id]: "tr" }));
    try {
      await tr({ data: { bloco_id: b.id, alvo: "both", sobrescrever: true } });
      toast.success("Traduções regeradas a partir do PT.");
      await qc.invalidateQueries({ queryKey: ["blocos", tipo] });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy((s) => ({ ...s, [b.id]: null }));
    }
  };

  const handleToggleAtivo = async (b: any, ativo: boolean) => {
    try {
      await upd({
        data: { id: b.id, ativo, comentario: ativo ? "bloco habilitado" : "bloco desabilitado" },
      });
      toast.success(`Bloco "${b.nome}" ${ativo ? "habilitado" : "desabilitado"}.`);
      await qc.invalidateQueries({ queryKey: ["blocos", tipo] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleSetLargura = async (b: any, largura: 50 | 100) => {
    try {
      await upd({ data: { id: b.id, largura, comentario: `largura: ${largura}%` } });
      await qc.invalidateQueries({ queryKey: ["blocos", tipo] });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleMove = async (b: any, dir: -1 | 1) => {
    const list = [...((q.data ?? []) as any[])].sort((a, z) => a.ordem_padrao - z.ordem_padrao);
    const idx = list.findIndex((x) => x.id === b.id);
    const target = list[idx + dir];
    if (!target) return;
    const ordemB = b.ordem_padrao;
    const ordemT = target.ordem_padrao;
    try {
      // swap sequencial via valor temporário (evita conflito caso ordem_padrao seja único)
      const tmp = 100000 + Math.floor(Math.random() * 100000);
      await upd({ data: { id: b.id, ordem_padrao: tmp, comentario: "reordenação (tmp)" } });
      await upd({ data: { id: target.id, ordem_padrao: ordemB, comentario: "reordenação" } });
      await upd({ data: { id: b.id, ordem_padrao: ordemT, comentario: "reordenação" } });
      await qc.invalidateQueries({ queryKey: ["blocos", tipo] });
      toast.success(`Bloco movido para ${dir === -1 ? "cima" : "baixo"}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (q.isLoading) return <div className="text-sm text-[var(--text-muted)]">Carregando…</div>;
  if (!q.data || q.data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--bg-border)] p-6 text-sm text-[var(--text-muted)]">
        Nenhum bloco para este tipo. Rode a migração de seed.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {(q.data ?? []).map((b: any) => {
          const e = editing[b.id];
          const esEmpty = !(e?.es || "").trim();
          const enEmpty = !(e?.en || "").trim();
          return (
            <div
              key={b.id}
              className={`rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4 ${b.ativo === false ? "opacity-60" : ""}`}
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-medium">
                    {b.nome}
                    {b.ativo === false ? (
                      <Badge variant="outline" className="ml-2">
                        desabilitado
                      </Badge>
                    ) : null}
                  </h3>
                  <div className="text-xs text-[var(--text-muted)]">
                    <span className="font-mono">{b.codigo}</span> · ordem {b.ordem_padrao} · largura{" "}
                    {b.largura ?? 100}%
                    {esEmpty ? (
                      <Badge variant="outline" className="ml-2">
                        ES vazio
                      </Badge>
                    ) : null}
                    {enEmpty ? (
                      <Badge variant="outline" className="ml-2">
                        EN vazio
                      </Badge>
                    ) : null}
                    {(b.variaveis_obrigatorias || []).length ? (
                      <span className="ml-2">variáveis: {b.variaveis_obrigatorias.join(", ")}</span>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2 rounded-md border border-[var(--bg-border)] px-2 py-1 text-xs">
                    <Switch
                      checked={b.ativo !== false}
                      onCheckedChange={(v) => handleToggleAtivo(b, v)}
                    />
                    <span>{b.ativo !== false ? "Habilitado" : "Desabilitado"}</span>
                  </label>
                  <div
                    className="inline-flex overflow-hidden rounded-md border border-[var(--bg-border)]"
                    role="group"
                    aria-label="Largura do bloco"
                  >
                    <button
                      type="button"
                      aria-pressed={(b.largura ?? 100) === 100}
                      className={`flex items-center gap-1 px-2 py-1 text-xs transition-colors ${(b.largura ?? 100) === 100 ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-[var(--bg-elevated)]"}`}
                      onClick={() => handleSetLargura(b, 100)}
                      title="Ocupa a linha inteira"
                    >
                      <Square className="h-3.5 w-3.5" /> 100%
                    </button>
                    <button
                      type="button"
                      aria-pressed={(b.largura ?? 100) === 50}
                      className={`flex items-center gap-1 border-l border-[var(--bg-border)] px-2 py-1 text-xs transition-colors ${(b.largura ?? 100) === 50 ? "bg-primary text-primary-foreground font-semibold" : "hover:bg-[var(--bg-elevated)]"}`}
                      onClick={() => handleSetLargura(b, 50)}
                      title="Metade da linha (permite 2 blocos lado a lado)"
                    >
                      <Columns2 className="h-3.5 w-3.5" /> 50%
                    </button>
                  </div>

                  <div className="inline-flex overflow-hidden rounded-md border border-[var(--bg-border)]">
                    <button
                      type="button"
                      className="px-2 py-1 text-xs hover:bg-[var(--bg-elevated)]"
                      onClick={() => handleMove(b, -1)}
                      title="Mover para cima"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="border-l border-[var(--bg-border)] px-2 py-1 text-xs hover:bg-[var(--bg-elevated)]"
                      onClick={() => handleMove(b, 1)}
                      title="Mover para baixo"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => setHistoricoBloco(b)}>
                    <History className="mr-2 h-4 w-4" /> Histórico
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTranslate(b)}
                    disabled={busy[b.id] === "tr"}
                  >
                    {busy[b.id] === "tr" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Languages className="mr-2 h-4 w-4" />
                    )}
                    Traduzir PT→ES/EN
                  </Button>
                  <Button size="sm" onClick={() => handleSave(b)} disabled={busy[b.id] === "save"}>
                    {busy[b.id] === "save" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Salvar
                  </Button>
                </div>
              </div>
              <Tabs defaultValue="pt">
                <TabsList>
                  <TabsTrigger value="pt">PT</TabsTrigger>
                  <TabsTrigger value="es">ES {esEmpty ? "·" : ""}</TabsTrigger>
                  <TabsTrigger value="en">EN {enEmpty ? "·" : ""}</TabsTrigger>
                </TabsList>
                {(["pt", "es", "en"] as const).map((l) => (
                  <TabsContent value={l} key={l} className="space-y-2 pt-3">
                    <div>
                      <Label className="text-xs">Título</Label>
                      <Input
                        value={editing[b.id]?.[`titulo_${l}` as "titulo_pt"] ?? ""}
                        onChange={(ev) =>
                          setEditing((s) => ({
                            ...s,
                            [b.id]: { ...s[b.id], [`titulo_${l}`]: ev.target.value } as EditState,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between">
                        <Label className="text-xs">Texto</Label>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          Use{" "}
                          <code className="rounded bg-[var(--bg-elevated)] px-1 py-0.5">
                            **texto**
                          </code>{" "}
                          para negrito
                        </span>
                      </div>
                      <Textarea
                        rows={6}
                        value={editing[b.id]?.[l] ?? ""}
                        onChange={(ev) =>
                          setEditing((s) => ({
                            ...s,
                            [b.id]: { ...s[b.id], [l]: ev.target.value } as EditState,
                          }))
                        }
                      />
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
              <div className="mt-3">
                <Label className="text-xs">
                  Comentário desta alteração (opcional, registrado no histórico)
                </Label>
                <Input
                  placeholder="Ex.: ajuste cláusula 2 a pedido do jurídico"
                  value={editing[b.id]?.comentario ?? ""}
                  onChange={(ev) =>
                    setEditing((s) => ({
                      ...s,
                      [b.id]: { ...s[b.id], comentario: ev.target.value } as EditState,
                    }))
                  }
                />
              </div>
            </div>
          );
        })}
      </div>

      <HistoricoSheet
        bloco={historicoBloco}
        onClose={() => setHistoricoBloco(null)}
        onRestored={() => qc.invalidateQueries({ queryKey: ["blocos", tipo] })}
      />
    </>
  );
}

// =====================================================================
// Histórico
// =====================================================================
function HistoricoSheet({
  bloco,
  onClose,
  onRestored,
}: {
  bloco: any | null;
  onClose: () => void;
  onRestored: () => void;
}) {
  const open = !!bloco;
  const q = useQuery({
    queryKey: ["bloco-hist", bloco?.id],
    queryFn: () => listBlocoHistorico({ data: { bloco_id: bloco!.id } }),
    enabled: open,
  });
  const restore = useServerFn(restoreBlocoVersao);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"preview" | "diff">("diff");
  const [lang, setLang] = useState<"pt" | "es" | "en">("pt");
  const [restoreComentario, setRestoreComentario] = useState("");
  const selected = useMemo(
    () => (q.data || []).find((v: any) => v.id === selectedId) || null,
    [q.data, selectedId],
  );

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setViewMode("diff");
      setLang("pt");
      setRestoreComentario("");
    }
  }, [open]);

  const handleRestore = async () => {
    if (!selected) return;
    try {
      await restore({
        data: { versao_id: selected.id, comentario: restoreComentario || undefined },
      });
      toast.success(
        `Restaurado a partir de v${selected.versao_seq}. Tentativa registrada no audit log.`,
      );
      setRestoreComentario("");
      onRestored();
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const currentContent = bloco?.[`conteudo_${lang}`] || {};
  const versionContent = (selected?.[`conteudo_${lang}`] as any) || {};
  const currentText = `${currentContent.titulo || ""}\n\n${currentContent.texto || ""}`.trim();
  const versionText = `${versionContent.titulo || ""}\n\n${versionContent.texto || ""}`.trim();
  const diffParts = useMemo(
    () => (selected ? diffLines(versionText, currentText, { newlineIsToken: false }) : []),
    [versionText, currentText, selected],
  );
  const hasChanges = diffParts.some((p) => p.added || p.removed);

  // ---- Análise para o modal de confirmação de restauração ----
  const restoreImpact = useMemo(() => {
    if (!selected || !bloco) return null;
    const countMap = (s: string): Map<string, number> => {
      const re = /\{\{\s*([\w.]+)\s*\}\}/g;
      const out = new Map<string, number>();
      let m: RegExpExecArray | null;
      while ((m = re.exec(s || "")) !== null) {
        out.set(m[1], (out.get(m[1]) ?? 0) + 1);
      }
      return out;
    };
    const langs = ["pt", "es", "en"] as const;
    const perLang = langs.map((l) => {
      const cur = bloco[`conteudo_${l}`] || {};
      const ver = selected[`conteudo_${l}`] || {};
      const curStr = `${cur.titulo || ""}\n${cur.texto || ""}`;
      const verStr = `${ver.titulo || ""}\n${ver.texto || ""}`;
      const changed = curStr.trim() !== verStr.trim();
      const curPh = countMap(curStr);
      const verPh = countMap(verStr);
      const allKeys = new Set<string>([...curPh.keys(), ...verPh.keys()]);
      const removed: string[] = [];
      const added: string[] = [];
      const altered: { name: string; from: number; to: number }[] = [];
      const preserved: string[] = [];
      for (const k of allKeys) {
        const a = curPh.get(k) ?? 0;
        const b = verPh.get(k) ?? 0;
        if (a > 0 && b === 0) removed.push(k);
        else if (a === 0 && b > 0) added.push(k);
        else if (a !== b) altered.push({ name: k, from: a, to: b });
        else preserved.push(k);
      }
      // status map para colorir placeholders inline
      // 'atual' pane: removed→danger, altered→warn, preserved→info
      // 'versao' pane: added→success, altered→warn, preserved→info
      const statusCur: Record<string, "removed" | "altered" | "kept"> = {};
      const statusVer: Record<string, "added" | "altered" | "kept"> = {};
      for (const k of removed) statusCur[k] = "removed";
      for (const k of added) statusVer[k] = "added";
      for (const a of altered) {
        statusCur[a.name] = "altered";
        statusVer[a.name] = "altered";
      }
      for (const k of preserved) {
        statusCur[k] = "kept";
        statusVer[k] = "kept";
      }
      return { lang: l, changed, removed, added, altered, preserved, statusCur, statusVer };
    });
    const affected = perLang.filter((x) => x.changed);
    const totalRemoved = perLang.reduce((acc, x) => acc + x.removed.length, 0);
    const totalAdded = perLang.reduce((acc, x) => acc + x.added.length, 0);
    const totalAltered = perLang.reduce((acc, x) => acc + x.altered.length, 0);
    return { perLang, affected, totalRemoved, totalAdded, totalAltered };
  }, [selected, bloco]);

  // Render texto destacando {{placeholders}} conforme statusMap
  const renderHighlighted = (text: string, statusMap: Record<string, string>) => {
    if (!text) return <span className="text-[var(--text-muted)]">—</span>;
    const re = /(\{\{\s*[\w.]+\s*\}\})/g;
    const parts = text.split(re);
    return parts.map((part, idx) => {
      const m = part.match(/^\{\{\s*([\w.]+)\s*\}\}$/);
      if (!m) return <span key={idx}>{part}</span>;
      const name = m[1];
      const st = statusMap[name];
      const cls =
        st === "removed"
          ? "bg-[color-mix(in_oklab,var(--danger)_22%,transparent)] text-[var(--danger)] line-through decoration-[var(--danger)]"
          : st === "added"
            ? "bg-[color-mix(in_oklab,var(--success)_22%,transparent)] text-[var(--success)]"
            : st === "altered"
              ? "bg-[color-mix(in_oklab,var(--warning,#d97706)_22%,transparent)] text-[var(--warning,#d97706)] underline decoration-dotted"
              : "bg-[var(--bg-elevated)] text-[var(--text-primary)]";
      const title =
        st === "removed"
          ? "Será removido após restaurar"
          : st === "added"
            ? "Será reintroduzido após restaurar"
            : st === "altered"
              ? "Quantidade de ocorrências mudará"
              : "Mantido (sem alteração)";
      return (
        <span key={idx} className={`rounded px-1 font-mono ${cls}`} title={title}>
          {part}
        </span>
      );
    });
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <SheetContent side="right" className="w-full max-w-4xl overflow-y-auto sm:max-w-4xl">
        <SheetHeader>
          <SheetTitle>Histórico do bloco</SheetTitle>
          <SheetDescription>{bloco?.nome}</SheetDescription>
        </SheetHeader>
        {q.isLoading && <div className="mt-4 text-sm text-[var(--text-muted)]">Carregando…</div>}
        {q.data && q.data.length === 0 && (
          <div className="mt-4 rounded-lg border border-dashed border-[var(--bg-border)] p-4 text-sm text-[var(--text-muted)]">
            Nenhuma versão registrada ainda. O histórico passa a ser gravado a partir da próxima
            alteração.
          </div>
        )}
        <div className="mt-4 grid gap-4 md:grid-cols-[240px_1fr]">
          <div className="space-y-2">
            {(q.data || []).map((v: any) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedId(v.id)}
                className={`w-full rounded-md border px-3 py-2 text-left text-xs transition ${
                  selectedId === v.id
                    ? "border-[var(--accent)] bg-[var(--bg-elevated)]"
                    : "border-[var(--bg-border)] hover:bg-[var(--bg-elevated)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono">v{v.versao_seq}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {v.acao}
                  </Badge>
                </div>
                <div className="mt-1 text-[var(--text-muted)]">
                  {new Date(v.created_at).toLocaleString("pt-BR")}
                </div>
                <div className="truncate">{v.alterado_por_nome || "—"}</div>
                {v.comentario ? (
                  <div className="mt-1 truncate text-[var(--text-muted)]">"{v.comentario}"</div>
                ) : null}
              </button>
            ))}
          </div>
          <div>
            {!selected ? (
              <div className="rounded-lg border border-dashed border-[var(--bg-border)] p-4 text-sm text-[var(--text-muted)]">
                Selecione uma versão para visualizar e comparar com o conteúdo atual.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm">
                    <strong>v{selected.versao_seq}</strong> ·{" "}
                    {new Date(selected.created_at).toLocaleString("pt-BR")} ·{" "}
                    {selected.alterado_por_nome || "—"} ·{" "}
                    <Badge variant="outline">{selected.acao}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex rounded-md border border-[var(--bg-border)] p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setViewMode("diff")}
                        className={`rounded px-2 py-1 ${viewMode === "diff" ? "bg-[var(--bg-elevated)] font-medium" : "text-[var(--text-muted)]"}`}
                      >
                        <GitCompare className="mr-1 inline h-3 w-3" /> Diff
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode("preview")}
                        className={`rounded px-2 py-1 ${viewMode === "preview" ? "bg-[var(--bg-elevated)] font-medium" : "text-[var(--text-muted)]"}`}
                      >
                        Versão
                      </button>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline">
                          <RotateCcw className="mr-2 h-4 w-4" /> Restaurar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Restaurar v{selected.versao_seq}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Confira lado a lado como cada idioma ficará após a restauração. O
                            conteúdo atual será salvo como nova versão e a tentativa será registrada
                            no log de auditoria.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        {restoreImpact && (
                          <div className="space-y-4 text-sm">
                            {restoreImpact.totalRemoved > 0 && (
                              <div className="flex items-start gap-2 rounded-md border border-[var(--danger)]/40 bg-[color-mix(in_oklab,var(--danger)_10%,transparent)] p-3">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--danger)]" />
                                <div className="space-y-1">
                                  <div className="font-medium text-[var(--danger)]">
                                    Atenção: {restoreImpact.totalRemoved}{" "}
                                    {restoreImpact.totalRemoved === 1
                                      ? "placeholder será removido"
                                      : "placeholders serão removidos"}
                                    .
                                  </div>
                                  <div className="text-xs text-[var(--text-muted)]">
                                    Documentos que dependem desses {`{{placeholders}}`} podem ficar
                                    sem dados dinâmicos após a restauração.
                                  </div>
                                </div>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-3 rounded-md border border-[var(--bg-border)] p-3 text-xs">
                              <div>
                                <div className="mb-1 font-medium uppercase tracking-wide text-[var(--text-muted)]">
                                  Bloco
                                </div>
                                <div>
                                  <span className="font-mono">{bloco?.codigo}</span> — {bloco?.nome}
                                </div>
                              </div>
                              <div>
                                <div className="mb-1 font-medium uppercase tracking-wide text-[var(--text-muted)]">
                                  Idiomas afetados
                                </div>
                                {restoreImpact.affected.length === 0 ? (
                                  <span className="text-[var(--text-muted)]">
                                    Nenhum — conteúdo já idêntico.
                                  </span>
                                ) : (
                                  <div className="flex flex-wrap gap-1">
                                    {restoreImpact.affected.map((a) => (
                                      <Badge key={a.lang} variant="outline">
                                        {a.lang.toUpperCase()}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs">
                                Comentário de auditoria (opcional, registrado no log)
                              </Label>
                              <Input
                                placeholder="Ex.: rollback aprovado pela diretoria após revisão jurídica"
                                value={restoreComentario}
                                onChange={(e) => setRestoreComentario(e.target.value)}
                              />
                            </div>
                            <div>
                              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                                Preview por idioma — atual × após restaurar
                              </div>
                              <Tabs defaultValue={restoreImpact.affected[0]?.lang ?? "pt"}>
                                <TabsList>
                                  {(["pt", "es", "en"] as const).map((l) => {
                                    const info = restoreImpact.perLang.find((x) => x.lang === l)!;
                                    return (
                                      <TabsTrigger key={l} value={l} className="gap-1">
                                        {l.toUpperCase()}
                                        {info.changed ? (
                                          <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                                        ) : null}
                                      </TabsTrigger>
                                    );
                                  })}
                                </TabsList>
                                {(["pt", "es", "en"] as const).map((l) => {
                                  const info = restoreImpact.perLang.find((x) => x.lang === l)!;
                                  const cur = bloco?.[`conteudo_${l}`] || {};
                                  const nxt = selected[`conteudo_${l}`] || {};
                                  return (
                                    <TabsContent key={l} value={l} className="pt-3">
                                      <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-2 text-xs">
                                            <Badge variant="outline">Atual</Badge>
                                            {!info.changed && (
                                              <span className="text-[var(--success)]">
                                                sem alteração
                                              </span>
                                            )}
                                          </div>
                                          <div>
                                            <Label className="text-xs">Título</Label>
                                            <div className="min-h-9 rounded-md border border-[var(--bg-border)] bg-[var(--bg-surface)] px-3 py-2 text-sm leading-relaxed">
                                              {renderHighlighted(cur.titulo || "", info.statusCur)}
                                            </div>
                                          </div>
                                          <div>
                                            <Label className="text-xs">Texto</Label>
                                            <div className="max-h-64 min-h-32 overflow-y-auto whitespace-pre-wrap rounded-md border border-[var(--bg-border)] bg-[var(--bg-surface)] px-3 py-2 text-sm leading-relaxed">
                                              {renderHighlighted(cur.texto || "", info.statusCur)}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="space-y-2">
                                          <div className="flex items-center gap-2 text-xs">
                                            <Badge
                                              variant="outline"
                                              className="border-[var(--accent)] text-[var(--accent)]"
                                            >
                                              Após restaurar (v{selected.versao_seq})
                                            </Badge>
                                          </div>
                                          <div>
                                            <Label className="text-xs">Título</Label>
                                            <div className="min-h-9 rounded-md border border-[var(--accent)]/40 bg-[var(--bg-surface)] px-3 py-2 text-sm leading-relaxed">
                                              {renderHighlighted(nxt.titulo || "", info.statusVer)}
                                            </div>
                                          </div>
                                          <div>
                                            <Label className="text-xs">Texto</Label>
                                            <div className="max-h-64 min-h-32 overflow-y-auto whitespace-pre-wrap rounded-md border border-[var(--accent)]/40 bg-[var(--bg-surface)] px-3 py-2 text-sm leading-relaxed">
                                              {renderHighlighted(nxt.texto || "", info.statusVer)}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      {(info.removed.length > 0 ||
                                        info.added.length > 0 ||
                                        info.altered.length > 0 ||
                                        info.preserved.length > 0) && (
                                        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-[var(--bg-border)] p-2 text-xs">
                                          <span className="flex items-center gap-1 text-[var(--text-muted)]">
                                            <span className="inline-block h-2 w-2 rounded-sm bg-[color-mix(in_oklab,var(--danger)_60%,transparent)]" />{" "}
                                            removido
                                          </span>
                                          <span className="flex items-center gap-1 text-[var(--text-muted)]">
                                            <span className="inline-block h-2 w-2 rounded-sm bg-[color-mix(in_oklab,var(--warning,#d97706)_60%,transparent)]" />{" "}
                                            alterado
                                          </span>
                                          <span className="flex items-center gap-1 text-[var(--text-muted)]">
                                            <span className="inline-block h-2 w-2 rounded-sm bg-[color-mix(in_oklab,var(--success)_60%,transparent)]" />{" "}
                                            reintroduzido
                                          </span>
                                          <span className="flex items-center gap-1 text-[var(--text-muted)]">
                                            <span className="inline-block h-2 w-2 rounded-sm bg-[var(--bg-elevated)]" />{" "}
                                            mantido
                                          </span>
                                          <span className="ml-auto text-[var(--text-muted)]">
                                            {info.removed.length} removidos · {info.altered.length}{" "}
                                            alterados · {info.added.length} reintroduzidos ·{" "}
                                            {info.preserved.length} mantidos
                                          </span>
                                        </div>
                                      )}
                                      {info.altered.length > 0 && (
                                        <div className="mt-2 rounded-md border border-[color-mix(in_oklab,var(--warning,#d97706)_40%,transparent)] p-2 text-xs">
                                          <span className="text-[var(--warning,#d97706)]">
                                            Alterados (contagem de ocorrências):
                                          </span>{" "}
                                          {info.altered.map((a) => (
                                            <code
                                              key={a.name}
                                              className="mr-1 rounded bg-[color-mix(in_oklab,var(--warning,#d97706)_15%,transparent)] px-1 font-mono"
                                            >
                                              {`{{${a.name}}}`} ({a.from}→{a.to})
                                            </code>
                                          ))}
                                        </div>
                                      )}
                                    </TabsContent>
                                  );
                                })}
                              </Tabs>
                            </div>
                          </div>
                        )}
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleRestore}
                            className={
                              restoreImpact && restoreImpact.totalRemoved > 0
                                ? "bg-[var(--danger)] hover:bg-[var(--danger)]/90"
                                : ""
                            }
                          >
                            {restoreImpact && restoreImpact.totalRemoved > 0
                              ? "Restaurar mesmo assim"
                              : "Restaurar"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <Tabs value={lang} onValueChange={(v) => setLang(v as any)}>
                  <TabsList>
                    <TabsTrigger value="pt">PT</TabsTrigger>
                    <TabsTrigger value="es">ES</TabsTrigger>
                    <TabsTrigger value="en">EN</TabsTrigger>
                  </TabsList>
                  {(["pt", "es", "en"] as const).map((l) => (
                    <TabsContent value={l} key={l} className="space-y-2 pt-3">
                      {viewMode === "preview" ? (
                        <>
                          <div>
                            <Label className="text-xs">Título (v{selected.versao_seq})</Label>
                            <Input
                              readOnly
                              value={(selected[`conteudo_${l}`] || {}).titulo || ""}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Texto (v{selected.versao_seq})</Label>
                            <Textarea
                              readOnly
                              rows={12}
                              value={(selected[`conteudo_${l}`] || {}).texto || ""}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                            <span>
                              Comparando{" "}
                              <strong className="text-[var(--text-primary)]">
                                v{selected.versao_seq}
                              </strong>{" "}
                              → <strong className="text-[var(--text-primary)]">atual</strong>
                            </span>
                            {!hasChanges && (
                              <Badge variant="outline">sem alterações em {l.toUpperCase()}</Badge>
                            )}
                          </div>
                          <div className="overflow-hidden rounded-md border border-[var(--bg-border)] bg-[var(--bg-surface)] font-mono text-xs">
                            {diffParts.length === 0 ? (
                              <div className="p-3 text-[var(--text-muted)]">
                                Sem conteúdo nesta língua.
                              </div>
                            ) : (
                              diffParts.map((part, idx) => {
                                const lines = part.value.replace(/\n$/, "").split("\n");
                                const cls = part.added
                                  ? "bg-[color-mix(in_oklab,var(--success)_18%,transparent)] text-[var(--success)]"
                                  : part.removed
                                    ? "bg-[color-mix(in_oklab,var(--danger)_18%,transparent)] text-[var(--danger)] line-through decoration-1"
                                    : "text-[var(--text-muted)]";
                                const prefix = part.added ? "+ " : part.removed ? "− " : "  ";
                                return (
                                  <div key={idx}>
                                    {lines.map((ln, i) => (
                                      <div
                                        key={i}
                                        className={`whitespace-pre-wrap px-3 py-0.5 ${cls}`}
                                      >
                                        <span className="select-none opacity-60">{prefix}</span>
                                        {ln || "\u00A0"}
                                      </div>
                                    ))}
                                  </div>
                                );
                              })
                            )}
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)]">
                            Linhas em vermelho serão recolocadas ao restaurar; linhas em verde (do
                            atual) serão substituídas pelo conteúdo histórico.
                          </p>
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// =====================================================================
// Layout
// =====================================================================
function LayoutTab() {
  const tiposQ = useQuery({ queryKey: ["doc-tipos"], queryFn: () => listDocumentoTipos() });
  const [tipo, setTipo] = useState<string>("orcamento");
  const q = useQuery({
    queryKey: ["layout", tipo],
    queryFn: () => getLayoutConfig({ data: { tipo } }),
  });
  const upd = useServerFn(updateLayoutConfig);
  const [form, setForm] = useState({
    accent_color: "#0B3D91",
    logo_url: "",
    empresa_nome: "",
    empresa_endereco: "",
    empresa_contato: "",
    rodape_extra: "",
  });

  useEffect(() => {
    if (q.data) {
      setForm({
        accent_color: q.data.accent_color || "#0B3D91",
        logo_url: q.data.logo_url || "",
        empresa_nome: q.data.empresa_nome || "",
        empresa_endereco: q.data.empresa_endereco || "",
        empresa_contato: q.data.empresa_contato || "",
        rodape_extra: q.data.rodape_extra || "",
      });
    } else {
      setForm({
        accent_color: "#0B3D91",
        logo_url: "",
        empresa_nome: "",
        empresa_endereco: "",
        empresa_contato: "",
        rodape_extra: "",
      });
    }
  }, [q.data]);

  const save = async () => {
    try {
      await upd({ data: { tipo_codigo: tipo, ...form, logo_url: form.logo_url || null } as any });
      toast.success("Layout atualizado.");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const tipoNome = (tiposQ.data ?? []).find((t) => t.codigo === tipo)?.nome || "Documento";

  // Logo: parse URL atual e opções (altura/gap) codificadas no fragment
  const parsed = useMemo(() => parseLogoUrl(form.logo_url), [form.logo_url]);
  const logoSrc = parsed.url || SYSTEM_LOGO_DATA_URL;
  const opts = parsed.opts;
  const fileRef = useRef<HTMLInputElement>(null);
  const setOpts = (next: Partial<typeof opts>) => {
    setForm({ ...form, logo_url: buildLogoUrl(parsed.url, { ...opts, ...next }) });
  };
  const setUrl = (url: string) => {
    setForm({ ...form, logo_url: url ? buildLogoUrl(url, opts) : "" });
  };
  const handleFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 1024 * 1024) {
      toast.error("Arquivo acima de 1 MB. Comprima e tente novamente.");
      return;
    }
    if (!/^image\/(png|jpe?g|svg\+xml|webp)$/.test(file.type)) {
      toast.error("Formato não suportado. Use PNG, JPG, SVG ou WebP.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      if (dataUrl) setUrl(dataUrl);
    };
    reader.onerror = () => toast.error("Falha ao ler o arquivo.");
    reader.readAsDataURL(file);
  };

  return (
    <div className="grid max-w-3xl gap-4 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-6">
      <div>
        <Label className="mb-2 block text-xs uppercase tracking-wide text-[var(--text-muted)]">
          Tipo de documento
        </Label>
        <TipoTabs
          tipos={
            (tiposQ.data ?? []) as Array<{ codigo: string; nome: string; prefixo_codigo: string }>
          }
          value={tipo}
          onChange={setTipo}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Nome da empresa</Label>
          <Input
            value={form.empresa_nome}
            onChange={(e) => setForm({ ...form, empresa_nome: e.target.value })}
          />
        </div>
        <div>
          <Label>Cor de destaque</Label>
          <div className="flex items-center gap-2">
            <Input
              type="color"
              value={form.accent_color}
              onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
              className="h-10 w-16 p-1"
            />
            <Input
              value={form.accent_color}
              onChange={(e) => setForm({ ...form, accent_color: e.target.value })}
            />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Endereço</Label>
          <Input
            value={form.empresa_endereco}
            onChange={(e) => setForm({ ...form, empresa_endereco: e.target.value })}
          />
        </div>
        <div>
          <Label>Contato (cabeçalho)</Label>
          <Input
            value={form.empresa_contato}
            onChange={(e) => setForm({ ...form, empresa_contato: e.target.value })}
            placeholder="contato@empresa.com · +55 11 9 0000-0000"
          />
        </div>
      </div>
      <div>
        <Label>Logomarca (fundo claro)</Label>
        <div
          className="mt-2 flex items-center gap-3 rounded-md border border-dashed border-[var(--bg-border)] bg-white p-3"
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            handleFile(e.dataTransfer.files?.[0]);
          }}
        >
          <img
            src={logoSrc}
            alt="logo"
            className="rounded-sm bg-white object-contain"
            style={{ height: opts.altura, width: "auto", maxWidth: opts.altura * 3.5 }}
          />
          <div className="flex flex-1 flex-col gap-2">
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="mr-2 h-3.5 w-3.5" /> Enviar arquivo
              </Button>
              {parsed.url ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => setUrl("")}>
                  <XIcon className="mr-1 h-3.5 w-3.5" /> Remover
                </Button>
              ) : (
                <span className="text-xs text-[var(--text-muted)]">
                  Sem arquivo — usando logo padrão.
                </span>
              )}
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              PNG, JPG, SVG ou WebP, até 1 MB. Arraste e solte ou clique em Enviar arquivo.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between">
            <Label>Altura da logo</Label>
            <span className="text-xs text-[var(--text-muted)]">{opts.altura} pt</span>
          </div>
          <Slider
            className="mt-2"
            min={16}
            max={56}
            step={1}
            value={[opts.altura]}
            onValueChange={(v) => setOpts({ altura: v[0] ?? DEFAULT_LOGO_OPTS.altura })}
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label>Espaço ao lado</Label>
            <span className="text-xs text-[var(--text-muted)]">{opts.gap} pt</span>
          </div>
          <Slider
            className="mt-2"
            min={0}
            max={24}
            step={1}
            value={[opts.gap]}
            onValueChange={(v) => setOpts({ gap: v[0] ?? DEFAULT_LOGO_OPTS.gap })}
          />
        </div>
      </div>

      <div>
        <Label>Texto extra do rodapé</Label>
        <Textarea
          rows={2}
          value={form.rodape_extra}
          onChange={(e) => setForm({ ...form, rodape_extra: e.target.value })}
          placeholder="Ex.: CNPJ 00.000.000/0001-00 · ISO 9001"
        />
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Aparece no rodapé entre o responsável e a paginação. Máx. 80 caracteres.
        </p>
      </div>

      <div>
        <Label>Pré-visualização (cabeçalho e rodapé)</Label>
        <div className="mt-2 overflow-hidden rounded-md border border-[var(--bg-border)] bg-white text-[#111827] shadow-sm">
          {/* Header */}
          <div
            className="flex items-start justify-between border-b px-4 pb-2 pt-3"
            style={{ borderBottomColor: form.accent_color, borderBottomWidth: 1 }}
          >
            <div className="flex items-center" style={{ gap: opts.gap }}>
              <img
                src={logoSrc}
                alt="logo"
                className="rounded-sm bg-white object-contain"
                style={{ height: opts.altura, width: "auto", maxWidth: opts.altura * 3.5 }}
              />
              <div className="leading-tight">
                <div className="text-[11px] font-bold" style={{ color: form.accent_color }}>
                  {form.empresa_nome || "Nome da empresa"}
                </div>
                <div className="text-[9px] text-[#6B7280]">
                  {form.empresa_contato || form.empresa_endereco || "contato@empresa.com"}
                </div>
              </div>
            </div>
            <div className="text-right leading-tight">
              <div className="text-[11px] font-bold">{tipoNome}</div>
              <div className="text-[9px] text-[#6B7280]">ORC-000123 · v1 · PT · 01/01/2026</div>
            </div>
          </div>
          {/* Corpo simulado */}
          <div className="px-4 py-6 text-center text-[10px] text-[#9CA3AF]">
            (conteúdo do documento)
          </div>
          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[#E5E7EB] px-4 py-2 text-[9px] text-[#6B7280]">
            <div className="min-w-0 flex-1 truncate">
              <span className="font-bold text-[#111827]">{tipoNome}</span> · v1
            </div>
            <div className="min-w-0 flex-1 truncate px-2 text-center">
              Resp.: Fulano de Tal{form.rodape_extra ? ` · ${form.rodape_extra.slice(0, 60)}` : ""}
            </div>
            <div className="flex-shrink-0 text-right">Página 1 de 2</div>
          </div>
        </div>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          A mesma logo (fundo claro), altura e espaço são aplicados ao cabeçalho de todos os PDFs
          gerados.
        </p>
      </div>

      <div>
        <Button onClick={save}>
          <Save className="mr-2 h-4 w-4" /> Salvar
        </Button>
      </div>
    </div>
  );
}

// =====================================================================
// Tipos
// =====================================================================
function TiposTab() {
  const tiposQ = useQuery({ queryKey: ["doc-tipos"], queryFn: () => listDocumentoTipos() });
  return (
    <div className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-6 text-sm">
      <div className="space-y-2">
        {(tiposQ.data ?? []).map((t) => (
          <div key={t.codigo} className="flex items-center justify-between">
            <div>
              <span className="font-medium">{t.nome}</span>{" "}
              <span className="ml-2 font-mono text-xs text-[var(--text-muted)]">
                {t.codigo} · {t.prefixo_codigo}
              </span>
            </div>
            <Badge>{t.ativo ? "Ativo" : "Inativo"}</Badge>
          </div>
        ))}
        {(tiposQ.data ?? []).length === 0 && (
          <div className="text-[var(--text-muted)]">Nenhum tipo cadastrado.</div>
        )}
      </div>
      <p className="mt-4 text-xs text-[var(--text-muted)]">
        Tipos novos são provisionados automaticamente quando o módulo correspondente gera seu
        primeiro documento.
      </p>
    </div>
  );
}
