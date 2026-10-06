/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ChevronDown, Copy, Mail, ExternalLink, XCircle, QrCode } from "lucide-react";
import {
  getEntrevista,
  enviarEntrevistaPorEmail,
  expirarEntrevista,
} from "@/lib/entrevistas.functions";
import { shareMessage, type Idioma } from "@/lib/entrevistas-shared";
import { ENTREVISTA_STATUS_META } from "@/components/comercial/entrevistas/EntrevistasPanel";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/comercial/entrevistas/$id")({
  component: EntrevistaDetailPage,
  head: () => ({
    meta: [{ title: "Entrevista — Comercial | SLTK" }],
  }),
});

const IDIOMAS: Array<{ v: Idioma; label: string }> = [
  { v: "pt", label: "Português" },
  { v: "es", label: "Español" },
  { v: "en", label: "English" },
];

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
  const [lang, setLang] = useState<Idioma | null>(null);
  const [maisDetalhes, setMaisDetalhes] = useState(false);

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
      toast.success("Link expirado.");
      qc.invalidateQueries({ queryKey: ["entrevista", id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao expirar."),
  });

  if (q.isLoading)
    return (
      <PageContainer>
        <div className="text-sm text-muted-foreground">Carregando…</div>
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
  const idioma: Idioma = lang ?? ((e.idioma_default as Idioma) || "pt");
  const msg = shareMessage(e.codigo, idioma, link.replace(`/entrevista/${e.codigo}`, ""));
  const st = ENTREVISTA_STATUS_META[e.status] ?? ENTREVISTA_STATUS_META.pendente;
  const titulo = e.lead_empresa || e.lead_nome || e.segmento?.nome_pt || `#${e.codigo}`;

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Comercial" },
          { label: "Formulários", href: "/comercial/formularios" },
          { label: `#${e.codigo}` },
        ]}
        title={titulo}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={st.cls}>
              {st.label}
            </Badge>
            {e.status === "pendente" && (
              <Button variant="outline" size="sm" onClick={() => expirar.mutate()}>
                <XCircle className="mr-1.5 h-4 w-4" /> Expirar link
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Compartilhar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input readOnly value={link} className="font-mono text-xs" />
              <Button
                size="icon"
                variant="outline"
                title="Copiar link"
                onClick={() => {
                  navigator.clipboard.writeText(link);
                  toast.success("Link copiado.");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="outline" asChild title="Abrir">
                <a href={link} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
              <Button size="icon" variant="outline" asChild title="QR code">
                <a
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(link)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <QrCode className="h-4 w-4" />
                </a>
              </Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">Mensagem para colar</Label>
                <Select value={idioma} onValueChange={(v) => setLang(v as Idioma)}>
                  <SelectTrigger className="h-7 w-[130px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {IDIOMAS.map((i) => (
                      <SelectItem key={i.v} value={i.v}>
                        {i.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea readOnly value={msg} rows={3} className="text-xs" />
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => {
                  navigator.clipboard.writeText(msg);
                  toast.success("Mensagem copiada.");
                }}
              >
                <Copy className="mr-1 h-3.5 w-3.5" /> Copiar mensagem
              </Button>
            </div>

            {e.status === "pendente" && (
              <div className="flex gap-2 border-t pt-3">
                <Input
                  type="email"
                  placeholder="Enviar por e-mail: lead@empresa.com"
                  value={emailLead}
                  onChange={(ev) => setEmailLead(ev.target.value)}
                />
                <Button disabled={!emailLead || enviar.isPending} onClick={() => enviar.mutate()}>
                  <Mail className="mr-1.5 h-4 w-4" /> Enviar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Detalhes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Info label="Segmento" value={e.segmento?.nome_pt ?? "—"} />
            <Info label="Empresa" value={e.lead_empresa ?? "—"} />
            <Info label="Contato" value={e.lead_nome ?? "—"} />
            <Info
              label={e.respondida_em ? "Respondida em" : "Criada em"}
              value={new Date(e.respondida_em ?? e.created_at).toLocaleString("pt-BR")}
            />
            <button
              type="button"
              className="flex items-center gap-1 pt-1 text-[12px] text-muted-foreground hover:text-foreground"
              onClick={() => setMaisDetalhes((v) => !v)}
              aria-expanded={maisDetalhes}
            >
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", maisDetalhes && "rotate-180")}
              />
              Mais detalhes
            </button>
            {maisDetalhes && (
              <div className="space-y-2 border-t pt-2">
                <Info label="Código" value={<span className="font-mono">{e.codigo}</span>} />
                <Info label="E-mail do lead" value={e.lead_email ?? "—"} />
                <Info label="Criada por" value={e.criador?.full_name ?? e.criador?.email ?? "—"} />
                <Info label="Criada em" value={new Date(e.created_at).toLocaleString("pt-BR")} />
                <Info
                  label="Idioma padrão"
                  value={IDIOMAS.find((i) => i.v === e.idioma_default)?.label ?? "Português"}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {e.status === "respondida" && (
        <Card className="mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Respostas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(e.respostas as any[]).length === 0 && (
              <div className="text-sm text-muted-foreground">Sem respostas registradas.</div>
            )}
            {(e.respostas as any[]).map((r) => (
              <div key={r.pergunta_id} className="rounded-md border p-3">
                <div className="mb-1 text-[11px] text-muted-foreground">Pergunta {r.numero}</div>
                <div className="mb-2 font-medium">{r.enunciado}</div>
                {r.valor_options &&
                  Array.isArray(r.valor_options) &&
                  r.valor_options.length > 0 && (
                    <ul className="list-disc space-y-0.5 pl-5 text-sm">
                      {r.valor_options.map((o: string, i: number) => (
                        <li key={i}>{o}</li>
                      ))}
                    </ul>
                  )}
                {r.valor_text && <div className="whitespace-pre-wrap text-sm">{r.valor_text}</div>}
                {r.descricao_extra && (
                  <div className="mt-2 whitespace-pre-wrap border-l-2 border-primary/40 pl-3 text-sm text-muted-foreground">
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

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-right">{value}</div>
    </div>
  );
}
