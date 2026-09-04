import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  History,
  MessageSquarePlus,
  Send,
  Undo2,
  XCircle,
  Pencil,
  RefreshCw,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  etpHistoricoQueryOptions,
  etpQueryOptions,
} from "@/lib/engenharia.queries";
import {
  aprovarEtp,
  enviarEtpParaRevisao,
  reabrirEtp,
  rejeitarEtp,
  removerEtp,
  retomarEtpRejeitado,
  updateEtp,
  voltarEtpParaRascunho,
} from "@/lib/equipamento-etps.functions";
import { EtpPdfButton } from "@/components/engenharia/EtpPdfButton";
import { AgendarKickoff } from "@/components/engenharia/AgendarKickoff";
import { addEtpHistoricoNota } from "@/lib/equipamento-etp-historico.functions";
import {
  ETP_CAMPO_LABEL,
  ETP_STATUS_COLOR,
  ETP_STATUS_LABEL,
  ETP_HISTORICO_TIPO_LABEL,
  type EtpHistoricoTipo,
  type EtpStatus,
} from "@/lib/engenharia.shared";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { EtpAnexosPanel } from "@/components/engenharia/EtpAnexosPanel";

export const Route = createFileRoute("/_authenticated/engenharia/etp/$id")({
  loader: ({ params, context }) =>
    context.queryClient.ensureQueryData(etpQueryOptions(params.id)),
  component: EtpEditorPage,
  errorComponent: EtpEditorError,
  pendingComponent: () => (
    <PageContainer>
      <div className="p-8 text-sm text-[var(--text-muted)]">Carregando ETP…</div>
    </PageContainer>
  ),
});

function EtpEditorError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <PageContainer>
      <div className="mx-auto max-w-lg rounded-[var(--radius-lg)] border border-rose-200 bg-rose-50/70 p-6 text-sm text-rose-800">
        <div className="mb-2 flex items-center gap-2 font-medium">
          <AlertTriangle className="h-4 w-4" /> Não foi possível carregar este ETP
        </div>
        <p className="mb-3 text-rose-700/90">
          {error?.message ?? "Erro desconhecido ao buscar o documento."}
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              reset();
              router.invalidate();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Tentar novamente
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => router.navigate({ to: "/engenharia/etp" })}
          >
            Voltar para a lista
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}

type FormState = {
  escopo: string;
  premissas: string;
  requisitos_funcionais: string;
  requisitos_tecnicos: string;
  criterios_aceite: string;
  riscos: string;
  observacoes: string;
};

const EMPTY_FORM: FormState = {
  escopo: "",
  premissas: "",
  requisitos_funcionais: "",
  requisitos_tecnicos: "",
  criterios_aceite: "",
  riscos: "",
  observacoes: "",
};

function EtpEditorPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { role } = useAuth();
  const { data } = useSuspenseQuery(etpQueryOptions(id));

  const update = useServerFn(updateEtp);
  const approve = useServerFn(aprovarEtp);
  const remove = useServerFn(removerEtp);
  const reabrir = useServerFn(reabrirEtp);
  const enviarRevisao = useServerFn(enviarEtpParaRevisao);
  const voltarRascunho = useServerFn(voltarEtpParaRascunho);
  const rejeitar = useServerFn(rejeitarEtp);
  const retomar = useServerFn(retomarEtpRejeitado);
  const [reabrirOpen, setReabrirOpen] = useState(false);
  const [justificativa, setJustificativa] = useState("");
  const [rejeitarOpen, setRejeitarOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [retomarOpen, setRetomarOpen] = useState(false);
  const [retomarObs, setRetomarObs] = useState("");

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const baseline = useMemo<FormState>(() => {
    if (!data) return EMPTY_FORM;
    return {
      escopo: data.escopo ?? "",
      premissas: data.premissas ?? "",
      requisitos_funcionais: data.requisitos_funcionais ?? "",
      requisitos_tecnicos: data.requisitos_tecnicos ?? "",
      criterios_aceite: data.criterios_aceite ?? "",
      riscos: data.riscos ?? "",
      observacoes: data.observacoes ?? "",
    };
  }, [data]);

  useEffect(() => {
    setForm(baseline);
  }, [baseline]);

  const dirty = useMemo(
    () => (Object.keys(form) as (keyof FormState)[]).some((k) => form[k] !== baseline[k]),
    [form, baseline],
  );

  const status = (data?.status ?? "rascunho") as EtpStatus;
  const canEdit = role === "admin" || role === "manager" || role === "engineer";
  const frozen = status === "aprovado" || status === "obsoleto" || status === "rejeitado";
  const readOnly = frozen || !canEdit;
  const canApprove = role === "admin" || role === "manager";

  const saveMut = useMutation({
    mutationFn: (close: boolean) => update({ data: { id, ...form } }).then(() => close),
    onSuccess: (close) => {
      setSavedAt(new Date());
      toast.success("Alterações salvas.");
      qc.invalidateQueries({ queryKey: ["engenharia", "etp", id] });
      qc.invalidateQueries({ queryKey: ["engenharia", "etps"] });
      if (close) navigate({ to: "/engenharia/etp" });
    },
    onError: (e: Error) => toast.error(e?.message ?? "Falha ao salvar."),
  });

  const approveMut = useMutation({
    mutationFn: () => approve({ data: { id } }),
    onSuccess: () => {
      toast.success("ETP aprovado. Versões anteriores marcadas como obsoletas.");
      qc.invalidateQueries({ queryKey: ["engenharia"] });
    },
    onError: (e: Error) => toast.error(e?.message ?? "Falha ao aprovar."),
  });

  const enviarRevisaoMut = useMutation({
    mutationFn: () => enviarRevisao({ data: { id } }),
    onSuccess: () => {
      toast.success("ETP enviado para revisão.");
      qc.invalidateQueries({ queryKey: ["engenharia"] });
    },
    onError: (e: Error) => toast.error(e?.message ?? "Falha ao enviar para revisão."),
  });

  const voltarRascunhoMut = useMutation({
    mutationFn: () => voltarRascunho({ data: { id } }),
    onSuccess: () => {
      toast.success("ETP devolvido para rascunho.");
      qc.invalidateQueries({ queryKey: ["engenharia"] });
    },
    onError: (e: Error) => toast.error(e?.message ?? "Falha ao devolver para rascunho."),
  });

  const rejeitarMut = useMutation({
    mutationFn: () => rejeitar({ data: { id, motivo: motivo.trim() } }),
    onSuccess: () => {
      toast.success("ETP rejeitado. O motivo ficou registrado no histórico.");
      setRejeitarOpen(false);
      setMotivo("");
      qc.invalidateQueries({ queryKey: ["engenharia"] });
    },
    onError: (e: Error) => toast.error(e?.message ?? "Falha ao rejeitar."),
  });

  const retomarMut = useMutation({
    mutationFn: () => retomar({ data: { id, observacao: retomarObs.trim() } }),
    onSuccess: () => {
      toast.success("ETP retomado para revisão.");
      setRetomarOpen(false);
      setRetomarObs("");
      qc.invalidateQueries({ queryKey: ["engenharia"] });
    },
    onError: (e: Error) => toast.error(e?.message ?? "Falha ao retomar."),
  });

  const deleteMut = useMutation({
    mutationFn: () => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("ETP removido.");
      qc.invalidateQueries({ queryKey: ["engenharia"] });
      navigate({ to: "/engenharia/etp" });
    },
    onError: (e: Error) => toast.error(e?.message ?? "Falha ao remover."),
  });

  const reabrirMut = useMutation({
    mutationFn: () => reabrir({ data: { id, justificativa: justificativa.trim() } }),
    onSuccess: () => {
      toast.success("ETP reaberto para edição. A ação ficou registrada no histórico.");
      setReabrirOpen(false);
      setJustificativa("");
      qc.invalidateQueries({ queryKey: ["engenharia"] });
    },
    onError: (e: Error) => toast.error(e?.message ?? "Falha ao reabrir."),
  });

  // Aviso ao sair com alterações pendentes
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const handleCancel = () => {
    if (dirty && !confirm("Descartar alterações não salvas?")) return;
    navigate({ to: "/engenharia/etp" });
  };

  const eqp = (data as any)?.cliente_equipamentos;
  const cli = (data as any)?.clientes;

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Engenharia" },
          { label: "ETPs", href: "/engenharia/etp" },
          { label: `v${data.versao}` },
        ]}
        title={`${eqp?.modelo ?? "Equipamento"} · ETP v${data.versao}`}
        subtitle={cli?.razao_social ?? undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {savedAt && !dirty ? (
              <span className="text-[11px] text-emerald-600">
                <CheckCircle2 className="mr-1 inline h-3 w-3" />
                Salvo às {savedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            ) : dirty ? (
              <span className="text-[11px] text-amber-600">
                <Pencil className="mr-1 inline h-3 w-3" />
                Alterações não salvas
              </span>
            ) : null}
            <Button size="sm" variant="outline" onClick={handleCancel}>
              Voltar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={readOnly || !dirty || saveMut.isPending}
              onClick={() => saveMut.mutate(true)}
            >
              Salvar &amp; Fechar
            </Button>
            <Button
              size="sm"
              disabled={readOnly || !dirty || saveMut.isPending}
              onClick={() => saveMut.mutate(false)}
            >
              <Save className="mr-1.5 h-4 w-4" />
              Salvar
            </Button>
          </div>
        }
      />

      {/* Status banner */}
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] px-4 py-3 shadow-[var(--shadow-sm)]">
        <Badge variant="outline" className={cn("text-xs", ETP_STATUS_COLOR[status])}>
          {ETP_STATUS_LABEL[status]}
        </Badge>
        <span className="text-xs text-[var(--text-muted)]">
          Atualizado em {new Date(data.updated_at as string).toLocaleString("pt-BR")}
        </span>
        {data.aprovado_em ? (
          <span className="text-xs text-emerald-700">
            Aprovado em {new Date(data.aprovado_em as string).toLocaleString("pt-BR")}
            {(data as { aprovado_por_nome?: string | null }).aprovado_por_nome
              ? ` por ${(data as { aprovado_por_nome?: string | null }).aprovado_por_nome}`
              : null}
          </span>
        ) : null}
        <div className="ml-auto flex flex-wrap gap-2">
          <EtpPdfButton etp={data as never} />
          {status === "rascunho" && canEdit ? (
            <Button
              size="sm"
              variant="secondary"
              disabled={enviarRevisaoMut.isPending || dirty}
              title={dirty ? "Salve antes de enviar para revisão." : undefined}
              onClick={() => enviarRevisaoMut.mutate()}
            >
              <Send className="mr-1.5 h-4 w-4" /> Enviar para revisão
            </Button>
          ) : null}
          {status === "em_revisao" && canEdit ? (
            <Button
              size="sm"
              variant="outline"
              disabled={voltarRascunhoMut.isPending}
              onClick={() => voltarRascunhoMut.mutate()}
            >
              <Undo2 className="mr-1.5 h-4 w-4" /> Voltar p/ rascunho
            </Button>
          ) : null}
          {status === "em_revisao" && canApprove ? (
            <Button
              size="sm"
              variant="outline"
              className="border-rose-300 text-rose-700 hover:bg-rose-50"
              onClick={() => setRejeitarOpen(true)}
            >
              <XCircle className="mr-1.5 h-4 w-4" /> Rejeitar
            </Button>
          ) : null}
          {status === "rejeitado" && canEdit ? (
            <Button size="sm" variant="secondary" onClick={() => setRetomarOpen(true)}>
              <RotateCcw className="mr-1.5 h-4 w-4" /> Retomar revisão
            </Button>
          ) : null}
          {(status === "rascunho" || status === "em_revisao") && canApprove ? (
            <Button
              size="sm"
              variant="default"
              disabled={approveMut.isPending || dirty}
              title={dirty ? "Salve antes de aprovar." : undefined}
              onClick={() => {
                if (
                  confirm(
                    "Aprovar esta versão? Versões anteriores deste equipamento serão marcadas como obsoletas e este ETP será congelado.",
                  )
                ) {
                  approveMut.mutate();
                }
              }}
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" /> Aprovar versão
            </Button>
          ) : null}
          {status === "aprovado" ? (
            <AgendarKickoff
              cliente={
                (data as { clientes?: { razao_social?: string } | null }).clientes?.razao_social ??
                "Cliente"
              }
              equipamento={
                (data as { cliente_equipamentos?: { codigo?: string } | null }).cliente_equipamentos
                  ?.codigo ?? "Equipamento"
              }
              versao={(data?.versao as number) ?? 1}
            />
          ) : null}
          {status === "aprovado" && canApprove ? (
            <Button
              size="sm"
              variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-50"
              onClick={() => setReabrirOpen(true)}
            >
              <RotateCcw className="mr-1.5 h-4 w-4" /> Reabrir para edição
            </Button>
          ) : null}
          {status === "rascunho" ? (
            <Button
              size="sm"
              variant="outline"
              className="text-rose-700 hover:bg-rose-50"
              onClick={() => {
                if (confirm("Remover este ETP em rascunho? A ação é definitiva.")) {
                  deleteMut.mutate();
                }
              }}
            >
              <Trash2 className="mr-1.5 h-4 w-4" /> Remover
            </Button>
          ) : null}
        </div>
      </div>

      {readOnly ? (
        <div className="mb-4 flex items-start gap-2 rounded-[var(--radius-md)] border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {frozen
              ? `Este ETP está ${status === "aprovado" ? "aprovado" : "obsoleto"} — campos congelados. Crie uma nova versão para alterações.`
              : "Você não tem permissão para editar este ETP. Apenas administradores, gestores e engenheiros podem editar."}
          </span>
        </div>
      ) : null}


      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        {/* Editor */}
        <div className="space-y-4">
          <Section title="Escopo &amp; premissas">
            <Field
              label="Escopo"
              hint="Descreva claramente o objetivo do fornecimento, fronteiras e exclusões."
              value={form.escopo}
              onChange={(v) => setForm((f) => ({ ...f, escopo: v }))}
              readOnly={readOnly}
            />
            <Field
              label="Premissas"
              hint="Condições assumidas (utilidades, ambiente, integrações, normas)."
              value={form.premissas}
              onChange={(v) => setForm((f) => ({ ...f, premissas: v }))}
              readOnly={readOnly}
            />
          </Section>

          <Section title="Requisitos">
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Requisitos funcionais"
                hint="O que o equipamento precisa fazer (capacidades, modos de operação)."
                value={form.requisitos_funcionais}
                onChange={(v) => setForm((f) => ({ ...f, requisitos_funcionais: v }))}
                readOnly={readOnly}
              />
              <Field
                label="Requisitos técnicos"
                hint="Materiais, dimensões, protocolos, normas aplicáveis."
                value={form.requisitos_tecnicos}
                onChange={(v) => setForm((f) => ({ ...f, requisitos_tecnicos: v }))}
                readOnly={readOnly}
              />
            </div>
          </Section>

          <Section title="Validação">
            <Field
              label="Critérios de aceite"
              hint="Métricas mensuráveis usadas no FAT/SAT (rendimento, OEE, defeitos)."
              value={form.criterios_aceite}
              onChange={(v) => setForm((f) => ({ ...f, criterios_aceite: v }))}
              readOnly={readOnly}
            />
            <Field
              label="Riscos"
              hint="Riscos técnicos, de prazo e de integração; planos de mitigação."
              value={form.riscos}
              onChange={(v) => setForm((f) => ({ ...f, riscos: v }))}
              readOnly={readOnly}
            />
          </Section>

          <Section title="Observações">
            <Field
              label="Observações gerais"
              hint="Comentários adicionais que não se encaixam nas seções acima."
              value={form.observacoes}
              max={5000}
              onChange={(v) => setForm((f) => ({ ...f, observacoes: v }))}
              readOnly={readOnly}
            />
          </Section>

          <EtpAnexosPanel etpId={id} readOnly={readOnly} />
        </div>

        {/* Histórico */}
        <HistoricoPanel etpId={id} />
      </div>

      <Dialog
        open={reabrirOpen}
        onOpenChange={(o) => {
          if (!o && !reabrirMut.isPending) {
            setReabrirOpen(false);
            setJustificativa("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-orange-600" />
              Reabrir ETP aprovado
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-[var(--text-secondary)]">
              O ETP voltará para <strong>Em revisão</strong> e ficará editável.
              A reabertura, seu autor e a justificativa abaixo ficarão
              registrados permanentemente no histórico.
            </p>
            <label className="block space-y-1">
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
                Justificativa <span className="text-rose-600">*</span>
              </span>
              <Textarea
                rows={4}
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Ex.: cliente solicitou alteração no requisito de capacidade após reunião de 24/06."
                maxLength={2000}
                disabled={reabrirMut.isPending}
              />
              <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                <span>{justificativa.trim().length} / 2000 (mínimo 10)</span>
              </div>
            </label>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReabrirOpen(false)}
              disabled={reabrirMut.isPending}
            >
              Cancelar
            </Button>
            <Button
              disabled={
                reabrirMut.isPending || justificativa.trim().length < 10
              }
              onClick={() => reabrirMut.mutate()}
            >
              <RotateCcw className="mr-1.5 h-4 w-4" /> Reabrir e registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={rejeitarOpen}
        onOpenChange={(o) => {
          if (!o && !rejeitarMut.isPending) {
            setRejeitarOpen(false);
            setMotivo("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-rose-600" /> Rejeitar ETP
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-[var(--text-secondary)]">
              O ETP ficará com status <strong>Rejeitado</strong> e congelado até ser
              retomado. O motivo abaixo fica registrado no histórico.
            </p>
            <Textarea
              rows={4}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: critérios de aceite incompatíveis com a norma exigida pelo cliente."
              maxLength={2000}
              disabled={rejeitarMut.isPending}
            />
            <div className="text-[10px] text-[var(--text-muted)]">
              {motivo.trim().length} / 2000 (mínimo 10)
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejeitarOpen(false)} disabled={rejeitarMut.isPending}>
              Cancelar
            </Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700"
              disabled={rejeitarMut.isPending || motivo.trim().length < 10}
              onClick={() => rejeitarMut.mutate()}
            >
              Rejeitar e registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={retomarOpen}
        onOpenChange={(o) => {
          if (!o && !retomarMut.isPending) {
            setRetomarOpen(false);
            setRetomarObs("");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-blue-600" /> Retomar ETP rejeitado
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-[var(--text-secondary)]">
              O ETP volta para <strong>Em revisão</strong> e fica editável novamente.
            </p>
            <Textarea
              rows={4}
              value={retomarObs}
              onChange={(e) => setRetomarObs(e.target.value)}
              placeholder="Descreva o que foi corrigido em relação ao motivo da rejeição."
              maxLength={2000}
              disabled={retomarMut.isPending}
            />
            <div className="text-[10px] text-[var(--text-muted)]">
              {retomarObs.trim().length} / 2000 (mínimo 10)
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRetomarOpen(false)} disabled={retomarMut.isPending}>
              Cancelar
            </Button>
            <Button
              disabled={retomarMut.isPending || retomarObs.trim().length < 10}
              onClick={() => retomarMut.mutate()}
            >
              Retomar revisão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

/* ============= Subcomponentes ============= */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-sm)]">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
        <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  readOnly,
  max = 20000,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  max?: number;
}) {
  return (
    <label className="block space-y-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
          {label}
        </span>
        <span className="text-[10px] text-[var(--text-muted)]">
          {value.length.toLocaleString("pt-BR")} / {max.toLocaleString("pt-BR")}
        </span>
      </div>
      {hint ? (
        <p className="text-[11px] text-[var(--text-muted)]">{hint}</p>
      ) : null}
      <Textarea
        rows={5}
        disabled={readOnly}
        maxLength={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="resize-y"
      />
    </label>
  );
}

function HistoricoPanel({ etpId }: { etpId: string }) {
  const qc = useQueryClient();
  const { role } = useAuth();
  const canWrite = role === "admin" || role === "manager" || role === "engineer";
  const addNota = useServerFn(addEtpHistoricoNota);
  const { data: historico = [], isLoading } = useQuery(etpHistoricoQueryOptions(etpId));
  const [nota, setNota] = useState("");

  const notaMut = useMutation({
    mutationFn: () => addNota({ data: { etp_id: etpId, mensagem: nota.trim() } }),
    onSuccess: () => {
      toast.success("Nota registrada no histórico.");
      setNota("");
      qc.invalidateQueries({ queryKey: ["engenharia", "etp", etpId, "historico"] });
    },
    onError: (e: Error) => toast.error(e?.message ?? "Falha ao registrar nota."),
  });

  return (
    <aside className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4 shadow-[var(--shadow-sm)] lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-auto">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <History className="h-4 w-4 text-[var(--text-muted)]" />
        Histórico de alterações
      </div>

      {canWrite ? (
        <div className="mb-4 space-y-2 rounded-[var(--radius-md)] border border-dashed border-[var(--bg-border)] bg-[var(--bg-elevated)]/40 p-3">
          <label className="block space-y-1">
            <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
              <MessageSquarePlus className="h-3.5 w-3.5" /> Adicionar nota
            </span>
            <Textarea
              rows={3}
              value={nota}
              maxLength={2000}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Decisão técnica, motivo da alteração, alinhamento com cliente…"
            />
          </label>
          <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
            <span>{nota.length} / 2000</span>
            <Button
              size="sm"
              disabled={!nota.trim() || notaMut.isPending}
              onClick={() => notaMut.mutate()}
            >
              Registrar
            </Button>
          </div>
        </div>
      ) : (
        <p className="mb-3 rounded-[var(--radius-md)] border border-[var(--bg-border)] bg-[var(--bg-elevated)]/40 p-2 text-[11px] text-[var(--text-muted)]">
          Apenas administradores, gestores e engenheiros podem registrar notas.
        </p>
      )}

      <Separator className="my-3" />

      {isLoading ? (
        <p className="text-xs text-[var(--text-muted)]">Carregando histórico…</p>
      ) : historico.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">
          Nenhuma alteração registrada ainda.
        </p>
      ) : (
        <ol className="relative space-y-3 border-l border-[var(--bg-border)] pl-4">
          {historico.map((h) => (
            <HistoricoItem key={h.id} h={h} />
          ))}
        </ol>
      )}
    </aside>
  );
}

const TIPO_DOT: Record<EtpHistoricoTipo, string> = {
  alteracao: "bg-blue-500",
  nota: "bg-amber-500",
  aprovacao: "bg-emerald-500",
  status: "bg-violet-500",
  anexo: "bg-sky-500",
  reabertura: "bg-orange-500",
};

function HistoricoItem({
  h,
}: {
  h: {
    id: string;
    tipo: EtpHistoricoTipo;
    campo: string | null;
    valor_anterior: string | null;
    valor_novo: string | null;
    mensagem: string | null;
    created_by_nome: string | null;
    created_at: string;
  };
}) {
  return (
    <li className="relative">
      <span
        className={cn(
          "absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full ring-2 ring-[var(--bg-surface)]",
          TIPO_DOT[h.tipo],
        )}
      />
      <div className="text-[11px] text-[var(--text-muted)]">
        {new Date(h.created_at).toLocaleString("pt-BR")} ·{" "}
        <span className="font-medium text-[var(--text-primary)]">
          {h.created_by_nome ?? "Sistema"}
        </span>
      </div>
      <div className="mt-0.5 text-xs font-medium">
        {ETP_HISTORICO_TIPO_LABEL[h.tipo]}
        {h.campo ? (
          <>
            {" · "}
            <span className="text-[var(--text-muted)]">
              {ETP_CAMPO_LABEL[h.campo] ?? h.campo}
            </span>
          </>
        ) : null}
      </div>

      {h.tipo === "nota" && h.mensagem ? (
        <p className="mt-1 whitespace-pre-wrap rounded-[var(--radius-md)] bg-amber-50/60 px-2 py-1.5 text-xs text-amber-900">
          {h.mensagem}
        </p>
      ) : null}

      {h.tipo === "alteracao" || h.tipo === "status" || h.tipo === "aprovacao" || h.tipo === "anexo" ? (
        <div className="mt-1 space-y-1 text-[11px]">
          {h.valor_anterior ? (
            <div className="rounded-[var(--radius-md)] border border-rose-100 bg-rose-50/50 px-2 py-1 text-rose-800">
              <span className="mr-1 font-mono text-[10px] text-rose-500">−</span>
              <span className="line-clamp-3 whitespace-pre-wrap break-words">{h.valor_anterior}</span>
            </div>
          ) : null}
          {h.valor_novo ? (
            <div className="rounded-[var(--radius-md)] border border-emerald-100 bg-emerald-50/50 px-2 py-1 text-emerald-800">
              <span className="mr-1 font-mono text-[10px] text-emerald-600">+</span>
              <span className="line-clamp-4 whitespace-pre-wrap break-words">{h.valor_novo}</span>
            </div>
          ) : null}
          {h.mensagem ? (
            <div className="text-[var(--text-muted)] whitespace-pre-wrap break-words">{h.mensagem}</div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
