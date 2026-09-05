/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, ExternalLink, FileText, Plus, Archive, CheckCircle2 } from "lucide-react";
import {
  listRfqTipos,
  emitirRfqLink,
  listRfqLinksCliente,
  arquivarRfqLink,
  listRfqSubmissoes,
  getRfqTipoSchema,
  listOportunidadesDoCliente,
  vincularSubmissaoOportunidade,
} from "@/lib/rfq.functions";
import type { Idioma } from "@/lib/rfq.shared";
import { IDIOMA_LABEL } from "@/lib/rfq.shared";
import { RFQFormRenderer } from "@/components/rfq/RFQFormRenderer";

type Props = { clienteId: string };

const STATUS_BADGE: Record<string, string> = {
  aberto: "border-sky-200 bg-sky-50 text-sky-700",
  preenchido: "border-emerald-200 bg-emerald-50 text-emerald-700",
  expirado: "border-slate-200 bg-slate-50 text-slate-500",
  arquivado: "border-slate-200 bg-slate-50 text-slate-500",
};

export function ClienteRfqTab({ clienteId }: Props) {
  const qc = useQueryClient();
  const [openEmit, setOpenEmit] = useState(false);
  const [vincularSubId, setVincularSubId] = useState<string | null>(null);

  const linksQ = useQuery({
    queryKey: ["rfq-links", clienteId],
    queryFn: () => listRfqLinksCliente({ data: { cliente_id: clienteId } }),
  });
  const subsQ = useQuery({
    queryKey: ["rfq-subs-cliente", clienteId],
    queryFn: () => listRfqSubmissoes({ data: { cliente_id: clienteId, limit: 200 } }),
  });

  const arquivarMut = useMutation({
    mutationFn: (link_id: string) => arquivarRfqLink({ data: { link_id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rfq-links", clienteId] });
      toast.success("Link arquivado.");
    },
  });

  function copiar(slug: string) {
    const url = `${window.location.origin}/checklist/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado para a área de transferência.");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-semibold">Checklists</h2>
          <p className="text-[12px] text-muted-foreground">
            Emita check-lists técnicos para o cliente preencher em PT, ES ou EN.
          </p>
        </div>
        <Button size="sm" onClick={() => setOpenEmit(true)}>
          <Plus className="h-3.5 w-3.5" /> Emitir formulário
        </Button>
      </div>

      <section className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          Links emitidos
        </div>
        {linksQ.isLoading ? (
          <div className="p-4 text-sm text-muted-foreground">Carregando…</div>
        ) : (linksQ.data ?? []).length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Nenhum formulário emitido ainda.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {(linksQ.data ?? []).map((l: any) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[13px] font-medium">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    {l.rfq_formulario_tipo?.nome_pt ?? "—"}
                    <Badge variant="outline" className="ml-1 text-[10px] uppercase">
                      {l.idioma}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={"text-[10px] " + (STATUS_BADGE[l.status] ?? "")}
                    >
                      {l.status}
                    </Badge>
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                    Emitido em {new Date(l.criado_em).toLocaleString("pt-BR")}
                    {l.expira_em &&
                      ` · expira em ${new Date(l.expira_em).toLocaleDateString("pt-BR")}`}
                    {l.preenchido_em &&
                      ` · preenchido em ${new Date(l.preenchido_em).toLocaleString("pt-BR")}`}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {l.status === "aberto" && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => copiar(l.slug)}>
                        <Copy className="h-3.5 w-3.5" /> Copiar link
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(`/checklist/${l.slug}`, "_blank")}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => arquivarMut.mutate(l.id)}>
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          Submissões recebidas
        </div>
        {subsQ.isLoading ? (
          <div className="p-4 text-sm text-muted-foreground">Carregando…</div>
        ) : (subsQ.data ?? []).length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Nenhuma submissão recebida.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {(subsQ.data ?? []).map((s: any) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium">
                    {s.rfq_formulario_tipo?.nome_pt ?? "—"}{" "}
                    <span className="text-[11.5px] text-muted-foreground">
                      · {s.preenchido_por_nome ?? "—"} ({s.preenchido_por_email ?? "—"})
                    </span>
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                    {new Date(s.criado_em).toLocaleString("pt-BR")}
                    {!s.lida_em && (
                      <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                        NOVO
                      </span>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setVincularSubId(s.id)}>
                  Vincular a oportunidade
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(`/comercial/checklists?submissao=${s.id}`, "_blank")}
                >
                  Ver respostas
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <EmitirDialog
        open={openEmit}
        onClose={() => setOpenEmit(false)}
        clienteId={clienteId}
        onEmitted={() => {
          qc.invalidateQueries({ queryKey: ["rfq-links", clienteId] });
        }}
      />

      <VincularOportunidadeDialog
        open={!!vincularSubId}
        onClose={() => setVincularSubId(null)}
        clienteId={clienteId}
        submissaoId={vincularSubId}
      />
    </div>
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
  const tiposQ = useQuery({ queryKey: ["rfq-tipos"], queryFn: () => listRfqTipos() });
  const [tipoId, setTipoId] = useState<string>("");
  const [idioma, setIdioma] = useState<Idioma>("pt");
  const [titulo, setTitulo] = useState("");
  const [expiraDias, setExpiraDias] = useState(30);
  const [linkCriado, setLinkCriado] = useState<string | null>(null);

  const emitMut = useMutation({
    mutationFn: () =>
      emitirRfqLink({
        data: {
          cliente_id: clienteId,
          tipo_id: tipoId,
          idioma,
          titulo: titulo || null,
          expira_em_dias: expiraDias,
        },
      }),
    onSuccess: (res) => {
      const url = `${window.location.origin}/checklist/${res.slug}`;
      setLinkCriado(url);
      onEmitted();
      toast.success("Formulário emitido.");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao emitir."),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setLinkCriado(null);
          setTipoId("");
          setTitulo("");
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Emitir checklist</DialogTitle>
          <DialogDescription>
            Gera um link público (PT, ES ou EN) para o cliente ou o próprio sales preencher.
          </DialogDescription>
        </DialogHeader>
        {linkCriado ? (
          <div className="space-y-3">
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Link público criado:
            </div>
            <div className="flex items-center gap-2">
              <Input readOnly value={linkCriado} />
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
              <Button
                onClick={() => {
                  setLinkCriado(null);
                  onClose();
                }}
              >
                Fechar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <EmitirBody
            tipoId={tipoId}
            setTipoId={setTipoId}
            idioma={idioma}
            setIdioma={setIdioma}
            titulo={titulo}
            setTitulo={setTitulo}
            expiraDias={expiraDias}
            setExpiraDias={setExpiraDias}
            tipos={tiposQ.data ?? []}
            onCancel={onClose}
            onEmit={() => emitMut.mutate()}
            emitting={emitMut.isPending}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EmitirBody({
  tipoId,
  setTipoId,
  idioma,
  setIdioma,
  titulo,
  setTitulo,
  expiraDias,
  setExpiraDias,
  tipos,
  onCancel,
  onEmit,
  emitting,
}: {
  tipoId: string;
  setTipoId: (v: string) => void;
  idioma: Idioma;
  setIdioma: (v: Idioma) => void;
  titulo: string;
  setTitulo: (v: string) => void;
  expiraDias: number;
  setExpiraDias: (v: number) => void;
  tipos: Array<{ id: string; nome_pt: string }>;
  onCancel: () => void;
  onEmit: () => void;
  emitting: boolean;
}) {
  const schemaQ = useQuery({
    queryKey: ["rfq-tipo-schema", tipoId],
    queryFn: () => getRfqTipoSchema({ data: { id: tipoId } }),
    enabled: !!tipoId,
  });

  return (
    <Tabs defaultValue="config" className="w-full">
      <TabsList>
        <TabsTrigger value="config">Configurar</TabsTrigger>
        <TabsTrigger value="preview" disabled={!tipoId}>
          Pré-visualizar
        </TabsTrigger>
      </TabsList>

      <TabsContent value="config" className="space-y-3 pt-3">
        <div>
          <Label>Tipo de máquina</Label>
          <Select value={tipoId} onValueChange={setTipoId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione…" />
            </SelectTrigger>
            <SelectContent>
              {tipos.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.nome_pt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Idioma</Label>
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
          </div>
          <div>
            <Label>Expira em (dias)</Label>
            <Input
              type="number"
              min={1}
              max={365}
              value={expiraDias}
              onChange={(e) => setExpiraDias(Number(e.target.value) || 30)}
            />
          </div>
        </div>
        <div>
          <Label>Título interno (opcional)</Label>
          <Input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ex.: Linha 6000 BPM — janeiro"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button disabled={!tipoId || emitting} onClick={onEmit}>
            Emitir link
          </Button>
        </DialogFooter>
      </TabsContent>

      <TabsContent value="preview" className="pt-3">
        {schemaQ.isLoading && (
          <p className="text-xs text-muted-foreground">Carregando pré-visualização…</p>
        )}
        {schemaQ.data && (
          <div className="rounded-md border border-dashed border-border bg-muted/30 p-3">
            <p className="mb-3 text-xs text-muted-foreground">
              Este é o formulário que o destinatário verá em <strong>{IDIOMA_LABEL[idioma]}</strong>
              .
            </p>
            <RFQFormRenderer schema={schemaQ.data.campos_schema} idioma={idioma} preview />
          </div>
        )}
      </TabsContent>
    </Tabs>
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
  const [oppId, setOppId] = useState<string>("");

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
      toast.success("Submissão vinculada à oportunidade.");
      qc.invalidateQueries({ queryKey: ["oportunidades-do-cliente", clienteId] });
      qc.invalidateQueries({ queryKey: ["rfq-subs-cliente", clienteId] });
      onClose();
      setOppId("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vincular submissão a oportunidade</DialogTitle>
          <DialogDescription>
            Ao vincular, o wizard de conversão passa a sugerir automaticamente o template de projeto
            correto para essa máquina.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Oportunidade</Label>
            <Select value={oppId} onValueChange={setOppId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={oppsQ.isLoading ? "Carregando…" : "Selecione uma oportunidade"}
                />
              </SelectTrigger>
              <SelectContent>
                {(oppsQ.data ?? []).map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.codigo ?? "—"} · {o.titulo}
                    <span className="ml-2 text-[10px] text-muted-foreground uppercase">
                      {o.pipeline_stage}
                    </span>
                  </SelectItem>
                ))}
                {(oppsQ.data ?? []).length === 0 && !oppsQ.isLoading && (
                  <div className="px-2 py-3 text-center text-[12px] text-muted-foreground">
                    Nenhuma oportunidade encontrada para este cliente.
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>
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
