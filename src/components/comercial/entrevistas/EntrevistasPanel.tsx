/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Plus,
  Link2,
  MoreVertical,
  Trash2,
  RotateCcw,
  ShieldAlert,
  FileDown,
  FolderUp,
  ExternalLink,
  MessageSquareText,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableEmpty, TableLoading } from "@/components/data/TableStates";
import {
  listEntrevistas,
  criarEntrevista,
  listSegmentos,
  moverEntrevistaParaLixeira,
  restaurarEntrevista,
  excluirEntrevistaDefinitivamente,
  type EntrevistaRow,
} from "@/lib/entrevistas.functions";
import { gerarDocumentoEntrevista } from "@/lib/entrevistas-docs.functions";
import type { Idioma } from "@/lib/entrevistas-shared";
import { useAuth } from "@/hooks/use-auth";
import { MensagemConvitePopover, appOrigin } from "./MensagemConvitePopover";
import { EntrevistaPreviewDialog } from "./EntrevistaPreviewDialog";

export const ENTREVISTA_STATUS_META: Record<string, { label: string; cls: string }> = {
  pendente: { label: "Pendente", cls: "bg-amber-100 text-amber-900 border-amber-200" },
  respondida: { label: "Respondida", cls: "bg-emerald-100 text-emerald-900 border-emerald-200" },
  expirada: {
    label: "Expirada",
    cls: "bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)] border-[var(--badge-neutral-border)]",
  },
  lixeira: { label: "Na lixeira", cls: "bg-rose-100 text-rose-900 border-rose-200" },
};

type Filtro = "todos" | "pendente" | "respondida" | "expirada" | "lixeira";

