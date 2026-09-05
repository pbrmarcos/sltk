import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { bulkImport } from "@/lib/importar.functions";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Upload, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/importar")({
  head: () => ({
    meta: [
      { title: "Importar dados — Solutek" },
      { name: "description", content: "Wizard de importação de clientes, fornecedores e mais." },
    ],
  }),
  component: ImportarWizardPage,
});

type Entity = "clientes" | "fornecedores";
type Step = 1 | 2 | 3 | 4;

const FIELDS: Record<Entity, { key: string; label: string; required?: boolean }[]> = {
  clientes: [
    { key: "razao_social", label: "Razão social", required: true },
    { key: "nome_fantasia", label: "Nome fantasia" },
    { key: "cnpj", label: "CNPJ" },
    { key: "email", label: "E-mail" },
    { key: "telefone", label: "Telefone" },
    { key: "cidade", label: "Cidade" },
    { key: "estado", label: "Estado (UF)" },
    { key: "pais", label: "País (BR/US/...)" },
  ],
  fornecedores: [
    { key: "razao_social", label: "Razão social", required: true },
    { key: "nome_fantasia", label: "Nome fantasia" },
    { key: "cnpj", label: "CNPJ" },
    { key: "email", label: "E-mail" },
    { key: "telefone", label: "Telefone" },
    { key: "pais", label: "País (BR/US/...)" },
  ],
};

