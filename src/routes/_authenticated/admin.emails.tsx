import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  Mail,
  ShieldAlert,
  Send,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  listEmailEvents,
  toggleEmailEvent,
  updateEmailTemplate,
  updateEmailRecipients,
  listEmailLogs,
  sendTestEmail,
  emailProviderStatus,
  previewEmailTemplate,
} from "@/lib/email/admin.functions";
import { Eye } from "lucide-react";

const APP_ROLES = ["admin","manager","engineer","production","purchasing","assembly","field","sales"] as const;
type AppRole = (typeof APP_ROLES)[number];
type Mode = "to" | "cc" | null;

const searchSchema = z.object({ tab: z.enum(["eventos","logs"]).optional() });

export const Route = createFileRoute("/_authenticated/admin/emails")({
  validateSearch: searchSchema,
  component: EmailsAdminPage,
});

function EmailsAdminPage() {
  const { role, roleLoading, loading } = useAuth();
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const active = tab ?? "eventos";

  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Administração", href: "/admin" },
    { label: "E-mails automáticos" },
  ];

  if (loading || roleLoading) {
    return (
      <PageContainer>
        <PageHeader breadcrumbs={crumbs} title="E-mails automáticos" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando…
        </div>
      </PageContainer>
    );
  }

  if (role !== "admin" && role !== "manager") {
    return (
      <PageContainer>
        <PageHeader breadcrumbs={crumbs} title="E-mails automáticos" />
        <div className="flex flex-col items-center gap-2 rounded-lg border p-12 text-center">
          <ShieldAlert className="h-10 w-10 text-destructive" />
          <h2 className="text-lg font-semibold">Acesso restrito</h2>
          <p className="text-sm text-muted-foreground">
            Só administradores e gestores podem abrir esta tela.
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={crumbs}
        title="E-mails automáticos"
        subtitle="Templates, matriz de destinatários por papel (To/Cc), toggles e log de envio. Remetente fixo: system@sltkamericas.com."
      />
      <ProviderStatusBanner />
      <Tabs
        value={active}
        onValueChange={(v) =>
          navigate({ to: "/admin/emails", search: { tab: v === "eventos" ? undefined : "logs" } })
        }
        className="mt-4"
      >
        <TabsList>
          <TabsTrigger value="eventos">Eventos</TabsTrigger>
          <TabsTrigger value="logs">Log de envio</TabsTrigger>
        </TabsList>
        <TabsContent value="eventos" className="mt-4">
          <EventsTab canEdit={role === "admin"} />
        </TabsContent>
        <TabsContent value="logs" className="mt-4">
          <LogsTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

function ProviderStatusBanner() {
  const fn = useServerFn(emailProviderStatus);
  const { data } = useQuery({ queryKey: ["email-provider-status"], queryFn: () => fn() });
  if (!data) return null;
  if (data.configured) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
        <CheckCircle2 className="h-4 w-4" />
        Provedor <strong>Resend</strong> conectado — envios reais por <strong>{data.sender}</strong>.
        {data.calendarConfigured
          ? <span className="ml-2 text-xs">+ Google Calendar disponível para eventos com agenda.</span>
          : <span className="ml-2 text-xs text-emerald-700/80">(Google Calendar opcional — não configurado.)</span>}
      </div>
    );
  }
  return (
    <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <div className="font-medium">Provedor Resend ainda não configurado</div>
        <p className="mt-1">
          Enquanto <code>RESEND_API_KEY</code> não estiver ativa, os disparos são
          registrados no log com status
          <code> provider_not_configured</code> e nenhum e-mail sai de fato. Toda a
          configuração de templates, matriz e toggles pode ser feita normalmente.
        </p>
      </div>
    </div>
  );
}

// ============= Eventos =============
type EventRow = {
  event_key: string;
  module: string;
  label: string;
  description: string | null;
  enabled: boolean;
  subject_template: string;
  body_template: string;
  create_calendar_event: boolean;
  calendar_duration_min: number | null;
  required_vars?: string[] | null;
};

type RecipientRow = { event_key: string; role: AppRole; mode: "to" | "cc" };

