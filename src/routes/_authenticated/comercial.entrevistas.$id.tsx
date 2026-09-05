/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Copy, Mail, ExternalLink, XCircle, ArrowLeft, QrCode } from "lucide-react";
import {
  getEntrevista,
  enviarEntrevistaPorEmail,
  expirarEntrevista,
} from "@/lib/entrevistas.functions";
import { shareMessage } from "@/lib/entrevistas-shared";

export const Route = createFileRoute("/_authenticated/comercial/entrevistas/$id")({
  component: EntrevistaDetailPage,
  head: () => ({
    meta: [{ title: "Entrevista — Comercial | SLTK" }],
  }),
});

function EntrevistaDetailPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const getFn = useServerFn(getEntrevista);
  const enviarFn = useServerFn(enviarEntrevistaPorEmail);
  const expirarFn = useServerFn(expirarEntrevista);

  const q = useQuery({
    queryKey: ["entrevista", id],
    queryFn: () => getFn({ data: { id } }),
  });

  const [emailLead, setEmailLead] = useState("");

  const enviar = useMutation({
    mutationFn: () => enviarFn({ data: { id, email: emailLead } }),
    onSuccess: () => {
      toast.success("E-mail enviado.");
      setEmailLead("");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao enviar."),
  });

  const expirar = useMutation({
    mutationFn: () => expirarFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Entrevista expirada.");
      qc.invalidateQueries({ queryKey: ["entrevista", id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao expirar."),
  });

  if (q.isLoading)
    return (
      <PageContainer>
        <div>Carregando…</div>
      </PageContainer>
    );
  if (q.isError || !q.data)
    return (
      <PageContainer>
        <div className="text-destructive">Entrevista não encontrada.</div>
      </PageContainer>
    );

  const e = q.data as any;
  const link = e.link_publico as string;

  return (
    <PageContainer>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          to="/comercial/entrevistas"
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar para entrevistas
        </Link>
      </div>

      <PageHeader
        breadcrumbs={[
          { label: "Comercial", href: "/comercial/pipeline" },
          { label: "Entrevistas", href: "/comercial/entrevistas" },
          { label: `#${e.codigo}` },
        ]}
        title={`Entrevista #${e.codigo}`}
        subtitle={`${e.segmento?.nome_pt ?? ""} · criada em ${new Date(e.created_at).toLocaleString("pt-BR")}`}
        actions={
          <div className="flex gap-2">
            <StatusBadge status={e.status} />
            {e.status === "pendente" && (
              <Button variant="outline" size="sm" onClick={() => expirar.mutate()}>
                <XCircle className="h-4 w-4 mr-1.5" /> Expirar link
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Compartilhar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">Link público</Label>
              <div className="flex gap-2">
                <Input readOnly value={link} className="font-mono text-sm" />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(link);
                    toast.success("Link copiado.");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" asChild>
                  <a href={link} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
                <Button size="icon" variant="outline" asChild>
                  <a
                    href={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <QrCode className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Mensagem pronta para colar</Label>
              <div className="flex gap-2 flex-wrap">
                {(["pt", "es", "en"] as const).map((lang) => (
                  <ShareCopyButton
                    key={lang}
                    lang={lang}
                    text={shareMessage(e.codigo, lang, link.replace(`/entrevista/${e.codigo}`, ""))}
                  />
                ))}
              </div>
            </div>

            {e.status === "pendente" && (
              <div className="pt-3 border-t space-y-2">
                <Label className="text-xs">Enviar por e-mail ao lead</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="lead@empresa.com"
                    value={emailLead}
                    onChange={(ev) => setEmailLead(ev.target.value)}
                  />
                  <Button disabled={!emailLead || enviar.isPending} onClick={() => enviar.mutate()}>
                    <Mail className="h-4 w-4 mr-1.5" /> Enviar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalhes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Info label="Código" value={<span className="font-mono">{e.codigo}</span>} />
            <Info label="Segmento" value={e.segmento?.nome_pt ?? "—"} />
            <Info label="Pilar (criador)" value={e.criador?.full_name ?? e.criador?.email ?? "—"} />
            <Info label="Lead" value={e.lead_nome ?? "—"} />
            <Info label="E-mail do lead" value={e.lead_email ?? "—"} />
            <Info label="Empresa" value={e.lead_empresa ?? "—"} />
            <Info label="Idioma padrão" value={idiomaLabel(e.idioma_default)} />
            {e.respondida_em && (
              <Info
                label="Respondida em"
                value={new Date(e.respondida_em).toLocaleString("pt-BR")}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {e.status === "respondida" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Respostas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(e.respostas as any[]).length === 0 && (
              <div className="text-sm text-muted-foreground">Sem respostas registradas.</div>
            )}
            {(e.respostas as any[]).map((r) => (
              <div key={r.pergunta_id} className="border rounded-md p-3">
                <div className="text-xs text-muted-foreground mb-1">Pergunta {r.numero}</div>
                <div className="font-medium mb-2">{r.enunciado}</div>
                {r.valor_options &&
                  Array.isArray(r.valor_options) &&
                  r.valor_options.length > 0 && (
                    <ul className="list-disc pl-5 text-sm space-y-0.5">
                      {r.valor_options.map((o: string, i: number) => (
                        <li key={i}>{o}</li>
                      ))}
                    </ul>
                  )}
                {r.valor_text && <div className="text-sm whitespace-pre-wrap">{r.valor_text}</div>}
                {r.descricao_extra && (
                  <div className="mt-2 border-l-2 border-primary/40 pl-3 text-sm text-muted-foreground whitespace-pre-wrap">
                    {r.descricao_extra}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pendente: { label: "Pendente", cls: "bg-amber-100 text-amber-900 border-amber-200" },
    respondida: { label: "Respondida", cls: "bg-emerald-100 text-emerald-900 border-emerald-200" },
    expirada: {
      label: "Expirada",
      cls: "bg-[var(--badge-neutral-bg)] text-[var(--badge-neutral-fg)] border-[var(--badge-neutral-border)]",
    },
  };
  const s = map[status] ?? map.pendente;
  return (
    <Badge variant="outline" className={s.cls}>
      {s.label}
    </Badge>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="text-muted-foreground text-xs uppercase tracking-wide">{label}</div>
      <div className="text-right">{value}</div>
    </div>
  );
}

function idiomaLabel(l: string) {
  return l === "es" ? "🇪🇸 Español" : l === "en" ? "🇺🇸 English" : "🇧🇷 Português";
}

function ShareCopyButton({ lang, text }: { lang: "pt" | "es" | "en"; text: string }) {
  const label = lang === "pt" ? "🇧🇷 PT" : lang === "es" ? "🇪🇸 ES" : "🇺🇸 EN";
  return (
    <div className="flex-1 min-w-0">
      <Textarea readOnly value={text} className="text-xs h-20" />
      <Button
        size="sm"
        variant="outline"
        className="mt-1 w-full"
        onClick={() => {
          navigator.clipboard.writeText(text);
          toast.success(`${label} copiado`);
        }}
      >
        <Copy className="h-3.5 w-3.5 mr-1" /> Copiar {label}
      </Button>
    </div>
  );
}
