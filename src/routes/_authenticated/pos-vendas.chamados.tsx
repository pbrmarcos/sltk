import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { useState, useEffect } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChamadoStatusBadge } from "@/components/suporte/ChamadoStatusBadge";
import { ChamadoPrioridadeBadge } from "@/components/suporte/ChamadoPrioridadeBadge";
import { ChamadoOrigemBadge } from "@/components/suporte/ChamadoOrigemBadge";
import { SlaClock } from "@/components/suporte/SlaClock";
import { listChamados } from "@/lib/suporte.functions";

const searchSchema = z.object({
  status: fallback(z.string(), "todos").default("todos"),
  origem: fallback(z.string(), "todas").default("todas"),
  prioridade: fallback(z.string(), "todas").default("todas"),
  escopo: fallback(z.string(), "todos").default("todos"),
  sla: fallback(z.boolean(), false).default(false),
  q: fallback(z.string(), "").default(""),
  mensagem_q: fallback(z.string(), "").default(""),
  cliente_q: fallback(z.string(), "").default(""),
  cnpj: fallback(z.string(), "").default(""),
  date_from: fallback(z.string(), "").default(""),
  date_to: fallback(z.string(), "").default(""),
  page: fallback(z.number().int(), 1).default(1),
});

export const Route = createFileRoute("/_authenticated/pos-vendas/chamados")({
  validateSearch: zodValidator(searchSchema),
  component: ChamadosListPage,
});

function ChamadosListPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/pos-vendas/chamados" });
  const [qInput, setQInput] = useState(search.q);
  const [msgInput, setMsgInput] = useState(search.mensagem_q);
  const [cliInput, setCliInput] = useState(search.cliente_q);
  const [cnpjInput, setCnpjInput] = useState(search.cnpj);
  const listFn = useServerFn(listChamados);

  useEffect(() => setQInput(search.q), [search.q]);
  useEffect(() => setMsgInput(search.mensagem_q), [search.mensagem_q]);
  useEffect(() => setCliInput(search.cliente_q), [search.cliente_q]);
  useEffect(() => setCnpjInput(search.cnpj), [search.cnpj]);

  const query = useQuery({
    queryKey: ["chamados", search],
    queryFn: () =>
      listFn({
        data: {
          status: search.status,
          origem: search.origem,
          prioridade: search.prioridade,
          escopo: search.escopo as "todos" | "meus" | "sem_atendente",
          sla_estourado: search.sla,
          q: search.q || null,
          mensagem_q: search.mensagem_q || null,
          cliente_q: search.cliente_q || null,
          cnpj: search.cnpj || null,
          date_from: search.date_from
            ? new Date(search.date_from + "T00:00:00").toISOString()
            : null,
          date_to: search.date_to ? new Date(search.date_to + "T23:59:59").toISOString() : null,
          page: search.page,
          page_size: 25,
        },
      }),
  });

  const total = query.data?.total ?? 0;
  const rows = (query.data?.rows ?? []) as any[];

  function update(patch: Partial<typeof search>) {
    navigate({ search: (prev: typeof search) => ({ ...prev, ...patch, page: 1 }) });
  }

  return (
    <PageContainer>
      <PageHeader
        title="Chamados"
        subtitle="Caixa de entrada unificada: suporte técnico, mensagens do site e registros internos."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Pós-venda" }, { label: "Chamados" }]}
      />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Input
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") update({ q: qInput });
          }}
          onBlur={() => {
            if (qInput !== search.q) update({ q: qInput });
          }}
          placeholder="Buscar por código, nome, e-mail, nº série…"
          className="max-w-xs"
        />
        <Select value={search.origem} onValueChange={(v) => update({ origem: v })}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas origens</SelectItem>
            <SelectItem value="site_publico">Suporte (site)</SelectItem>
            <SelectItem value="contato_site">Contato do site</SelectItem>
            <SelectItem value="interno">Interno</SelectItem>
          </SelectContent>
        </Select>
        <Select value={search.status} onValueChange={(v) => update({ status: v })}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="aberto">Aberto</SelectItem>
            <SelectItem value="em_analise">Em análise</SelectItem>
            <SelectItem value="aguardando_cliente">Aguardando cliente</SelectItem>
            <SelectItem value="resolvido">Resolvido</SelectItem>
            <SelectItem value="reaberto">Reaberto</SelectItem>
            <SelectItem value="arquivado">Arquivado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={search.prioridade} onValueChange={(v) => update({ prioridade: v })}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas prioridades</SelectItem>
            <SelectItem value="critica">Crítica</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="media">Média</SelectItem>
            <SelectItem value="baixa">Baixa</SelectItem>
          </SelectContent>
        </Select>
        <Select value={search.escopo} onValueChange={(v) => update({ escopo: v })}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos atendentes</SelectItem>
            <SelectItem value="meus">Meus chamados</SelectItem>
            <SelectItem value="sem_atendente">Sem atendente</SelectItem>
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Checkbox checked={search.sla} onCheckedChange={(v) => update({ sla: v === true })} />
          SLA estourado
        </label>
        <div className="ml-auto text-sm text-muted-foreground">
          {total} chamado{total === 1 ? "" : "s"}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Input
          value={cliInput}
          onChange={(e) => setCliInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") update({ cliente_q: cliInput });
          }}
          onBlur={() => {
            if (cliInput !== search.cliente_q) update({ cliente_q: cliInput });
          }}
          placeholder="Cliente (razão social/fantasia)…"
          className="max-w-xs"
        />
        <Input
          value={cnpjInput}
          onChange={(e) => setCnpjInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") update({ cnpj: cnpjInput });
          }}
          onBlur={() => {
            if (cnpjInput !== search.cnpj) update({ cnpj: cnpjInput });
          }}
          placeholder="CNPJ (parcial)…"
          className="w-44"
        />
        <Input
          value={msgInput}
          onChange={(e) => setMsgInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") update({ mensagem_q: msgInput });
          }}
          onBlur={() => {
            if (msgInput !== search.mensagem_q) update({ mensagem_q: msgInput });
          }}
          placeholder="Texto nas mensagens…"
          className="max-w-xs"
        />
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          De
          <Input
            type="date"
            value={search.date_from}
            onChange={(e) => update({ date_from: e.target.value })}
            className="w-36"
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          Até
          <Input
            type="date"
            value={search.date_to}
            onChange={(e) => update({ date_to: e.target.value })}
            className="w-36"
          />
        </label>
        {search.cliente_q ||
        search.cnpj ||
        search.mensagem_q ||
        search.date_from ||
        search.date_to ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              update({ cliente_q: "", cnpj: "", mensagem_q: "", date_from: "", date_to: "" })
            }
          >
            Limpar avançado
          </Button>
        ) : null}
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Visitante</TableHead>
              <TableHead>Assunto</TableHead>
              <TableHead>Prioridade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Atendente</TableHead>
              <TableHead>SLA resposta</TableHead>
              <TableHead>Última msg</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isError ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  {query.error instanceof Error
                    ? query.error.message
                    : "Erro ao carregar chamados."}
                </TableCell>
              </TableRow>
            ) : query.isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  Carregando…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  Nenhum chamado encontrado.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r: any) => {
                const pendente =
                  r.ultima_mensagem_por === "visitante" &&
                  r.status !== "resolvido" &&
                  r.status !== "arquivado";
                return (
                  <TableRow key={r.id} className="cursor-pointer">
                    <TableCell className="font-mono">
                      <Link
                        to="/pos-vendas/chamados/$id"
                        params={{ id: r.id }}
                        className="text-primary hover:underline"
                      >
                        {r.codigo}
                      </Link>
                      {pendente ? (
                        <span className="ml-2 inline-block rounded-full bg-rose-100 text-rose-700 text-[10px] px-2 py-0.5">
                          novo
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <ChamadoOrigemBadge origem={r.origem} />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{r.visitante_nome}</div>
                      <div className="text-xs text-muted-foreground">{r.visitante_email}</div>
                    </TableCell>
                    <TableCell>
                      <div>{r.assunto ?? "—"}</div>
                      {r.numero_serie ? (
                        <div className="text-xs text-muted-foreground">sn {r.numero_serie}</div>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <ChamadoPrioridadeBadge prioridade={r.prioridade} />
                    </TableCell>
                    <TableCell>
                      <ChamadoStatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.atendente_nome ?? <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <SlaClock
                        slaAt={r.sla_resposta_at}
                        finalizedAt={r.first_response_at}
                        compact
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.ultima_mensagem_em
                        ? new Date(r.ultima_mensagem_em).toLocaleString()
                        : new Date(r.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between mt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            navigate({ search: (p: typeof search) => ({ ...p, page: Math.max(1, p.page - 1) }) })
          }
          disabled={search.page === 1}
        >
          Anterior
        </Button>
        <div className="text-sm text-muted-foreground">Página {search.page}</div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate({ search: (p: typeof search) => ({ ...p, page: p.page + 1 }) })}
          disabled={rows.length < 25}
        >
          Próxima
        </Button>
      </div>
    </PageContainer>
  );
}
