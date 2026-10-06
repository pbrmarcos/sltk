/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FileText, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GerarEtpDialog } from "@/components/checklist/GerarEtpDialog";
import { TableLoading, TableEmpty, TableError } from "@/components/data/TableStates";
import { listChecklistSubmissoes, getChecklistSubmissao } from "@/lib/checklist.functions";
import { pickLabel } from "@/lib/checklist.shared";
import type { FormularioSchema, Idioma } from "@/lib/checklist.shared";
import { cn } from "@/lib/utils";

/**
 * Inbox de checklists respondidos pelos clientes (todas as empresas). A emissão
 * do checklist acontece na ficha do cliente; aqui só se lê e se dá sequência.
 */
export function ChecklistsInbox({ submissaoInicial }: { submissaoInicial?: string }) {
  const [selected, setSelected] = useState<string | undefined>(submissaoInicial);
  useEffect(() => {
    if (submissaoInicial) setSelected(submissaoInicial);
  }, [submissaoInicial]);

  const listQ = useQuery({
    queryKey: ["checklist-submissoes"],
    queryFn: () => listChecklistSubmissoes({ data: { limit: 200 } }),
  });
  const detQ = useQuery({
    queryKey: ["checklist-sub", selected],
    queryFn: () => getChecklistSubmissao({ data: { id: selected! } }),
    enabled: Boolean(selected),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <section className="rounded-lg border bg-card">
        {listQ.isError ? (
          <TableError
            description="Não foi possível carregar as respostas."
            onRetry={() => listQ.refetch()}
          />
        ) : listQ.isLoading ? (
          <TableLoading />
        ) : (listQ.data ?? []).length === 0 ? (
          <TableEmpty
            title="Nenhum checklist respondido"
            description="Emita o checklist na ficha do cliente; as respostas chegam aqui."
          />
        ) : (
          <ul className="divide-y">
            {(listQ.data ?? []).map((s: any) => (
              <li key={s.id}>
                <button
                  onClick={() => setSelected(s.id)}
                  className={cn(
                    "w-full px-3 py-2.5 text-left hover:bg-muted/50",
                    selected === s.id && "bg-muted/70",
                  )}
                >
                  <div className="flex items-center gap-2 text-[13px] font-medium">
                    <span className="truncate">{s.clientes?.razao_social ?? "—"}</span>
                    {!s.lida_em && (
                      <span className="shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                        NOVO
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                    {s.checklist_formulario_tipo?.nome_pt ?? "—"} ·{" "}
                    {new Date(s.criado_em).toLocaleDateString("pt-BR")}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border bg-card">
        {!selected ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Selecione um checklist para ver as respostas.
          </div>
        ) : detQ.isError ? (
          <TableError
            description="Não foi possível carregar este checklist."
            onRetry={() => detQ.refetch()}
          />
        ) : detQ.isLoading || !detQ.data ? (
          <TableLoading />
        ) : (
          <SubmissaoDetalhe data={detQ.data} />
        )}
      </section>
    </div>
  );
}

function SubmissaoDetalhe({ data }: { data: { submissao: any; anexos: any[] } }) {
  const s = data.submissao;
  const schema = (s.checklist_formulario_tipo?.campos_schema ?? { secoes: [] }) as FormularioSchema;
  const idioma = (s.idioma as Idioma) ?? "pt";
  const respostas = (s.respostas ?? {}) as Record<string, unknown>;
  const clienteCodigo = s.clientes?.codigo;

  return (
    <div className="p-4 md:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b pb-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold">
            {s.checklist_formulario_tipo?.nome_pt ?? "—"}
          </h2>
          <div className="mt-0.5 text-[12px] text-muted-foreground">
            {clienteCodigo ? (
              <Link to="/clientes/$codigo" params={{ codigo: clienteCodigo }} className="underline">
                {s.clientes?.razao_social}
              </Link>
            ) : (
              s.clientes?.razao_social
            )}
            {" · "}
            {new Date(s.criado_em).toLocaleString("pt-BR")}
            {" · "}
            <Badge variant="outline" className="text-[10px] uppercase">
              {s.idioma}
            </Badge>
          </div>
          <div
            className="text-[12px] text-muted-foreground"
            title={[s.preenchido_por_email, s.preenchido_por_telefone].filter(Boolean).join(" · ")}
          >
            Preenchido por {s.preenchido_por_nome ?? "—"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <GerarEtpDialog submissaoId={s.id} clienteId={s.cliente_id} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="px-2" aria-label="Mais ações">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link to="/comercial/orcamento/novo">
                  <FileText className="mr-2 h-4 w-4" /> Criar orçamento
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="space-y-5">
        {schema.secoes.map((sec) => (
          <section key={sec.id}>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {pickLabel(sec.titulo, idioma)}
            </h3>
            <dl className="divide-y rounded-md border">
              {sec.campos.map((c) => {
                const v = respostas[c.id];
                let display: string;
                if (v === undefined || v === null || v === "") display = "—";
                else if (typeof v === "boolean") display = v ? "Sim" : "Não";
                else if (Array.isArray(v)) display = v.join(", ") || "—";
                else display = String(v);
                return (
                  <div
                    key={c.id}
                    className="grid gap-0.5 px-3 py-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:gap-3"
                  >
                    <dt className="text-[12px] text-muted-foreground">
                      {pickLabel(c.label, idioma)}
                    </dt>
                    <dd className="text-[13px] text-foreground">{display}</dd>
                  </div>
                );
              })}
            </dl>
          </section>
        ))}
      </div>

      {(data.anexos ?? []).length > 0 && (
        <section className="mt-5">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Anexos
          </h3>
          <ul className="space-y-1">
            {(data.anexos ?? []).map((a: any) => (
              <li key={a.id} className="text-[12.5px]">
                {a.drive_view_url ? (
                  <a
                    href={a.drive_view_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-700 underline"
                  >
                    {a.nome}
                  </a>
                ) : (
                  a.nome
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
