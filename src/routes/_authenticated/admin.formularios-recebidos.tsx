import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import {
  ShieldAlert,
  Inbox,
  MessageSquareText,
  ClipboardList,
  ArrowRight,
  Search,
  X,
  Check,
  Circle,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChamadoStatusBadge } from "@/components/suporte/ChamadoStatusBadge";
import { listChamados } from "@/lib/suporte.functions";
import { listEntrevistas } from "@/lib/entrevistas.functions";
import { listChecklistSubmissoes } from "@/lib/checklist.functions";
import { listFormInboxStatus, setFormInboxStatus } from "@/lib/form-inbox-status.functions";

type InboxKind = "contato" | "entrevista" | "checklist";
type InboxStatus = "pendente" | "lido";

export const Route = createFileRoute("/_authenticated/admin/formularios-recebidos")({
  component: FormulariosRecebidosPage,
});

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function withinRange(iso: string | null | undefined, from: string, to: string) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (from) {
    const f = new Date(from + "T00:00:00").getTime();
    if (t < f) return false;
  }
  if (to) {
    const e = new Date(to + "T23:59:59").getTime();
    if (t > e) return false;
  }
  return true;
}

function matches(term: string, ...fields: (string | null | undefined)[]) {
  if (!term) return true;
  const q = term.toLowerCase();
  return fields.some((f) => (f ?? "").toLowerCase().includes(q));
}

function FormulariosRecebidosPage() {
  const { role } = useAuth();
  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Administração", href: "/admin" },
    { label: "Formulários recebidos" },
  ];

  if (role !== "admin" && role !== "manager") {
    return (
      <PageContainer>
        <PageHeader breadcrumbs={crumbs} title="Formulários recebidos" />
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-12 text-center">
          <ShieldAlert className="h-10 w-10 text-[var(--danger)]" />
          <p className="text-sm text-[var(--text-secondary)]">
            Apenas administradores e gestores podem ver esta página.
          </p>
        </div>
      </PageContainer>
    );
  }

  return <FormulariosRecebidosPanel crumbs={crumbs} />;
}

