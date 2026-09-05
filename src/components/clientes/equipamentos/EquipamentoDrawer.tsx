import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Upload,
  Wrench,
  Cpu,
  ClipboardCheck,
  History,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { confirmDiscard } from "@/lib/unsaved-guard";
import {
  EQUIPAMENTO_CATEGORIA_LABEL,
  EQUIPAMENTO_STATUS_COLOR,
  EQUIPAMENTO_STATUS_LABEL,
  EQUIPAMENTO_STATUS_FASE,
  EQUIPAMENTO_FASE_LABEL,
  EQUIPAMENTO_DOC_CATEGORIAS,
  EQUIPAMENTO_DOC_CATEGORIA_LABEL,
  EQUIPAMENTO_DOC_AREA,
  type EquipamentoCategoria,
  type EquipamentoStatus,
  type EquipamentoDocCategoria,
} from "@/lib/equipamentos.shared";
import { equipamentoDocumentosQueryOptions } from "@/lib/equipamento-documentos.queries";
import {
  uploadEquipamentoDocumento,
  removerEquipamentoDocumento,
} from "@/lib/equipamento-documentos.functions";
import { equipamentoTimelineQueryOptions } from "@/lib/equipamento-planejamento.queries";
import { useAuth } from "@/hooks/use-auth";
import { useSensitiveAccess } from "@/lib/sensitive";
import { EtpEquipamentoPanel } from "@/components/engenharia/EtpEquipamentoPanel";
import { DisciplinaTab } from "./DisciplinaTab";
import { BomSummaryCard } from "./BomSummaryCard";

export type EquipamentoRow = {
  id: string;
  codigo: string | null;
  modelo: string;
  fabricante?: string | null;
  numero_serie: string | null;
  tag_cliente: string | null;
  categoria: string;
  status: string;
  data_entrega: string | null;
  data_instalacao: string | null;
  data_garantia_fim: string | null;
  localizacao: string | null;
  valor_venda: number | null;
  observacoes: string | null;
  resumo?: string | null;
  responsavel_engenharia_id?: string | null;
  responsavel_automacao_id?: string | null;
};

type Area = "engenharia" | "producao" | "qualidade" | "pos_venda";

const AREA_LABEL: Record<Area, string> = {
  engenharia: "Engenharia",
  producao: "Automação",
  qualidade: "Qualidade",
  pos_venda: "Pós-venda",
};

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}

function fmtDateTime(d: string | null | undefined) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("pt-BR");
  } catch {
    return "—";
  }
}

