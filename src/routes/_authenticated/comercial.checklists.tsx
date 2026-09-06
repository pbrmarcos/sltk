/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProcessoComercialGuia } from "@/components/comercial/ProcessoComercialGuia";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GerarEtpDialog } from "@/components/rfq/GerarEtpDialog";
import { Inbox, ExternalLink } from "lucide-react";
import { TableLoading, TableEmpty, TableError } from "@/components/data/TableStates";
import { listRfqSubmissoes, getRfqSubmissao } from "@/lib/rfq.functions";
import { pickLabel } from "@/lib/rfq.shared";
import type { FormularioSchema, Idioma } from "@/lib/rfq.shared";

const searchSchema = z.object({
  submissao: fallback(z.string().uuid().optional(), undefined).default(undefined),
});

export const Route = createFileRoute("/_authenticated/comercial/checklists")({
  validateSearch: zodValidator(searchSchema),
  component: FormulariosRfqPage,
});

function FormulariosRfqPage() {
  const search = Route.useSearch();
  const [selected, setSelected] = useState<string | undefined>(search.submissao);
  const listQ = useQuery({
    queryKey: ["rfq-submissoes"],
    queryFn: () => listRfqSubmissoes({ data: { limit: 200 } }),
  });
  const detQ = useQuery({
    queryKey: ["rfq-sub", selected],
    queryFn: () => getRfqSubmissao({ data: { id: selected! } }),
    enabled: Boolean(selected),
  });

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Comercial", href: "/comercial/pipeline" },
          { label: "Checklists" },
        ]}
        title="Checklists"
        subtitle="Submissões recebidas dos formulários do time de vendas"
      />
      <ProcessoComercialGuia destaque="checklist" />

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <section className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Inbox className="mr-1 inline h-3.5 w-3.5" /> Inbox
          </div>
          {listQ.isError ? (
            <TableError
              description="Não foi possível carregar as submissões."
              onRetry={() => listQ.refetch()}
            />
          ) : listQ.isLoading ? (
            <TableLoading />
          ) : (listQ.data ?? []).length === 0 ? (
            <TableEmpty title="Nenhuma submissão ainda" />
          ) : (
            <ul className="divide-y divide-border">
              {(listQ.data ?? []).map((s: any) => (
                <li key={s.id}>
                  <button
                    onClick={() => setSelected(s.id)}
                    className={
                      "w-full px-4 py-2.5 text-left hover:bg-muted/50 " +
                      (selected === s.id ? "bg-muted/70" : "")
                    }
                  >
                    <div className="flex items-center gap-2 text-[13px] font-medium">
                      {s.rfq_formulario_tipo?.nome_pt ?? "—"}
                      {!s.lida_em && (
                        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                          NOVO
                        </span>
                      )}
                      <Badge variant="outline" className="text-[10px] uppercase">
                        {s.idioma}
                      </Badge>
                    </div>
                    <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                      {s.clientes?.razao_social ?? "—"} ·{" "}
                      {new Date(s.criado_em).toLocaleString("pt-BR")}
                    </div>
                    <div className="text-[11.5px] text-muted-foreground">
                      Por: {s.preenchido_por_nome ?? "—"} ({s.preenchido_por_email ?? "—"})
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-border bg-card">
          {!selected ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Selecione uma submissão para ver as respostas.
            </div>
          ) : detQ.isError ? (
            <TableError
              description="Não foi possível carregar esta submissão."
              onRetry={() => detQ.refetch()}
            />
          ) : detQ.isLoading || !detQ.data ? (
            <TableLoading />
          ) : (
            <SubmissaoDetalhe data={detQ.data} />
          )}
        </section>
      </div>
    </PageContainer>
  );
}

function SubmissaoDetalhe({
  data,
}: {
  data: {
    submissao: any;
    anexos: any[];
  };
}) {
  const s = data.submissao;
  const schema = (s.rfq_formulario_tipo?.campos_schema ?? { secoes: [] }) as FormularioSchema;
  const idioma = (s.idioma as Idioma) ?? "pt";
  const respostas = (s.respostas ?? {}) as Record<string, unknown>;
  const clienteCodigo = s.clientes?.codigo;

  return (
    <div className="p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 className="text-[15px] font-semibold">{s.rfq_formulario_tipo?.nome_pt ?? "—"}</h2>
          <div className="mt-1 text-[12px] text-muted-foreground">
            {s.clientes?.razao_social} ·{" "}
            <Link to="/clientes/$codigo" params={{ codigo: clienteCodigo }} className="underline">
              #{clienteCodigo}
            </Link>{" "}
            · {new Date(s.criado_em).toLocaleString("pt-BR")}
          </div>
          <div className="text-[12px] text-muted-foreground">
            Preenchido por {s.preenchido_por_nome ?? "—"} · {s.preenchido_por_email ?? "—"}
            {s.preenchido_por_telefone && ` · ${s.preenchido_por_telefone}`}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <GerarEtpDialog submissaoId={s.id} clienteId={s.cliente_id} />
          <Button asChild size="sm">
            <Link to="/comercial/orcamento/novo">
              Criar orçamento <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-5">
        {schema.secoes.map((sec) => (
          <section key={sec.id}>
            <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
              {pickLabel(sec.titulo, idioma)}
            </h3>
            <dl className="grid gap-2 md:grid-cols-2">
              {sec.campos.map((c) => {
                const v = respostas[c.id];
                let display: string;
                if (v === undefined || v === null || v === "") display = "—";
                else if (typeof v === "boolean") display = v ? "Sim" : "Não";
                else if (Array.isArray(v)) display = v.join(", ") || "—";
                else display = String(v);
                return (
                  <div key={c.id} className="rounded-md border border-border bg-muted/20 px-3 py-2">
                    <dt className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {pickLabel(c.label, idioma)}
                    </dt>
                    <dd className="mt-0.5 text-[13px] text-foreground">{display}</dd>
                  </div>
                );
              })}
            </dl>
          </section>
        ))}
      </div>

      {(data.anexos ?? []).length > 0 && (
        <section className="mt-5">
          <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
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
