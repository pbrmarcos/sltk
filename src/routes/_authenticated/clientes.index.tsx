import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Plus, Star, Building2, AlertTriangle } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProcessoComercialGuia } from "@/components/comercial/ProcessoComercialGuia";
import { useSuspenseQuery } from "@tanstack/react-query";
import { clientesListQueryOptions, paisesQueryOptions } from "@/lib/clientes.queries";
import { formatDocumento, CLIENTE_STATUS } from "@/lib/clientes.shared";
import { ClienteStatusBadge, useClienteStatusLabel } from "@/components/clientes/ClienteStatusBadge";
import { Flag } from "@/components/ui/flag";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Toolbar, ToolbarSearch, ToolbarSpacer } from "@/components/data/Toolbar";
import { TableEmpty } from "@/components/data/TableStates";
import { PermissionLinkButton } from "@/components/auth/PermissionLinkButton";
import { Pagination } from "@/components/data/Pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  status: fallback(
    z.enum(["todos", "ativo", "suspect", "prospect", "inativo"]),
    "todos",
  ).default("todos"),
  pais: fallback(z.string(), "todos").default("todos"),
  page: fallback(z.number().int().min(1), 1).default(1),
  pageSize: fallback(z.union([z.literal(25), z.literal(50), z.literal(100)]), 25).default(25),
});

export const Route = createFileRoute("/_authenticated/clientes/")({
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    context.queryClient.ensureQueryData(paisesQueryOptions());
    context.queryClient.ensureQueryData(
      clientesListQueryOptions({
        q: deps.q,
        status: deps.status,
        pais: deps.pais,
        page: deps.page,
        pageSize: deps.pageSize,
      }),
    );
  },
  component: ClientesListPage,
  errorComponent: ClientesListError,
});

