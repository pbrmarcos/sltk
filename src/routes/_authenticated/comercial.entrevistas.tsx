/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { gerarDocumentoEntrevista } from "@/lib/entrevistas-docs.functions";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProcessoComercialGuia } from "@/components/comercial/ProcessoComercialGuia";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, MessageSquareText, User2, Building2, CalendarClock, Copy, ExternalLink, FileDown, Link2, Trash2, RotateCcw, ShieldAlert, MoreVertical, Printer, X, FolderUp } from "lucide-react";
import {
  listEntrevistas, criarEntrevista, getEntrevista,
  moverEntrevistaParaLixeira, restaurarEntrevista, excluirEntrevistaDefinitivamente,
  type EntrevistaRow,
} from "@/lib/entrevistas.functions";
import { listSegmentos } from "@/lib/entrevistas.functions";
import { shareMessage, type Idioma } from "@/lib/entrevistas-shared";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useBrandSettings } from "@/hooks/use-brand-settings";



export const Route = createFileRoute("/_authenticated/comercial/entrevistas")({
  component: EntrevistasListPage,
  head: () => ({
    meta: [
      { title: "Entrevistas — Comercial | SLTK" },
      { name: "description", content: "Crie entrevistas técnicas por segmento e compartilhe um link público com o lead." },
    ],
  }),
});

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pendente:   { label: "Pendente",   className: "bg-amber-100 text-amber-900 border-amber-200" },
  respondida: { label: "Respondida", className: "bg-emerald-100 text-emerald-900 border-emerald-200" },
  expirada:   { label: "Expirada",   className: "bg-slate-200 text-slate-700 border-slate-300" },
};

