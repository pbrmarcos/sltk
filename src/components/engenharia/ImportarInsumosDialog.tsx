import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Upload, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import ExcelJS from "exceljs";
import { exportInsumosXlsx, applyInsumosExcel } from "@/lib/projeto-insumos.functions";

type Step = "escolha" | "diff" | "aplicado";

export function ImportarInsumosDialog({
  open,
  onOpenChange,
  projetoId,
  onImported,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projetoId: string;
  onImported?: () => void;
}) {
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>("escolha");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [diff, setDiff] = useState<any>(null);

  const reset = () => {
    setStep("escolha");
    setRows([]);
    setFileName(null);
    setDiff(null);
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const baixar = async () => {
    setLoading(true);
    try {
      const r = await exportInsumosXlsx({ data: { projeto_id: projetoId } });
      const bin = atob(r.base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes as unknown as BlobPart], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = r.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Template baixado");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao gerar template");
    } finally {
      setLoading(false);
    }
  };

  const onUpload = async (file: File) => {
    setLoading(true);
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf);
      const ws = wb.getWorksheet("Insumos") ?? wb.worksheets[0];
      if (!ws) throw new Error("Aba 'Insumos' não encontrada");
      const headers: Record<number, string> = {};
      ws.getRow(1).eachCell((c, col) => (headers[col] = String(c.value ?? "").trim()));
      const parsed: any[] = [];
      for (let r = 2; r <= ws.rowCount; r++) {
        const row = ws.getRow(r);
        const obj: any = {};
        let hasAny = false;
        for (const col of Object.keys(headers)) {
          const key = headers[Number(col)];
          if (!key) continue;
          let v: any = row.getCell(Number(col)).value;
          if (v && typeof v === "object" && "text" in v) v = (v as any).text;
          if (v instanceof Date) v = v.toISOString().slice(0, 10);
          if (typeof v === "string") v = v.trim();
          obj[key] = v ?? null;
          if (v !== null && v !== "" && v !== undefined) hasAny = true;
        }
        if (!hasAny) continue;
        if (!obj.descricao) continue;
        parsed.push({
          codigo_interno: obj.codigo_interno || null,
          sub_conjunto: obj.sub_conjunto || null,
          disciplina: String(obj.disciplina ?? "outro"),
          descricao: String(obj.descricao),
          fabricante_sugerido: obj.fabricante_sugerido || null,
          part_number: obj.part_number || null,
          quantidade: Number(obj.quantidade ?? 1),
          unidade: String(obj.unidade ?? "UN"),
          qtd_estoque: obj.qtd_estoque == null || obj.qtd_estoque === "" ? 0 : Number(obj.qtd_estoque),
          criticidade: obj.criticidade || null,
          custo_estimado_unit:
            obj.custo_estimado_unit == null || obj.custo_estimado_unit === "" ? null : Number(obj.custo_estimado_unit),
          necessidade_em: obj.necessidade_em || null,
          observacoes: obj.observacoes || null,
        });
      }
      setRows(parsed);
      const dry = await applyInsumosExcel({
        data: {
          projeto_id: projetoId,
          rows: parsed,
          arquivoNome: file.name,
          dryRun: true,
        },
      });
      setDiff(dry.diff);
      setStep("diff");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao ler planilha");
    } finally {
      setLoading(false);
    }
  };

  const aplicar = async () => {
    setLoading(true);
    try {
      await applyInsumosExcel({
        data: {
          projeto_id: projetoId,
          rows,
          arquivoNome: fileName,
          dryRun: false,
        },
      });
      setStep("aplicado");
      toast.success("Importação aplicada");
      qc.invalidateQueries({ queryKey: ["projeto", "insumos", projetoId] });
      qc.invalidateQueries({ queryKey: ["projeto-insumo-historico", projetoId] });
      onImported?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao aplicar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar Excel — Insumos</DialogTitle>
          <DialogDescription>
            Baixe o template pré-preenchido, edite no Excel (inclusive quantidade em estoque) e envie de volta.
          </DialogDescription>
        </DialogHeader>

        {step === "escolha" && (
          <div className="grid gap-3 md:grid-cols-2">
            <button
              onClick={baixar}
              disabled={loading}
              className="flex flex-col items-center justify-center gap-2 rounded-md border p-6 text-sm hover:bg-muted"
            >
              <Download className="h-6 w-6 text-primary" />
              <span className="font-medium">Baixar template</span>
              <span className="text-[11px] text-muted-foreground">Insumos atuais deste projeto</span>
            </button>
            <label className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed p-6 text-sm hover:bg-muted cursor-pointer">
              <Upload className="h-6 w-6 text-primary" />
              <span className="font-medium">Enviar planilha</span>
              <span className="text-[11px] text-muted-foreground">.xlsx com aba "Insumos"</span>
              <input
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onUpload(f);
                }}
              />
            </label>
          </div>
        )}

        {step === "diff" && diff && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="h-4 w-4" />
              <span className="font-medium">{fileName}</span>
              <span className="text-muted-foreground">{rows.length} linhas lidas</span>
            </div>
            <div className="grid gap-2 text-[12px] md:grid-cols-3">
              <DiffBlock title="Novos" color="emerald" items={diff.added} labelKey="titulo" />
              <DiffBlock title="Atualizados" color="amber" items={diff.updated} labelKey="codigo" extraKey="changed" />
              <DiffBlock title="Removidos" color="rose" items={diff.removed} labelKey="titulo" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={reset} disabled={loading}>
                Voltar
              </Button>
              <Button onClick={aplicar} disabled={loading}>
                Aplicar alterações
              </Button>
            </div>
          </div>
        )}

        {step === "aplicado" && (
          <div className="flex flex-col items-center gap-2 py-6 text-sm">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="font-medium">Importação concluída</p>
            <Button onClick={() => handleClose(false)}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DiffBlock({
  title,
  color,
  items,
  labelKey,
  extraKey,
}: {
  title: string;
  color: "emerald" | "amber" | "rose";
  items: any[];
  labelKey: string;
  extraKey?: string;
}) {
  const bg = {
    emerald: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900",
    amber: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900",
    rose: "bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900",
  }[color];
  return (
    <div className={`rounded-md border p-2 ${bg}`}>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide">{title}</span>
        <span className="text-[10px] text-muted-foreground">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] italic text-muted-foreground">—</p>
      ) : (
        <ul className="max-h-40 space-y-0.5 overflow-y-auto text-[11px]">
          {items.slice(0, 40).map((it, i) => (
            <li key={i} className="truncate">
              {it[labelKey] ?? "—"}
              {extraKey && it[extraKey]?.length ? (
                <span className="ml-1 text-muted-foreground">({it[extraKey].join(", ")})</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
