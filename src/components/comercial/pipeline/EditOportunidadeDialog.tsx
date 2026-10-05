import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate, Link } from "@tanstack/react-router";
import { listOrcamentosDaOportunidade } from "@/lib/docs/docs.functions";
import { ProximoPassoBar } from "./ProximoPassoBar";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
  useRestoreOportunidade,
  useUpdateOportunidade,
  useUpdateStage,
} from "@/lib/oportunidades.queries";
import {
  RotateCcw,
  XCircle,
  Paperclip,
  MessageSquare,
  FileText,
  Upload,
  Trash2,
  ExternalLink,
  Loader2,
  Sparkles,
  UserPlus,
  Clock,
  TrendingUp,
  Calendar,
  Copy,
  Mail,
  Phone,
  Building2,
  Trophy,
  MoreHorizontal,
} from "lucide-react";
import {
  PIPELINE_STAGES,
  STAGE_LABEL,
  type OportunidadeLite,
  type PipelineStage,
} from "@/lib/oportunidades.functions";
import { ConvertWizardDialog } from "./ConvertWizardDialog";
import { RestoredOportunidadeBadge } from "./RestoredOportunidadeBadge";
import { ClienteStatusBadge } from "@/components/clientes/ClienteStatusBadge";
import { AgendarEntrevista } from "./AgendarEntrevista";
import {
  listOportunidadeNotas,
  addOportunidadeNota,
  removerOportunidadeNota,
} from "@/lib/oportunidade-notas.functions";
import {
  listOportunidadeColaboradores,
  convidarColaborador,
  revogarColaborador,
} from "@/lib/oportunidade-colaboradores.functions";
import { listSalesUsers } from "@/lib/checklist.functions";
import {
  listOportunidadeAnexos,
  uploadOportunidadeAnexo,
  removerOportunidadeAnexo,
} from "@/lib/oportunidade-anexos.functions";
import { useFormDraft } from "@/hooks/use-form-draft";
import { confirmDiscard } from "@/lib/unsaved-guard";

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function daysBetween(a: string | null | undefined, b: Date = new Date()) {
  if (!a) return null;
  const t = new Date(a).getTime();
  if (isNaN(t)) return null;
  return Math.floor((b.getTime() - t) / 86400_000);
}

function daysUntil(a: string | null | undefined) {
  if (!a) return null;
  const t = new Date(a).getTime();
  if (isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86400_000);
}

function formatCurrencyBRL(v: number | null | undefined) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const res = (r.result as string) || "";
      resolve(res.includes(",") ? res.split(",", 2)[1] : res);
    };
    r.onerror = () => reject(new Error("Falha ao ler arquivo"));
    r.readAsDataURL(file);
  });
}

type OportunidadeTab = "dados" | "agenda" | "orcamentos" | "notas";
const TABS_VALIDAS: OportunidadeTab[] = ["dados", "agenda", "orcamentos", "notas"];

