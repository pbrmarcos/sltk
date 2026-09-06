import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  escolherVencedor,
  getCotacao,
  inviteFornecedores,
  listFornecedoresParaCotacao,
  setCotacaoStatus,
} from "@/lib/cotacoes.functions";
import {
  COTACAO_STATUS_COLOR,
  COTACAO_STATUS_LABEL,
  type CotacaoStatus,
} from "@/lib/cotacoes.shared";
import { cn } from "@/lib/utils";
import { Copy, ExternalLink, Trophy, UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/compras/cotacoes/$id")({
  component: CotacaoDetailPage,
});

type Convite = {
  id: string;
  fornecedor_id: string;
  token: string;
  status: string;
  fornecedores?: {
    codigo: string;
    nome_fantasia: string;
    razao_social: string;
    pais: string;
  } | null;
};
type Item = {
  id: string;
  descricao: string;
  part_number: string | null;
  quantidade: number;
  unidade: string;
};
type Proposta = {
  id: string;
  convite_id: string;
  moeda: string;
  valido_ate: string | null;
  total: number | null;
  status: string;
};
type PropostaItem = {
  id: string;
  proposta_id: string;
  cotacao_item_id: string;
  preco_unitario: number;
  prazo_entrega_dias: number | null;
};
type Escolha = { cotacao_item_id: string; proposta_item_id: string; justificativa: string | null };

function CotacaoDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const getFn = useServerFn(getCotacao);
  const inviteFn = useServerFn(inviteFornecedores);
  const statusFn = useServerFn(setCotacaoStatus);
  const escolherFn = useServerFn(escolherVencedor);
  const fornsFn = useServerFn(listFornecedoresParaCotacao);

  const q = useQuery({
    queryKey: ["cotacoes", "detail", id],
    queryFn: () => getFn({ data: { id } }),
  });

  const [openInvite, setOpenInvite] = useState(false);
  const [fornSel, setFornSel] = useState<Set<string>>(new Set());

  const fornsQ = useQuery({
    queryKey: ["cotacoes", "forns-invite", id],
    queryFn: () => fornsFn({ data: {} }),
    enabled: openInvite,
  });

  if (q.isLoading) return <PageContainer>Carregando…</PageContainer>;
  if (q.error || !q.data) return <PageContainer>Erro ao carregar cotação.</PageContainer>;

  const cot = q.data.cotacao as {
    id: string;
    codigo: string;
    titulo: string;
    status: CotacaoStatus;
    descricao: string | null;
    prazo_resposta: string | null;
    incoterm: string | null;
    moeda: string;
    condicoes_pagamento: string | null;
    origem: string | null;
    projeto_id: string | null;
  };
  const itens = q.data.itens as Item[];
  const convites = q.data.convites as Convite[];
  const propostas = q.data.propostas as Proposta[];
  const propostaItens = q.data.proposta_itens as PropostaItem[];
  const escolhas = q.data.escolhas as Escolha[];

  const propostaByConvite = new Map<string, Proposta>();
  for (const p of propostas) propostaByConvite.set(p.convite_id, p);
  const itemPriceMap = new Map<string, PropostaItem>();
  for (const pi of propostaItens) itemPriceMap.set(`${pi.proposta_id}:${pi.cotacao_item_id}`, pi);
  const escolhaMap = new Map<string, Escolha>();
  for (const e of escolhas) escolhaMap.set(e.cotacao_item_id, e);

  async function invite() {
    if (fornSel.size === 0) return;
    try {
      await inviteFn({ data: { cotacao_id: id, fornecedor_ids: Array.from(fornSel) } });
      toast.success("Fornecedores convidados");
      setOpenInvite(false);
      setFornSel(new Set());
      qc.invalidateQueries({ queryKey: ["cotacoes", "detail", id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao convidar");
    }
  }

  async function changeStatus(status: CotacaoStatus) {
    try {
      await statusFn({ data: { id, status } });
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["cotacoes", "detail", id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    }
  }

  async function escolher(cotacao_item_id: string, proposta_item_id: string) {
    try {
      await escolherFn({ data: { cotacao_item_id, proposta_item_id } });
      toast.success("Vencedor definido");
      qc.invalidateQueries({ queryKey: ["cotacoes", "detail", id] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha");
    }
  }

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Compras" },
          { label: "Cotações", href: "/compras/cotacoes" },
          { label: cot.codigo },
        ]}
        title={`${cot.codigo} — ${cot.titulo}`}
        subtitle={cot.descricao ?? ""}
        actions={
          <div className="flex gap-2">
            {cot.status === "rascunho" && (
              <Button onClick={() => changeStatus("aberta")}>Abrir cotação</Button>
            )}
            {cot.status === "aberta" && (
              <Button variant="outline" onClick={() => changeStatus("encerrada")}>
                Encerrar
              </Button>
            )}
            <Button variant="outline" onClick={() => setOpenInvite(true)}>
              <UserPlus className="mr-2 size-4" /> Convidar fornecedor
            </Button>
          </div>
        }
      />

      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="outline" className={cn(COTACAO_STATUS_COLOR[cot.status])}>
          {COTACAO_STATUS_LABEL[cot.status]}
        </Badge>
        <span className="text-[var(--text-muted)]">Moeda: {cot.moeda}</span>
        {cot.incoterm && (
          <span className="text-[var(--text-muted)]">• Incoterm: {cot.incoterm}</span>
        )}
        {cot.prazo_resposta && (
          <span className="text-[var(--text-muted)]">
            • Prazo: {new Date(cot.prazo_resposta).toLocaleDateString("pt-BR")}
          </span>
        )}
        {cot.origem === "bom" && cot.projeto_id && (
          <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700">
            ⚙ Da B.O.M. de um projeto
          </Badge>
        )}
      </div>

      {/* Convidados */}
      <section className="mt-6">
        <h3 className="mb-2 text-sm font-semibold">Fornecedores convidados ({convites.length})</h3>
        <div className="overflow-x-auto rounded-md border bg-[var(--bg-surface)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-elevated)] text-left text-xs text-[var(--text-secondary)]">
              <tr>
                <th className="p-2">Fornecedor</th>
                <th className="p-2">Status</th>
                <th className="p-2">Proposta</th>
                <th className="p-2">Total</th>
                <th className="p-2">Link público</th>
              </tr>
            </thead>
            <tbody>
              {convites.map((c) => {
                const p = propostaByConvite.get(c.id);
                const url = `${typeof window !== "undefined" ? window.location.origin : ""}/p/cotacao/${c.token}`;
                return (
                  <tr key={c.id} className="border-t">
                    <td className="p-2">
                      <div className="font-medium">
                        {c.fornecedores?.nome_fantasia || c.fornecedores?.razao_social}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {c.fornecedores?.codigo} • {c.fornecedores?.pais}
                      </div>
                    </td>
                    <td className="p-2 capitalize">{c.status}</td>
                    <td className="p-2">{p ? p.status : "—"}</td>
                    <td className="p-2 font-mono">
                      {p?.total != null
                        ? p.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
                        : "—"}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        <Input value={url} readOnly className="h-7 w-64 text-xs" />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => {
                            navigator.clipboard.writeText(url);
                            toast.success("Link copiado");
                          }}
                        >
                          <Copy className="size-3" />
                        </Button>
                        <Button asChild size="icon" variant="ghost" className="h-7 w-7">
                          <a href={url} target="_blank" rel="noreferrer">
                            <ExternalLink className="size-3" />
                          </a>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {convites.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-sm text-[var(--text-muted)]">
                    Nenhum fornecedor convidado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Matriz comparativa */}
      <section className="mt-6">
        <h3 className="mb-2 text-sm font-semibold">Comparativo de propostas</h3>
        <div className="overflow-x-auto rounded-md border bg-[var(--bg-surface)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-elevated)] text-left text-xs text-[var(--text-secondary)]">
              <tr>
                <th className="p-2 sticky left-0 bg-[var(--bg-elevated)]">Item</th>
                <th className="p-2">Qtde</th>
                {propostas.map((p) => {
                  const conv = convites.find((c) => c.id === p.convite_id);
                  return (
                    <th key={p.id} className="p-2 min-w-[180px]">
                      <div className="font-medium">
                        {conv?.fornecedores?.nome_fantasia ||
                          conv?.fornecedores?.razao_social ||
                          "—"}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {p.moeda}
                        {p.valido_ate
                          ? ` • até ${new Date(p.valido_ate).toLocaleDateString("pt-BR")}`
                          : ""}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {itens.map((it) => {
                const escolha = escolhaMap.get(it.id);
                const prices = propostas
                  .map((p) => itemPriceMap.get(`${p.id}:${it.id}`))
                  .filter((x): x is PropostaItem => !!x);
                const min = prices.length
                  ? Math.min(...prices.map((x) => Number(x.preco_unitario)))
                  : null;
                return (
                  <tr key={it.id} className="border-t">
                    <td className="p-2 sticky left-0 bg-[var(--bg-surface)]">
                      <div className="font-medium">{it.descricao}</div>
                      {it.part_number && (
                        <div className="text-xs text-[var(--text-muted)]">PN: {it.part_number}</div>
                      )}
                    </td>
                    <td className="p-2 text-xs">
                      {it.quantidade} {it.unidade}
                    </td>
                    {propostas.map((p) => {
                      const pi = itemPriceMap.get(`${p.id}:${it.id}`);
                      if (!pi)
                        return (
                          <td key={p.id} className="p-2 text-[var(--text-muted)]">
                            —
                          </td>
                        );
                      const isMin = min != null && Number(pi.preco_unitario) === min;
                      const isWinner = escolha?.proposta_item_id === pi.id;
                      return (
                        <td
                          key={p.id}
                          className={cn(
                            "p-2",
                            isMin && "bg-emerald-50",
                            isWinner && "ring-2 ring-amber-400",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="font-mono">
                                {Number(pi.preco_unitario).toLocaleString("pt-BR", {
                                  minimumFractionDigits: 2,
                                })}
                              </div>
                              {pi.prazo_entrega_dias != null && (
                                <div className="text-[11px] text-[var(--text-muted)]">
                                  {pi.prazo_entrega_dias}d
                                </div>
                              )}
                            </div>
                            <Button
                              size="icon"
                              variant={isWinner ? "default" : "ghost"}
                              className="h-7 w-7"
                              title="Escolher vencedor"
                              onClick={() => escolher(it.id, pi.id)}
                            >
                              <Trophy className="size-3" />
                            </Button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {itens.length === 0 && (
                <tr>
                  <td
                    colSpan={2 + propostas.length}
                    className="p-6 text-center text-sm text-[var(--text-muted)]"
                  >
                    Sem itens.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-[var(--text-muted)]">
          Linhas verdes indicam o menor preço por item. Use o troféu para selecionar o vencedor.
        </p>
      </section>

      <Dialog open={openInvite} onOpenChange={setOpenInvite}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Convidar fornecedores</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto rounded border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--bg-elevated)] text-left text-xs">
                <tr>
                  <th className="p-2 w-10" />
                  <th className="p-2">Fornecedor</th>
                  <th className="p-2">País</th>
                </tr>
              </thead>
              <tbody>
                {(fornsQ.data ?? []).map((f) => {
                  const it = f as {
                    id: string;
                    codigo: string;
                    nome_fantasia: string;
                    razao_social: string;
                    pais: string;
                  };
                  const checked = fornSel.has(it.id);
                  return (
                    <tr key={it.id} className="border-t">
                      <td className="p-2">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            const next = new Set(fornSel);
                            if (v) next.add(it.id);
                            else next.delete(it.id);
                            setFornSel(next);
                          }}
                        />
                      </td>
                      <td className="p-2">
                        <div className="font-medium">{it.nome_fantasia || it.razao_social}</div>
                        <div className="text-xs text-[var(--text-muted)]">{it.codigo}</div>
                      </td>
                      <td className="p-2">{it.pais}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenInvite(false)}>
              Cancelar
            </Button>
            <Button onClick={invite} disabled={fornSel.size === 0}>
              Convidar {fornSel.size > 0 ? `(${fornSel.size})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