/** Lista de entrevistas técnicas: uma linha por entrevista, 1 ação principal + menu. */
export function EntrevistasPanel() {
  const qc = useQueryClient();
  const listFn = useServerFn(listEntrevistas);
  const segFn = useServerFn(listSegmentos);
  const criarFn = useServerFn(criarEntrevista);
  const { role } = useAuth();
  const canPurge = role === "admin" || role === "manager";

  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const escopo = filtro === "lixeira" ? "lixeira" : "ativas";
  const list = useQuery({
    queryKey: ["entrevistas", escopo],
    queryFn: () => listFn({ data: { escopo } }),
  });
  const segs = useQuery({ queryKey: ["entrev-segmentos"], queryFn: () => segFn() });

  const [open, setOpen] = useState(false);
  const [novoSeg, setNovoSeg] = useState("");
  const [leadNome, setLeadNome] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadEmpresa, setLeadEmpresa] = useState("");
  const [idioma, setIdioma] = useState<Idioma>("pt");

  const criar = useMutation({
    mutationFn: (input: any) => criarFn({ data: input }),
    onSuccess: (r) => {
      toast.success(`Entrevista ${r.codigo} criada.`);
      qc.invalidateQueries({ queryKey: ["entrevistas"] });
      setOpen(false);
      setLeadNome("");
      setLeadEmail("");
      setLeadEmpresa("");
      setNovoSeg("");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao criar entrevista."),
  });

  const filtered = useMemo(() => {
    const rows = list.data ?? [];
    const q = busca.trim().toLowerCase();
    return rows.filter((r) => {
      if (escopo === "ativas" && filtro !== "todos" && r.status !== filtro) return false;
      if (!q) return true;
      return [r.codigo, r.segmento_nome, r.lead_nome, r.lead_empresa, r.criador_nome]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [list.data, filtro, busca, escopo]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar empresa, contato, código…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="h-9 max-w-xs"
        />
        <Select value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
          <SelectTrigger className="h-9 w-[150px] text-[12.5px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            <SelectItem value="pendente">Pendentes</SelectItem>
            <SelectItem value="respondida">Respondidas</SelectItem>
            <SelectItem value="expirada">Expiradas</SelectItem>
            <SelectItem value="lixeira">Lixeira</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-[12px] text-muted-foreground">{filtered.length}</span>
        <Button size="sm" className="ml-auto" onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> Nova entrevista
        </Button>
      </div>

      {list.isLoading ? (
        <TableLoading />
      ) : filtered.length === 0 ? (
        <TableEmpty
          title={filtro === "lixeira" ? "Lixeira vazia" : "Nenhuma entrevista"}
          description={
            filtro === "lixeira"
              ? "Itens na lixeira são apagados após 30 dias."
              : "Crie uma entrevista e envie o link ao lead."
          }
        />
      ) : (
        <div className="divide-y rounded-lg border bg-card">
          {filtered.map((e) => (
            <EntrevistaLinha
              key={e.id}
              e={e}
              naLixeira={escopo === "lixeira"}
              canPurge={canPurge}
            />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova entrevista</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-1">
              <Label>Segmento *</Label>
              <Select value={novoSeg} onValueChange={setNovoSeg}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o segmento" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {(segs.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome_pt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="grid gap-1">
                <Label>Empresa</Label>
                <Input value={leadEmpresa} onChange={(e) => setLeadEmpresa(e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label>Contato</Label>
                <Input value={leadNome} onChange={(e) => setLeadNome(e.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={leadEmail}
                  onChange={(e) => setLeadEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <Label>Idioma</Label>
                <Select value={idioma} onValueChange={(v) => setIdioma(v as Idioma)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pt">Português</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
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
              {criar.isPending ? "Criando…" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EntrevistaLinha({
  e,
  naLixeira,
  canPurge,
}: {
  e: EntrevistaRow;
  naLixeira: boolean;
  canPurge: boolean;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const st = naLixeira
    ? ENTREVISTA_STATUS_META.lixeira
    : (ENTREVISTA_STATUS_META[e.status] ?? ENTREVISTA_STATUS_META.pendente);
  const link = `${appOrigin()}/entrevista/${e.codigo}`;

  const trashFn = useServerFn(moverEntrevistaParaLixeira);
  const restoreFn = useServerFn(restaurarEntrevista);
  const purgeFn = useServerFn(excluirEntrevistaDefinitivamente);
  const arquivarFn = useServerFn(gerarDocumentoEntrevista);

  const [confirmTrash, setConfirmTrash] = useState(false);
  const [confirmPurge, setConfirmPurge] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const invalidate = () => qc.invalidateQueries({ queryKey: ["entrevistas"] });

  const trashMut = useMutation({
    mutationFn: () => trashFn({ data: { id: e.id, motivo: motivo || null } }),
    onSuccess: () => {
      toast.success("Movida para a lixeira.");
      setConfirmTrash(false);
      setMotivo("");
      invalidate();
    },
    onError: (err: any) => toast.error(err?.message ?? "Falha ao mover para lixeira."),
  });
  const restoreMut = useMutation({
    mutationFn: () => restoreFn({ data: { id: e.id } }),
    onSuccess: () => {
      toast.success("Entrevista restaurada.");
      invalidate();
    },
    onError: (err: any) => toast.error(err?.message ?? "Falha ao restaurar."),
  });
  const purgeMut = useMutation({
    mutationFn: () => purgeFn({ data: { id: e.id, motivo: motivo || null } }),
    onSuccess: () => {
      toast.success("Excluída definitivamente.");
      setConfirmPurge(false);
      setMotivo("");
      invalidate();
    },
    onError: (err: any) => toast.error(err?.message ?? "Falha ao excluir."),
  });
  const arquivarMut = useMutation({
    mutationFn: () => arquivarFn({ data: { entrevista_id: e.id, idiomas: ["pt"] } }),
    onSuccess: (r: any) => {
      if (r?.drive_ok) toast.success("PDF arquivado no Drive e na Central de Documentos.");
      else
        toast.warning(`PDF na Central de Documentos. Drive: ${r?.drive_error ?? "indisponível"}`);
      qc.invalidateQueries({ queryKey: ["central-docs", "entrevistas-gerados"] });
    },
    onError: (err: any) => toast.error(err?.message ?? "Falha ao arquivar."),
  });

  const abrir = () => navigate({ to: "/comercial/entrevistas/$id", params: { id: e.id } });
  const empresa = e.lead_empresa || e.lead_nome || e.segmento_nome;
  const sub = [e.lead_empresa ? e.lead_nome : null, e.segmento_nome, `#${e.codigo}`]
    .filter(Boolean)
    .join(" · ");
  const purgeDate = e.purge_at ? new Date(e.purge_at) : null;

  return (
    <>
      <div
        className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40"
        onClick={naLixeira ? undefined : abrir}
        role={naLixeira ? undefined : "button"}
      >
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium">{empresa}</div>
          <div className="truncate text-[11.5px] text-muted-foreground">
            {sub}
            {naLixeira && purgeDate && (
              <span className="text-rose-700">
                {" "}
                · apaga em {purgeDate.toLocaleDateString("pt-BR")}
              </span>
            )}
          </div>
        </div>
        <Badge variant="outline" className={`shrink-0 text-[10px] ${st.cls}`}>
          {st.label}
        </Badge>
        <span className="hidden shrink-0 text-[11.5px] text-muted-foreground sm:inline">
          {new Date(e.created_at).toLocaleDateString("pt-BR")}
        </span>
        {!naLixeira && (
          <>
            <Button
              size="sm"
              variant="outline"
              className="h-7 shrink-0 text-xs"
              onClick={(ev) => {
                ev.stopPropagation();
                navigator.clipboard.writeText(link);
                toast.success("Link copiado.");
              }}
            >
              <Link2 className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Copiar link</span>
            </Button>
            <MensagemConvitePopover
              codigo={e.codigo}
              idiomaPadrao={(e.idioma_default as Idioma) ?? "pt"}
            />
          </>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(ev) => ev.stopPropagation()}>
            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" aria-label="Mais">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(ev) => ev.stopPropagation()}>
            {!naLixeira && (
              <>
                <DropdownMenuItem onSelect={abrir}>
                  <ExternalLink className="mr-2 h-4 w-4" /> Abrir
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={link} target="_blank" rel="noreferrer">
                    <MessageSquareText className="mr-2 h-4 w-4" /> Ver como o lead vê
                  </a>
                </DropdownMenuItem>
                {e.status === "respondida" && (
                  <>
                    <DropdownMenuItem onSelect={() => setPreviewOpen(true)}>
                      <FileDown className="mr-2 h-4 w-4" /> Respostas (PDF)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={arquivarMut.isPending}
                      onSelect={() => arquivarMut.mutate()}
                    >
                      <FolderUp className="mr-2 h-4 w-4" /> Arquivar no Drive
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-rose-700" onSelect={() => setConfirmTrash(true)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Mover para lixeira
                </DropdownMenuItem>
              </>
            )}
            {naLixeira && (
              <>
                <DropdownMenuItem
                  onSelect={() => restoreMut.mutate()}
                  disabled={restoreMut.isPending}
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> Restaurar
                </DropdownMenuItem>
                {canPurge && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-rose-700"
                      onSelect={() => setConfirmPurge(true)}
                    >
                      <ShieldAlert className="mr-2 h-4 w-4" /> Excluir definitivamente
                    </DropdownMenuItem>
                  </>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog
        open={confirmTrash}
        onOpenChange={(o) => !trashMut.isPending && setConfirmTrash(o)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mover para a lixeira</AlertDialogTitle>
            <AlertDialogDescription>
              A entrevista <strong>#{e.codigo}</strong> fica 30 dias na lixeira e pode ser
              restaurada nesse período.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={motivo}
            onChange={(ev) => setMotivo(ev.target.value)}
            placeholder="Motivo (opcional)"
            rows={2}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={trashMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              disabled={trashMut.isPending}
              onClick={(ev) => {
                ev.preventDefault();
                trashMut.mutate();
              }}
            >
              {trashMut.isPending ? "Enviando…" : "Mover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={confirmPurge}
        onOpenChange={(o) => !purgeMut.isPending && setConfirmPurge(o)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-rose-700">
              <ShieldAlert className="h-5 w-5" /> Excluir definitivamente
            </AlertDialogTitle>
            <AlertDialogDescription>
              Ação irreversível: respostas e anexos de <strong>#{e.codigo}</strong> serão apagados e
              a ação fica registrada na auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={motivo}
            onChange={(ev) => setMotivo(ev.target.value)}
            placeholder="Motivo (opcional, registrado)"
            rows={2}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={purgeMut.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              disabled={purgeMut.isPending}
              onClick={(ev) => {
                ev.preventDefault();
                purgeMut.mutate();
              }}
            >
              {purgeMut.isPending ? "Excluindo…" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EntrevistaPreviewDialog
        entrevistaId={e.id}
        codigo={e.codigo}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />
    </>
  );
}