function EventsTab({ canEdit }: { canEdit: boolean }) {
  const listFn = useServerFn(listEmailEvents);
  const { data, isLoading } = useQuery({
    queryKey: ["email-events"],
    queryFn: () => listFn(),
  });
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [viewKey, setViewKey] = useState<string | null>(null);

  const byModule = useMemo(() => {
    const map = new Map<string, EventRow[]>();
    for (const e of (data?.events ?? []) as EventRow[]) {
      const arr = map.get(e.module) ?? [];
      arr.push(e);
      map.set(e.module, arr);
    }
    return Array.from(map.entries()).sort(([a],[b]) => a.localeCompare(b));
  }, [data]);

  const recipientsByEvent = useMemo(() => {
    const map = new Map<string, RecipientRow[]>();
    for (const r of (data?.recipients ?? []) as RecipientRow[]) {
      const arr = map.get(r.event_key) ?? [];
      arr.push(r);
      map.set(r.event_key, arr);
    }
    return map;
  }, [data]);

  if (isLoading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando eventos…</div>;
  }

  const openEvent = openKey
    ? (data?.events as EventRow[] | undefined)?.find((e) => e.event_key === openKey)
    : null;
  const viewEvent = viewKey
    ? (data?.events as EventRow[] | undefined)?.find((e) => e.event_key === viewKey)
    : null;

  return (
    <div className="flex flex-col gap-4">
      {byModule.map(([mod, events]) => (
        <Card key={mod}>
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-base capitalize">
              <Mail className="h-4 w-4" /> {mod}
              <Badge variant="secondary" className="ml-2">{events.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead>Destinatários</TableHead>
                    <TableHead className="w-28">Agenda</TableHead>
                    <TableHead className="w-44">Último envio</TableHead>
                    <TableHead className="w-24">Ativo</TableHead>
                    <TableHead className="w-40 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((e) => {
                    const recs = recipientsByEvent.get(e.event_key) ?? [];
                    const toList = recs.filter((r) => r.mode === "to").map((r) => r.role);
                    const ccList = recs.filter((r) => r.mode === "cc").map((r) => r.role);
                    const last = (data?.lastSends ?? {})[e.event_key];
                    return (
                      <TableRow key={e.event_key}>
                        <TableCell>
                          <div className="font-medium">{e.label}</div>
                          <div className="text-xs text-muted-foreground">{e.event_key}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {toList.map((r) => (
                              <Badge key={`to-${r}`} variant="default" className="text-[10px]">To: {r}</Badge>
                            ))}
                            {ccList.map((r) => (
                              <Badge key={`cc-${r}`} variant="outline" className="text-[10px]">Cc: {r}</Badge>
                            ))}
                            {recs.length === 0 && (
                              <span className="text-xs text-muted-foreground">nenhum</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {e.create_calendar_event ? (
                            <Badge variant="secondary" className="gap-1">
                              <CalendarClock className="h-3 w-3" />
                              {e.calendar_duration_min ?? 60}min
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {last ? (
                            <div className="flex flex-col">
                              <span className="text-xs">
                                {new Date(last.at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                              </span>
                              <Badge
                                variant={
                                  last.status === "sent" || last.status === "delivered"
                                    ? "default"
                                    : last.status === "provider_not_configured"
                                    ? "secondary"
                                    : "destructive"
                                }
                                className="mt-0.5 w-fit text-[10px]"
                              >
                                {last.status}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">nunca</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <ToggleCell eventKey={e.event_key} enabled={e.enabled} disabled={!canEdit} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setViewKey(e.event_key)}
                              title="Visualizar e-mail renderizado"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setOpenKey(e.event_key)}
                            >
                              Editar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ))}

      {openEvent && (
        <EventEditorDialog
          key={openEvent.event_key}
          event={openEvent}
          recipients={recipientsByEvent.get(openEvent.event_key) ?? []}
          canEdit={canEdit}
          onClose={() => setOpenKey(null)}
        />
      )}
      {viewEvent && (
        <QuickPreviewDialog
          event={viewEvent}
          onClose={() => setViewKey(null)}
        />
      )}
    </div>
  );
}

function ToggleCell({
  eventKey, enabled, disabled,
}: { eventKey: string; enabled: boolean; disabled: boolean }) {
  const qc = useQueryClient();
  const fn = useServerFn(toggleEmailEvent);
  const mut = useMutation({
    mutationFn: (v: boolean) => fn({ data: { event_key: eventKey, enabled: v } }),
    onSuccess: () => {
      toast.success("Toggle atualizado.");
      qc.invalidateQueries({ queryKey: ["email-events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Switch
      checked={enabled}
      disabled={disabled || mut.isPending}
      onCheckedChange={(v) => mut.mutate(v)}
    />
  );
}

function EventEditorDialog({
  event, recipients, canEdit, onClose,
}: {
  event: EventRow;
  recipients: RecipientRow[];
  canEdit: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [subject, setSubject] = useState(event.subject_template);
  const [body, setBody] = useState(event.body_template);
  const [calendar, setCalendar] = useState(event.create_calendar_event);
  const [duration, setDuration] = useState(event.calendar_duration_min ?? 60);
  const [requiredVars, setRequiredVars] = useState<string>(
    (event.required_vars ?? []).join(", "),
  );
  const [testRecipient, setTestRecipient] = useState<string>("");

  const initialMap = useMemo(() => {
    const m = new Map<AppRole, Mode>();
    for (const r of recipients) m.set(r.role, r.mode);
    return m;
  }, [recipients]);
  const [modes, setModes] = useState<Map<AppRole, Mode>>(new Map(initialMap));

  const tplFn = useServerFn(updateEmailTemplate);
  const recFn = useServerFn(updateEmailRecipients);
  const testFn = useServerFn(sendTestEmail);
  const previewFn = useServerFn(previewEmailTemplate);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<{ subject: string; html: string; warnings: string[]; unknown_vars: string[]; vars_used: string[] } | null>(null);
  const previewMut = useMutation({
    mutationFn: () => previewFn({ data: { subject_template: subject, body_template: body, event_key: event.event_key } }),
    onSuccess: (res) => {
      setPreview(res);
      setPreviewOpen(true);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const parsedRequired = requiredVars
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter((s) => /^[a-zA-Z0-9_]+$/.test(s));

  const saveTpl = useMutation({
    mutationFn: () => tplFn({ data: {
      event_key: event.event_key,
      subject_template: subject,
      body_template: body,
      create_calendar_event: calendar,
      calendar_duration_min: calendar ? duration : null,
      required_vars: parsedRequired,
    }}),
    onSuccess: () => {
      toast.success("Template salvo.");
      qc.invalidateQueries({ queryKey: ["email-events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const saveRec = useMutation({
    mutationFn: () => recFn({ data: {
      event_key: event.event_key,
      recipients: Array.from(modes.entries())
        .filter(([, m]) => m !== null)
        .map(([role, mode]) => ({ role, mode: mode as "to" | "cc" })),
    }}),
    onSuccess: () => {
      toast.success("Destinatários salvos.");
      qc.invalidateQueries({ queryKey: ["email-events"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const testMut = useMutation({
    mutationFn: () => testFn({ data: {
      event_key: event.event_key,
      recipient: testRecipient.trim() || null,
    } }),
    onSuccess: (res) => toast.success(`Teste enviado para ${res.recipient}.`),
    onError: (e: Error) => toast.error(e.message),
  });


  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" /> {event.label}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            <code>{event.event_key}</code> — módulo <em>{event.module}</em>
          </p>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Assunto</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} disabled={!canEdit} />
          </div>
          <div className="grid gap-2">
            <Label>Corpo (HTML — variáveis <code>{"{{var}}"}</code>)</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              className="font-mono text-xs"
              disabled={!canEdit}
            />
          </div>

          <div className="flex items-center gap-4 rounded-md border p-3">
            <Switch
              checked={calendar}
              onCheckedChange={setCalendar}
              disabled={!canEdit}
            />
            <div className="flex-1">
              <div className="text-sm font-medium">Criar evento na agenda Google</div>
              <div className="text-xs text-muted-foreground">
                Requer <code>calendarStartISO</code> no dispatch. Duração padrão em minutos.
              </div>
            </div>
            <Input
              type="number"
              min={5}
              max={720}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-24"
              disabled={!canEdit || !calendar}
            />
          </div>

          <div className="grid gap-2 rounded-md border p-3">
            <Label className="text-xs font-semibold">Variáveis obrigatórias</Label>
            <Input
              value={requiredVars}
              onChange={(e) => setRequiredVars(e.target.value)}
              placeholder="ex: codigo, cliente_nome, link"
              disabled={!canEdit}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Separadas por vírgula. Se qualquer uma estiver vazia no disparo, o envio é bloqueado e registrado no log com status <code>skipped_missing_required</code>.
            </p>
          </div>

          <Separator />


          <div>
            <div className="mb-2 text-sm font-medium">Destinatários por papel</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {APP_ROLES.map((r) => {
                const current = modes.get(r) ?? null;
                return (
                  <div key={r} className="flex items-center justify-between rounded-md border p-2">
                    <span className="text-xs capitalize">{r}</span>
                    <Select
                      value={current ?? "none"}
                      onValueChange={(v) => {
                        const next = new Map(modes);
                        next.set(r, v === "none" ? null : (v as "to" | "cc"));
                        setModes(next);
                      }}
                      disabled={!canEdit}
                    >
                      <SelectTrigger className="h-7 w-20 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">—</SelectItem>
                        <SelectItem value="to">To</SelectItem>
                        <SelectItem value="cc">Cc</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-2 rounded-md border border-dashed p-3">
            <Label className="text-xs font-semibold">Enviar teste</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                placeholder="destinatário@empresa.com (vazio = seu e-mail)"
                disabled={!canEdit}
                className="text-xs"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={() => testMut.mutate()}
                disabled={!canEdit || testMut.isPending}
              >
                <Send className="mr-1 h-3 w-3" /> Enviar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Usa variáveis de exemplo — o e-mail vai realmente ser disparado via Resend.
            </p>
          </div>
        </div>

        <DialogFooter className="mt-2 gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => previewMut.mutate()}
            disabled={previewMut.isPending}
          >
            <Eye className="mr-1 h-3 w-3" /> Pré-visualizar
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => saveRec.mutate()}
            disabled={!canEdit || saveRec.isPending}
          >
            Salvar destinatários
          </Button>
          <Button
            size="sm"
            onClick={() => saveTpl.mutate()}
            disabled={!canEdit || saveTpl.isPending}
          >
            Salvar template
          </Button>
        </DialogFooter>
      </DialogContent>

      {previewOpen && preview && (
        <PreviewDialog preview={preview} onClose={() => setPreviewOpen(false)} />
      )}
    </Dialog>
  );
}

function PreviewDialog({
  preview,
  onClose,
}: {
  preview: { subject: string; html: string; warnings: string[]; unknown_vars: string[]; vars_used: string[] };
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4" /> Prévia do e-mail
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Renderizado com dados fictícios de exemplo. Assunto e corpo vão pelo mesmo layout do envio real.
          </p>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Assunto</div>
            <div className="font-medium">{preview.subject}</div>
          </div>

          {preview.warnings.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <div className="mb-1 flex items-center gap-1 font-medium">
                <AlertTriangle className="h-3.5 w-3.5" /> Avisos de validação
              </div>
              <ul className="list-disc space-y-0.5 pl-4">
                {preview.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          {preview.vars_used.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 text-xs">
              <span className="text-muted-foreground">Variáveis usadas:</span>
              {preview.vars_used.map((v) => (
                <Badge
                  key={v}
                  variant={preview.unknown_vars.includes(v) ? "destructive" : "secondary"}
                  className="text-[10px]"
                >
                  {`{{${v}}}`}
                </Badge>
              ))}
            </div>
          )}

          <div className="overflow-hidden rounded-md border bg-white">
            <iframe
              title="Prévia do e-mail"
              sandbox=""
              srcDoc={preview.html}
              className="h-[520px] w-full border-0"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Prévia rápida a partir da linha da tabela: renderiza o template já salvo
 * (sem passar pelo editor). Também usado a partir do log de envio.
 */
function QuickPreviewDialog({
  event,
  onClose,
}: {
  event: { event_key: string; label: string; subject_template: string; body_template: string };
  onClose: () => void;
}) {
  const previewFn = useServerFn(previewEmailTemplate);
  const { data, isLoading, error } = useQuery({
    queryKey: ["email-preview-quick", event.event_key, event.subject_template, event.body_template],
    queryFn: () => previewFn({ data: {
      subject_template: event.subject_template,
      body_template: event.body_template,
      event_key: event.event_key,
    }}),
    staleTime: 60_000,
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4" /> {event.label}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Renderizado com dados de exemplo — mesmo layout usado no envio real (header com logo, rodapé e CTA).
          </p>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Gerando prévia…
          </div>
        )}
        {error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {(error as Error).message}
          </div>
        )}
        {data && (
          <div className="grid gap-3">
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Assunto</div>
              <div className="font-medium">{data.subject}</div>
            </div>
            {data.warnings.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <div className="mb-1 flex items-center gap-1 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5" /> Avisos
                </div>
                <ul className="list-disc space-y-0.5 pl-4">
                  {data.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
            <div className="overflow-hidden rounded-md border bg-white">
              <iframe
                title="Prévia do e-mail"
                sandbox=""
                srcDoc={data.html}
                className="h-[560px] w-full border-0"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function LogsTab() {
  const [eventKey, setEventKey] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [viewLogKey, setViewLogKey] = useState<string | null>(null);
  const [detailLog, setDetailLog] = useState<null | Awaited<ReturnType<typeof fn>>["rows"][number]>(null);

  const fn = useServerFn(listEmailLogs);
  const eventsFn = useServerFn(listEmailEvents);
  const { data: eventsData } = useQuery({ queryKey: ["email-events"], queryFn: () => eventsFn() });
  const eventByKey = useMemo(() => {
    const m = new Map<string, EventRow>();
    for (const e of (eventsData?.events ?? []) as EventRow[]) m.set(e.event_key, e);
    return m;
  }, [eventsData]);
  const viewLogEvent = viewLogKey ? eventByKey.get(viewLogKey) : null;
  const { data, isLoading } = useQuery({
    queryKey: ["email-logs", eventKey, status],
    queryFn: () =>
      fn({ data: {
        event_key: eventKey || null,
        status: status || null,
        page: 1,
        pageSize: 100,
      }}),
  });

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-base">Log de envios</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex flex-wrap gap-2">
          <Input
            placeholder="Filtrar por event_key"
            value={eventKey}
            onChange={(e) => setEventKey(e.target.value)}
            className="w-64"
          />
          <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="sent">Enviado</SelectItem>
              <SelectItem value="failed">Falhou</SelectItem>
              <SelectItem value="skipped_disabled">Ignorado (desativado)</SelectItem>
              <SelectItem value="skipped_no_recipients">Ignorado (sem destinatários)</SelectItem>
              <SelectItem value="skipped_missing_required">Ignorado (variáveis obrigatórias)</SelectItem>
              <SelectItem value="provider_not_configured">Provider não configurado</SelectItem>

            </SelectContent>
          </Select>
        </div>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>To / Cc</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead className="w-32">Status</TableHead>
                  <TableHead className="w-14"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.rows ?? []).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs">{new Date(r.created_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell className="text-xs"><code>{r.event_key}</code></TableCell>
                    <TableCell className="text-xs">{r.triggered_by_kind}</TableCell>
                    <TableCell className="text-xs">
                      <div>{(r.to_addresses ?? []).join(", ")}</div>
                      {(r.cc_addresses ?? []).length > 0 && (
                        <div className="text-muted-foreground">Cc: {(r.cc_addresses ?? []).join(", ")}</div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[320px] truncate text-xs">{r.subject}</TableCell>
                    <TableCell><StatusBadge status={r.status} /></TableCell>
                    <TableCell className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDetailLog(r)}
                        title="Ver detalhes do envio (variáveis, snapshot)"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      {eventByKey.has(r.event_key) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewLogKey(r.event_key)}
                          title="Visualizar template atual deste evento"
                        >
                          <Mail className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </TableCell>

                  </TableRow>
                ))}
                {(!data || data.rows.length === 0) && (
                  <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">Nenhum registro.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      {viewLogEvent && (
        <QuickPreviewDialog event={viewLogEvent} onClose={() => setViewLogKey(null)} />
      )}
      {detailLog && (
        <LogDetailDialog log={detailLog} onClose={() => setDetailLog(null)} />
      )}
    </Card>
  );
}

function LogDetailDialog({
  log,
  onClose,
}: {
  log: {
    id: string;
    created_at: string;
    event_key: string;
    subject: string;
    status: string;
    to_addresses: string[];
    cc_addresses: string[];
    error: string | null;
    vars_used: Record<string, string | number | boolean | null> | null;
    template_snapshot: { subject_template: string; body_template: string } | null;
    required_missing: string[] | null;
  };
  onClose: () => void;
}) {
  const vars = log.vars_used ?? {};
  const varKeys = Object.keys(vars).sort();
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" /> Detalhe do envio
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            <code>{log.event_key}</code> — {new Date(log.created_at).toLocaleString("pt-BR")}
          </p>
        </DialogHeader>

        <div className="grid gap-3 text-sm">
          <div className="rounded-md border p-3">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Assunto</div>
            <div className="font-medium">{log.subject}</div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border p-2">
              <div className="text-[10px] uppercase text-muted-foreground">To</div>
              <div>{log.to_addresses.join(", ") || "—"}</div>
            </div>
            <div className="rounded-md border p-2">
              <div className="text-[10px] uppercase text-muted-foreground">Cc</div>
              <div>{log.cc_addresses.join(", ") || "—"}</div>
            </div>
          </div>

          <div className="rounded-md border p-2 text-xs">
            <div className="mb-1 text-[10px] uppercase text-muted-foreground">Status</div>
            <StatusBadge status={log.status} />
            {log.error && <div className="mt-2 rounded bg-red-50 p-2 text-red-800">{log.error}</div>}
          </div>

          {log.required_missing && log.required_missing.length > 0 && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <div className="mb-1 font-medium">Variáveis obrigatórias ausentes</div>
              <div className="flex flex-wrap gap-1">
                {log.required_missing.map((v) => (
                  <Badge key={v} variant="outline" className="border-amber-400 bg-amber-100 font-mono text-[10px]">
                    {v}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-md border p-2">
            <div className="mb-1 text-[10px] uppercase text-muted-foreground">Variáveis usadas ({varKeys.length})</div>
            {varKeys.length === 0 ? (
              <div className="text-xs text-muted-foreground">Nenhuma variável registrada.</div>
            ) : (
              <div className="max-h-56 overflow-auto">
                <table className="w-full text-xs">
                  <tbody>
                    {varKeys.map((k) => (
                      <tr key={k} className="border-b last:border-0">
                        <td className="py-1 pr-2 font-mono text-muted-foreground">{k}</td>
                        <td className="break-all py-1">{String(vars[k] ?? "")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {log.template_snapshot && (
            <details className="rounded-md border p-2 text-xs">
              <summary className="cursor-pointer font-medium">Snapshot do template no momento do envio</summary>
              <div className="mt-2 space-y-2">
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Assunto (template)</div>
                  <pre className="whitespace-pre-wrap rounded bg-slate-50 p-2 font-mono text-[11px]">{log.template_snapshot.subject_template}</pre>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Corpo (template)</div>
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-2 font-mono text-[11px]">{log.template_snapshot.body_template}</pre>
                </div>
              </div>
            </details>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}



function StatusBadge({ status }: { status: string }) {
  if (status === "sent") return <Badge className="gap-1 bg-emerald-600"><CheckCircle2 className="h-3 w-3" /> enviado</Badge>;
  if (status === "failed") return <Badge className="gap-1 bg-red-600"><XCircle className="h-3 w-3" /> falhou</Badge>;
  return <Badge variant="outline" className="gap-1"><AlertTriangle className="h-3 w-3" /> {status}</Badge>;
}

