import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate, Link } from "@tanstack/react-router";
import { listOrcamentosDaOportunidade } from "@/lib/docs/docs.functions";
import { ProximoPassoBar } from "./ProximoPassoBar";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  FileText,
  ExternalLink,
  Loader2,
  Sparkles,
  Mail,
  Phone,
  MessageCircle,
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
import { StatLine } from "@/components/data/StatLine";
import { ConvertWizardDialog } from "./ConvertWizardDialog";
import { MarcarPerdidaDialog } from "./MarcarPerdidaDialog";
import { OportunidadeAnotacoesTab } from "./OportunidadeAnotacoesTab";
import { OportunidadeColaboradores } from "./OportunidadeColaboradores";
import { AgendarEntrevistaDialog } from "./AgendarEntrevista";
import { ClienteStatusBadge } from "@/components/clientes/ClienteStatusBadge";
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

function daysBetween(a: string | null | undefined) {
  if (!a) return null;
  const t = new Date(a).getTime();
  if (isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86400_000);
}

function formatCurrencyBRL(v: number | null | undefined) {
  if (v == null) return "—";
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

type OportunidadeTab = "dados" | "orcamentos" | "notas";
const TABS_VALIDAS: OportunidadeTab[] = ["dados", "orcamentos", "notas"];

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
  const [tab, setTab] = useState<OportunidadeTab>(initialTab);
  const [lostOpen, setLostOpen] = useState(false);
  const [agendaOpen, setAgendaOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  const update = useUpdateOportunidade();
  const updateStageMut = useUpdateStage();
  const restoreMut = useRestoreOportunidade();
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
    setTab(initialTab);
    setLostOpen(false);
    setAgendaOpen(false);
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
  };
  const { clearDraft, isDirty } = useFormDraft({
    // v2: a aba Agenda e o campo de nota saíram do rascunho.
    formKey: `oportunidade:editar:v2:${opp?.id ?? "fechado"}`,
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
    },
  });

  const open = !!opp;
  const locked = opp?.pipeline_stage === "ganho" && !!opp?.processo_id;
  const alreadyLost = opp?.pipeline_stage === "perdido";
  const isCliente = !!opp?.cliente_id;
  const readOnly = locked || alreadyLost;

  const diasNoEstagio = daysBetween(opp?.stage_entered_at) ?? 0;
  const valorNum = valor === "" ? null : Number(valor);
  const probNum = Number(prob) || 0;

  // Uma linha de status por vez: travada > perdida > restaurada.
  const statusLine = locked ? (
    <span>Convertida em processo — somente leitura.</span>
  ) : alreadyLost ? (
    <span title={opp?.lost_reason ?? undefined}>
      Perdida em {formatDateTime(opp?.lost_at)}
      {opp?.lost_by_nome ? ` por ${opp.lost_by_nome}` : ""}
      {opp?.lost_reason ? (
        <>
          {" · "}
          <span className="text-rose-800">{opp.lost_reason}</span>
        </>
      ) : null}
    </span>
  ) : opp?.restored_at ? (
    <span>
      Restaurada em {formatDateTime(opp.restored_at)}
      {opp.restored_by_nome ? ` por ${opp.restored_by_nome}` : ""}
    </span>
  ) : null;
  const statusTone = locked
    ? "border-amber-200 bg-amber-50 text-amber-800"
    : alreadyLost
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-sky-200 bg-sky-50 text-sky-800";

  const telDigits = telefone.replace(/\D/g, "");

  function handleSave() {
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
          onOpenChange(false);
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
      <DialogContent className="w-[95vw] max-w-[960px] max-h-[96dvh] overflow-y-auto gap-3">
        <DialogHeader className="space-y-0">
          <div className="flex flex-wrap items-center gap-2 pr-6">
            <DialogTitle className="truncate text-base">{titulo || "Oportunidade"}</DialogTitle>
            <span className="font-mono text-[11px] text-muted-foreground">{opp?.codigo}</span>
            {isCliente ? (
              <ClienteStatusBadge status={opp?.lifecycle_stage} className="shrink-0" />
            ) : (
              <Badge
                variant="outline"
                className="shrink-0 border-amber-200 bg-amber-50 text-[10px] text-amber-800"
              >
                Lead
              </Badge>
            )}
            <div className="ml-auto flex items-center gap-2">
              {opp && (
                <OportunidadeColaboradores
                  oppId={opp.id}
                  responsavelNome={opp.responsavel_nome}
                  locked={readOnly}
                />
              )}
              <Button size="sm" disabled={readOnly || update.isPending} onClick={handleSave}>
                {update.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                Salvar
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="px-2" aria-label="Mais ações">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!readOnly && (
                    <DropdownMenuItem onSelect={() => setWizardOpen(true)}>
                      <Trophy className="mr-2 h-4 w-4" />
                      {isCliente ? "Converter / atualizar cliente" : "Promover a cliente"}
                    </DropdownMenuItem>
                  )}
                  {opp?.cliente_codigo && (
                    <DropdownMenuItem asChild>
                      <Link to="/clientes/$codigo" params={{ codigo: opp.cliente_codigo }}>
                        <Building2 className="mr-2 h-4 w-4" /> Abrir ficha do cliente
                      </Link>
                    </DropdownMenuItem>
                  )}
                  {!readOnly && (
                    <DropdownMenuItem
                      className="text-rose-700 focus:text-rose-800"
                      onSelect={() => setLostOpen(true)}
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
          </div>
          <DialogDescription className="sr-only">Dados da oportunidade.</DialogDescription>
        </DialogHeader>

        {statusLine && (
          <div className={`rounded-md border px-3 py-1.5 text-[12px] ${statusTone}`}>
            {statusLine}
          </div>
        )}

        {opp && !alreadyLost && (
          <ProximoPassoBar
            opp={opp}
            orcamentos={orcamentos.length}
            locked={locked}
            actions={{
              onAgenda: () => setAgendaOpen(true),
              onGerarOrcamento: gerarOrcamento,
              onAvancar: (next) => {
                updateStageMut.mutate(
                  { id: opp.id, stage: next },
                  {
                    onSuccess: () => {
                      if (next === "ganho") setWizardOpen(true);
                    },
                  },
                );
              },
              onPromover: () => setWizardOpen(true),
            }}
          />
        )}

        <StatLine
          className="text-[12.5px]"
          items={[
            {
              label: "na etapa",
              value: `${diasNoEstagio}d`,
              tone: diasNoEstagio > 14 ? "danger" : "default",
            },
            { label: "valor", value: formatCurrencyBRL(valorNum) },
            { label: "probabilidade", value: `${probNum}%` },
            ...(opp?.lost_count
              ? [{ label: "perdas anteriores", value: opp.lost_count, tone: "warning" as const }]
              : []),
          ]}
        />

        <Tabs value={tab} onValueChange={(v) => setTab(v as OportunidadeTab)}>
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="orcamentos">
              Orçamentos
              {orcamentos.length > 0 && (
                <span className="ml-1 rounded-full bg-muted px-1.5 text-[10.5px]">
                  {orcamentos.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="notas">Anotações</TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="mt-3">
            <div className="grid gap-3">
              <div className="grid gap-1">
                <Label htmlFor="ed-titulo">Título *</Label>
                <Input
                  id="ed-titulo"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  maxLength={200}
                  disabled={readOnly}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-1">
                  <Label htmlFor="ed-empresa">Empresa</Label>
                  <div className="flex gap-1">
                    <Input
                      id="ed-empresa"
                      value={empresa}
                      onChange={(e) => setEmpresa(e.target.value)}
                      maxLength={200}
                      disabled={readOnly}
                    />
                    {opp?.cliente_codigo && !readOnly && (
                      <Button
                        asChild
                        size="sm"
                        variant="outline"
                        className="h-10 shrink-0 px-2"
                        title="Minerar dados da empresa (Receita, site, Google)"
                      >
                        <Link
                          to="/clientes/$codigo"
                          params={{ codigo: opp.cliente_codigo }}
                          search={{ minerar: true } as never}
                        >
                          <Sparkles className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="ed-nome">Contato</Label>
                  <Input
                    id="ed-nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    maxLength={200}
                    disabled={readOnly}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="ed-email">E-mail</Label>
                  <div className="flex gap-1">
                    <Input
                      id="ed-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      maxLength={200}
                      disabled={readOnly}
                    />
                    {email && (
                      <Button asChild size="sm" variant="ghost" className="h-10 shrink-0 px-2">
                        <a href={`mailto:${email}`} title="Enviar e-mail">
                          <Mail className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="ed-tel">Telefone</Label>
                  <div className="flex gap-1">
                    <Input
                      id="ed-tel"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      maxLength={50}
                      disabled={readOnly}
                    />
                    {telDigits && (
                      <>
                        <Button asChild size="sm" variant="ghost" className="h-10 shrink-0 px-2">
                          <a href={`tel:${telDigits}`} title="Ligar">
                            <Phone className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button asChild size="sm" variant="ghost" className="h-10 shrink-0 px-2">
                          <a
                            href={`https://wa.me/${telDigits}`}
                            target="_blank"
                            rel="noreferrer"
                            title="WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="grid gap-1">
                  <Label htmlFor="ed-valor">Valor (R$)</Label>
                  <Input
                    id="ed-valor"
                    type="number"
                    inputMode="decimal"
                    value={valor}
                    onChange={(e) => setValor(e.target.value)}
                    disabled={readOnly}
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
                    disabled={readOnly}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="ed-close">Fechamento</Label>
                  <Input
                    id="ed-close"
                    type="date"
                    value={expected}
                    onChange={(e) => setExpected(e.target.value)}
                    disabled={readOnly}
                  />
                </div>
                <div className="grid gap-1">
                  <Label>Etapa</Label>
                  <Select
                    value={stage}
                    disabled={readOnly || updateStageMut.isPending}
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
                      {PIPELINE_STAGES.map((s) => (
                        <SelectItem
                          key={s}
                          value={s}
                          disabled={s === "perdido" && s !== stage}
                          title={
                            s === "perdido" ? "Use “Marcar como perdida” no menu ⋯" : undefined
                          }
                        >
                          {STAGE_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-1">
                <Label htmlFor="ed-obs">Observações</Label>
                <Textarea
                  id="ed-obs"
                  value={obs}
                  onChange={(e) => setObs(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  disabled={readOnly}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="orcamentos" className="mt-3 space-y-3">
            <div className="flex justify-end">
              <Button size="sm" disabled={readOnly} onClick={gerarOrcamento}>
                <FileText className="mr-1 h-3.5 w-3.5" /> Gerar orçamento
              </Button>
            </div>
            {orcamentosQ.isLoading && (
              <p className="py-4 text-center text-[12px] text-muted-foreground">
                <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> Carregando…
              </p>
            )}
            {!orcamentosQ.isLoading && orcamentos.length === 0 && (
              <p className="py-6 text-center text-[12px] text-muted-foreground">
                Nenhum orçamento ainda.
              </p>
            )}
            <div className="space-y-1.5">
              {orcamentos.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-2 rounded-lg border bg-card p-2 text-[13px]"
                >
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">
                      {d.codigo} · {d.titulo ?? "—"}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      v{d.versao} · {d.status} · {formatDateTime(d.created_at)}
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

          <TabsContent value="notas" className="mt-3">
            {opp && <OportunidadeAnotacoesTab oppId={opp.id} />}
          </TabsContent>
        </Tabs>
      </DialogContent>

      <MarcarPerdidaDialog
        open={lostOpen}
        onOpenChange={setLostOpen}
        titulo={opp?.titulo}
        pending={updateStageMut.isPending}
        onConfirm={(reason) => {
          if (!opp) return;
          updateStageMut.mutate(
            { id: opp.id, stage: "perdido", lost_reason: reason },
            {
              onSuccess: () => {
                setLostOpen(false);
                clearDraft();
                onOpenChange(false);
              },
            },
          );
        }}
      />

      {opp && (
        <AgendarEntrevistaDialog
          open={agendaOpen}
          onOpenChange={setAgendaOpen}
          opp={opp}
          onRegistrada={() => {
            setAgendaOpen(false);
            setTab("notas");
          }}
        />
      )}

      <ConvertWizardDialog
        source={wizardOpen ? opp : null}
        open={wizardOpen}
        onOpenChange={(o) => setWizardOpen(o)}
      />
    </Dialog>
  );
}
