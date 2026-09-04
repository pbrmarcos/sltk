/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  adminListRfqTipos,
  adminUpsertRfqTipo,
  adminToggleRfqTipoAtivo,
} from "@/lib/rfq.functions";
import type { FormularioSchema } from "@/lib/rfq.shared";
import {
  RfqTipoEditor,
  makeEmptyDraft,
  type RfqTipoDraft,
} from "@/components/rfq/admin/RfqTipoEditor";

/** Catálogo de tipos de Checklist (RFQ) — antes era /admin/checklist-tipos, agora vive em Modelos de Formulário. */
export function ChecklistTiposPanel() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [draft, setDraft] = useState<RfqTipoDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const listQ = useQuery({
    queryKey: ["admin-rfq-tipos"],
    queryFn: () => adminListRfqTipos(),
  });

  const toggleMut = useMutation({
    mutationFn: (v: { id: string; ativo: boolean }) => adminToggleRfqTipoAtivo({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-rfq-tipos"] });
      qc.invalidateQueries({ queryKey: ["rfq-tipos"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro."),
  });

  const upsertMut = useMutation({
    mutationFn: (d: RfqTipoDraft) =>
      adminUpsertRfqTipo({
        data: {
          id: d.id ?? null,
          codigo: d.codigo,
          nome_pt: d.nome_pt,
          nome_es: d.nome_es || null,
          nome_en: d.nome_en || null,
          familia: d.familia || null,
          descricao: d.descricao || null,
          ativo: d.ativo,
          campos_schema: d.campos_schema,
        },
      }),
    onSuccess: () => {
      toast.success("Tipo salvo.");
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["admin-rfq-tipos"] });
      qc.invalidateQueries({ queryKey: ["rfq-tipos"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar."),
    onSettled: () => setSaving(false),
  });

  const filtered = useMemo(() => {
    const b = busca.trim().toLowerCase();
    if (!b) return listQ.data ?? [];
    return (listQ.data ?? []).filter(
      (t) =>
        t.codigo.toLowerCase().includes(b) ||
        t.nome_pt.toLowerCase().includes(b) ||
        (t.familia || "").toLowerCase().includes(b),
    );
  }, [busca, listQ.data]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-7"
            placeholder="Buscar por código, nome ou família…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Button onClick={() => setDraft(makeEmptyDraft())} className="gap-2">
          <Plus className="h-4 w-4" /> Novo tipo
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
              <th className="px-3 py-2 text-left">Código</th>
              <th className="px-3 py-2 text-left">Nome (PT)</th>
              <th className="px-3 py-2 text-left">Família</th>
              <th className="px-3 py-2 text-left">Seções</th>
              <th className="px-3 py-2 text-left">Ativo</th>
              <th className="px-3 py-2 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {listQ.isLoading && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-xs text-muted-foreground">
                  Carregando…
                </td>
              </tr>
            )}
            {!listQ.isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-xs text-muted-foreground">
                  Nenhum tipo encontrado.
                </td>
              </tr>
            )}
            {filtered.map((t) => {
              const schema = (t.campos_schema || { secoes: [] }) as FormularioSchema;
              return (
                <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-3 py-2 font-mono text-[12px]">{t.codigo}</td>
                  <td className="px-3 py-2">{t.nome_pt}</td>
                  <td className="px-3 py-2">
                    {t.familia ? <Badge variant="secondary">{t.familia}</Badge> : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {schema.secoes.length} seções ·{" "}
                    {schema.secoes.reduce((n, s) => n + s.campos.length, 0)} campos
                  </td>
                  <td className="px-3 py-2">
                    <Switch
                      checked={t.ativo}
                      onCheckedChange={(v) => toggleMut.mutate({ id: t.id, ativo: v })}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setDraft({
                          id: t.id,
                          codigo: t.codigo,
                          nome_pt: t.nome_pt,
                          nome_es: t.nome_es ?? "",
                          nome_en: t.nome_en ?? "",
                          familia: t.familia ?? "",
                          descricao: t.descricao ?? "",
                          ativo: t.ativo,
                          campos_schema: schema,
                        })
                      }
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={!!draft} onOpenChange={(v) => !v && setDraft(null)}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Editar tipo de Checklist" : "Novo tipo de Checklist"}</DialogTitle>
            <DialogDescription>
              Defina as seções e perguntas do formulário. O sales escolhe o idioma ao emitir o
              link.
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <RfqTipoEditor
              draft={draft}
              onChange={setDraft}
              saving={saving}
              onSave={() => {
                if (!draft.codigo || !draft.nome_pt) {
                  toast.error("Código e Nome (PT) são obrigatórios.");
                  return;
                }
                setSaving(true);
                upsertMut.mutate(draft);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
