import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Loader2, Save, FileText, ExternalLink } from "lucide-react";
import { getSATTemplate, type SATTemplateDetalhe } from "@/lib/sat-templates.functions";
import { getSATRelatorio, saveSATRelatorio, listSATAnexos } from "@/lib/sat-relatorios.functions";
import { SATAnexoUploader } from "./SATAnexoUploader";
import { useFormDraft } from "@/hooks/use-form-draft";

type SimNao = "sim" | "nao" | null;
type Resposta = {
  valor?: string | number | boolean | null;
  sim_nao?: SimNao;
  comentario?: string;
  selecionadas?: string[];
};
type Dados = Record<string, Resposta>;

export function SATFormPage({ id }: { id: string }) {
  const qc = useQueryClient();
  const getRelFn = useServerFn(getSATRelatorio);
  const getTplFn = useServerFn(getSATTemplate);
  const saveFn = useServerFn(saveSATRelatorio);
  const listAnexFn = useServerFn(listSATAnexos);

  const relQ = useQuery({
    queryKey: ["sat-relatorio", id],
    queryFn: () => getRelFn({ data: { id } }),
  });

  const templateId = (relQ.data as { template_id?: string } | undefined)?.template_id;
  const tplQ = useQuery({
    queryKey: ["sat-template", templateId],
    queryFn: () => getTplFn({ data: { id: templateId! } }),
    enabled: !!templateId,
  });

  const anexQ = useQuery({
    queryKey: ["sat-anexos", id],
    queryFn: () => listAnexFn({ data: { relatorio_id: id } }),
  });

  const [dados, setDados] = useState<Dados>({});
  const [observacoes, setObservacoes] = useState("");
  const [periodoDe, setPeriodoDe] = useState<string>("");
  const [periodoAte, setPeriodoAte] = useState<string>("");
  const [local, setLocal] = useState<string>("");
  const [dirty, setDirty] = useState(false);

  const serverDraft = useMemo(() => {
    const row = relQ.data as
      | {
          dados?: Dados;
          observacoes?: string | null;
          periodo_de?: string | null;
          periodo_ate?: string | null;
          local_endereco?: string | null;
        }
      | undefined;
    return {
      dados: row?.dados ?? {},
      observacoes: row?.observacoes ?? "",
      periodoDe: row?.periodo_de ?? "",
      periodoAte: row?.periodo_ate ?? "",
      local: row?.local_endereco ?? "",
    };
  }, [relQ.data]);
  const { clearDraft } = useFormDraft({
    formKey: `sat-relatorio:${id}`,
    value: { dados, observacoes, periodoDe, periodoAte, local },
    initialValue: serverDraft,
    enabled: !!relQ.data,
    onRestore: (saved) => {
      setDados(saved.dados);
      setObservacoes(saved.observacoes);
      setPeriodoDe(saved.periodoDe);
      setPeriodoAte(saved.periodoAte);
      setLocal(saved.local);
      setDirty(true);
    },
  });

  useEffect(() => {
    if (relQ.data) {
      const r = relQ.data as {
        dados?: Dados;
        observacoes?: string | null;
        periodo_de?: string | null;
        periodo_ate?: string | null;
        local_endereco?: string | null;
      };
      setDados((r.dados as Dados) ?? {});
      setObservacoes(r.observacoes ?? "");
      setPeriodoDe(r.periodo_de ?? "");
      setPeriodoAte(r.periodo_ate ?? "");
      setLocal(r.local_endereco ?? "");
      setDirty(false);
    }
  }, [relQ.data]);

  const saveMut = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          id,
          dados,
          observacoes,
          periodo_de: periodoDe || null,
          periodo_ate: periodoAte || null,
          local_endereco: local || null,
          status: "preenchendo",
        },
      }),
    onSuccess: () => {
      clearDraft();
      setDirty(false);
      toast.success("Salvo.");
      qc.invalidateQueries({ queryKey: ["sat-relatorio", id] });
      qc.invalidateQueries({ queryKey: ["sat-relatorios"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const anexosByItem = useMemo(() => {
    const m = new Map<string, typeof anexQ.data>();
    for (const a of anexQ.data ?? []) {
      const key = a.item_id ?? "__geral__";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(a);
    }
    return m;
  }, [anexQ.data]);

  if (relQ.isLoading || tplQ.isLoading) {
    return (
      <div className="py-16 text-center text-[var(--text-muted)]">
        <Loader2 className="inline h-5 w-5 animate-spin" />
      </div>
    );
  }

  const rel = relQ.data as {
    codigo?: string;
    status?: string;
    pdf_drive_view_url?: string | null;
    clientes?: { razao_social?: string } | null;
    processos?: { codigo?: string } | null;
  } | null;
  const tpl = tplQ.data as SATTemplateDetalhe | null;

  return (
    <div className="space-y-4">
      {/* Actions topo */}
      <div className="flex items-center justify-between gap-3 sticky top-0 z-10 bg-[var(--bg-base)] py-2 border-b border-[var(--bg-border)]">
        <div className="flex items-center gap-2 text-[13px]">
          <span className="font-medium">{rel?.codigo}</span>
          <Badge variant="outline">{rel?.status}</Badge>
          {rel?.clientes?.razao_social && (
            <span className="text-[var(--text-muted)]">{rel.clientes.razao_social}</span>
          )}
          {dirty && <span className="text-[12px] text-amber-600">• alterações não salvas</span>}
        </div>
        <div className="flex gap-2">
          {rel?.pdf_drive_view_url && (
            <Button asChild variant="outline" size="sm">
              <a href={rel.pdf_drive_view_url} target="_blank" rel="noreferrer">
                <FileText className="mr-1 h-3.5 w-3.5" /> PDF
              </a>
            </Button>
          )}
          <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1 h-4 w-4" />
            )}
            Salvar
          </Button>
        </div>
      </div>

      {/* Dados gerais */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4 grid grid-cols-2 gap-3">
        <div>
          <Label>Período - De</Label>
          <Input
            type="date"
            value={periodoDe}
            onChange={(e) => {
              setPeriodoDe(e.target.value);
              setDirty(true);
            }}
          />
        </div>
        <div>
          <Label>Período - Até</Label>
          <Input
            type="date"
            value={periodoAte}
            onChange={(e) => {
              setPeriodoAte(e.target.value);
              setDirty(true);
            }}
          />
        </div>
        <div className="col-span-2">
          <Label>Local / Endereço da fábrica</Label>
          <Input
            value={local}
            onChange={(e) => {
              setLocal(e.target.value);
              setDirty(true);
            }}
          />
        </div>
      </div>

      {/* Seções do template */}
      {tpl?.secoes.map((sec, idx) => (
        <div
          key={sec.id}
          className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)]"
        >
          <div className="border-b border-[var(--bg-border)] px-4 py-3">
            <div className="text-[14px] font-semibold">
              {idx + 1}. {sec.titulo}
            </div>
            {sec.descricao && (
              <div className="text-[12px] text-[var(--text-muted)] mt-0.5">{sec.descricao}</div>
            )}
          </div>
          <div className="p-4 space-y-4">
            {sec.itens.map((it) => {
              const resp = dados[it.id] ?? {};
              const update = (next: Resposta) => {
                setDados((d) => ({ ...d, [it.id]: { ...d[it.id], ...next } }));
                setDirty(true);
              };
              return (
                <div key={it.id} className="space-y-1.5">
                  <Label className="text-[13px]">
                    {it.label} {it.obrigatorio && <span className="text-red-500">*</span>}
                  </Label>
                  {it.ajuda && (
                    <div className="text-[11.5px] text-[var(--text-muted)]">{it.ajuda}</div>
                  )}

                  {it.tipo === "sim_nao_comentario" && (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <label
                          className={cn(
                            "inline-flex items-center gap-2 text-[13px] font-medium px-3.5 h-9 rounded-[var(--radius-md)] border cursor-pointer transition-all",
                            resp.sim_nao === "sim"
                              ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--text-primary)]"
                              : "border-[var(--bg-border)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:border-[var(--text-muted)]/50",
                          )}
                        >
                          <input
                            type="radio"
                            className="accent-[var(--primary)]"
                            name={`r-${it.id}`}
                            checked={resp.sim_nao === "sim"}
                            onChange={() => update({ sim_nao: "sim" })}
                          />
                          Sim
                        </label>
                        <label
                          className={cn(
                            "inline-flex items-center gap-2 text-[13px] font-medium px-3.5 h-9 rounded-[var(--radius-md)] border cursor-pointer transition-all",
                            resp.sim_nao === "nao"
                              ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--text-primary)]"
                              : "border-[var(--bg-border)] bg-[var(--bg-surface)] text-[var(--text-muted)] hover:border-[var(--text-muted)]/50",
                          )}
                        >
                          <input
                            type="radio"
                            className="accent-[var(--primary)]"
                            name={`r-${it.id}`}
                            checked={resp.sim_nao === "nao"}
                            onChange={() => update({ sim_nao: "nao" })}
                          />
                          Não
                        </label>
                      </div>
                      <Textarea
                        rows={2}
                        placeholder="Comentários / Pendências"
                        value={resp.comentario ?? ""}
                        onChange={(e) => update({ comentario: e.target.value })}
                      />
                    </div>
                  )}

                  {it.tipo === "texto" && (
                    <Input
                      value={(resp.valor as string) ?? ""}
                      onChange={(e) => update({ valor: e.target.value })}
                    />
                  )}

                  {it.tipo === "numero" && (
                    <Input
                      type="number"
                      step="0.01"
                      value={(resp.valor as number | undefined) ?? ""}
                      onChange={(e) =>
                        update({ valor: e.target.value === "" ? null : Number(e.target.value) })
                      }
                    />
                  )}

                  {it.tipo === "data" && (
                    <Input
                      type="date"
                      value={(resp.valor as string) ?? ""}
                      onChange={(e) => update({ valor: e.target.value })}
                    />
                  )}

                  {it.tipo === "checkbox_multi" && (
                    <div className="grid grid-cols-2 gap-2">
                      {it.opcoes.map((op) => {
                        const sel = resp.selecionadas ?? [];
                        const checked = sel.includes(op);
                        return (
                          <label key={op} className="flex items-center gap-2 text-[13px]">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => {
                                const set = new Set(sel);
                                if (v) set.add(op);
                                else set.delete(op);
                                update({ selecionadas: Array.from(set) });
                              }}
                            />
                            {op}
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {it.tipo === "parametro_operacional" && (
                    <Textarea
                      rows={6}
                      placeholder="Parâmetro | Valor | Unidade — um por linha"
                      value={(resp.valor as string) ?? ""}
                      onChange={(e) => update({ valor: e.target.value })}
                    />
                  )}

                  {it.permite_anexo && (
                    <SATAnexoUploader
                      relatorioId={id}
                      itemId={it.id}
                      secaoId={sec.id}
                      anexos={anexosByItem.get(it.id) ?? []}
                      compact
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Anexos gerais */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4 space-y-2">
        <Label className="text-[14px] font-semibold">Anexos gerais do relatório</Label>
        <div className="text-[12px] text-[var(--text-muted)]">
          Fotos ou documentos que não pertencem a um item específico.
        </div>
        <SATAnexoUploader relatorioId={id} anexos={anexosByItem.get("__geral__") ?? []} />
      </div>

      {/* Observações */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4">
        <Label>Observações finais</Label>
        <Textarea
          rows={4}
          value={observacoes}
          onChange={(e) => {
            setObservacoes(e.target.value);
            setDirty(true);
          }}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2 pb-4">
        <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
          {saveMut.isPending ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-1 h-4 w-4" />
          )}
          Salvar
        </Button>
      </div>
    </div>
  );
}
