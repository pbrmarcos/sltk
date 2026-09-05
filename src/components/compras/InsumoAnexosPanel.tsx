import { useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Paperclip,
  Upload,
  FileText,
  DollarSign,
  Trash2,
  ExternalLink,
  Loader2,
  FolderOpen,
  Download,
  AlertCircle,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  uploadInsumoAnexo,
  listInsumoAnexos,
  removeInsumoAnexo,
  getInsumoDriveFolderUrl,
} from "@/lib/insumo-anexos.functions";
import { listFornecedoresAtivos } from "@/lib/ordens-compra.functions";

type Props = { insumoId: string };

type Kind = "orcamento" | "tecnico" | "outro";

const KIND_LABEL: Record<Kind, string> = {
  orcamento: "Orçamento",
  tecnico: "Técnico",
  outro: "Outro",
};

const KIND_COLOR: Record<Kind, string> = {
  orcamento: "bg-emerald-50 text-emerald-700 border-emerald-200",
  tecnico: "bg-blue-50 text-blue-700 border-blue-200",
  outro: "bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--bg-border)]",
};

const MOEDAS = ["BRL", "USD", "EUR", "CNY"] as const;
const INCOTERMS = ["EXW", "FOB", "CIF", "DAP", "DDP", "CFR", "FCA"] as const;

const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPT =
  "application/pdf,image/jpeg,image/png,image/webp,application/zip,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function formatSize(bytes: number | null | undefined) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatValor(v: number | null | undefined, moeda: string | null | undefined) {
  if (v == null) return null;
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: moeda ?? "BRL",
    }).format(Number(v));
  } catch {
    return `${moeda ?? ""} ${v}`;
  }
}

