import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import ExcelJS from "exceljs";
import {
  exportEquipamentoDisciplinaXlsx,
  applyEquipamentoDisciplinaExcel,
} from "@/lib/equipamento-import.functions";

type Step = "escolha" | "diff" | "aplicado";

export function ImportarDisciplinaDialog({
  open,
  onOpenChange,
  equipamentoId,
  disciplina,
  onImported,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  equipamentoId: string;
  disciplina: string;
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
      const r = await exportEquipamentoDisciplinaXlsx({
        data: { equipamentoId, disciplina: disciplina as any },
      });
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
      const ws = wb.getWorksheet("Etapas") ?? wb.worksheets[0];
      if (!ws) throw new Error("Aba 'Etapas' não encontrada");
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
        if (!obj.titulo) continue;
        parsed.push({
          codigo: obj.codigo || null,
          ordem: obj.ordem != null && obj.ordem !== "" ? Number(obj.ordem) : null,
          titulo: String(obj.titulo),
          descricao: obj.descricao ?? null,
          status: obj.status || null,
          prioridade: obj.prioridade || null,
          data_vencimento: obj.data_vencimento || null,
          responsavel_nome: obj.responsavel_nome || null,
        });
      }
      setRows(parsed);

      const dry = await applyEquipamentoDisciplinaExcel({
        data: {
          equipamentoId,
          disciplina: disciplina as any,
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
      await applyEquipamentoDisciplinaExcel({
        data: {
          equipamentoId,
          disciplina: disciplina as any,
          rows,
          arquivoNome: fileName,
          dryRun: false,
        },
      });
      setStep("aplicado");
      toast.success("Importação aplicada");
      qc.invalidateQueries({ queryKey: ["eq-disc-etapas", equipamentoId, disciplina] });
      qc.invalidateQueries({ queryKey: ["eq-historico", equipamentoId] });
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
          <DialogTitle>Importar Excel — {disciplina}</DialogTitle>
          <DialogDescription>
            Baixe o template pré-preenchido, edite no Excel e envie de volta. Disponível apenas durante o planejamento.
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
              <span className="text-[11px] text-muted-foreground">Etapas atuais com códigos curtos</span>
            </button>
            <label className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed p-6 text-sm hover:bg-muted cursor-pointer">
              <Upload className="h-6 w-6 text-primary" />
              <span className="font-medium">Enviar planilha</span>
              <span className="text-[11px] text-muted-foreground">.xlsx com aba "Etapas"</span>
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
              <span className="text-muted-foreground">
                {rows.length} linhas lidas
              </span>
            </div>
            <div className="grid gap-2 text-[12px] md:grid-cols-3">
              <DiffBlock title="Novas" color="emerald" items={diff.added} labelKey="titulo" />
              <DiffBlock title="Atualizadas" color="amber" items={diff.updated} labelKey="codigo" extraKey="changed" />
              <DiffBlock title="Removidas" color="rose" items={diff.removed} labelKey="titulo" />
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