function fmtMoney(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

type DrawerTab = "visao" | "planejamento" | "etp" | "timeline" | Area;

export function EquipamentoDrawer({
  open,
  onClose,
  equipamento,
  initialTab,
}: {
  open: boolean;
  onClose: () => void;
  equipamento: EquipamentoRow | null;
  initialTab?: DrawerTab;
}) {
  const [tab, setTab] = useState<DrawerTab>(initialTab ?? "visao");
  const { user, role } = useAuth();

  if (!equipamento) return null;
  // Papel Sales enxerga apenas a página do time dos equipamentos em que está
  // designado — nas demais áreas (montagem, engenharia, qualidade…) o acesso
  // ao detalhe fica bloqueado, mesmo abrindo pela lista.
  const isSales = role === "sales";
  const designado =
    !!user?.id &&
    (equipamento.responsavel_engenharia_id === user.id ||
      equipamento.responsavel_automacao_id === user.id);
  const salesBloqueado = isSales && !designado;
  const status = equipamento.status as EquipamentoStatus;
  const cat = equipamento.categoria as EquipamentoCategoria;
  const fase = EQUIPAMENTO_STATUS_FASE[status];

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="w-full max-w-7xl overflow-hidden p-0 sm:max-w-7xl">
        <div className="flex h-[90vh] flex-col">
          <div className="border-b border-border bg-gradient-to-br from-muted/40 to-transparent p-6 pb-4">
            <DialogHeader className="space-y-2 text-left">
              <div className="flex items-center gap-2 text-[11px] font-mono text-muted-foreground">
                <Wrench className="h-3.5 w-3.5" />
                {equipamento.codigo ?? "—"}
              </div>
              <DialogTitle className="text-[20px] leading-tight">{equipamento.modelo}</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2 text-[12px]">
                <Badge variant="outline" className={cn(EQUIPAMENTO_STATUS_COLOR[status])}>
                  {EQUIPAMENTO_STATUS_LABEL[status] ?? status}
                </Badge>
                <span className="text-muted-foreground">·</span>
                <span>Fase: {EQUIPAMENTO_FASE_LABEL[fase]}</span>
                <span className="text-muted-foreground">·</span>
                <span>{EQUIPAMENTO_CATEGORIA_LABEL[cat] ?? cat}</span>
                {equipamento.responsavel_engenharia_id && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span className="inline-flex items-center gap-1">
                      <User className="h-3 w-3" /> Engenharia atribuída
                    </span>
                  </>
                )}
                {equipamento.responsavel_automacao_id && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <span className="inline-flex items-center gap-1">
                      <Cpu className="h-3 w-3" /> Automação atribuída
                    </span>
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            {equipamento.resumo && (
              <div className="mt-4 rounded-lg border border-border bg-card p-4">
                <div className="mb-1 flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                  <ClipboardCheck className="h-3.5 w-3.5" /> Resumo do equipamento
                </div>
                <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed">
                  {equipamento.resumo}
                </p>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-6">
            {salesBloqueado ? (
              <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center">
                <p className="text-[13px] font-medium">Acesso restrito a este equipamento</p>
                <p className="mt-1 text-[12.5px] text-muted-foreground">
                  Seu perfil acessa apenas a página do time dos equipamentos em que está designado.
                </p>
              </div>
            ) : isSales ? (
              <div className="mt-4 space-y-4">
                <TimeCard eqp={equipamento} />
                <TimelinePanel equipamentoId={equipamento.id} />
              </div>
            ) : (
              <Tabs value={tab} onValueChange={(v) => setTab(v as DrawerTab)} className="mt-4">
                <TabsList className="grid w-full grid-cols-8">
                  <TabsTrigger value="visao">Visão</TabsTrigger>
                  <TabsTrigger value="planejamento">Planejamento</TabsTrigger>
                  <TabsTrigger value="etp">ETP</TabsTrigger>
                  <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  <TabsTrigger value="engenharia">Engenharia</TabsTrigger>
                  <TabsTrigger value="producao">Automação</TabsTrigger>
                  <TabsTrigger value="qualidade">Qualidade</TabsTrigger>
                  <TabsTrigger value="pos_venda">Pós-venda</TabsTrigger>
                </TabsList>

                <TabsContent value="etp" className="mt-4">
                  <EtpEquipamentoPanel equipamentoId={equipamento.id} />
                </TabsContent>

                <TabsContent value="visao" className="mt-4 space-y-3">
                  <BomSummaryCard equipamentoId={equipamento.id} />
                  <DataGrid eqp={equipamento} />
                </TabsContent>

                <TabsContent value="planejamento" className="mt-4">
                  <DisciplinaTab equipamentoId={equipamento.id} disciplina="planejamento" />
                </TabsContent>

                <TabsContent value="timeline" className="mt-4">
                  <TimelinePanel equipamentoId={equipamento.id} />
                </TabsContent>

                {(["engenharia", "producao", "qualidade", "pos_venda"] as const).map((area) => (
                  <TabsContent key={area} value={area} className="mt-4 space-y-4">
                    <DisciplinaTab equipamentoId={equipamento.id} disciplina={area} />
                    <DocsArea area={area} equipamentoId={equipamento.id} />
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TimelinePanel({ equipamentoId }: { equipamentoId: string }) {
  const eventsQ = useQuery(equipamentoTimelineQueryOptions(equipamentoId));
  const etapasQ = useQuery({
    queryKey: ["eq-timeline-etapas", equipamentoId],
    queryFn: () =>
      import("@/lib/equipamento-disciplina-etapas.functions").then((m) =>
        m.listAllEquipamentoEtapas({ data: { equipamentoId } }),
      ),
  });

  const events = eventsQ.data ?? [];
  const etapas = (etapasQ.data ?? []).filter((e) => !e.parent_id);

  if (eventsQ.isLoading || etapasQ.isLoading) {
    return <div className="text-[12px] text-muted-foreground">Carregando timeline…</div>;
  }

  const statusDot: Record<string, string> = {
    concluido: "bg-emerald-500",
    em_progresso: "bg-sky-500",
    bloqueado: "bg-rose-500",
    nao_iniciado: "bg-muted-foreground/40",
  };
  const discLabel: Record<string, string> = {
    planejamento: "Planejamento",
    engenharia: "Engenharia",
    producao: "Automação",
    qualidade: "Qualidade",
    pos_venda: "Pós-venda",
  };

  return (
    <div className="space-y-5">
      {etapas.length > 0 && (
        <section>
          <h4 className="mb-2 text-[12px] font-semibold text-foreground">Etapas por prazo</h4>
          <ol className="relative space-y-2 border-l border-border pl-5">
            {etapas.map((e) => (
              <li key={e.id} className="relative">
                <span
                  className={cn(
                    "absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background",
                    statusDot[e.status] ?? "bg-muted-foreground/60",
                  )}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12.5px] font-medium">{e.titulo}</span>
                  <Badge
                    variant="outline"
                    className="h-4 border-border bg-muted/40 px-1 text-[9.5px] font-normal"
                  >
                    {discLabel[e.disciplina] ?? e.disciplina}
                  </Badge>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {e.data_vencimento
                    ? new Date(e.data_vencimento).toLocaleDateString("pt-BR")
                    : "sem prazo"}
                  {e.responsavel_nome ? ` · ${e.responsavel_nome}` : ""}
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {events.length > 0 && (
        <section>
          <h4 className="mb-2 text-[12px] font-semibold text-foreground">Histórico de eventos</h4>
          <ol className="relative space-y-3 border-l border-border pl-5">
            {events.map((e, i) => (
              <li key={i} className="relative">
                <span
                  className={cn(
                    "absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background",
                    e.kind.startsWith("planej_ok")
                      ? "bg-emerald-500"
                      : e.kind.startsWith("etp_aprov")
                        ? "bg-emerald-500"
                        : e.kind.startsWith("audit_insert")
                          ? "bg-sky-500"
                          : e.kind.startsWith("audit_delete")
                            ? "bg-rose-500"
                            : "bg-muted-foreground/60",
                  )}
                />
                <div className="flex items-center gap-2">
                  <History className="h-3.5 w-3.5 text-muted-foreground" />
                  <div className="text-[12.5px] font-medium">{e.titulo}</div>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {fmtDateTime(e.at)} {e.autor ? `· ${e.autor}` : ""}
                </div>
                {e.detalhe && (
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{e.detalhe}</div>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {etapas.length === 0 && events.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-[12.5px] text-muted-foreground">
          Sem etapas nem eventos ainda.
        </div>
      )}
    </div>
  );
}

function TimeCard({ eqp }: { eqp: EquipamentoRow }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 text-[12.5px]">
      <div className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
        Time do equipamento
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="inline-flex items-center gap-1.5">
          <User className="h-3.5 w-3.5" /> Engenharia:{" "}
          <span className="font-medium">{eqp.responsavel_engenharia_id ? "atribuída" : "—"}</span>
        </div>
        <div className="inline-flex items-center gap-1.5">
          <Cpu className="h-3.5 w-3.5" /> Automação:{" "}
          <span className="font-medium">{eqp.responsavel_automacao_id ? "atribuída" : "—"}</span>
        </div>
      </div>
    </div>
  );
}

function DataGrid({ eqp }: { eqp: EquipamentoRow }) {
  const { canSee } = useSensitiveAccess();
  const rows: Array<[string, React.ReactNode]> = [
    ["Fabricante", eqp.fabricante ?? "Solutek"],
    ["Nº de série", eqp.numero_serie ?? "—"],
    ["Tag do cliente", eqp.tag_cliente ?? "—"],
    ["Localização", eqp.localizacao ?? "—"],
    ["Data de entrega", fmtDate(eqp.data_entrega)],
    ["Data de instalação", fmtDate(eqp.data_instalacao)],
    ["Fim da garantia", fmtDate(eqp.data_garantia_fim)],
    ["Valor de venda", canSee ? fmtMoney(eqp.valor_venda) : "R$ ••••"],
  ];
  return (
    <div className="space-y-3 text-[12.5px]">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-border bg-muted/20 p-4">
        {rows.map(([k, v]) => (
          <div key={k}>
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</div>
            <div className="font-medium">{v}</div>
          </div>
        ))}
      </div>
      {eqp.observacoes && (
        <div className="rounded-lg border border-border p-4">
          <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">
            Observações
          </div>
          <div className="whitespace-pre-wrap text-[12.5px]">{eqp.observacoes}</div>
        </div>
      )}
    </div>
  );
}

function DocsArea({ area, equipamentoId }: { area: Area; equipamentoId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(equipamentoDocumentosQueryOptions(equipamentoId));
  const [openUpload, setOpenUpload] = useState(false);

  const areaCategorias = useMemo(
    () => EQUIPAMENTO_DOC_CATEGORIAS.filter((c) => EQUIPAMENTO_DOC_AREA[c] === area),
    [area],
  );

  const docs = (data ?? []).filter((d) =>
    areaCategorias.includes(d.categoria as EquipamentoDocCategoria),
  );

  const removeMut = useMutation({
    mutationFn: (id: string) => removerEquipamentoDocumento({ data: { id } }),
    onSuccess: () => {
      toast.success("Documento removido.");
      qc.invalidateQueries({ queryKey: ["equipamentos", equipamentoId, "documentos"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao remover."),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-[12px] text-muted-foreground">
          {AREA_LABEL[area]} · {docs.length} documento{docs.length === 1 ? "" : "s"}
        </div>
        <Button size="sm" className="h-8" onClick={() => setOpenUpload(true)}>
          <Plus className="h-3.5 w-3.5" /> Adicionar
        </Button>
      </div>

      {isLoading ? (
        <div className="text-[12px] text-muted-foreground">Carregando…</div>
      ) : docs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center text-[12.5px] text-muted-foreground">
          Nenhum documento de {AREA_LABEL[area].toLowerCase()} ainda.
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-4 py-2.5 text-[12.5px]">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{d.nome_final}</span>
                  <Badge
                    variant="outline"
                    className="border-border bg-muted/40 text-[10px] font-normal"
                  >
                    {EQUIPAMENTO_DOC_CATEGORIA_LABEL[d.categoria as EquipamentoDocCategoria] ??
                      d.categoria}
                  </Badge>
                  {d.versao && (
                    <Badge variant="outline" className="border-border text-[10px] font-normal">
                      {d.versao}
                    </Badge>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {fmtBytes(d.tamanho_bytes)} · {fmtDate(d.created_at)} · {d.user_nome ?? "—"}
                </div>
              </div>
              {d.drive_view_url && (
                <a
                  href={d.drive_view_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  title="Abrir no Drive"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
              <button
                onClick={() => {
                  if (confirm(`Remover ${d.nome_final}?`)) removeMut.mutate(d.id);
                }}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-rose-700"
                title="Remover"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <UploadDocumentoDialog
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        equipamentoId={equipamentoId}
        areaCategorias={areaCategorias}
        onUploaded={() => {
          qc.invalidateQueries({ queryKey: ["equipamentos", equipamentoId, "documentos"] });
          setOpenUpload(false);
        }}
      />
    </div>
  );
}

function UploadDocumentoDialog({
  open,
  onClose,
  equipamentoId,
  areaCategorias,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  equipamentoId: string;
  areaCategorias: readonly EquipamentoDocCategoria[];
  onUploaded: () => void;
}) {
  const [categoria, setCategoria] = useState<EquipamentoDocCategoria>(areaCategorias[0]);
  const [versao, setVersao] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [chosenName, setChosenName] = useState("");
  const [busy, setBusy] = useState(false);

  const dirty = !!file || !!chosenName.trim() || !!versao.trim() || !!observacoes.trim();
  const guardedClose = () => {
    if (busy) return;
    if (confirmDiscard(dirty)) onClose();
  };

  if (!open) return null;

  async function onUpload() {
    if (!file) {
      toast.error("Selecione um arquivo.");
      return;
    }
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
      await uploadEquipamentoDocumento({
        data: {
          equipamento_id: equipamentoId,
          categoria,
          filename: file.name,
          mime_type: file.type || "application/octet-stream",
          size_bytes: file.size,
          data_base64: b64,
          chosen_name: chosenName.trim() || file.name.replace(/\.[^.]+$/, ""),
          versao: versao.trim() || null,
          observacoes: observacoes.trim() || null,
        },
      });
      toast.success("Documento enviado.");
      setFile(null);
      setChosenName("");
      setVersao("");
      setObservacoes("");
      onUploaded();
    } catch (e: any) {
      toast.error(e?.message ?? "Falha no upload.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={guardedClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Adicionar documento</h2>
          <button
            onClick={guardedClose}
            className="rounded p-1 text-muted-foreground hover:bg-muted"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 text-[12.5px]">
          <label className="space-y-1 block">
            <span className="text-muted-foreground">Categoria</span>
            <Select
              value={categoria}
              onValueChange={(v) => setCategoria(v as EquipamentoDocCategoria)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {areaCategorias.map((c) => (
                  <SelectItem key={c} value={c}>
                    {EQUIPAMENTO_DOC_CATEGORIA_LABEL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="space-y-1 block">
            <span className="text-muted-foreground">Arquivo (PDF, JPG, PNG, ZIP)</span>
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.zip"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                if (f && !chosenName) setChosenName(f.name.replace(/\.[^.]+$/, ""));
              }}
            />
            {file && (
              <span className="text-[11px] text-muted-foreground">
                {file.name} · {fmtBytes(file.size)}
              </span>
            )}
          </label>

          <label className="space-y-1 block">
            <span className="text-muted-foreground">Nome do arquivo</span>
            <Input
              value={chosenName}
              onChange={(e) => setChosenName(e.target.value)}
              placeholder="manual-mecanico-rev-a"
            />
          </label>

          <label className="space-y-1 block">
            <span className="text-muted-foreground">Versão (opcional)</span>
            <Input
              value={versao}
              onChange={(e) => setVersao(e.target.value)}
              placeholder="Rev. A"
            />
          </label>

          <label className="space-y-1 block">
            <span className="text-muted-foreground">Observações (opcional)</span>
            <Textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={guardedClose} disabled={busy}>
            Cancelar
          </Button>
          <Button size="sm" disabled={busy || !file} onClick={onUpload}>
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}{" "}
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}
