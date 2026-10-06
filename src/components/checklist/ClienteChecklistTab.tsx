/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/form/FormField";
import { FormGrid } from "@/components/form/FormGrid";
import {
  Archive,
  CheckCircle2,
  Copy,
  ExternalLink,
  Link2,
  Mail,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import {
  listChecklistTipos,
  emitirChecklistLink,
  listChecklistLinksCliente,
  arquivarChecklistLink,
  enviarChecklistLinkPorEmail,
  listChecklistSubmissoes,
  listOportunidadesDoCliente,
  vincularSubmissaoOportunidade,
} from "@/lib/checklist.functions";
import type { Idioma } from "@/lib/checklist.shared";
import { IDIOMA_LABEL } from "@/lib/checklist.shared";

type Props = { clienteId: string };

const STATUS_BADGE: Record<string, string> = {
  aberto: "border-sky-200 bg-sky-50 text-sky-700",
  preenchido: "border-emerald-200 bg-emerald-50 text-emerald-700",
  expirado:
    "border-[var(--badge-neutral-border)] bg-[var(--badge-neutral-bg)] text-[var(--text-muted)]",
  arquivado:
    "border-[var(--badge-neutral-border)] bg-[var(--badge-neutral-bg)] text-[var(--text-muted)]",
};

/**
 * Checklists técnicos do cliente — único lugar onde se emite. Uma linha por
 * checklist: tipo · status · data · 1 ação + menu. Respostas abrem em Formulários.
 */
export function ClienteChecklistTab({ clienteId }: Props) {
  const qc = useQueryClient();
  const [openEmit, setOpenEmit] = useState(false);
  const [vincularSubId, setVincularSubId] = useState<string | null>(null);

  const linksQ = useQuery({
    queryKey: ["checklist-links", clienteId],
    queryFn: () => listChecklistLinksCliente({ data: { cliente_id: clienteId } }),
  });
  const subsQ = useQuery({
    queryKey: ["checklist-subs-cliente", clienteId],
    queryFn: () => listChecklistSubmissoes({ data: { cliente_id: clienteId, limit: 200 } }),
  });
  const arquivarMut = useMutation({
    mutationFn: (link_id: string) => arquivarChecklistLink({ data: { link_id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checklist-links", clienteId] });
      toast.success("Link arquivado.");
    },
  });
  const enviarEmailMut = useMutation({
    mutationFn: (link_id: string) => enviarChecklistLinkPorEmail({ data: { link_id } }),
    onSuccess: (res) => toast.success(`Checklist enviado para ${res.email}.`),
    onError: (e: any) => toast.error(e.message || "Erro ao enviar e-mail."),
  });

  const copiar = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/checklist/${slug}`);
    toast.success("Link copiado.");
  };

  const links = (linksQ.data ?? []) as any[];
  const subs = (subsQ.data ?? []) as any[];
  const total = links.length + subs.length;

  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <h2 className="text-[13.5px] font-semibold">Checklists{total ? ` (${total})` : ""}</h2>
        <Button size="sm" className="h-8" onClick={() => setOpenEmit(true)}>
          <Plus className="h-3.5 w-3.5" /> Emitir checklist
        </Button>
      </div>

      {linksQ.isLoading || subsQ.isLoading ? (
        <div className="p-4 text-[12px] text-muted-foreground">Carregando…</div>
      ) : total === 0 ? (
        <div className="p-6 text-center text-[12.5px] text-muted-foreground">
          Nenhum checklist ainda. Emita um link em PT, ES ou EN para o cliente preencher.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {subs.map((s) => (
            <li key={`s-${s.id}`} className="flex items-center gap-3 px-4 py-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[13px] font-medium">
                  <span className="truncate">{s.checklist_formulario_tipo?.nome_pt ?? "—"}</span>
                  {!s.lida_em && (
                    <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                      NOVO
                    </span>
                  )}
                </div>
                <div className="truncate text-[11.5px] text-muted-foreground">
                  Respondido por {s.preenchido_por_nome ?? "—"} ·{" "}
                  {new Date(s.criado_em).toLocaleDateString("pt-BR")}
                </div>
              </div>
              <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                <Link
                  to="/comercial/formularios"
                  search={{ aba: "checklists", submissao: s.id } as never}
                >
                  Ver respostas
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Mais">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => setVincularSubId(s.id)}>
                    <Link2 className="mr-2 h-4 w-4" /> Vincular a oportunidade
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
          {links.map((l) => (
            <li key={`l-${l.id}`} className="flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[13px] font-medium">
                  <span className="truncate">{l.checklist_formulario_tipo?.nome_pt ?? "—"}</span>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {l.idioma}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={"text-[10px] " + (STATUS_BADGE[l.status] ?? "")}
                  >
                    {l.status}
                  </Badge>
                </div>
                <div className="truncate text-[11.5px] text-muted-foreground">
                  Emitido em {new Date(l.criado_em).toLocaleDateString("pt-BR")}
                  {l.expira_em && ` · expira ${new Date(l.expira_em).toLocaleDateString("pt-BR")}`}
                  {l.preenchido_em &&
                    ` · preenchido ${new Date(l.preenchido_em).toLocaleDateString("pt-BR")}`}
                </div>
              </div>
              {l.status === "aberto" && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => copiar(l.slug)}
                  >
                    <Copy className="h-3.5 w-3.5 sm:mr-1" />
                    <span className="hidden sm:inline">Copiar link</span>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Mais">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        disabled={enviarEmailMut.isPending}
                        onSelect={() => enviarEmailMut.mutate(l.id)}
                      >
                        <Mail className="mr-2 h-4 w-4" /> Enviar por e-mail
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => window.open(`/checklist/${l.slug}`, "_blank")}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" /> Abrir como o cliente vê
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => arquivarMut.mutate(l.id)}>
                        <Archive className="mr-2 h-4 w-4" /> Arquivar link
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <EmitirDialog
        open={openEmit}
        onClose={() => setOpenEmit(false)}
        clienteId={clienteId}
        onEmitted={() => qc.invalidateQueries({ queryKey: ["checklist-links", clienteId] })}
      />
      <VincularOportunidadeDialog
        open={!!vincularSubId}
        onClose={() => setVincularSubId(null)}
        clienteId={clienteId}
        submissaoId={vincularSubId}
      />
    </section>
  );
}

function EmitirDialog({
  open,
  onClose,
  clienteId,
  onEmitted,
}: {
  open: boolean;
  onClose: () => void;
  clienteId: string;
  onEmitted: () => void;
}) {
  const tiposQ = useQuery({ queryKey: ["checklist-tipos"], queryFn: () => listChecklistTipos() });
  const [tipoId, setTipoId] = useState("");
  const [idioma, setIdioma] = useState<Idioma>("pt");
  const [titulo, setTitulo] = useState("");
  const [linkCriado, setLinkCriado] = useState<string | null>(null);

  const emitMut = useMutation({
    mutationFn: () =>
      emitirChecklistLink({
        data: {
          cliente_id: clienteId,
          tipo_id: tipoId,
          idioma,
          titulo: titulo || null,
          expira_em_dias: 30,
        },
      }),
    onSuccess: (res) => {
      setLinkCriado(`${window.location.origin}/checklist/${res.slug}`);
      onEmitted();
    },
    onError: (e: any) => toast.error(e.message || "Erro ao emitir."),
  });

  const fechar = () => {
    setLinkCriado(null);
    setTipoId("");
    setTitulo("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && fechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Emitir checklist</DialogTitle>
          <DialogDescription>Link público, válido por 30 dias.</DialogDescription>
        </DialogHeader>
        {linkCriado ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input readOnly value={linkCriado} className="font-mono text-xs" />
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(linkCriado);
                  toast.success("Copiado.");
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={fechar}>Fechar</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <FormGrid cols={1}>
              <FormField label="Tipo de máquina" required>
                <Select value={tipoId} onValueChange={setTipoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione…" />
                  </SelectTrigger>
                  <SelectContent>
                    {(tiposQ.data ?? []).map((t: any) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.nome_pt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
              <FormGrid cols={2}>
                <FormField label="Idioma">
                  <Select value={idioma} onValueChange={(v) => setIdioma(v as Idioma)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pt">{IDIOMA_LABEL.pt}</SelectItem>
                      <SelectItem value="es">{IDIOMA_LABEL.es}</SelectItem>
                      <SelectItem value="en">{IDIOMA_LABEL.en}</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Título interno">
                  <Input
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Linha 6000 BPM"
                  />
                </FormField>
              </FormGrid>
            </FormGrid>
            <DialogFooter>
              <Button variant="outline" onClick={fechar}>
                Cancelar
              </Button>
              <Button disabled={!tipoId || emitMut.isPending} onClick={() => emitMut.mutate()}>
                Emitir link
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function VincularOportunidadeDialog({
  open,
  onClose,
  clienteId,
  submissaoId,
}: {
  open: boolean;
  onClose: () => void;
  clienteId: string;
  submissaoId: string | null;
}) {
  const qc = useQueryClient();
  const [oppId, setOppId] = useState("");
  const oppsQ = useQuery({
    queryKey: ["oportunidades-do-cliente", clienteId],
    queryFn: () => listOportunidadesDoCliente({ data: { cliente_id: clienteId } }),
    enabled: open,
  });
  const vincularMut = useMutation({
    mutationFn: () =>
      vincularSubmissaoOportunidade({
        data: { oportunidade_id: oppId, submissao_id: submissaoId },
      }),
    onSuccess: () => {
      toast.success("Vinculado — o template de projeto passa a ser sugerido na conversão.");
      qc.invalidateQueries({ queryKey: ["oportunidades-do-cliente", clienteId] });
      qc.invalidateQueries({ queryKey: ["checklist-subs-cliente", clienteId] });
      onClose();
      setOppId("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Vincular a uma oportunidade</DialogTitle>
        </DialogHeader>
        <Select value={oppId} onValueChange={setOppId}>
          <SelectTrigger>
            <SelectValue
              placeholder={oppsQ.isLoading ? "Carregando…" : "Selecione a oportunidade"}
            />
          </SelectTrigger>
          <SelectContent>
            {(oppsQ.data ?? []).map((o: any) => (
              <SelectItem key={o.id} value={o.id}>
                {o.codigo ?? "—"} · {o.titulo}
              </SelectItem>
            ))}
            {(oppsQ.data ?? []).length === 0 && !oppsQ.isLoading && (
              <div className="px-2 py-3 text-center text-[12px] text-muted-foreground">
                Nenhuma oportunidade para este cliente.
              </div>
            )}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => vincularMut.mutate()} disabled={!oppId || vincularMut.isPending}>
            {vincularMut.isPending ? "Vinculando…" : "Vincular"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