function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const sep = lines[0].includes(";") && !lines[0].includes(",") ? ";" : ",";
  const parseLine = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = !inQ;
        }
      } else if (ch === sep && !inQ) {
        out.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  };
  const headers = parseLine(lines[0]).map((h) => h.replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

function ImportarWizardPage() {
  const navigate = useNavigate();
  const importFn = useServerFn(bulkImport);
  const [step, setStep] = useState<Step>(1);
  const [entity, setEntity] = useState<Entity>("clientes");
  const [csvText, setCsvText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<null | {
    inserted: number;
    skipped: number;
    errors: string[];
  }>(null);

  const parsed = useMemo(
    () => (csvText ? parseCSV(csvText) : { headers: [], rows: [] }),
    [csvText],
  );
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const fields = FIELDS[entity];

  function autoMap(headers: string[]) {
    const map: Record<string, string> = {};
    for (const f of fields) {
      const found = headers.find(
        (h) => h.toLowerCase().replace(/[^a-z]/g, "") === f.key.replace(/_/g, ""),
      );
      if (found) map[f.key] = found;
    }
    setMapping(map);
  }

  function next() {
    if (step === 2) {
      if (parsed.headers.length === 0) {
        toast.error("Cole ou faça upload de um CSV com cabeçalho.");
        return;
      }
      autoMap(parsed.headers);
    }
    if (step === 3) {
      const req = fields.filter((f) => f.required);
      for (const f of req) {
        if (!mapping[f.key]) {
          toast.error(`Mapeie a coluna para "${f.label}".`);
          return;
        }
      }
    }
    setStep((s) => Math.min(4, s + 1) as Step);
  }

  const previewRows = useMemo(() => {
    if (parsed.headers.length === 0) return [] as Record<string, string>[];
    return parsed.rows.slice(0, 5).map((row) => {
      const obj: Record<string, string> = {};
      for (const f of fields) {
        const header = mapping[f.key];
        if (!header) continue;
        const idx = parsed.headers.indexOf(header);
        obj[f.key] = idx >= 0 ? (row[idx] ?? "") : "";
      }
      return obj;
    });
  }, [parsed, mapping, fields]);

  async function handleImport() {
    setBusy(true);
    try {
      const rows = parsed.rows
        .map((row) => {
          const obj: Record<string, string> = {};
          for (const f of fields) {
            const header = mapping[f.key];
            if (!header) continue;
            const idx = parsed.headers.indexOf(header);
            obj[f.key] = idx >= 0 ? (row[idx] ?? "") : "";
          }
          return obj;
        })
        .filter((r) => (r.razao_social ?? "").trim().length > 0);
      const res = await importFn({ data: { entity, rows } });
      setResult(res);
      toast.success(
        `Importação concluída: ${res.inserted} inseridos, ${res.skipped} ignorados, ${res.errors.length} erros.`,
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Falha na importação");
    } finally {
      setBusy(false);
    }
  }

  function handleFile(f: File) {
    if (f.size > 5 * 1024 * 1024) {
      toast.error("Arquivo acima de 5MB — divida em partes.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result ?? ""));
    reader.readAsText(f);
  }

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: "Importar" }]}
        title="Wizard de importação"
        subtitle="Importe clientes ou fornecedores em lote via CSV."
      />

      <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
        {(["Módulo", "CSV", "Mapear", "Confirmar"] as const).map((label, i) => {
          const s = (i + 1) as Step;
          const active = step === s;
          const done = step > s;
          return (
            <div key={label} className="flex items-center gap-2">
              <span
                className={
                  "grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold " +
                  (done
                    ? "bg-emerald-500 text-white"
                    : active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground")
                }
              >
                {done ? "✓" : s}
              </span>
              <span className={active ? "font-semibold text-foreground" : ""}>{label}</span>
              {i < 3 && <span className="mx-1">›</span>}
            </div>
          );
        })}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>1. Qual módulo você quer importar?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2 max-w-sm">
              <Label>Módulo</Label>
              <Select value={entity} onValueChange={(v) => setEntity(v as Entity)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clientes">Clientes</SelectItem>
                  <SelectItem value="fornecedores">Fornecedores</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Campos aceitos: {fields.map((f) => f.label).join(", ")}.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>2. Cole ou faça upload do CSV</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded border border-input bg-background px-3 py-2 text-sm hover:bg-accent">
                <Upload className="h-4 w-4" />
                Selecionar arquivo .csv
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </label>
              <span className="text-xs text-muted-foreground">
                A primeira linha deve conter os cabeçalhos.
              </span>
            </div>
            <Textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={"razao_social,cnpj,email\nEmpresa X,12345678000199,contato@x.com"}
              rows={10}
              className="font-mono text-xs"
            />
            {parsed.headers.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Detectadas {parsed.headers.length} colunas e {parsed.rows.length} linhas.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>3. Mapeie as colunas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {fields.map((f) => (
              <div key={f.key} className="grid grid-cols-2 items-center gap-3 max-w-2xl">
                <Label>
                  {f.label}
                  {f.required && <span className="text-red-500"> *</span>}
                </Label>
                <Select
                  value={mapping[f.key] ?? "__none__"}
                  onValueChange={(v) =>
                    setMapping((m) => ({ ...m, [f.key]: v === "__none__" ? "" : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="— não mapear —" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— não mapear —</SelectItem>
                    {parsed.headers.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>4. Prévia e confirmação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span>
                    {result.inserted} registros inseridos, {result.skipped} ignorados,{" "}
                    {result.errors.length} erros.
                  </span>
                </div>
                {result.errors.length > 0 && (
                  <div className="rounded border border-red-500/40 bg-red-500/5 p-3 text-xs">
                    <div className="mb-1 font-semibold text-red-600">Erros:</div>
                    <ul className="list-disc pl-5">
                      {result.errors.slice(0, 20).map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      navigate({ to: entity === "clientes" ? "/clientes" : "/fornecedores" })
                    }
                  >
                    Ir para {entity}
                  </Button>
                  <Button
                    onClick={() => {
                      setStep(1);
                      setCsvText("");
                      setMapping({});
                      setResult(null);
                    }}
                  >
                    Nova importação
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Serão importados <b>{parsed.rows.length}</b> registros para <b>{entity}</b>.
                  Mostrando as 5 primeiras linhas mapeadas:
                </p>
                <div className="rounded border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {fields
                          .filter((f) => mapping[f.key])
                          .map((f) => (
                            <TableHead key={f.key}>{f.label}</TableHead>
                          ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewRows.map((r, i) => (
                        <TableRow key={i}>
                          {fields
                            .filter((f) => mapping[f.key])
                            .map((f) => (
                              <TableCell key={f.key} className="text-xs">
                                {r[f.key] ?? ""}
                              </TableCell>
                            ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setStep((s) => Math.max(1, s - 1) as Step)}
          disabled={step === 1 || busy || !!result}
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        {step < 4 ? (
          <Button onClick={next}>
            Avançar <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : !result ? (
          <Button onClick={handleImport} disabled={busy || parsed.rows.length === 0}>
            {busy ? "Importando..." : `Importar ${parsed.rows.length} registros`}
          </Button>
        ) : null}
      </div>
    </PageContainer>
  );
}
