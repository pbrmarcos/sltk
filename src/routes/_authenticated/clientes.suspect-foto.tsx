import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Camera,
  Images,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  UserPlus,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCameraCaptureInputs } from "@/hooks/useCameraCaptureInputs";
import { compressImage } from "@/lib/image-resize";
import { paisesQueryOptions } from "@/lib/clientes.queries";
import {
  scanSuspectFoto,
  createSuspectRapido,
  type SuspectExtracted,
} from "@/lib/suspects.functions";
import type { QualifyResult } from "@/lib/lead-qualify.server";

export const Route = createFileRoute("/_authenticated/clientes/suspect-foto")({
  component: SuspectFotoPage,
});

type Fase = "inicio" | "analisando" | "revisao";

function GradeBadge({ grade }: { grade: "A" | "B" | "C" }) {
  const cls =
    grade === "A"
      ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
      : grade === "B"
        ? "bg-amber-500/15 text-amber-600 border-amber-500/30"
        : "bg-slate-500/15 text-slate-500 border-slate-500/30";
  return (
    <span
      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border text-xl font-black ${cls}`}
    >
      {grade}
    </span>
  );
}

function SuspectFotoPage() {
  const navigate = useNavigate();
  const scanFn = useServerFn(scanSuspectFoto);
  const createFn = useServerFn(createSuspectRapido);

  const [fase, setFase] = React.useState<Fase>("inicio");
  const [previews, setPreviews] = React.useState<string[]>([]);
  const [scanError, setScanError] = React.useState<string | null>(null);
  const [qualify, setQualify] = React.useState<QualifyResult | null>(null);
  const [qualifyError, setQualifyError] = React.useState<string | null>(null);
  const [candidatos, setCandidatos] = React.useState<
    Array<{ id: string; razao_social: string; codigo: string }>
  >([]);

  const [empresa, setEmpresa] = React.useState("");
  const [pais, setPais] = React.useState("BR");
  const [cidade, setCidade] = React.useState("");
  const [site, setSite] = React.useState("");
  const [documento, setDocumento] = React.useState("");
  const [contatoNome, setContatoNome] = React.useState("");
  const [contatoCargo, setContatoCargo] = React.useState("");
  const [contatoEmail, setContatoEmail] = React.useState("");
  const [contatoTelefone, setContatoTelefone] = React.useState("");
  const [observacoes, setObservacoes] = React.useState("");

  const paises = useQuery(paisesQueryOptions());

  function aplicarExtracao(e: SuspectExtracted, q: QualifyResult | null) {
    setEmpresa(e.empresa ?? "");
    setPais((e.pais_iso2 ?? "BR").toUpperCase());
    setCidade(e.cidade ?? "");
    setSite(e.site ?? "");
    setDocumento(q?.dados.documento_verificado ?? e.documento_fiscal ?? "");
    setContatoNome(e.nome ?? (e.empresa ? `Contato ${e.empresa}` : ""));
    setContatoCargo(e.cargo ?? "");
    setContatoEmail(e.email ?? q?.dados.email ?? "");
    setContatoTelefone(e.telefone ?? q?.dados.telefone ?? "");
    setObservacoes(
      [e.produto_descricao ? `Produto: ${e.produto_descricao}` : null, e.observacoes]
        .filter(Boolean)
        .join("\n"),
    );
  }

  const handleFiles = React.useCallback(
    async (fileList: FileList) => {
      const selecionados = Array.from(fileList).slice(0, 3);
      if (!selecionados.length) return;
      setFase("analisando");
      setScanError(null);
      setQualify(null);
      setQualifyError(null);
      try {
        const imagens = await Promise.all(selecionados.map((f) => compressImage(f)));
        setPreviews(imagens.map((i) => `data:${i.mime};base64,${i.base64}`));
        const r = await scanFn({ data: { imagens } });
        if (!r.ok) {
          setScanError(r.error);
          setFase("inicio");
          return;
        }
        aplicarExtracao(r.extracted, r.qualify);
        setQualify(r.qualify);
        setQualifyError(r.qualifyError);
        setFase("revisao");
      } catch (e) {
        setScanError(e instanceof Error ? e.message : "Falha ao processar as imagens.");
        setFase("inicio");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scanFn],
  );

  const { renderInputs, openGaleria, openCamera, isTouch } = useCameraCaptureInputs(handleFiles, {
    multiple: true,
    accept: "image/*",
  });

  const criar = useMutation({
    mutationFn: (confirmar: boolean) =>
      createFn({
        data: {
          empresa: empresa.trim(),
          pais,
          cidade: cidade.trim() || null,
          site: site.trim() || null,
          documento_fiscal: documento.trim() || null,
          contato_nome: contatoNome.trim(),
          contato_cargo: contatoCargo.trim() || null,
          contato_email: contatoEmail.trim() || "",
          contato_telefone: contatoTelefone.trim() || null,
          observacoes: observacoes.trim() || null,
          grade: qualify?.grade ?? null,
          analise_motivo: qualify?.motivo ?? null,
          confirmar_duplicata: confirmar,
        },
      }),
    onSuccess: (r) => {
      if (!r.ok && r.needsConfirm) {
        setCandidatos(r.candidatos);
        return;
      }
      if (r.ok) {
        toast.success(`Suspect ${r.cliente.codigo} criado e enviado ao pipeline.`);
        void navigate({ to: "/clientes/$codigo", params: { codigo: r.cliente.codigo } });
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const jaCliente = qualify?.ja_cliente ?? null;

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: "Clientes", href: "/clientes" }, { label: "Suspect por foto" }]}
        title="Suspect por foto"
        subtitle="Fotografe um cartão de visita ou o rótulo de um produto — a IA extrai, qualifica e cria o lead."
      />
      {renderInputs()}

      {fase === "inicio" && (
        <div className="mx-auto mt-6 w-full max-w-md space-y-4">
          {scanError && (
            <div className="flex items-start gap-2 rounded-lg border border-[var(--danger)]/40 bg-[var(--danger)]/5 p-3 text-sm text-[var(--danger)]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {scanError}
            </div>
          )}
          {isTouch && (
            <button
              onClick={openCamera}
              className="flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[var(--primary)]/40 bg-[var(--primary)]/5 p-10 transition hover:bg-[var(--primary)]/10"
            >
              <Camera className="h-12 w-12 text-[var(--primary)]" />
              <span className="text-base font-semibold text-[var(--text-primary)]">Tirar foto</span>
              <span className="text-xs text-[var(--text-muted)]">
                Cartão de visita ou rótulo do produto
              </span>
            </button>
          )}
          <button
            onClick={openGaleria}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-elevated)]"
          >
            <Images className="h-5 w-5 text-[var(--text-muted)]" />
            Escolher da galeria (até 3 imagens)
          </button>
          <p className="text-center text-xs text-[var(--text-muted)]">
            A IA extrai os dados, lê o site, verifica o CNPJ na Receita e dá a nota A/B/C conforme
            os{" "}
            <Link to="/admin/prospeccao" className="underline underline-offset-2">
              critérios de prospecção
            </Link>
            .
          </p>
        </div>
      )}

      {fase === "analisando" && (
        <div className="mx-auto mt-10 flex w-full max-w-md flex-col items-center gap-4">
          {previews.length > 0 && (
            <div className="flex gap-2">
              {previews.map((p, i) => (
                <img
                  key={i}
                  src={p}
                  alt=""
                  className="h-24 w-24 rounded-lg border border-[var(--bg-border)] object-cover"
                />
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--primary)]" />
            Analisando: extração → site → Receita → qualificação…
          </div>
          <p className="text-xs text-[var(--text-muted)]">Isso pode levar até 1 minuto.</p>
        </div>
      )}

      {fase === "revisao" && (
        <div className="mx-auto mt-4 w-full max-w-xl space-y-4 pb-10">
          <div className="flex items-start gap-3 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4">
            {qualify ? (
              <>
                <GradeBadge grade={qualify.grade} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    <Sparkles className="mr-1 inline h-3.5 w-3.5 text-[var(--primary)]" />
                    Qualificação da IA
                  </p>
                  <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{qualify.motivo}</p>
                  {qualify.abordagem_sugerida && (
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      <strong>Abordagem:</strong> {qualify.abordagem_sugerida}
                    </p>
                  )}
                  {qualify.dados.documento_verificado && (
                    <p className="mt-1 text-xs text-emerald-600">
                      <CheckCircle2 className="mr-1 inline h-3 w-3" />
                      CNPJ {qualify.dados.documento_verificado} verificado na Receita
                    </p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">
                <AlertTriangle className="mr-1 inline h-4 w-4 text-[var(--warning)]" />
                Qualificação indisponível{qualifyError ? ` — ${qualifyError}` : ""}. Você ainda pode
                criar o suspect.
              </p>
            )}
          </div>

          {jaCliente && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              Esta empresa já parece ser cliente: <strong>{jaCliente.nome}</strong>. Confira antes
              de criar um duplicado.
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 rounded-xl border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="sf-empresa">Empresa *</Label>
              <Input id="sf-empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sf-pais">País</Label>
              <select
                id="sf-pais"
                value={pais}
                onChange={(e) => setPais(e.target.value)}
                className="h-10 w-full rounded-md border border-[var(--bg-border)] bg-[var(--bg-base)] px-2 text-sm"
              >
                {(paises.data ?? []).map((p: { codigo: string; nome: string }) => (
                  <option key={p.codigo} value={p.codigo}>
                    {p.nome}
                  </option>
                ))}
                {!paises.data?.length && <option value="BR">Brasil</option>}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="sf-cidade">Cidade</Label>
              <Input id="sf-cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sf-doc">Documento fiscal (CNPJ…)</Label>
              <Input
                id="sf-doc"
                value={documento}
                onChange={(e) => setDocumento(e.target.value)}
                placeholder="opcional — suspect não exige"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sf-site">Site</Label>
              <Input id="sf-site" value={site} onChange={(e) => setSite(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sf-nome">Contato *</Label>
              <Input
                id="sf-nome"
                value={contatoNome}
                onChange={(e) => setContatoNome(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sf-cargo">Cargo</Label>
              <Input
                id="sf-cargo"
                value={contatoCargo}
                onChange={(e) => setContatoCargo(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sf-email">E-mail</Label>
              <Input
                id="sf-email"
                type="email"
                value={contatoEmail}
                onChange={(e) => setContatoEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sf-tel">Telefone / WhatsApp</Label>
              <Input
                id="sf-tel"
                value={contatoTelefone}
                onChange={(e) => setContatoTelefone(e.target.value)}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="sf-obs">Observações</Label>
              <Textarea
                id="sf-obs"
                rows={3}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </div>
          </div>

          {candidatos.length > 0 && (
            <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              <p className="font-medium">Já existem clientes parecidos:</p>
              <ul className="ml-4 list-disc">
                {candidatos.map((c) => (
                  <li key={c.id}>
                    {c.razao_social} ({c.codigo})
                  </li>
                ))}
              </ul>
              <Button size="sm" variant="outline" onClick={() => criar.mutate(true)}>
                Criar mesmo assim
              </Button>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              className="h-11 flex-1 sm:flex-none sm:px-8"
              disabled={
                criar.isPending || empresa.trim().length < 2 || contatoNome.trim().length < 1
              }
              onClick={() => criar.mutate(false)}
            >
              {criar.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="mr-2 h-4 w-4" />
              )}
              Criar suspect
            </Button>
            <Button
              variant="outline"
              className="h-11"
              onClick={() => {
                setFase("inicio");
                setPreviews([]);
                setCandidatos([]);
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Nova foto
            </Button>
          </div>

          {previews.length > 0 && (
            <div className="flex gap-2">
              {previews.map((p, i) => (
                <img
                  key={i}
                  src={p}
                  alt=""
                  className="h-16 w-16 rounded-md border border-[var(--bg-border)] object-cover"
                />
              ))}
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