export function InsumoAnexosPanel({ insumoId }: Props) {
  const qc = useQueryClient();
  const uploadFn = useServerFn(uploadInsumoAnexo);
  const listFn = useServerFn(listInsumoAnexos);
  const removeFn = useServerFn(removeInsumoAnexo);
  const listFornFn = useServerFn(listFornecedoresAtivos);
  const folderFn = useServerFn(getInsumoDriveFolderUrl);

  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [kind, setKind] = useState<Kind>("orcamento");
  const [fornecedorId, setFornecedorId] = useState<string>("");
  const [fornecedorQ, setFornecedorQ] = useState("");
  const [valor, setValor] = useState<string>("");
  const [moeda, setMoeda] = useState<string>("BRL");
  const [condicao, setCondicao] = useState("");
  const [leadTime, setLeadTime] = useState("");
  const [incoterm, setIncoterm] = useState("");
  const [validade, setValidade] = useState<Date | undefined>(undefined);
  const [obs, setObs] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const anexos = useQuery({
    queryKey: ["insumo-anexos", insumoId],
    queryFn: () => listFn({ data: { insumo_id: insumoId } }),
  });

  const driveFolder = useQuery({
    queryKey: ["insumo-drive-folder", insumoId],
    queryFn: () => folderFn({ data: { insumo_id: insumoId } }),
  });

  const fornecedoresQ = useQuery({
    queryKey: ["fornecedores-ativos", fornecedorQ],
    queryFn: () => listFornFn({ data: { q: fornecedorQ } }),
  });

  const { orcamentos, tecnicos, outros, folderUrl } = useMemo(() => {
    const rows = (anexos.data ?? []) as any[];
    const anexoFolder = rows.find((r) => r.drive_folder_url)?.drive_folder_url ?? null;
    return {
      orcamentos: rows.filter((r) => r.kind === "orcamento"),
      tecnicos: rows.filter((r) => r.kind === "tecnico"),
      outros: rows.filter((r) => r.kind === "outro"),
      folderUrl: anexoFolder ?? driveFolder.data?.url ?? null,
    };
  }, [anexos.data, driveFolder.data]);

  async function fileToBase64(file: File): Promise<string> {
    const buf = await file.arrayBuffer();
    // Chunked base64 to avoid stack overflow
    let bin = "";
    const view = new Uint8Array(buf);
    const CHUNK = 0x8000;
    for (let i = 0; i < view.length; i += CHUNK) {
      bin += String.fromCharCode(...view.subarray(i, i + CHUNK));
    }
    return btoa(bin);
  }

  function validate(file: File): Record<string, string> {
    const errs: Record<string, string> = {};
    if (file.size > MAX_BYTES) {
      errs.file = `Arquivo muito grande (máx ${MAX_BYTES / 1048576}MB).`;
    }
    if (!ACCEPT.split(",").includes(file.type)) {
      errs.file = errs.file ?? `Tipo não suportado: ${file.type || "desconhecido"}.`;
    }
    if (kind === "orcamento") {
      const v = Number((valor || "").replace(",", "."));
      if (!valor.trim()) errs.valor = "Informe o valor do orçamento.";
      else if (Number.isNaN(v) || v <= 0) errs.valor = "Valor deve ser numérico e maior que zero.";
      if (!fornecedorId) errs.fornecedor = "Selecione o fornecedor da proposta.";
      if (!condicao.trim()) errs.condicao = "Informe a condição de pagamento.";
      if (validade) {
        const d = new Date(validade);
        if (Number.isNaN(d.getTime())) errs.validade = "Data inválida.";
      }
    }
    return errs;
  }

  async function handleFile(file: File) {
    const errs = validate(file);
    setErrors(errs);
    if (Object.keys(errs).length) {
      toast.error(Object.values(errs)[0]);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setUploading(true);
    try {
      const data_base64 = await fileToBase64(file);
      await uploadFn({
        data: {
          insumo_id: insumoId,
          kind,
          fornecedor_id: fornecedorId || null,
          filename: file.name,
          mime_type: file.type || "application/octet-stream",
          size_bytes: file.size,
          data_base64,
          valor: valor ? Number(valor.replace(",", ".")) : null,
          moeda: moeda || "BRL",
          condicao_pagamento: condicao || null,
          lead_time_dias: leadTime ? Number(leadTime) : null,
          incoterm: incoterm || null,
          validade_ate: validade ? validade.toISOString().slice(0, 10) : null,
          observacoes: obs || null,
        },
      });
      toast.success("Anexo enviado.");
      if (kind === "orcamento") {
        setValor("");
        setCondicao("");
        setLeadTime("");
        setIncoterm("");
        setValidade(undefined);
        setObs("");
      }
      setErrors({});
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["insumo-anexos", insumoId] }),
        qc.invalidateQueries({ queryKey: ["insumo-atividades", insumoId] }),
        qc.invalidateQueries({ queryKey: ["insumo-drive-folder", insumoId] }),
      ]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha no upload.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Remover este anexo?")) return;
    try {
      await removeFn({ data: { id } });
      toast.success("Anexo removido.");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["insumo-anexos", insumoId] }),
        qc.invalidateQueries({ queryKey: ["insumo-atividades", insumoId] }),
      ]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao remover.");
    }
  }

  return (
    <div className="space-y-4">
      {/* Uploader */}
      <div className="rounded-md border border-[var(--bg-border)] bg-[var(--bg-elevated)] p-3 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs flex items-center gap-1.5">
            <Upload className="h-3.5 w-3.5" />
            Enviar arquivo
          </Label>
          {folderUrl && (
            <a
              href={folderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-[var(--text-secondary)] hover:text-blue-600"
            >
              <FolderOpen className="h-3 w-3" />
              Abrir pasta do Drive
            </a>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <div>
            <Label className="text-[11px] text-[var(--text-muted)]">Tipo</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="orcamento">Orçamento</SelectItem>
                <SelectItem value="tecnico">Técnico / Datasheet</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label className="text-[11px] text-[var(--text-muted)]">
              Fornecedor {kind === "orcamento" && <span className="text-red-500">*</span>}
            </Label>
            <Select value={fornecedorId || "none"} onValueChange={(v) => setFornecedorId(v === "none" ? "" : v)}>
              <SelectTrigger className={cn("h-8 text-xs", errors.fornecedor && "border-red-400")}>
                <SelectValue placeholder="Selecionar fornecedor…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Sem fornecedor —</SelectItem>
                <div className="px-2 py-1">
                  <Input
                    placeholder="Buscar…"
                    className="h-7 text-xs"
                    value={fornecedorQ}
                    onChange={(e) => setFornecedorQ(e.target.value)}
                  />
                </div>
                {(fornecedoresQ.data ?? []).map((f: any) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nome_fantasia ?? f.nome} {f.codigo ? `· ${f.codigo}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.fornecedor && <FieldError msg={errors.fornecedor} />}
          </div>
        </div>


        {kind === "orcamento" && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 rounded border border-emerald-200 bg-emerald-50/40 p-2">
            <div>
              <Label className="text-[11px] text-[var(--text-muted)]">
                Valor <span className="text-red-500">*</span>
              </Label>
              <Input
                className={cn("h-8 text-xs", errors.valor && "border-red-400")}
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
              {errors.valor && <FieldError msg={errors.valor} />}
            </div>

            <div>
              <Label className="text-[11px] text-[var(--text-muted)]">Moeda</Label>
              <Select value={moeda} onValueChange={setMoeda}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOEDAS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-[var(--text-muted)]">Lead time (dias)</Label>
              <Input
                type="number"
                min={0}
                className="h-8 text-xs"
                value={leadTime}
                onChange={(e) => setLeadTime(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-[11px] text-[var(--text-muted)]">Incoterm</Label>
              <Select value={incoterm || "none"} onValueChange={(v) => setIncoterm(v === "none" ? "" : v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {INCOTERMS.map((i) => (
                    <SelectItem key={i} value={i}>
                      {i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label className="text-[11px] text-[var(--text-muted)]">
                Condição de pagamento <span className="text-red-500">*</span>
              </Label>
              <Input
                className={cn("h-8 text-xs", errors.condicao && "border-red-400")}
                placeholder="Ex.: 30/60/90 dias, antecipado…"
                value={condicao}
                onChange={(e) => setCondicao(e.target.value)}
              />
              {errors.condicao && <FieldError msg={errors.condicao} />}
            </div>
            <div>
              <Label className="text-[11px] text-[var(--text-muted)]">Validade</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "h-8 w-full justify-start text-left text-xs font-normal",
                      !validade && "text-[var(--text-muted)]",
                      errors.validade && "border-red-400",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {validade ? format(validade, "dd/MM/yyyy", { locale: ptBR }) : "dd/mm/aaaa"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={validade}
                    onSelect={setValidade}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {errors.validade && <FieldError msg={errors.validade} />}
            </div>

            <div className="col-span-4">
              <Label className="text-[11px] text-[var(--text-muted)]">Observações</Label>
              <Textarea
                rows={2}
                className="text-xs"
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Notas para quem for aprovar…"
              />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          <Button
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="mr-2 h-3.5 w-3.5" />
            )}
            {uploading ? "Enviando…" : "Selecionar arquivo"}
          </Button>
          <span className="text-[11px] text-[var(--text-muted)]">
            PDF, imagens, DOC/XLS ou ZIP até 25MB. Salvo em Drive/Compras/Insumos/…
          </span>
        </div>
        {errors.file && <FieldError msg={errors.file} />}
      </div>


      {/* Listagens */}
      <Section
        title="Orçamentos recebidos"
        icon={<DollarSign className="h-3.5 w-3.5" />}
        rows={orcamentos}
        onRemove={handleRemove}
        showCotacaoFields
      />
      <Section
        title="Anexos técnicos"
        icon={<FileText className="h-3.5 w-3.5" />}
        rows={tecnicos}
        onRemove={handleRemove}
      />
      <Section
        title="Outros anexos"
        icon={<Paperclip className="h-3.5 w-3.5" />}
        rows={outros}
        onRemove={handleRemove}
      />
    </div>
  );
}

function Section({
  title,
  icon,
  rows,
  onRemove,
  showCotacaoFields,
}: {
  title: string;
  icon: React.ReactNode;
  rows: any[];
  onRemove: (id: string) => void;
  showCotacaoFields?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)]">
        {icon}
        {title}
        <span className="text-[var(--text-muted)] font-normal">({rows.length})</span>
      </div>
      {rows.length === 0 ? (
        <div className="text-[11px] text-[var(--text-muted)] italic border border-dashed border-[var(--bg-border)] rounded p-3">
          Nada por aqui ainda.
        </div>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r) => {
            const kind = r.kind as Kind;
            const forn = r.fornecedores;
            const valorFmt = formatValor(r.valor, r.moeda);
            return (
              <div
                key={r.id}
                className="rounded border border-[var(--bg-border)] bg-[var(--bg-surface)] p-2.5 flex flex-col md:flex-row md:items-center gap-2 text-xs"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Badge
                    variant="outline"
                    className={cn("font-normal shrink-0", KIND_COLOR[kind])}
                  >
                    {KIND_LABEL[kind]}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-[var(--text-primary)]">
                      {r.file_name}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] flex flex-wrap gap-x-2">
                      <span>{formatSize(r.size_bytes)}</span>
                      {forn && (
                        <span>· {forn.nome_fantasia ?? forn.nome}</span>
                      )}
                      {r.uploaded_by_nome && <span>· {r.uploaded_by_nome}</span>}
                      <span>· {new Date(r.criado_em).toLocaleString("pt-BR")}</span>
                    </div>
                    {showCotacaoFields && (valorFmt || r.condicao_pagamento || r.lead_time_dias || r.incoterm) && (
                      <div className="text-[10px] text-emerald-700 flex flex-wrap gap-x-2 mt-0.5">
                        {valorFmt && <span className="font-semibold">{valorFmt}</span>}
                        {r.condicao_pagamento && <span>· {r.condicao_pagamento}</span>}
                        {r.lead_time_dias != null && <span>· {r.lead_time_dias} dias</span>}
                        {r.incoterm && <span>· {r.incoterm}</span>}
                        {r.validade_ate && (
                          <span>· val. {new Date(r.validade_ate).toLocaleDateString("pt-BR")}</span>
                        )}
                      </div>
                    )}
                    {r.observacoes && (
                      <div className="text-[10px] text-[var(--text-secondary)] mt-0.5 italic truncate">
                        {r.observacoes}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {r.drive_view_url && (
                    <Button asChild size="sm" variant="ghost" className="h-7" title="Abrir no Drive">
                      <a href={r.drive_view_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  )}
                  {r.drive_file_id && (
                    <Button asChild size="sm" variant="ghost" className="h-7" title="Baixar arquivo">
                      <a
                        href={`https://drive.google.com/uc?export=download&id=${r.drive_file_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={r.file_name}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => onRemove(r.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FieldError({ msg }: { msg: string }) {
  return (
    <div className="mt-1 flex items-center gap-1 text-[10px] text-red-600">
      <AlertCircle className="h-3 w-3" />
      <span>{msg}</span>
    </div>
  );
}
