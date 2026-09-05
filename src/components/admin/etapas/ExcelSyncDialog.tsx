/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  applyEtapaTemplateBulk,
  DISCIPLINAS,
  PRIORIDADES,
  DISCIPLINAS_PROJETO,
} from "@/lib/etapa-templates.functions";
import { Upload, FileSpreadsheet, CheckCircle2 } from "lucide-react";

const ROLES = [
  "engineer",
  "manager",
  "assembly",
  "production",
  "purchasing",
  "sales",
  "field",
  "admin",
];
const ABAS_EQP = ["planejamento", "engenharia", "producao", "qualidade"];

const ETAPAS_COLS = [
  "codigo",
  "disciplina",
  "ordem",
  "titulo",
  "descricao",
  "prioridade",
  "duracao_h",
  "responsavel_role",
  "entregavel",
  "requer_anexo",
  "checklist",
];
const BOM_COLS = [
  "codigo",
  "disciplina_projeto",
  "equipamento_disciplina",
  "ordem",
  "descricao",
  "quantidade",
  "unidade",
  "criticidade",
  "part_number",
  "fabricante",
  "link",
  "observacoes",
];

function addValidation(ws: ExcelJS.Worksheet, col: string, values: readonly string[]) {
  // Excel data-validation via list (comma-separated, no external range)
  const range = `${col}2:${col}5000`;
  (ws as any).dataValidations.add(range, {
    type: "list",
    allowBlank: true,
    formulae: [`"${values.join(",")}"`],
  });
}