function FormulariosRecebidosPanel({ crumbs }: { crumbs: { label: string; href?: string }[] }) {
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const listChamadosFn = useServerFn(listChamados);
  const listEntrevistasFn = useServerFn(listEntrevistas);
  const listChecklistFn = useServerFn(listChecklistSubmissoes);

  const contato = useQuery({
    queryKey: ["form-inbox", "contato"],
    queryFn: () =>
      listChamadosFn({
        data: {
          status: "todos",
          origem: "contato_site",
          prioridade: "todas",
          escopo: "todos",
          sla_estourado: false,
          page: 1,
          page_size: 100,
        },
      }),
  });

  const entrevistas = useQuery({
    queryKey: ["form-inbox", "entrevistas"],
    queryFn: () => listEntrevistasFn({ data: { escopo: "ativas" } as any }),
  });

  const checklists = useQuery({
    queryKey: ["form-inbox", "checklist"],
    queryFn: () => listChecklistFn({ data: { limit: 100 } as any }),
  });

  // Status pendente/lido por tipo.
  const listStatusFn = useServerFn(listFormInboxStatus);
  const statusContato = useQuery({
    queryKey: ["form-inbox-status", "contato"],
    queryFn: () => listStatusFn({ data: { entity_type: "contato" } }),
  });
  const statusEntrevista = useQuery({
    queryKey: ["form-inbox-status", "entrevista"],
    queryFn: () => listStatusFn({ data: { entity_type: "entrevista" } }),
  });
  const statusChecklist = useQuery({
    queryKey: ["form-inbox-status", "checklist"],
    queryFn: () => listStatusFn({ data: { entity_type: "checklist" } }),
  });

  const statusMap = (kind: InboxKind): Record<string, InboxStatus> => {
    const rows =
      kind === "contato"
        ? statusContato.data
        : kind === "entrevista"
          ? statusEntrevista.data
          : statusChecklist.data;
    const m: Record<string, InboxStatus> = {};
    for (const r of rows ?? []) m[r.entity_id] = r.status;
    return m;
  };
  const contatoStatusMap = statusMap("contato");
  const entrevistaStatusMap = statusMap("entrevista");
  const checklistStatusMap = statusMap("checklist");

  const countByStatus = (rows: any[], map: Record<string, InboxStatus>) => {
    let lidos = 0;
    for (const r of rows) if (map[r.id] === "lido") lidos++;
    return { lidos, pendentes: rows.length - lidos };
  };

  const contatoAll = (contato.data?.rows ?? []) as any[];
  const entrevistaAll = ((entrevistas.data as any) ?? []) as any[];
  const checklistAll = ((checklists.data as any) ?? []) as any[];

  const contatoRows = useMemo(
    () =>
      contatoAll
        .filter((c) => withinRange(c.created_at, dateFrom, dateTo) || (!dateFrom && !dateTo))
        .filter((c) => matches(search, c.visitante_nome, c.visitante_email, c.assunto, c.codigo)),
    [contatoAll, search, dateFrom, dateTo],
  );

  const entrevistaResp = useMemo(
    () => entrevistaAll.filter((e) => !!e.respondida_em),
    [entrevistaAll],
  );

  const entrevistaRows = useMemo(
    () =>
      entrevistaResp
        .filter(
          (e) =>
            withinRange(e.respondida_em ?? e.created_at, dateFrom, dateTo) ||
            (!dateFrom && !dateTo),
        )
        .filter((e) =>
          matches(search, e.lead_nome, e.lead_email, e.lead_empresa, e.codigo, e.segmento_nome),
        ),
    [entrevistaResp, search, dateFrom, dateTo],
  );

  const checklistRows = useMemo(
    () =>
      checklistAll
        .filter((r) => withinRange(r.criado_em, dateFrom, dateTo) || (!dateFrom && !dateTo))
        .filter((r) =>
          matches(
            search,
            r.preenchido_por_nome,
            r.preenchido_por_email,
            r.clientes?.razao_social,
            r.checklist_formulario_tipo?.nome_pt,
          ),
        ),
    [checklistAll, search, dateFrom, dateTo],
  );

  const hasFilter = search || dateFrom || dateTo;

  return (
    <PageContainer>
      <PageHeader breadcrumbs={crumbs} title="Formulários recebidos" />

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryCard
          icon={<Inbox className="h-5 w-5" />}
          label="Contato do site"
          count={contatoRows.length}
          total={contatoAll.length}
          loading={contato.isLoading}
          {...countByStatus(contatoRows, contatoStatusMap)}
        />
        <SummaryCard
          icon={<MessageSquareText className="h-5 w-5" />}
          label="Entrevistas respondidas"
          count={entrevistaRows.length}
          total={entrevistaResp.length}
          loading={entrevistas.isLoading}
          {...countByStatus(entrevistaRows, entrevistaStatusMap)}
        />
        <SummaryCard
          icon={<ClipboardList className="h-5 w-5" />}
          label="Checklists recebidos"
          count={checklistRows.length}
          total={checklistAll.length}
          loading={checklists.isLoading}
          {...countByStatus(checklistRows, checklistStatusMap)}
        />
      </div>

      {/* Filtros */}
      <Card className="mt-6">
        <CardContent className="flex flex-col gap-3 p-4 md:flex-row md:items-end">
          <div className="flex-1">
            <Label htmlFor="form-inbox-search" className="text-xs">
              Buscar por nome, e-mail, assunto…
            </Label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
              <Input
                id="form-inbox-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ex.: joão, contato@empresa.com"
                className="pl-8"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:flex md:items-end">
            <div>
              <Label htmlFor="form-inbox-from" className="text-xs">
                De
              </Label>
              <Input
                id="form-inbox-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="form-inbox-to" className="text-xs">
                Até
              </Label>
              <Input
                id="form-inbox-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          {hasFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearch("");
                setDateFrom("");
                setDateTo("");
              }}
            >
              <X className="mr-1 h-4 w-4" /> Limpar
            </Button>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="contato" className="mt-6">
        <TabsList>
          <TabsTrigger value="contato">Contato ({contatoRows.length})</TabsTrigger>
          <TabsTrigger value="entrevistas">Entrevistas ({entrevistaRows.length})</TabsTrigger>
          <TabsTrigger value="checklist">Checklist ({checklistRows.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="contato" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                Últimas mensagens do formulário de contato
              </CardTitle>
              <Button asChild variant="outline" size="sm">
                <Link to="/pos-vendas/chamados" search={{ origem: "contato_site" } as any}>
                  Ver todas <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {contato.isLoading ? (
                <p className="text-sm text-[var(--text-secondary)]">Carregando…</p>
              ) : contatoRows.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">
                  {hasFilter
                    ? "Nenhum resultado para os filtros."
                    : "Nenhuma mensagem recebida ainda."}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Remetente</TableHead>
                      <TableHead>Assunto</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Leitura</TableHead>
                      <TableHead>Recebida</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contatoRows.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs">{c.codigo}</TableCell>
                        <TableCell>
                          <div className="font-medium">{c.visitante_nome ?? "—"}</div>
                          <div className="text-xs text-[var(--text-secondary)]">
                            {c.visitante_email ?? ""}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[280px] truncate">{c.assunto ?? "—"}</TableCell>
                        <TableCell>
                          <ChamadoStatusBadge status={c.status} />
                        </TableCell>
                        <TableCell>
                          <StatusToggle
                            kind="contato"
                            id={c.id}
                            status={contatoStatusMap[c.id] ?? "pendente"}
                          />
                        </TableCell>
                        <TableCell className="text-xs">{fmtDate(c.created_at)}</TableCell>
                        <TableCell>
                          <Button asChild size="sm" variant="ghost">
                            <Link to="/pos-vendas/chamados/$id" params={{ id: c.id }}>
                              Abrir
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entrevistas" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Entrevistas técnicas respondidas</CardTitle>
              <Button asChild variant="outline" size="sm">
                <Link to="/comercial/entrevistas">
                  Ver todas <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {entrevistas.isLoading ? (
                <p className="text-sm text-[var(--text-secondary)]">Carregando…</p>
              ) : entrevistaRows.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">
                  {hasFilter
                    ? "Nenhum resultado para os filtros."
                    : "Nenhuma entrevista respondida."}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Lead</TableHead>
                      <TableHead>Segmento</TableHead>
                      <TableHead>Leitura</TableHead>
                      <TableHead>Respondida</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entrevistaRows.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-mono text-xs">{e.codigo ?? "—"}</TableCell>
                        <TableCell>
                          <div className="font-medium">{e.lead_nome ?? e.lead_empresa ?? "—"}</div>
                          <div className="text-xs text-[var(--text-secondary)]">
                            {e.lead_email ?? ""}
                          </div>
                        </TableCell>
                        <TableCell>{e.segmento_nome ?? "—"}</TableCell>
                        <TableCell>
                          <StatusToggle
                            kind="entrevista"
                            id={e.id}
                            status={entrevistaStatusMap[e.id] ?? "pendente"}
                          />
                        </TableCell>
                        <TableCell className="text-xs">
                          {fmtDate(e.respondida_em ?? e.created_at)}
                        </TableCell>
                        <TableCell>
                          <Button asChild size="sm" variant="ghost">
                            <Link to="/comercial/entrevistas/$id" params={{ id: e.id }}>
                              Abrir
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklist" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Submissões de Checklist</CardTitle>
              <Button asChild variant="outline" size="sm">
                <Link to="/central-documentos">
                  Ver central de documentos <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {checklists.isLoading ? (
                <p className="text-sm text-[var(--text-secondary)]">Carregando…</p>
              ) : checklistRows.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">
                  {hasFilter
                    ? "Nenhum resultado para os filtros."
                    : "Nenhuma submissão de Checklist."}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Leitura</TableHead>
                      <TableHead>Recebida</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {checklistRows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.clientes?.razao_social ?? "—"}</TableCell>
                        <TableCell>
                          <div>{r.preenchido_por_nome ?? "—"}</div>
                          <div className="text-xs text-[var(--text-secondary)]">
                            {r.preenchido_por_email ?? ""}
                          </div>
                        </TableCell>
                        <TableCell>{r.checklist_formulario_tipo?.nome_pt ?? "—"}</TableCell>
                        <TableCell>
                          <StatusToggle
                            kind="checklist"
                            id={r.id}
                            status={checklistStatusMap[r.id] ?? "pendente"}
                          />
                        </TableCell>
                        <TableCell className="text-xs">{fmtDate(r.criado_em)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

function StatusToggle({ kind, id, status }: { kind: InboxKind; id: string; status: InboxStatus }) {
  const qc = useQueryClient();
  const setFn = useServerFn(setFormInboxStatus);
  const mut = useMutation({
    mutationFn: (next: InboxStatus) =>
      setFn({ data: { entity_type: kind, entity_id: id, status: next } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["form-inbox-status", kind] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const next: InboxStatus = status === "lido" ? "pendente" : "lido";
  const isLido = status === "lido";
  return (
    <Button
      size="sm"
      variant={isLido ? "outline" : "default"}
      className="h-7 gap-1 px-2 text-xs"
      onClick={() => mut.mutate(next)}
      disabled={mut.isPending}
      title={isLido ? "Marcar como pendente" : "Marcar como lido"}
    >
      {isLido ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
      {isLido ? "Lido" : "Pendente"}
    </Button>
  );
}

function SummaryCard({
  icon,
  label,
  count,
  total,
  loading,
  pendentes,
  lidos,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  total: number;
  loading?: boolean;
  pendentes?: number;
  lidos?: number;
}) {
  const filtered = count !== total;
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
          {icon}
        </div>
        <div className="flex-1">
          <div className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">
            {label}
          </div>
          <div className="text-2xl font-bold">
            {loading ? "…" : count}
            {filtered && !loading && (
              <span className="ml-1 text-sm font-normal text-[var(--text-secondary)]">
                / {total}
              </span>
            )}
          </div>
          {!loading && (pendentes !== undefined || lidos !== undefined) && (
            <div className="mt-1 flex gap-1">
              <Badge variant="default" className="text-[10px]">
                {pendentes ?? 0} pendente{(pendentes ?? 0) === 1 ? "" : "s"}
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                {lidos ?? 0} lido{(lidos ?? 0) === 1 ? "" : "s"}
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
