import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChamadoChat, type ChatMensagem } from "@/components/suporte/ChamadoChat";
import { ChamadoTimeline } from "@/components/suporte/ChamadoTimeline";
import { ChamadoStatusBadge } from "@/components/suporte/ChamadoStatusBadge";
import { ChamadoPrioridadeBadge } from "@/components/suporte/ChamadoPrioridadeBadge";
import { ChamadoOrigemBadge } from "@/components/suporte/ChamadoOrigemBadge";
import { SlaClock } from "@/components/suporte/SlaClock";
import {
  addComentarioInterno,
  alterarStatusChamado,
  assumirChamado,
  getChamado,
  responderChamado,
  setPrioridadeChamado,
  reatribuirChamado,
  listAtendentes,
} from "@/lib/suporte.functions";

export const Route = createFileRoute("/_authenticated/pos-vendas/chamados/$id")({
  component: ChamadoDetalhePage,
});

type Prioridade = "baixa" | "media" | "alta" | "critica";
type Status =
  | "aberto"
  | "em_analise"
  | "aguardando_cliente"
  | "resolvido"
  | "reaberto"
  | "arquivado";

function ChamadoDetalhePage() {
  const { id } = useParams({ from: "/_authenticated/pos-vendas/chamados/$id" });
  const qc = useQueryClient();
  const getFn = useServerFn(getChamado);
  const respFn = useServerFn(responderChamado);
  const statusFn = useServerFn(alterarStatusChamado);
  const assumirFn = useServerFn(assumirChamado);
  const prioridadeFn = useServerFn(setPrioridadeChamado);
  const reatribuirFn = useServerFn(reatribuirChamado);
  const atendentesFn = useServerFn(listAtendentes);
  const comentarioFn = useServerFn(addComentarioInterno);

  const q = useQuery({
    queryKey: ["chamado", id],
    queryFn: () => getFn({ data: { id } }),
    refetchInterval: 15000,
  });

  const atendentesQ = useQuery({
    queryKey: ["atendentes"],
    queryFn: () => atendentesFn(),
    staleTime: 5 * 60_000,
  });

  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [comentario, setComentario] = useState("");
  const [enviandoComentario, setEnviandoComentario] = useState(false);

  const [priDialog, setPriDialog] = useState<{ open: boolean; value: Prioridade; motivo: string }>({
    open: false,
    value: "media",
    motivo: "",
  });
  const [reDialog, setReDialog] = useState<{ open: boolean; value: string; motivo: string }>({
    open: false,
    value: "__none__",
    motivo: "",
  });

  async function enviar() {
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      await respFn({ data: { chamado_id: id, conteudo: texto.trim() } });
      setTexto("");
      await qc.invalidateQueries({ queryKey: ["chamado", id] });
      toast.success("Resposta enviada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao responder.");
    } finally {
      setEnviando(false);
    }
  }

  async function enviarComentario() {
    if (!comentario.trim()) return;
    setEnviandoComentario(true);
    try {
      await comentarioFn({ data: { chamado_id: id, conteudo: comentario.trim() } });
      setComentario("");
      await qc.invalidateQueries({ queryKey: ["chamado", id] });
      toast.success("Comentário interno adicionado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao comentar.");
    } finally {
      setEnviandoComentario(false);
    }
  }

  async function mudarStatus(p: Status) {
    try {
      await statusFn({ data: { chamado_id: id, para: p } });
      await qc.invalidateQueries({ queryKey: ["chamado", id] });
      toast.success("Status atualizado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao atualizar.");
    }
  }

  async function confirmarPrioridade() {
    try {
      await prioridadeFn({
        data: {
          chamado_id: id,
          prioridade: priDialog.value,
          motivo: priDialog.motivo.trim() || null,
        },
      });
      setPriDialog((d) => ({ ...d, open: false, motivo: "" }));
      await qc.invalidateQueries({ queryKey: ["chamado", id] });
      toast.success("Prioridade atualizada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao atualizar prioridade.");
    }
  }

  async function confirmarReatribuicao() {
    try {
      await reatribuirFn({
        data: {
          chamado_id: id,
          atendente_id: reDialog.value === "__none__" ? null : reDialog.value,
          motivo: reDialog.motivo.trim() || null,
        },
      });
      setReDialog((d) => ({ ...d, open: false, motivo: "" }));
      await qc.invalidateQueries({ queryKey: ["chamado", id] });
      toast.success("Atendente atualizado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao reatribuir.");
    }
  }

  async function assumir() {
    try {
      await assumirFn({ data: { chamado_id: id } });
      await qc.invalidateQueries({ queryKey: ["chamado", id] });
      toast.success("Chamado atribuído a você.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao assumir.");
    }
  }

  if (q.isLoading)
    return (
      <PageContainer>
        <div className="p-6 text-muted-foreground">Carregando…</div>
      </PageContainer>
    );
  if (q.error || !q.data)
    return (
      <PageContainer>
        <div className="p-6 text-rose-700">Erro ao carregar chamado.</div>
      </PageContainer>
    );

  const { chamado, mensagens, eventos, equipamento } = q.data as {
    chamado: {
      id: string;
      codigo: string;
      status: Status;
      origem: string;
      prioridade: Prioridade;
      assunto: string | null;
      visitante_nome: string;
      visitante_email: string;
      visitante_telefone: string | null;
      numero_serie: string | null;
      atendente_id: string | null;
      atendente_nome: string | null;
      sla_resposta_at: string | null;
      sla_resolucao_at: string | null;
      first_response_at: string | null;
      created_at: string;
    };
    mensagens: (ChatMensagem & { interno?: boolean })[];
    eventos: any[];
    equipamento: {
      modelo?: string;
      fabricante?: string;
      clientes?: { id: string } | null;
    } | null;
  };
  const isContato = chamado.origem === "contato_site";
  const mensagensPublicas = mensagens.filter((m) => !m.interno);
  const jaResolvido = chamado.status === "resolvido" || chamado.status === "arquivado";
  const atendentes = atendentesQ.data?.atendentes ?? [];

  return (
    <PageContainer>
      <PageHeader
        title={chamado.codigo}
        subtitle={
          chamado.assunto ?? (isContato ? "Mensagem do site institucional" : "Chamado de suporte")
        }
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Pós-venda" },
          { label: "Chamados", href: "/pos-vendas/chamados" },
          { label: chamado.codigo },
        ]}
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <ChamadoOrigemBadge origem={chamado.origem} />
        <ChamadoStatusBadge status={chamado.status} />
        <ChamadoPrioridadeBadge prioridade={chamado.prioridade} />
        <SlaClock
          slaAt={chamado.sla_resposta_at}
          finalizedAt={chamado.first_response_at}
          label="Resposta"
        />
        <SlaClock slaAt={chamado.sla_resolucao_at} label="Resolução" />
        {!jaResolvido ? (
          <Button
            size="sm"
            variant="outline"
            className="ml-auto text-emerald-700 border-emerald-300 hover:bg-emerald-50"
            onClick={() => mudarStatus("resolvido")}
          >
            <CheckCircle2 className="h-4 w-4 mr-1" /> Marcar como resolvido
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-lg border bg-card p-4">
            <Tabs defaultValue="conversa">
              <TabsList>
                <TabsTrigger value="conversa">Conversa</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="internos">Comentários internos</TabsTrigger>
              </TabsList>

              <TabsContent value="conversa" className="pt-3">
                <ChamadoChat mensagens={mensagensPublicas} viewpoint="internal" />

                {chamado.status === "arquivado" ? (
                  <div className="mt-3 text-sm text-muted-foreground italic">
                    Chamado arquivado — sem interações.
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    <Textarea
                      value={texto}
                      onChange={(e) => setTexto(e.target.value)}
                      rows={3}
                      maxLength={4000}
                      placeholder={
                        isContato
                          ? "Registre a resposta ao remetente…"
                          : "Escreva a resposta ao cliente…"
                      }
                    />
                    <div className="flex justify-end">
                      <Button onClick={enviar} disabled={enviando || !texto.trim()}>
                        {enviando ? "Enviando…" : "Enviar resposta"}
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="timeline" className="pt-3">
                <ChamadoTimeline eventos={eventos ?? []} mensagens={mensagens as any} />
              </TabsContent>

              <TabsContent value="internos" className="pt-3 space-y-3">
                <div className="rounded border bg-amber-50/40 p-3 max-h-[50vh] overflow-y-auto space-y-2">
                  {mensagens.filter((m) => m.interno).length === 0 ? (
                    <div className="text-sm text-muted-foreground italic">
                      Sem comentários internos.
                    </div>
                  ) : (
                    mensagens
                      .filter((m) => m.interno)
                      .map((m) => (
                        <div key={m.id} className="rounded border bg-white p-2 text-sm">
                          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                            {m.autor_nome} · {new Date(m.created_at).toLocaleString()}
                          </div>
                          <div className="whitespace-pre-wrap break-words">{m.conteudo}</div>
                        </div>
                      ))
                  )}
                </div>
                <Textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  rows={3}
                  maxLength={4000}
                  placeholder="Anotação visível apenas para a equipe interna…"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={enviarComentario}
                    disabled={enviandoComentario || !comentario.trim()}
                    variant="secondary"
                  >
                    {enviandoComentario ? "Salvando…" : "Adicionar comentário"}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="text-xs uppercase text-muted-foreground">Status</div>
            <Select value={chamado.status} onValueChange={(v) => mudarStatus(v as Status)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aberto">Aberto</SelectItem>
                <SelectItem value="em_analise">Em análise</SelectItem>
                <SelectItem value="aguardando_cliente">Aguardando cliente</SelectItem>
                <SelectItem value="resolvido">Resolvido</SelectItem>
                <SelectItem value="reaberto">Reaberto</SelectItem>
                <SelectItem value="arquivado">Arquivado</SelectItem>
              </SelectContent>
            </Select>

            <div className="pt-2">
              <div className="text-xs uppercase text-muted-foreground mb-1">Prioridade</div>
              <div className="flex items-center gap-2">
                <ChamadoPrioridadeBadge prioridade={chamado.prioridade} />
                <Dialog
                  open={priDialog.open}
                  onOpenChange={(o) =>
                    setPriDialog({ open: o, value: chamado.prioridade, motivo: "" })
                  }
                >
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      Alterar
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Alterar prioridade</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <Select
                        value={priDialog.value}
                        onValueChange={(v) =>
                          setPriDialog((d) => ({ ...d, value: v as Prioridade }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="critica">Crítica (1h / 4h)</SelectItem>
                          <SelectItem value="alta">Alta (4h / 24h)</SelectItem>
                          <SelectItem value="media">Média (8h / 72h)</SelectItem>
                          <SelectItem value="baixa">Baixa (24h / 7d)</SelectItem>
                        </SelectContent>
                      </Select>
                      <Textarea
                        placeholder="Motivo da mudança (opcional, registrado na timeline)…"
                        value={priDialog.motivo}
                        onChange={(e) => setPriDialog((d) => ({ ...d, motivo: e.target.value }))}
                        rows={3}
                        maxLength={500}
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setPriDialog((d) => ({ ...d, open: false }))}
                      >
                        Cancelar
                      </Button>
                      <Button onClick={confirmarPrioridade}>Confirmar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="pt-2 border-t">
              <div className="text-xs uppercase text-muted-foreground mb-1">Atendente</div>
              <div className="text-sm mb-2">
                {chamado.atendente_nome ?? (
                  <span className="text-muted-foreground">— não atribuído —</span>
                )}
              </div>
              <div className="flex gap-2">
                <Dialog
                  open={reDialog.open}
                  onOpenChange={(o) =>
                    setReDialog({ open: o, value: chamado.atendente_id ?? "__none__", motivo: "" })
                  }
                >
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      Reatribuir
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reatribuir chamado</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                      <Select
                        value={reDialog.value}
                        onValueChange={(v) => setReDialog((d) => ({ ...d, value: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="— não atribuído —" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— não atribuído —</SelectItem>
                          {atendentes.map((a: { id: string; nome: string }) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Textarea
                        placeholder="Motivo da reatribuição (opcional, registrado na timeline)…"
                        value={reDialog.motivo}
                        onChange={(e) => setReDialog((d) => ({ ...d, motivo: e.target.value }))}
                        rows={3}
                        maxLength={500}
                      />
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setReDialog((d) => ({ ...d, open: false }))}
                      >
                        Cancelar
                      </Button>
                      <Button onClick={confirmarReatribuicao}>Confirmar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                {!chamado.atendente_id ? (
                  <Button size="sm" variant="secondary" onClick={assumir}>
                    Assumir
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-4 space-y-2 text-sm">
            <div className="text-xs uppercase text-muted-foreground">Visitante</div>
            <div>
              <strong>{chamado.visitante_nome}</strong>
            </div>
            <div className="text-muted-foreground">{chamado.visitante_email}</div>
            {chamado.visitante_telefone ? (
              <div className="text-muted-foreground">{chamado.visitante_telefone}</div>
            ) : null}

            {isContato ? (
              <div className="pt-2 border-t text-xs text-muted-foreground italic">
                Mensagem recebida pelo formulário público do site (/contato).
              </div>
            ) : (
              <>
                <div className="pt-2 border-t text-xs uppercase text-muted-foreground">
                  Equipamento
                </div>
                <div>
                  nº série: <span className="font-mono">{chamado.numero_serie ?? "—"}</span>
                </div>
                {equipamento ? (
                  <div className="text-sm">
                    <div>
                      {equipamento.modelo} — {equipamento.fabricante}
                    </div>
                    {equipamento.clientes ? (
                      <Link
                        to="/clientes/$codigo"
                        params={{ codigo: equipamento.clientes.id }}
                        className="text-primary hover:underline text-xs"
                      >
                        Ver cliente
                      </Link>
                    ) : null}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic">
                    nº de série não bateu com nenhum equipamento cadastrado.
                  </div>
                )}
              </>
            )}
            <div className="pt-2 border-t text-xs text-muted-foreground">
              Aberto em {new Date(chamado.created_at).toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