export function EditOportunidadeDialog({
  opp,
  onOpenChange,
  initialTab = "dados",
}: {
  opp: OportunidadeLite | null;
  onOpenChange: (open: boolean) => void;
  initialTab?: OportunidadeTab;
}) {
  const [titulo, setTitulo] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [valor, setValor] = useState("");
  const [prob, setProb] = useState("10");
  const [expected, setExpected] = useState("");
  const [stage, setStage] = useState<PipelineStage>("novo");
  const [obs, setObs] = useState("");
  const update = useUpdateOportunidade();
  const updateStageMut = useUpdateStage();
  const restoreMut = useRestoreOportunidade();
  const [lostMode, setLostMode] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [tab, setTab] = useState<OportunidadeTab>(initialTab);
  const [novoColabId, setNovoColabId] = useState<string>("");
  const [novaNota, setNovaNota] = useState("");
  const qc = useQueryClient();
  const navigate = useNavigate();

  // Orçamentos vinculados
  const listOrcFn = useServerFn(listOrcamentosDaOportunidade);
  const orcamentosQ = useQuery({
    queryKey: ["op-orcamentos", opp?.id],
    queryFn: () => listOrcFn({ data: { oportunidade_id: opp!.id } }),
    enabled: !!opp?.id,
  });
  const orcamentos = orcamentosQ.data ?? [];

  function gerarOrcamento() {
    if (!opp) return;
    navigate({
      to: "/comercial/orcamento/novo",
      search: {
        oportunidade: opp.id,
        oportunidadeCodigo: opp.codigo,
        ...(opp.cliente_id ? { cliente: opp.cliente_id } : {}),
        titulo: opp.titulo,
      },
    });
  }

  // Wizard "promover a cliente"
  const [wizardOpen, setWizardOpen] = useState(false);

  // Notas
  const listNotasFn = useServerFn(listOportunidadeNotas);
  const addNotaFn = useServerFn(addOportunidadeNota);
  const delNotaFn = useServerFn(removerOportunidadeNota);
  const notasQ = useQuery({
    queryKey: ["op-notas", opp?.id],
    queryFn: () => listNotasFn({ data: { oportunidade_id: opp!.id } }),
    enabled: !!opp?.id,
  });
  const addNotaMut = useMutation({
    mutationFn: (texto: string) => addNotaFn({ data: { oportunidade_id: opp!.id, texto } }),
    onSuccess: () => {
      setNovaNota("");
      qc.invalidateQueries({ queryKey: ["op-notas", opp?.id] });
      toast.success("Anotação adicionada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delNotaMut = useMutation({
    mutationFn: (id: string) => delNotaFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["op-notas", opp?.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  // Colaboradores
  const listColabFn = useServerFn(listOportunidadeColaboradores);
  const convidarColabFn = useServerFn(convidarColaborador);
  const revogarColabFn = useServerFn(revogarColaborador);
  const listSalesFn = useServerFn(listSalesUsers);
  const colabQ = useQuery({
    queryKey: ["op-colaboradores", opp?.id],
    queryFn: () => listColabFn({ data: { oportunidade_id: opp!.id } }),
    enabled: !!opp?.id,
  });
  const salesUsersQ = useQuery({
    queryKey: ["sales-users-comercial"],
    queryFn: () => listSalesFn(),
    enabled: !!opp?.id,
  });
  const colabAtivos = (colabQ.data ?? []).filter((c) => !c.revogado_em);
  const convidarColabMut = useMutation({
    mutationFn: (user_id: string) =>
      convidarColabFn({ data: { oportunidade_id: opp!.id, user_id } }),
    onSuccess: () => {
      setNovoColabId("");
      qc.invalidateQueries({ queryKey: ["op-colaboradores", opp?.id] });
      toast.success("Colaborador convidado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const revogarColabMut = useMutation({
    mutationFn: (id: string) => revogarColabFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["op-colaboradores", opp?.id] });
      toast.success("Colaborador removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Anexos
  const listAnexosFn = useServerFn(listOportunidadeAnexos);
  const upAnexoFn = useServerFn(uploadOportunidadeAnexo);
  const delAnexoFn = useServerFn(removerOportunidadeAnexo);
  const anexosQ = useQuery({
    queryKey: ["op-anexos", opp?.id],
    queryFn: () => listAnexosFn({ data: { oportunidade_id: opp!.id } }),
    enabled: !!opp?.id,
  });
  const uploadMut = useMutation({
    mutationFn: async (file: File) => {
      const b64 = await fileToBase64(file);
      const chosen = file.name.replace(/\.[^.]+$/, "").slice(0, 100) || "arquivo";
      return upAnexoFn({
        data: {
          oportunidade_id: opp!.id,
          filename: file.name,
          mime_type: file.type || "application/octet-stream",
          size_bytes: file.size,
          data_base64: b64,
          chosen_name: chosen,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["op-anexos", opp?.id] });
      toast.success("Arquivo enviado para o Drive");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const delAnexoMut = useMutation({
    mutationFn: (id: string) => delAnexoFn({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["op-anexos", opp?.id] }),
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (!opp) return;
    setTitulo(opp.titulo);
    setEmpresa(opp.empresa_lead ?? "");
    setNome(opp.nome_lead ?? "");
    setEmail(opp.email ?? "");
    setTelefone(opp.telefone ?? "");
    setValor(opp.valor_estimado != null ? String(opp.valor_estimado) : "");
    setProb(String(opp.probabilidade));
    setExpected(opp.expected_close_date ?? "");
    setStage(opp.pipeline_stage);
    setObs(opp.observacoes ?? "");
    setLostMode(false);
    setLostReason("");
    setTab(initialTab);
    setNovaNota("");
    setNovoColabId("");
    setWizardOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opp]);

  const initialDraft = useMemo(
    () => ({
      titulo: opp?.titulo ?? "",
      empresa: opp?.empresa_lead ?? "",
      nome: opp?.nome_lead ?? "",
      email: opp?.email ?? "",
      telefone: opp?.telefone ?? "",
      valor: opp?.valor_estimado != null ? String(opp.valor_estimado) : "",
      prob: opp ? String(opp.probabilidade) : "10",
      expected: opp?.expected_close_date ?? "",
      stage: opp?.pipeline_stage ?? ("novo" as PipelineStage),
      obs: opp?.observacoes ?? "",
      tab: "dados" as const,
      novaNota: "",
    }),
    [opp],
  );
  const currentDraft = {
    titulo,
    empresa,
    nome,
    email,
    telefone,
    valor,
    prob,
    expected,
    stage,
    obs,
    tab,
    novaNota,
  };
  const { clearDraft, isDirty } = useFormDraft({
    formKey: `oportunidade:editar:${opp?.id ?? "fechado"}`,
    value: currentDraft,
    initialValue: initialDraft,
    enabled: !!opp,
    onRestore: (saved) => {
      setTitulo(saved.titulo);
      setEmpresa(saved.empresa);
      setNome(saved.nome);
      setEmail(saved.email);
      setTelefone(saved.telefone);
      setValor(saved.valor);
      setProb(saved.prob);
      setExpected(saved.expected);
      setStage(saved.stage);
      setObs(saved.obs);
      setTab(
        TABS_VALIDAS.includes(saved.tab as OportunidadeTab)
          ? (saved.tab as OportunidadeTab)
          : "dados",
      );
      setNovaNota(saved.novaNota);
    },
  });

  const open = !!opp;
  const locked = opp?.pipeline_stage === "ganho" && !!opp?.processo_id;
  const alreadyLost = opp?.pipeline_stage === "perdido";

  // Insights
  const diasNoEstagio = daysBetween(opp?.stage_entered_at) ?? 0;
  const idadeOpp = daysBetween(opp?.created_at) ?? 0;
  const diasAteFechamento = daysUntil(opp?.expected_close_date);
  const valorNum = valor === "" ? null : Number(valor);
  const probNum = Number(prob) || 0;
  const valorPonderado = valorNum != null ? Math.round(valorNum * (probNum / 100)) : null;
  const isCliente = !!opp?.cliente_id;

  function copyToClipboard(text: string, label: string) {
    if (!text) return;
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${label} copiado`),
      () => toast.error("Falha ao copiar"),
    );
  }

  function handleSave(close: boolean) {
    if (!opp) return;
    update.mutate(
      {
        id: opp.id,
        titulo: titulo.trim(),
        empresa_lead: empresa.trim() || null,
        nome_lead: nome.trim() || null,
        email: email.trim() || null,
        telefone: telefone.trim() || null,
        valor_estimado: valor === "" ? null : Number(valor),
        probabilidade: Number(prob),
        expected_close_date: expected || null,
        observacoes: obs.trim() || null,
      },
      {
        onSuccess: () => {
          clearDraft();
          if (close) onOpenChange(false);
        },
      },
    );
  }

  function requestClose() {
    if (!confirmDiscard(isDirty)) return;
    clearDraft();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) requestClose();
      }}
    >
      <DialogContent className="w-[95vw] max-w-[1400px] max-h-[96dvh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-6">
            <div className="flex items-center gap-2 min-w-0">
              <DialogTitle className="truncate">{opp?.codigo || "Oportunidade"}</DialogTitle>
              {isCliente ? (
                <ClienteStatusBadge status={opp?.lifecycle_stage} withLabel className="shrink-0" />
              ) : (
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 shrink-0 text-[10px]">
                  <Building2 className="h-3 w-3 mr-1" /> Lead (sem cliente)
                </Badge>
              )}
              <Badge variant="outline" className="shrink-0 text-[10px]">
                Funil: {opp ? STAGE_LABEL[opp.pipeline_stage] : "—"}
              </Badge>
            </div>
          </div>
          <DialogDescription className="sr-only">Dados da oportunidade.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Button size="sm" disabled={locked || update.isPending} onClick={() => handleSave(true)}>
            {update.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
            Salvar
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="px-2" aria-label="Mais ações">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {!locked && !alreadyLost && (
                <DropdownMenuItem onSelect={() => setWizardOpen(true)}>
                  <Trophy className="mr-2 h-4 w-4" />
                  {isCliente ? "Atualizar ficha do cliente" : "Promover a cliente"}
                </DropdownMenuItem>
              )}
              {opp?.cliente_codigo && (
                <DropdownMenuItem asChild>
                  <Link to="/clientes/$codigo" params={{ codigo: opp.cliente_codigo }}>
                    <Building2 className="mr-2 h-4 w-4" /> Abrir ficha do cliente
                  </Link>
                </DropdownMenuItem>
              )}
              {!locked && !alreadyLost && (
                <DropdownMenuItem
                  className="text-rose-700 focus:text-rose-800"
                  onSelect={() => setLostMode(true)}
                >
                  <XCircle className="mr-2 h-4 w-4" /> Marcar como perdida
                </DropdownMenuItem>
              )}
              {alreadyLost && (
                <DropdownMenuItem
                  disabled={restoreMut.isPending}
                  onSelect={() =>
                    opp &&
                    restoreMut.mutate(
                      { id: opp.id },
                      {
                        onSuccess: () => {
                          clearDraft();
                          onOpenChange(false);
                        },
                      },
                    )
                  }
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> Restaurar
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {lostMode && !alreadyLost && (
          <div className="rounded border border-rose-200 bg-rose-50 p-3 space-y-2">
            <Label htmlFor="ed-lost-reason" className="text-rose-900">
              Motivo da perda *
            </Label>
            <Textarea
              id="ed-lost-reason"
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Ex: preço, prazo, concorrente X, sem fit técnico..."
            />
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setLostMode(false);
                  setLostReason("");
                }}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={lostReason.trim().length < 10 || updateStageMut.isPending}
                onClick={() => {
                  if (!opp || !lostReason.trim()) return;
                  updateStageMut.mutate(
                    { id: opp.id, stage: "perdido", lost_reason: lostReason.trim() },
                    {
                      onSuccess: () => {
                        clearDraft();
                        onOpenChange(false);
                      },
                    },
                  );
                }}
              >
                Confirmar perda e arquivar
              </Button>
            </div>
          </div>
        )}

        {alreadyLost && (
          <div className="rounded border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 space-y-1">
            <div className="font-medium">Oportunidade arquivada (perdida).</div>
            <div>
              Marcada por {opp?.lost_by_nome || "—"} em{" "}
              {opp?.lost_at
                ? new Date(opp.lost_at).toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })
                : "—"}
              .
            </div>
            <div className="text-rose-700">Motivo: {opp?.lost_reason || "—"}</div>
          </div>
        )}

        <RestoredOportunidadeBadge
          restoredAt={opp?.restored_at ?? null}
          restoredBy={opp?.restored_by_nome ?? null}
        />

        {locked && (
          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
            Oportunidade convertida em processo — somente leitura.
          </div>
        )}

        {opp && !alreadyLost && (
          <ProximoPassoBar
            opp={opp}
            orcamentos={orcamentos.length}
            locked={locked}
            actions={{
              onAgenda: () => setTab("agenda"),
              onGerarOrcamento: gerarOrcamento,
              onAvancar: (stage) => {
                updateStageMut.mutate(
                  { id: opp.id, stage },
                  {
                    onSuccess: () => {
                      if (stage === "ganho") setWizardOpen(true);
                    },
                  },
                );
              },
              onPromover: () => setWizardOpen(true),
            }}
          />
        )}

        <div className="mt-2 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList className="h-auto flex-wrap">
              <TabsTrigger value="dados" className="gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Dados
              </TabsTrigger>
              <TabsTrigger value="agenda" className="gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Agenda
              </TabsTrigger>
              <TabsTrigger value="orcamentos" className="gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Orçamentos
                <span className="ml-1 rounded-full bg-muted px-1.5 text-[10.5px]">
                  {orcamentos.length}
                </span>
              </TabsTrigger>
              <TabsTrigger value="notas" className="gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" /> Anotações
                <span className="ml-1 rounded-full bg-muted px-1.5 text-[10.5px]">
                  {notasQ.data?.length ?? 0}
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="orcamentos" className="mt-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] text-muted-foreground">
                  Documentos de orçamento vinculados a esta oportunidade.
                </p>
                <Button size="sm" disabled={locked} onClick={gerarOrcamento}>
                  <FileText className="h-3.5 w-3.5 mr-1" /> Gerar orçamento
                </Button>
              </div>
              {orcamentosQ.isLoading && (
                <p className="text-center text-[12px] text-muted-foreground py-4">
                  <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> Carregando…
                </p>
              )}
              {!orcamentosQ.isLoading && orcamentos.length === 0 && (
                <p className="text-center text-[12px] text-muted-foreground py-6">
                  Nenhum orçamento ainda. Gere o primeiro a partir do botão acima.
                </p>
              )}
              <div className="space-y-1.5">
                {orcamentos.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center gap-2 rounded-lg border bg-card p-2 text-[13px]"
                  >
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">
                        {d.codigo} · {d.titulo ?? "—"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        v{d.versao} • {d.status} • {formatDateTime(d.created_at)}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" asChild>
                      <Link to="/comercial/orcamento/$id" params={{ id: d.id }}>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="dados" className="mt-3">
              <div className="grid gap-3">
                {opp?.cliente_codigo && !locked && (
                  <Button asChild size="sm" variant="outline" className="w-fit">
                    <Link
                      to="/clientes/$codigo"
                      params={{ codigo: opp.cliente_codigo }}
                      search={{ minerar: true } as never}
                    >
                      <Sparkles className="mr-1 h-3.5 w-3.5" /> Minerar dados da empresa
                    </Link>
                  </Button>
                )}
                <div className="grid gap-1">
                  <Label htmlFor="ed-titulo">Título *</Label>
                  <Input
                    id="ed-titulo"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    maxLength={200}
                    disabled={locked}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid gap-1">
                    <Label htmlFor="ed-empresa">Empresa</Label>
                    <Input
                      id="ed-empresa"
                      value={empresa}
                      onChange={(e) => setEmpresa(e.target.value)}
                      maxLength={200}
                      disabled={locked}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="ed-nome">Contato</Label>
                    <Input
                      id="ed-nome"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      maxLength={200}
                      disabled={locked}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid gap-1">
                    <Label htmlFor="ed-email">Email</Label>
                    <Input
                      id="ed-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      maxLength={200}
                      disabled={locked}
                      placeholder="—"
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="ed-tel">Telefone</Label>
                    <Input
                      id="ed-tel"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      maxLength={50}
                      disabled={locked}
                      placeholder="—"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="grid gap-1">
                    <Label htmlFor="ed-valor">Valor (R$)</Label>
                    <Input
                      id="ed-valor"
                      type="number"
                      inputMode="decimal"
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                      disabled={locked}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="ed-prob">Prob. (%)</Label>
                    <Input
                      id="ed-prob"
                      type="number"
                      min={0}
                      max={100}
                      value={prob}
                      onChange={(e) => setProb(e.target.value)}
                      disabled={locked}
                    />
                  </div>
                  <div className="grid gap-1">
                    <Label htmlFor="ed-close">Fechamento</Label>
                    <Input
                      id="ed-close"
                      type="date"
                      value={expected}
                      onChange={(e) => setExpected(e.target.value)}
                      disabled={locked}
                    />
                  </div>
                </div>
                <div className="grid gap-1">
                  <Label>Estágio</Label>
                  <Select
                    value={stage}
                    disabled={locked || alreadyLost || updateStageMut.isPending}
                    onValueChange={(v) => {
                      const next = v as PipelineStage;
                      if (!opp || next === stage) return;
                      setStage(next);
                      updateStageMut.mutate(
                        { id: opp.id, stage: next },
                        {
                          onSuccess: () => {
                            if (next === "ganho") setWizardOpen(true);
                          },
                          onError: () => setStage(opp.pipeline_stage),
                        },
                      );
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STAGES.map((s) => {
                        const bloqueado = s === "perdido" && s !== stage;
                        return (
                          <SelectItem
                            key={s}
                            value={s}
                            disabled={bloqueado}
                            title={
                              bloqueado
                                ? "Use “Marcar como perdida” — o motivo da perda é obrigatório."
                                : undefined
                            }
                          >
                            {STAGE_LABEL[s]}
                            {bloqueado ? " — use “Marcar como perdida”" : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    {locked
                      ? "Oportunidade já convertida em processo — estágio somente leitura."
                      : alreadyLost
                        ? "Oportunidade arquivada como perdida — reabra para mudar de estágio."
                        : "Você também pode arrastar o card no kanban. A mudança é registrada no histórico."}
                  </p>
                </div>

                <div className="grid gap-1">
                  <Label htmlFor="ed-obs">Observações</Label>
                  <Textarea
                    id="ed-obs"
                    value={obs}
                    onChange={(e) => setObs(e.target.value)}
                    maxLength={2000}
                    rows={3}
                    disabled={locked}
                    placeholder="Anotações internas…"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="agenda" className="mt-3">
              {opp ? (
                <AgendarEntrevista
                  opp={opp}
                  onRegistrada={() => {
                    void notasQ.refetch();
                    setTab("notas");
                  }}
                />
              ) : null}
            </TabsContent>

            <TabsContent value="notas" className="mt-3 space-y-3">
              <div className="space-y-2">
                <Textarea
                  value={novaNota}
                  onChange={(e) => setNovaNota(e.target.value)}
                  rows={3}
                  maxLength={4000}
                  placeholder="Escreva uma anotação… (ex.: ligação 12/06, cliente pediu nova proposta)"
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    disabled={!novaNota.trim() || addNotaMut.isPending}
                    onClick={() => addNotaMut.mutate(novaNota.trim())}
                  >
                    {addNotaMut.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                    Adicionar
                  </Button>
                </div>
              </div>
              <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                {notasQ.isLoading && (
                  <p className="text-center text-[12px] text-muted-foreground py-4">
                    <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> Carregando…
                  </p>
                )}
                {!notasQ.isLoading && (notasQ.data?.length ?? 0) === 0 && (
                  <p className="text-center text-[12px] text-muted-foreground py-6">
                    Sem anotações.
                  </p>
                )}
                {(notasQ.data ?? []).map((n) => (
                  <div key={n.id} className="rounded-lg border bg-card p-3 text-[13px]">
                    <div className="whitespace-pre-wrap">{n.texto}</div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>
                        {n.user_nome ?? "—"} • {formatDateTime(n.created_at)}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (window.confirm("Excluir esta anotação?")) delNotaMut.mutate(n.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-3 border-t pt-3">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Anexos
                </div>

                <div className="rounded-lg border border-dashed p-4 text-center">
                  <input
                    id="op-file"
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.zip,application/pdf,image/jpeg,image/png,application/zip"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadMut.mutate(f);
                      e.currentTarget.value = "";
                    }}
                  />
                  <label htmlFor="op-file" className="cursor-pointer">
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <div className="text-[13px]">
                        {uploadMut.isPending ? "Enviando…" : "Clique para enviar um arquivo"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        PDF / JPG / PNG até 25MB · ZIP até 50MB
                      </div>
                    </div>
                  </label>
                </div>
                <div className="space-y-1.5 max-h-[360px] overflow-auto pr-1">
                  {anexosQ.isLoading && (
                    <p className="text-center text-[12px] text-muted-foreground py-4">
                      <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> Carregando…
                    </p>
                  )}
                  {!anexosQ.isLoading && (anexosQ.data?.length ?? 0) === 0 && (
                    <p className="text-center text-[12px] text-muted-foreground py-6">
                      Sem arquivos.
                    </p>
                  )}
                  {(anexosQ.data ?? []).map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center gap-2 rounded-lg border bg-card p-2 text-[13px]"
                    >
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{a.nome_final}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {a.user_nome ?? "—"} • {formatDateTime(a.created_at)} •{" "}
                          {formatBytes(a.tamanho_bytes)}
                        </div>
                      </div>
                      {a.drive_view_url && (
                        <Button size="sm" variant="ghost" asChild>
                          <a
                            href={a.drive_view_url}
                            target="_blank"
                            rel="noreferrer"
                            title="Abrir no Drive"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (window.confirm(`Excluir o arquivo "${a.nome_final}"?`)) {
                            delAnexoMut.mutate(a.id);
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Os arquivos são salvos no SLTK Drive em{" "}
                  <code>{"{cliente} / Comercial / {OPP-código} / {AAAAMM}"}</code> ou, sem cliente,
                  em{" "}
                  <code>
                    _Comercial / {"{ano}"} / {"{OPP-código}"}
                  </code>
                  .
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <aside className="space-y-3 lg:sticky lg:top-0 lg:self-start">
            <div className="rounded-lg border bg-card p-3">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Insights
              </div>
              <div className="space-y-2 text-[12.5px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="font-medium">{formatCurrencyBRL(valorNum)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ponderado</span>
                  <span className="font-medium text-primary">
                    {formatCurrencyBRL(valorPonderado)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Probabilidade</span>
                  <span className="font-medium">{probNum}%</span>
                </div>
                <div className="h-px bg-border my-1" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> No estágio
                  </span>
                  <span className="font-medium">{diasNoEstagio}d</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Idade total</span>
                  <span className="font-medium">{idadeOpp}d</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Fechamento
                  </span>
                  <span
                    className={`font-medium ${diasAteFechamento != null && diasAteFechamento < 0 ? "text-rose-600" : diasAteFechamento != null && diasAteFechamento <= 7 ? "text-amber-600" : ""}`}
                  >
                    {diasAteFechamento == null
                      ? "—"
                      : diasAteFechamento < 0
                        ? `${Math.abs(diasAteFechamento)}d atrasado`
                        : `em ${diasAteFechamento}d`}
                  </span>
                </div>
                <div className="h-px bg-border my-1" />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Anotações</span>
                  <span className="font-medium">{notasQ.data?.length ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Anexos</span>
                  <span className="font-medium">{anexosQ.data?.length ?? 0}</span>
                </div>
                {opp?.lost_count ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Perdas anteriores</span>
                    <span className="font-medium text-rose-600">{opp.lost_count}</span>
                  </div>
                ) : null}
              </div>
            </div>

            {(email || telefone) && (
              <div className="rounded-lg border bg-card p-3 space-y-2">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Contato rápido
                </div>
                {email && (
                  <button
                    className="w-full flex items-center gap-2 text-[12px] hover:bg-muted rounded px-2 py-1.5 text-left"
                    onClick={() => copyToClipboard(email, "E-mail")}
                  >
                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1">{email}</span>
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
                {telefone && (
                  <button
                    className="w-full flex items-center gap-2 text-[12px] hover:bg-muted rounded px-2 py-1.5 text-left"
                    onClick={() => copyToClipboard(telefone, "Telefone")}
                  >
                    <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1">{telefone}</span>
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
              </div>
            )}

            <div className="rounded-lg border bg-card p-3 space-y-2">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Colaboradores
              </div>

              <div className="flex items-center gap-2">
                <Select value={novoColabId} onValueChange={setNovoColabId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione um pilar…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(salesUsersQ.data ?? [])
                      .filter((u) => !colabAtivos.some((c) => c.user_id === u.id))
                      .map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.nome} — {u.email}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  disabled={!novoColabId || convidarColabMut.isPending}
                  onClick={() => convidarColabMut.mutate(novoColabId)}
                >
                  {convidarColabMut.isPending && (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  )}
                  Convidar
                </Button>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-auto pr-1">
                {colabQ.isLoading && (
                  <p className="text-center text-[12px] text-muted-foreground py-4">
                    <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> Carregando…
                  </p>
                )}
                {!colabQ.isLoading && colabAtivos.length === 0 && (
                  <p className="text-center text-[12px] text-muted-foreground py-6">
                    Nenhum colaborador convidado.
                  </p>
                )}
                {colabAtivos.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-lg border bg-card p-3 text-[13px]"
                  >
                    <div>
                      <div className="font-medium">{c.user_nome ?? "—"}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {c.user_email} • convidado em {formatDateTime(c.convidado_em)}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={revogarColabMut.isPending}
                      onClick={() => revogarColabMut.mutate(c.id)}
                    >
                      <XCircle className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        <DialogFooter className="text-xs text-muted-foreground">
          Pilar: {opp?.responsavel_nome}
        </DialogFooter>
      </DialogContent>

      <ConvertWizardDialog
        source={wizardOpen ? opp : null}
        open={wizardOpen}
        onOpenChange={(o) => {
          setWizardOpen(o);
        }}
      />
    </Dialog>
  );
}