function ClientesListError({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <PageContainer>
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-6">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-600" />
          <div className="flex-1">
            <h2 className="font-semibold text-rose-900">Erro ao carregar clientes</h2>
            <p className="mt-1 text-sm text-rose-700">{error.message}</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-3"
              onClick={() => {
                reset();
                router.invalidate();
              }}
            >
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

function ClientesListPage() {
  const { q, status, pais, page, pageSize } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const statusLabel = useClienteStatusLabel();

  const paises = useSuspenseQuery(paisesQueryOptions());
  const list = useSuspenseQuery(
    clientesListQueryOptions({ q, status, pais, page, pageSize }),
  );
  const total = list.data.total;
  const rows = list.data.rows;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const paisMap = new Map(paises.data.map((p) => [p.codigo, p]));

  type SearchState = z.infer<typeof searchSchema>;
  const update = (patch: Partial<SearchState>) =>
    navigate({ search: (prev: SearchState) => ({ ...prev, ...patch }) });

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "CRM" }, { label: "Clientes" }]}
        title="Clientes"
        subtitle="Contas, key accounts e prospects"
        actions={
          <PermissionLinkButton module="clientes" to="/clientes/novo" size="sm" className="h-9">
            <Plus className="mr-1 h-4 w-4" /> Novo cliente
          </PermissionLinkButton>
        }
      />
      <ProcessoComercialGuia destaque="ganho" />

      <Toolbar>
        <ToolbarSearch
          value={q}
          onChange={(v) => update({ q: v, page: 1 })}
          placeholder="Buscar por nome, código, documento ou cidade…"
        />
        <Select
          value={status}
          onValueChange={(v) => update({ status: v as typeof status, page: 1 })}
        >
          <SelectTrigger className="h-9 w-[140px] text-[12.5px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {CLIENTE_STATUS.map((s) => (
              <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={pais}
          onValueChange={(v) => update({ pais: v, page: 1 })}
        >
          <SelectTrigger className="h-9 w-[160px] text-[12.5px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os países</SelectItem>
            {paises.data.map((p) => (
              <SelectItem key={p.codigo} value={p.codigo}>
                 <span className="inline-flex items-center gap-2">
                   <Flag code={p.codigo} size={16} />
                   <span>{p.nome}</span>
                 </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ToolbarSpacer />
        <span className="text-[12px] text-[var(--text-muted)]">{total} cliente(s)</span>
      </Toolbar>

      <div className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]">
        {rows.length === 0 ? (
          <div className="p-4">
            <TableEmpty
              title="Nenhum cliente encontrado"
              description="Ajuste a busca ou cadastre um novo cliente."
              action={
                <PermissionLinkButton module="clientes" to="/clientes/novo" size="sm">
                  <Plus className="mr-1 h-4 w-4" /> Novo cliente
                </PermissionLinkButton>
              }
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[110px]">Código</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Documento</TableHead>
                <TableHead className="hidden md:table-cell">Cidade / UF</TableHead>
                <TableHead>Status do cliente</TableHead>
                <TableHead className="hidden lg:table-cell">País</TableHead>
                <TableHead className="hidden lg:table-cell">Segmento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => {
                const initials = c.razao_social
                  .split(/\s+/)
                  .map((w) => w[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();
                const paisCfg = paisMap.get(c.pais);
                const docFmt = paisCfg ? formatDocumento(c.documento_fiscal_numero, paisCfg.documento_mascara) : c.documento_fiscal_numero;
                const color = pickColor(c.razao_social);
                return (
                <TableRow key={c.id} className="cursor-pointer">
                  <TableCell className="font-mono text-[11.5px] text-[var(--text-muted)]">
                    <Link to="/clientes/$codigo" params={{ codigo: c.codigo }} className="hover:underline">
                      {c.codigo}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link to="/clientes/$codigo" params={{ codigo: c.codigo }} className="flex items-center gap-3">
                      <span
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br text-[12px] font-semibold text-white shadow-sm",
                          color,
                        )}
                      >
                        {initials}
                      </span>
                      <span className="flex flex-col">
                        <span className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-primary)]">
                          {c.razao_social}
                          {c.key_account && (
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          )}
                        </span>
                        <span className="text-[11.5px] text-[var(--text-muted)]">
                          <Building2 className="mr-1 inline h-3 w-3" />
                          {c.segmento ?? "—"}
                        </span>
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-[12.5px] text-[var(--text-secondary)]">
                    {docFmt}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-[12.5px] text-[var(--text-secondary)]">
                    {c.endereco_cidade ?? "—"}{c.endereco_estado ? ` — ${c.endereco_estado}` : ""}
                  </TableCell>
                  <TableCell>
                    <ClienteStatusBadge status={c.status ?? c.lifecycle_stage} />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-[12.5px] text-[var(--text-secondary)]">
                     <span className="inline-flex items-center gap-1.5">
                       <Flag code={c.pais} size={16} />
                       {paisCfg?.nome ?? c.pais}
                     </span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-[12.5px] text-[var(--text-muted)]">{c.segmento ?? "—"}</TableCell>
                </TableRow>
              );})}
            </TableBody>
          </Table>
        )}
      </div>

      <Pagination
        page={safePage}
        pageSize={pageSize}
        total={total}
        onPageChange={(p) => update({ page: p })}
        onPageSizeChange={(s) => update({ pageSize: (s as 25 | 50 | 100), page: 1 })}
      />
    </PageContainer>
  );
}

const COLORS = [
  "from-blue-600 to-sky-500",
  "from-emerald-600 to-teal-500",
  "from-amber-600 to-orange-500",
  "from-violet-600 to-purple-500",
  "from-pink-600 to-rose-500",
  "from-red-600 to-orange-500",
  "from-lime-600 to-green-500",
  "from-sky-600 to-cyan-500",
  "from-indigo-600 to-blue-500",
  "from-stone-600 to-zinc-500",
  "from-teal-600 to-emerald-500",
  "from-cyan-600 to-blue-500",
  "from-orange-600 to-red-500",
  "from-slate-600 to-gray-500",
  "from-sky-700 to-indigo-500",
];
function pickColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return COLORS[h % COLORS.length];
}