function EntrevistasListPage() {
  const qc = useQueryClient();
  const listFn = useServerFn(listEntrevistas);
  const segFn = useServerFn(listSegmentos);
  const criarFn = useServerFn(criarEntrevista);
  const { role } = useAuth();
  const canPurge = role === "admin" || role === "manager";

  const [escopo, setEscopo] = useState<"ativas" | "lixeira">("ativas");
  const list = useQuery({ queryKey: ["entrevistas", escopo], queryFn: () => listFn({ data: { escopo } }) });
  const segs = useQuery({ queryKey: ["entrev-segmentos"], queryFn: () => segFn() });

  const [open, setOpen] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [filtroBusca, setFiltroBusca] = useState("");
  const [novoSeg, setNovoSeg] = useState<string>("");
  const [leadNome, setLeadNome] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadEmpresa, setLeadEmpresa] = useState("");
  const [idioma, setIdioma] = useState<"pt" | "es" | "en">("pt");

  const criar = useMutation({
    mutationFn: (input: any) => criarFn({ data: input }),
    onSuccess: (r) => {
      toast.success(`Entrevista ${r.codigo} criada.`);
      qc.invalidateQueries({ queryKey: ["entrevistas"] });
      setOpen(false);
      setLeadNome(""); setLeadEmail(""); setLeadEmpresa(""); setNovoSeg("");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao criar entrevista."),
  });

  const filtered = useMemo(() => {
    const rows = list.data ?? [];
    const q = filtroBusca.trim().toLowerCase();
    return rows.filter((r) => {
      if (escopo === "ativas" && filtroStatus !== "todos" && r.status !== filtroStatus) return false;
      if (!q) return true;
      return [r.codigo, r.segmento_nome, r.lead_nome, r.lead_empresa, r.criador_nome]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
    });
  }, [list.data, filtroStatus, filtroBusca, escopo]);

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: "Comercial", href: "/comercial/pipeline" }, { label: "Entrevistas" }]}
        title="Entrevistas"
        subtitle="Crie entrevistas técnicas por segmento e compartilhe um link público com o lead."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nova entrevista
          </Button>
        }
      />
      <ProcessoComercialGuia destaque="entrevista" />

      <div className="space-y-4 mt-4">
        <Tabs value={escopo} onValueChange={(v) => setEscopo(v as "ativas" | "lixeira")}>
          <TabsList>
            <TabsTrigger value="ativas">Ativas</TabsTrigger>
            <TabsTrigger value="lixeira">
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Lixeira
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap gap-3 items-center">
          <Input
            placeholder="Buscar por código, segmento, lead…"
            value={filtroBusca}
            onChange={(e) => setFiltroBusca(e.target.value)}
            className="max-w-sm"
          />
          {escopo === "ativas" && (
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="respondida">Respondida</SelectItem>
                <SelectItem value="expirada">Expirada</SelectItem>
              </SelectContent>
            </Select>
          )}
          <div className="text-sm text-muted-foreground ml-auto">
            {filtered.length} entrevista{filtered.length === 1 ? "" : "s"}
          </div>
        </div>

        {escopo === "lixeira" && (
          <div className="text-xs text-muted-foreground border rounded-md p-3 bg-muted/40">
            Entrevistas na lixeira são excluídas automaticamente após <strong>30 dias</strong>.
            Você pode restaurar a qualquer momento{canPurge ? " ou excluir definitivamente" : ""}.
          </div>
        )}

        {list.isLoading ? (
          <div className="text-sm text-muted-foreground">Carregando…</div>
        ) : filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <MessageSquareText className="mx-auto h-8 w-8 mb-2 opacity-50" />
            {escopo === "lixeira"
              ? "Lixeira vazia."
              : `Nenhuma entrevista ${filtroStatus !== "todos" ? `com status ${filtroStatus}` : "por aqui ainda"}.`}
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((e) => (
              <EntrevistaCard key={e.id} e={e} escopo={escopo} canPurge={canPurge} />
            ))}
          </div>
        )}
      </div>


      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nova entrevista</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Segmento *</Label>
              <Select value={novoSeg} onValueChange={setNovoSeg}>
                <SelectTrigger><SelectValue placeholder="Selecione o segmento" /></SelectTrigger>
                <SelectContent className="max-h-80">
                  {(segs.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.nome_pt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Idioma padrão</Label>
                <Select value={idioma} onValueChange={(v) => setIdioma(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt">🇧🇷 Português</SelectItem>
                    <SelectItem value="es">🇪🇸 Español</SelectItem>
                    <SelectItem value="en">🇺🇸 English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Empresa (opcional)</Label>
                <Input value={leadEmpresa} onChange={(e) => setLeadEmpresa(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Contato (opcional)</Label>
                <Input value={leadNome} onChange={(e) => setLeadNome(e.target.value)} />
              </div>
              <div>
                <Label>E-mail do lead (opcional)</Label>
                <Input type="email" value={leadEmail} onChange={(e) => setLeadEmail(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              disabled={!novoSeg || criar.isPending}
              onClick={() =>
                criar.mutate({
                  segmento_id: novoSeg,
                  lead_nome: leadNome || null,
                  lead_email: leadEmail || null,
                  lead_empresa: leadEmpresa || null,
                  idioma_default: idioma,
                })
              }
            >
              {criar.isPending ? "Criando…" : "Criar entrevista"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

function appOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "https://sltkamericas.com";
}

function EntrevistaCard({ e, escopo, canPurge }: { e: EntrevistaRow; escopo: "ativas" | "lixeira"; canPurge: boolean }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const brand = useBrandSettings();
  const getFn = useServerFn(getEntrevista);
  const st = STATUS_LABEL[e.status] ?? STATUS_LABEL.pendente;
  const link = `${appOrigin()}/entrevista/${e.codigo}`;
  const [lang, setLang] = useState<Idioma>((e.idioma_default as Idioma) ?? "pt");
  const msg = shareMessage(e.codigo, lang, appOrigin());

  const trashFn = useServerFn(moverEntrevistaParaLixeira);
  const restoreFn = useServerFn(restaurarEntrevista);
  const purgeFn = useServerFn(excluirEntrevistaDefinitivamente);

  const [confirmTrash, setConfirmTrash] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [motivo, setMotivo] = useState("");

  const preview = useQuery({
    queryKey: ["entrevistas", "preview", e.id],
    enabled: previewOpen,
    queryFn: () => getFn({ data: { id: e.id } }),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["entrevistas"] });

  const trashMut = useMutation({
    mutationFn: () => trashFn({ data: { id: e.id, motivo: motivo || null } }),
    onSuccess: () => { toast.success("Entrevista movida para a lixeira."); setConfirmTrash(false); setMotivo(""); invalidate(); },
    onError: (err: any) => toast.error(err?.message ?? "Falha ao mover para lixeira."),
  });

  const restoreMut = useMutation({
    mutationFn: () => restoreFn({ data: { id: e.id } }),
    onSuccess: () => { toast.success("Entrevista restaurada."); invalidate(); },
    onError: (err: any) => toast.error(err?.message ?? "Falha ao restaurar."),
  });

  const purgeMut = useMutation({
    mutationFn: () => purgeFn({ data: { id: e.id, motivo: motivo || null } }),
    onSuccess: () => { toast.success("Entrevista excluída definitivamente."); setConfirmPurge(false); setMotivo(""); invalidate(); },
    onError: (err: any) => toast.error(err?.message ?? "Falha ao excluir."),
  });

  const arquivarFn = useServerFn(gerarDocumentoEntrevista);
  const arquivarMut = useMutation({
    mutationFn: () => arquivarFn({ data: { entrevista_id: e.id, idiomas: ["pt"] } }),
    onSuccess: (r: any) => {
      if (r?.drive_ok) toast.success("PDF arquivado no Drive e na Central de Documentos.");
      else toast.warning(`PDF registrado na Central de Documentos. Drive: ${r?.drive_error ?? "indisponível"}`);
      qc.invalidateQueries({ queryKey: ["central-docs", "entrevistas-gerados"] });
    },
    onError: (err: any) => toast.error(err?.message ?? "Falha ao arquivar documento."),
  });


  const stopClick = (fn: () => void) => (ev: React.MouseEvent) => {
    ev.preventDefault(); ev.stopPropagation(); fn();
  };

  const naLixeira = escopo === "lixeira";
  const purgeDate = e.purge_at ? new Date(e.purge_at) : null;
  const diasRestantes = purgeDate
    ? Math.max(0, Math.ceil((purgeDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : null;

  return (
    <>
      <Card
        className={`hover:shadow-md hover:border-primary/30 transition flex flex-col ${naLixeira ? "opacity-90" : "cursor-pointer"}`}
        onClick={naLixeira ? undefined : () => navigate({ to: "/comercial/entrevistas/$id", params: { id: e.id } })}
      >
        <CardContent className="p-4 space-y-3 flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-mono text-xs text-muted-foreground">#{e.codigo}</div>
              <div className="font-semibold text-base leading-tight mt-0.5 truncate">{e.segmento_nome}</div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {naLixeira
                ? <Badge variant="outline" className="bg-rose-100 text-rose-900 border-rose-200">Na lixeira</Badge>
                : <Badge variant="outline" className={st.className}>{st.label}</Badge>}
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(ev) => ev.stopPropagation()}>
                  <Button size="icon" variant="ghost" className="h-7 w-7">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(ev) => ev.stopPropagation()}>
                  {!naLixeira && (
                    <DropdownMenuItem onSelect={() => setConfirmTrash(true)} className="text-rose-700">
                      <Trash2 className="h-4 w-4 mr-2" /> Mover para lixeira
                    </DropdownMenuItem>
                  )}
                  {naLixeira && (
                    <>
                      <DropdownMenuItem onSelect={() => restoreMut.mutate()} disabled={restoreMut.isPending}>
                        <RotateCcw className="h-4 w-4 mr-2" /> Restaurar
                      </DropdownMenuItem>
                      {canPurge && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => setConfirmPurge(true)} className="text-rose-700">
                            <ShieldAlert className="h-4 w-4 mr-2" /> Excluir definitivamente
                          </DropdownMenuItem>
                        </>
                      )}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {(e.lead_empresa || e.lead_nome) && (
            <div className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{[e.lead_empresa, e.lead_nome].filter(Boolean).join(" · ")}</span>
            </div>
          )}

          {naLixeira ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-900 space-y-1">
              <div>
                Exclusão automática em <strong>{diasRestantes ?? "—"} dia{diasRestantes === 1 ? "" : "s"}</strong>
                {purgeDate && <> ({purgeDate.toLocaleDateString("pt-BR")})</>}.
              </div>
              {e.deleted_reason && <div className="italic opacity-80">"{e.deleted_reason}"</div>}
            </div>
          ) : (
            <>
              {/* Mensagem para copiar */}
              <div
                className="rounded-md border bg-muted/40 p-2.5 space-y-1.5"
                onClick={(ev) => ev.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                    Mensagem para colar
                  </span>
                  <div className="flex gap-1">
                    {(["pt","es","en"] as const).map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setLang(l)}
                        className={`text-[10px] px-1.5 py-0.5 rounded border ${lang === l ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground hover:text-foreground"}`}
                      >
                        {l.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <Textarea
                  readOnly
                  value={msg}
                  className="text-xs h-16 resize-none bg-background"
                  onFocus={(ev) => ev.currentTarget.select()}
                />
                <div className="flex gap-1.5 flex-wrap">
                  <Button
                    size="sm" variant="outline" className="h-7 text-xs flex-1"
                    onClick={stopClick(() => { navigator.clipboard.writeText(msg); toast.success("Mensagem copiada."); })}
                  >
                    <Copy className="h-3 w-3 mr-1" /> Copiar
                  </Button>
                  <Button
                    size="sm" variant="outline" className="h-7 text-xs"
                    onClick={stopClick(() => { navigator.clipboard.writeText(link); toast.success("Link copiado."); })}
                    title="Copiar apenas o link"
                  >
                    <Link2 className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" asChild onClick={(ev) => ev.stopPropagation()}>
                    <a href={link} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" /></a>
                  </Button>
                </div>
              </div>

              {e.status === "respondida" && (
                <Button
                  size="sm" className="w-full"
                  onClick={stopClick(() => setPreviewOpen(true))}
                >
                  <FileDown className="h-4 w-4 mr-1.5" />
                  Ver respostas (PDF)
                </Button>
              )}

              {e.status === "respondida" && (
                <Button
                  size="sm" variant="outline" className="w-full"
                  disabled={arquivarMut.isPending}
                  onClick={stopClick(() => arquivarMut.mutate())}
                  title="Gera o PDF e arquiva na Central de Documentos + Google Drive"
                >
                  <FolderUp className="h-4 w-4 mr-1.5" />
                  {arquivarMut.isPending ? "Arquivando…" : "Arquivar no Drive"}
                </Button>
              )}
            </>
          )}

          <div className="text-xs text-muted-foreground flex items-center gap-3 pt-2 border-t mt-auto">
            <span className="flex items-center gap-1"><User2 className="h-3 w-3" /> {e.criador_nome ?? e.criador_email ?? "—"}</span>
            <span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" /> {new Date(e.created_at).toLocaleDateString("pt-BR")}</span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmTrash} onOpenChange={setConfirmTrash}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mover para a lixeira</DialogTitle>
            <DialogDescription>
              A entrevista <strong>#{e.codigo}</strong> ficará na lixeira por 30 dias antes da exclusão automática.
              Você pode restaurá-la a qualquer momento nesse período.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Motivo (opcional)</Label>
            <Textarea value={motivo} onChange={(ev) => setMotivo(ev.target.value)} placeholder="Ex.: duplicada, teste, lead desqualificado…" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTrash(false)}>Cancelar</Button>
            <Button variant="destructive" disabled={trashMut.isPending} onClick={() => trashMut.mutate()}>
              {trashMut.isPending ? "Enviando…" : "Enviar para lixeira"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmPurge} onOpenChange={setConfirmPurge}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700">
              <ShieldAlert className="h-5 w-5" /> Excluir definitivamente
            </DialogTitle>
            <DialogDescription>
              Esta ação é <strong>irreversível</strong>. Todas as respostas e anexos de <strong>#{e.codigo}</strong> serão apagados.
              A ação ficará registrada na auditoria com seu usuário.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Motivo (opcional, será registrado)</Label>
            <Textarea value={motivo} onChange={(ev) => setMotivo(ev.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmPurge(false)}>Cancelar</Button>
            <Button variant="destructive" disabled={purgeMut.isPending} onClick={() => purgeMut.mutate()}>
              {purgeMut.isPending ? "Excluindo…" : "Excluir definitivamente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="flex h-[min(92vh,980px)] max-w-[min(1180px,calc(100vw-2rem))] flex-col overflow-hidden p-0 [&>button]:hidden">
          <style>{`
            @page { size: A4; margin: 0; }
            @media print {
              html, body { background: #fff !important; }
              body * { visibility: hidden !important; }
              .interview-print-area, .interview-print-area * { visibility: visible !important; }
              .interview-print-area {
                position: absolute !important;
                inset: 0 auto auto 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                box-shadow: none !important;
              }
              .interview-preview-toolbar, .interview-page-indicator { display: none !important; }
              .interview-print-shell { background: #fff !important; padding: 0 !important; overflow: visible !important; }
              .interview-page { box-shadow: none !important; margin: 0 !important; page-break-after: always; break-after: page; }
              .interview-page:last-child { page-break-after: auto; break-after: auto; }
              .interview-qblock { break-inside: avoid; page-break-inside: avoid; }
            }
          `}</style>
          <DialogHeader className="interview-preview-toolbar border-b bg-background px-5 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <DialogTitle>Prévia da entrevista #{e.codigo}</DialogTitle>
                <DialogDescription>Confira o layout com quebra de páginas antes de imprimir ou salvar como PDF.</DialogDescription>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPreviewOpen(false)}>
                  <X className="mr-1.5 h-4 w-4" /> Fechar
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!preview.data || preview.isError}>
                  <FileDown className="mr-1.5 h-4 w-4" /> Salvar como PDF
                </Button>
                <Button size="sm" onClick={() => window.print()} disabled={!preview.data || preview.isError}>
                  <Printer className="mr-1.5 h-4 w-4" /> Imprimir
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="interview-print-shell flex-1 overflow-auto bg-muted p-4">
            {preview.isLoading ? (
              <div className="flex min-h-[480px] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <div>Carregando conteúdo da entrevista…</div>
              </div>
            ) : preview.isError ? (
              <div className="mx-auto flex min-h-[480px] max-w-md flex-col items-center justify-center gap-2 rounded border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-800">
                <ShieldAlert className="h-6 w-6" />
                <div className="font-semibold">Não foi possível carregar a prévia</div>
                <div>{(preview.error as any)?.message ?? "Tente fechar e abrir novamente."}</div>
                <Button size="sm" variant="outline" onClick={() => preview.refetch()}>Tentar novamente</Button>
              </div>
            ) : preview.data ? (
              <InterviewPreviewDocument entrevista={preview.data as any} brand={brand.settings} />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function fmtDateTime(s?: string | null) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleString("pt-BR");
  } catch {
    return "—";
  }
}

function InterviewPreviewDocument({ entrevista, brand }: { entrevista: any; brand: any }) {
  const respostas: any[] = entrevista.respostas ?? [];
  const logo = brand?.logo_url || brand?.logo_url_dark || null;
  const empresa = brand?.system_name || "SLTK Americas";
  const codigoDoc = `ENT-${entrevista.codigo}`;
  const emissao = fmtDateTime(new Date().toISOString());

  // Paginação: página 1 leva cabeçalho grande + identificação + 6 respostas; demais 12 respostas.
  const FIRST_PAGE_ITEMS = 6;
  const OTHER_PAGE_ITEMS = 12;
  const pages: any[][] = [];
  if (respostas.length === 0) {
    pages.push([]);
  } else {
    pages.push(respostas.slice(0, FIRST_PAGE_ITEMS));
    for (let i = FIRST_PAGE_ITEMS; i < respostas.length; i += OTHER_PAGE_ITEMS) {
      pages.push(respostas.slice(i, i + OTHER_PAGE_ITEMS));
    }
  }
  const total = pages.length;

  return (
    <div className="interview-print-area mx-auto flex w-[210mm] flex-col items-center gap-4">
      {pages.map((chunk, idx) => (
        <div
          key={idx}
          className="interview-page relative flex h-[297mm] w-[210mm] flex-col bg-background p-[12mm] text-[11px] leading-relaxed text-foreground shadow-lg"
          style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
        >
          {idx === 0 ? (
            <>
              <div className="mb-3 flex items-start justify-between gap-4">
                <div className="flex flex-1 items-start gap-3">
                  {logo ? <img src={logo} alt="Logomarca" className="h-14 w-auto object-contain" /> : null}
                  <div>
                    <h1 className="m-0 text-[22px] font-bold leading-tight">Entrevista Técnica</h1>
                    <div className="mt-1 leading-tight">
                      <div className="font-bold">{empresa}</div>
                      <div>Respostas do lead · {entrevista.segmento?.nome_pt ?? "—"}</div>
                    </div>
                  </div>
                </div>
                <div className="text-right leading-tight">
                  <div className="text-[13px] font-bold">{codigoDoc}</div>
                  <div>Emissão: {emissao}</div>
                  <div>Respondida: {fmtDateTime(entrevista.respondida_em)}</div>
                </div>
              </div>
              <div className="mb-2 bg-muted px-2 py-1 text-center text-[13px] font-bold">Entrevista nº {entrevista.codigo}</div>
              <div className="mb-1 bg-muted/70 px-2 py-1 text-center font-semibold">Identificação</div>
              <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-0.5">
                <div><b>Código:</b> #{entrevista.codigo}</div>
                <div><b>Segmento:</b> {entrevista.segmento?.nome_pt ?? "—"}</div>
                <div><b>Lead:</b> {entrevista.lead_nome ?? "—"}</div>
                <div><b>Empresa:</b> {entrevista.lead_empresa ?? "—"}</div>
                <div><b>E-mail:</b> {entrevista.lead_email ?? "—"}</div>
                <div><b>Pilar (criador):</b> {entrevista.criador?.full_name || entrevista.criador?.email || "—"}</div>
                <div><b>Criada em:</b> {fmtDateTime(entrevista.created_at)}</div>
                <div><b>Respondida em:</b> {fmtDateTime(entrevista.respondida_em)}</div>
              </div>
              <div className="mb-2 mt-1 border-b-2 border-primary pb-1 text-[12px] font-bold">Respostas</div>
            </>
          ) : (
            <div className="mb-2 flex items-center justify-between border-b pb-1 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-2">
                {logo ? <img src={logo} alt="" className="h-6 w-auto object-contain" /> : null}
                <span className="font-semibold text-foreground">{empresa}</span>
                <span>· {codigoDoc}</span>
              </div>
              <div>Entrevista nº {entrevista.codigo}</div>
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            {chunk.length === 0 ? (
              <div className="italic text-muted-foreground">Sem respostas registradas.</div>
            ) : (
              chunk.map((r) => {
                const opts: string[] = Array.isArray(r.valor_options) ? r.valor_options : [];
                const hasText = !!(r.valor_text && String(r.valor_text).trim().length);
                const hasAny = opts.length > 0 || hasText;
                return (
                  <div key={`${r.numero}-${r.pergunta_id}`} className="interview-qblock mb-2 rounded border bg-muted/30 p-2">
                    <div className="mb-0.5 text-[9px] uppercase text-muted-foreground">Pergunta {r.numero}</div>
                    <div className="mb-1 font-bold">{r.enunciado}</div>
                    {opts.map((o, i) => <div key={i} className="pl-3">• {o}</div>)}
                    {hasText ? <div className="mt-1 whitespace-pre-wrap">{r.valor_text}</div> : null}
                    {!hasAny ? <div className="italic text-muted-foreground">— não respondida —</div> : null}
                    {r.descricao_extra ? (
                      <div className="mt-1 border-l-2 border-primary pl-2 text-[10px] text-muted-foreground">
                        Observação: {r.descricao_extra}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-2 flex items-center justify-between border-t pt-1 text-[10px] text-muted-foreground">
            <span>{empresa} · {codigoDoc}</span>
            <span className="font-semibold text-foreground">Pág. {idx + 1} de {total}</span>
          </div>

          <div className="interview-page-indicator pointer-events-none absolute right-3 top-3 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            {idx + 1}/{total}
          </div>
        </div>
      ))}
    </div>
  );
}