export async function downloadTemplateXlsx(tpl: any, itens: any[], bom: any[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Solutek Hub";
  wb.created = new Date();

  // Etapas
  const wsE = wb.addWorksheet("Etapas");
  wsE.columns = ETAPAS_COLS.map((k) => ({
    header: k,
    key: k,
    width: k === "titulo" || k === "descricao" || k === "entregavel" ? 32 : 16,
  }));
  wsE.getRow(1).font = { bold: true };
  wsE.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEEEEE" } };
  for (const it of itens) {
    wsE.addRow({
      codigo: it.codigo ?? "",
      disciplina: it.disciplina,
      ordem: it.ordem,
      titulo: it.titulo,
      descricao: it.descricao ?? "",
      prioridade: it.prioridade,
      duracao_h: it.duracao_h ?? "",
      responsavel_role: it.responsavel_role ?? "",
      entregavel: it.entregavel ?? "",
      requer_anexo: it.requer_anexo ? "sim" : "nao",
      checklist: Array.isArray(it.checklist)
        ? it.checklist.map((c: any) => c.texto).join(" | ")
        : "",
    });
  }
  addValidation(wsE, "B", DISCIPLINAS);
  addValidation(wsE, "F", PRIORIDADES);
  addValidation(wsE, "H", ["", ...ROLES]);
  addValidation(wsE, "J", ["sim", "nao"]);

  // BOM
  const wsB = wb.addWorksheet("BOM");
  wsB.columns = BOM_COLS.map((k) => ({
    header: k,
    key: k,
    width: k === "descricao" || k === "observacoes" ? 32 : 16,
  }));
  wsB.getRow(1).font = { bold: true };
  wsB.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEEEEEE" } };
  for (const b of bom) {
    wsB.addRow({
      codigo: b.codigo ?? "",
      disciplina_projeto: b.disciplina_projeto,
      equipamento_disciplina: b.equipamento_disciplina,
      ordem: b.ordem,
      descricao: b.descricao,
      quantidade: b.quantidade,
      unidade: b.unidade,
      criticidade: b.criticidade,
      part_number: b.part_number ?? "",
      fabricante: b.fabricante ?? "",
      link: b.link ?? "",
      observacoes: b.observacoes ?? "",
    });
  }
  addValidation(wsB, "B", DISCIPLINAS_PROJETO);
  addValidation(wsB, "C", ABAS_EQP);
  addValidation(wsB, "H", PRIORIDADES);

  // Instruções
  const wsI = wb.addWorksheet("Instruções");
  wsI.getColumn(1).width = 120;
  const notes = [
    `Template: ${tpl.nome} — versão atual v${tpl.versao_atual}`,
    "",
    "COMO USAR",
    "1) Edite as abas 'Etapas' e 'BOM' à vontade. Os cabeçalhos NÃO podem ser renomeados.",
    "2) Coluna 'codigo' identifica a linha (ex.: ENG-01, BOM-02). Deixe vazia para criar nova; mantenha para atualizar.",
    "3) Para remover uma etapa/item, apague a linha inteira. A importação detecta o que sumiu.",
    "4) Coluna 'checklist': separe sub-tarefas com ' | ' (barra vertical entre espaços). Ex.: passo A | passo B | passo C",
    "5) Coluna 'requer_anexo': use 'sim' ou 'nao'.",
    "6) Dropdowns já estão configurados para disciplina, prioridade, role e disciplina_projeto.",
    "",
    `Enums aceitos:`,
    `- disciplina: ${DISCIPLINAS.join(", ")}`,
    `- prioridade / criticidade: ${PRIORIDADES.join(", ")}`,
    `- disciplina_projeto: ${DISCIPLINAS_PROJETO.join(", ")}`,
    `- equipamento_disciplina: ${ABAS_EQP.join(", ")}`,
    `- responsavel_role: ${ROLES.join(", ")}`,
    "",
    "Ao importar, uma nova versão v(N+1) é criada automaticamente no histórico.",
  ];
  notes.forEach((n) => wsI.addRow([n]));
  wsI.getRow(1).font = { bold: true, size: 13 };

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `template_${tpl.slug || tpl.id}_v${tpl.versao_atual}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

type DiffRow = { kind: "novo" | "alterado" | "removido" | "igual"; row: any; before?: any };

function normalizeItem(r: any, byCode: Map<string, any>): any {
  const codigo = r.codigo ? String(r.codigo).trim() : "";
  const existing = codigo ? byCode.get(codigo) : undefined;
  return {
    id: existing?.id,
    codigo: codigo || undefined,
    disciplina: String(r.disciplina || "planejamento"),
    ordem: Number(r.ordem) || 999,
    titulo: String(r.titulo || ""),
    descricao: r.descricao ? String(r.descricao) : null,
    prioridade: String(r.prioridade || "media"),
    duracaoH: r.duracao_h !== "" && r.duracao_h != null ? Number(r.duracao_h) : null,
    responsavelRole: r.responsavel_role ? String(r.responsavel_role) : null,
    entregavel: r.entregavel ? String(r.entregavel) : null,
    requerAnexo: String(r.requer_anexo || "").toLowerCase() === "sim",
    checklist: r.checklist
      ? String(r.checklist)
          .split("|")
          .map((s: string) => s.trim())
          .filter(Boolean)
          .map((t: string) => ({ texto: t }))
      : [],
  };
}
function normalizeBom(r: any, byCode: Map<string, any>): any {
  const codigo = r.codigo ? String(r.codigo).trim() : "";
  const existing = codigo ? byCode.get(codigo) : undefined;
  return {
    id: existing?.id,
    codigo: codigo || undefined,
    disciplinaProjeto: String(r.disciplina_projeto || "mecanico"),
    equipamentoDisciplina: String(r.equipamento_disciplina || "engenharia"),
    ordem: Number(r.ordem) || 999,
    descricao: String(r.descricao || ""),
    quantidade: r.quantidade !== "" && r.quantidade != null ? Number(r.quantidade) : 1,
    unidade: String(r.unidade || "un"),
    criticidade: String(r.criticidade || "media"),
    partNumber: r.part_number ? String(r.part_number) : null,
    fabricante: r.fabricante ? String(r.fabricante) : null,
    link: r.link ? String(r.link) : null,
    observacoes: r.observacoes ? String(r.observacoes) : null,
  };
}

function sheetToObjects(ws: ExcelJS.Worksheet | undefined, cols: string[]): any[] {
  if (!ws) return [];
  const out: any[] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj: any = {};
    cols.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      let v: any = cell.value;
      if (v && typeof v === "object" && "text" in v) v = (v as any).text;
      if (v && typeof v === "object" && "result" in v) v = (v as any).result;
      obj[c] = v ?? "";
    });
    // Skip fully-empty rows
    if (Object.values(obj).every((x) => x === "" || x == null)) return;
    out.push(obj);
  });
  return out;
}

export function ExcelSyncDialog({
  templateId,
  tpl,
  itens,
  bom,
  onClose,
  onApplied,
}: {
  templateId: string;
  tpl: any;
  itens: any[];
  bom: any[];
  onClose: () => void;
  onApplied: () => void;
}) {
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [parsedItens, setParsedItens] = useState<any[]>([]);
  const [parsedBom, setParsedBom] = useState<any[]>([]);
  const [itemDiff, setItemDiff] = useState<DiffRow[]>([]);
  const [bomDiff, setBomDiff] = useState<DiffRow[]>([]);
  const [removeItemIds, setRemoveItemIds] = useState<string[]>([]);
  const [removeBomIds, setRemoveBomIds] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);

  const mut = useMutation({
    mutationFn: () =>
      applyEtapaTemplateBulk({
        data: {
          templateId,
          itens: parsedItens.filter((it) => it.titulo),
          bom: parsedBom.filter((b) => b.descricao),
          removeItemIds,
          removeBomIds,
        },
      }),
    onSuccess: (r) => {
      setResult(r);
      setStep("done");
      toast.success(`Importado — v${r.versao} publicada.`);
      onApplied();
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha no import."),
  });

  async function handleFile(f: File) {
    if (f.size > 10 * 1024 * 1024) {
      toast.error("Arquivo acima de 10MB.");
      return;
    }
    const buf = await f.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf);
    const wsE = wb.getWorksheet("Etapas");
    const wsB = wb.getWorksheet("BOM");
    const rawE = sheetToObjects(wsE, ETAPAS_COLS);
    const rawB = sheetToObjects(wsB, BOM_COLS);
    const itemByCode = new Map<string, any>(
      itens.filter((i) => i.codigo).map((i) => [i.codigo, i]),
    );
    const bomByCode = new Map<string, any>(bom.filter((b) => b.codigo).map((b) => [b.codigo, b]));
    const normE = rawE.map((r) => normalizeItem(r, itemByCode));
    const normB = rawB.map((r) => normalizeBom(r, bomByCode));
    setParsedItens(normE);
    setParsedBom(normB);

    // Diff
    const beforeById = new Map(itens.map((i) => [i.id, i]));
    const beforeBomById = new Map(bom.map((b) => [b.id, b]));
    const seenItemIds = new Set<string>();
    const seenBomIds = new Set<string>();
    const itemD: DiffRow[] = normE.map((it) => {
      if (!it.id) return { kind: "novo", row: it };
      seenItemIds.add(it.id);
      const before = beforeById.get(it.id);
      if (!before) return { kind: "novo", row: it };
      const changed =
        before.titulo !== it.titulo ||
        (before.descricao ?? null) !== (it.descricao ?? null) ||
        before.prioridade !== it.prioridade ||
        before.disciplina !== it.disciplina ||
        Number(before.duracao_h ?? 0) !== Number(it.duracaoH ?? 0) ||
        (before.responsavel_role ?? null) !== (it.responsavelRole ?? null) ||
        (before.entregavel ?? null) !== (it.entregavel ?? null) ||
        !!before.requer_anexo !== !!it.requerAnexo ||
        JSON.stringify(before.checklist ?? []) !== JSON.stringify(it.checklist);
      return { kind: changed ? "alterado" : "igual", row: it, before };
    });
    const removedI: DiffRow[] = itens
      .filter((i) => !seenItemIds.has(i.id))
      .map((i) => ({ kind: "removido", row: i }));
    setItemDiff([...itemD, ...removedI]);
    setRemoveItemIds(removedI.map((r) => r.row.id));

    const bomD: DiffRow[] = normB.map((b) => {
      if (!b.id) return { kind: "novo", row: b };
      seenBomIds.add(b.id);
      const before = beforeBomById.get(b.id);
      if (!before) return { kind: "novo", row: b };
      const changed =
        before.descricao !== b.descricao ||
        Number(before.quantidade) !== Number(b.quantidade) ||
        before.unidade !== b.unidade ||
        before.criticidade !== b.criticidade ||
        before.disciplina_projeto !== b.disciplinaProjeto ||
        (before.part_number ?? null) !== (b.partNumber ?? null) ||
        (before.fabricante ?? null) !== (b.fabricante ?? null);
      return { kind: changed ? "alterado" : "igual", row: b, before };
    });
    const removedB: DiffRow[] = bom
      .filter((b) => !seenBomIds.has(b.id))
      .map((b) => ({ kind: "removido", row: b }));
    setBomDiff([...bomD, ...removedB]);
    setRemoveBomIds(removedB.map((r) => r.row.id));

    setStep("preview");
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "Importar planilha Excel"}
            {step === "preview" && "Revise o diff antes de aplicar"}
            {step === "done" && "Importação concluída"}
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Selecione a planilha (.xlsx) que você baixou desse template e editou. Vamos comparar
              com o estado atual e mostrar novos / alterados / removidos antes de aplicar.
            </p>
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed border-border bg-muted/20 p-6 hover:bg-muted/30">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <div>
                <div className="text-sm font-medium">Selecionar arquivo .xlsx</div>
                <div className="text-xs text-muted-foreground">Máx. 10 MB</div>
              </div>
              <input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </label>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-6 py-2">
            <DiffSection
              title={`Etapas (${itemDiff.filter((d) => d.kind !== "igual").length} mudanças)`}
              diff={itemDiff}
              fields={["disciplina", "titulo", "prioridade"]}
              fieldsBefore={["disciplina", "titulo", "prioridade"]}
            />
            <DiffSection
              title={`BOM (${bomDiff.filter((d) => d.kind !== "igual").length} mudanças)`}
              diff={bomDiff}
              fields={["descricao", "quantidade", "unidade", "criticidade"]}
              fieldsBefore={["descricao", "quantidade", "unidade", "criticidade"]}
            />
          </div>
        )}

        {step === "done" && result && (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 rounded border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span>
                Nova versão <b>v{result.versao}</b> publicada — {result.itensInseridos} etapas
                novas, {result.itensAtualizados} atualizadas, {result.bomInseridos} BOM novos,{" "}
                {result.bomAtualizados} BOM atualizados, {result.removidos} removidos.
              </span>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <Button variant="ghost" onClick={onClose}>
              Fechar
            </Button>
          )}
          {step === "preview" && (
            <>
              <Button variant="ghost" onClick={() => setStep("upload")}>
                Voltar
              </Button>
              <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
                <FileSpreadsheet className="mr-1 h-4 w-4" />
                {mut.isPending ? "Aplicando..." : "Aplicar mudanças"}
              </Button>
            </>
          )}
          {step === "done" && <Button onClick={onClose}>Fechar</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DiffSection({
  title,
  diff,
  fields,
  fieldsBefore,
}: {
  title: string;
  diff: DiffRow[];
  fields: string[];
  fieldsBefore: string[];
}) {
  const visible = diff.filter((d) => d.kind !== "igual");
  return (
    <section>
      <h4 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{title}</h4>
      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem alterações.</p>
      ) : (
        <div className="rounded border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ação</TableHead>
                {fields.map((f) => (
                  <TableHead key={f}>{f}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((d, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <span
                      className={
                        "rounded px-2 py-0.5 text-[10px] font-semibold uppercase " +
                        (d.kind === "novo"
                          ? "bg-emerald-500/15 text-emerald-700"
                          : d.kind === "alterado"
                            ? "bg-amber-500/15 text-amber-700"
                            : "bg-red-500/15 text-red-700")
                      }
                    >
                      {d.kind}
                    </span>
                  </TableCell>
                  {fields.map((f, idx) => {
                    const beforeKey = fieldsBefore[idx];
                    const beforeVal = d.before ? d.before[beforeKey] : undefined;
                    const afterVal = (d.row as any)[f];
                    return (
                      <TableCell key={f} className="text-xs">
                        {d.kind === "alterado" &&
                        beforeVal !== undefined &&
                        String(beforeVal) !== String(afterVal) ? (
                          <div>
                            <div className="text-muted-foreground line-through">
                              {String(beforeVal ?? "")}
                            </div>
                            <div className="font-medium">{String(afterVal ?? "")}</div>
                          </div>
                        ) : (
                          <span>{String(afterVal ?? beforeVal ?? "")}</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
