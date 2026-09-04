import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  publicGetRelatorio,
  publicSetChecklistResposta,
  publicSetSatResposta,
  publicSubmitAssinatura,
  publicExportRelatorioPdf,
} from "@/lib/share-links.functions";
import { FAT_SECOES } from "@/lib/fat.functions";
import { CheckCircle2, XCircle, MinusCircle, ClipboardCheck, FileDown } from "lucide-react";

export const Route = createFileRoute("/p/relatorio/$tipo/$token")({
  ssr: false,
  component: PublicRelatorioPage,
});

type PublicData = Awaited<ReturnType<typeof publicGetRelatorio>>;

function PublicRelatorioPage() {
  const { tipo, token } = useParams({ from: "/p/relatorio/$tipo/$token" });
  const fetchFn = useServerFn(publicGetRelatorio);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-relatorio", tipo, token],
    queryFn: () => fetchFn({ data: { token } }),
    retry: false,
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["public-relatorio", tipo, token] });
  }

  if (isLoading) {
    return <CenteredMsg>Carregando relatório…</CenteredMsg>;
  }
  if (error || !data) {
    return <PublicLinkErrorState error={error as Error | null} />;
  }


  const r = data.relatorio as Record<string, unknown>;
  const codigo = (r.codigo as string) ?? "—";

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <ClipboardCheck className="h-4 w-4" />
            Preenchimento em campo
          </div>
          <h1 className="mt-1 text-2xl font-semibold">
            {data.tipo.toUpperCase()} · {codigo}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            {data.cliente ? (data.cliente as any).nome_fantasia || (data.cliente as any).razao_social : ""}
            {data.processo ? ` · ${(data.processo as any).codigo} ${(data.processo as any).titulo ?? ""}` : ""}
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Link válido até {new Date(data.exp * 1000).toLocaleString("pt-BR")}
          </p>
        </div>
        <ExportPdfButton token={token} />
      </header>

      {data.tipo === "fat"
        ? <FatPublicForm data={data} token={token} onChange={refresh} />
        : <SatPublicForm data={data} token={token} onChange={refresh} />}
    </div>
  );
}

function CenteredMsg({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center p-6 text-sm">{children}</div>;
}

type LinkErrorKind = "expired" | "revoked" | "notfound" | "invalid" | "tampered" | "mismatch" | "unknown";

function parseLinkError(error: Error | null): { kind: LinkErrorKind; message: string } {
  const raw = error?.message ?? "";
  const m = raw.match(/^\[(expired|revoked|notfound|invalid|tampered|mismatch)\]\s*(.*)$/);
  if (m) return { kind: m[1] as LinkErrorKind, message: m[2] || raw };
  return { kind: "unknown", message: raw || "Token inválido, revogado ou expirado." };
}

const LINK_ERROR_COPY: Record<LinkErrorKind, { title: string; hint: string; tone: "warn" | "danger" | "info" }> = {
  expired: {
    title: "Este link expirou",
    hint: "Peça ao responsável (engenharia ou gestão) para gerar um novo link de campo.",
    tone: "warn",
  },
  revoked: {
    title: "Link revogado",
    hint: "Este link foi desativado e não pode mais ser usado. Solicite um novo link ao responsável pelo relatório.",
    tone: "danger",
  },
  notfound: {
    title: "Relatório não encontrado",
    hint: "O relatório referenciado por este link não existe mais ou foi removido do sistema.",
    tone: "warn",
  },
  invalid: {
    title: "Link inválido",
    hint: "A URL parece estar incompleta ou foi alterada. Confirme se você abriu o link exato enviado pelo responsável.",
    tone: "danger",
  },
  tampered: {
    title: "Link com integridade comprometida",
    hint: "Detectamos que este link foi alterado depois de emitido. Por segurança, ele não é mais aceito.",
    tone: "danger",
  },
  mismatch: {
    title: "Link incompatível",
    hint: "Este link não corresponde ao tipo de relatório esperado. Solicite uma nova URL ao responsável.",
    tone: "danger",
  },
  unknown: {
    title: "Não foi possível abrir o link",
    hint: "Tente novamente em alguns instantes ou solicite um novo link ao responsável pelo relatório.",
    tone: "warn",
  },
};

function PublicLinkErrorState({ error }: { error: Error | null }) {
  const { kind, message } = parseLinkError(error);
  const copy = LINK_ERROR_COPY[kind];
  const toneClass =
    copy.tone === "danger"
      ? "border-rose-500/30 bg-rose-500/5 text-rose-700 dark:text-rose-300"
      : copy.tone === "info"
        ? "border-sky-500/30 bg-sky-500/5 text-sky-700 dark:text-sky-300"
        : "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300";
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-base)] p-6">
      <Card className={`w-full max-w-lg p-6 ${toneClass}`}>
        <div className="mb-4 flex items-center gap-3">
          <div
            aria-hidden
            className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-semibold ${
              copy.tone === "danger" ? "bg-rose-500/15" : "bg-amber-500/15"
            }`}
          >
            !
          </div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">{copy.title}</h1>
            <p className="text-xs uppercase tracking-wider opacity-70">Preenchimento em campo</p>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-[var(--text-primary)]">{copy.hint}</p>
        <p className="mt-3 rounded-md border border-[var(--bg-border)] bg-[var(--bg-surface)] p-3 text-xs text-[var(--text-muted)]">
          <span className="font-mono">{message}</span>
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
            Tentar novamente
          </Button>
          <a
            href="mailto:?subject=Solicitar%20novo%20link%20de%20relatório"
            className="text-xs text-[var(--text-muted)] underline-offset-4 hover:underline"
          >
            Solicitar novo link
          </a>
        </div>
      </Card>
    </div>
  );
}


function ExportPdfButton({ token }: { token: string }) {
  const exportFn = useServerFn(publicExportRelatorioPdf);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const res = await exportFn({ data: { token } });
      toast.success(`PDF gerado: ${res.codigo} v${res.versao}`);
      // abre PT por padrão; demais idiomas listados via toast adicional
      const pt = res.urls.pt || res.urls.es || res.urls.en;
      if (pt) window.open(pt, "_blank", "noopener");
      const outros = Object.entries(res.urls).filter(([k]) => k !== "pt");
      if (outros.length) {
        toast.message(`Também disponíveis: ${outros.map(([k]) => k.toUpperCase()).join(", ")}`, {
          description: outros.map(([k, u]) => `${k.toUpperCase()}: ${u}`).join("\n"),
        });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar PDF");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button onClick={run} disabled={loading} variant="outline" size="sm">
      <FileDown className="mr-1.5 h-4 w-4" />
      {loading ? "Gerando…" : "Exportar PDF"}
    </Button>
  );
}

/* ====================================================
 * FAT
 * ====================================================*/

function FatPublicForm({ data, token, onChange }: { data: PublicData; token: string; onChange: () => void }) {
  const r = data.relatorio as { progresso?: number; ok_count?: number; nok_count?: number; na_count?: number };
  const respMap = useMemo(() => {
    const m = new Map<string, { status: string; comentario: string | null }>();
    for (const x of data.respostas as Array<{ template_id: string; status: string; comentario: string | null }>) {
      m.set(x.template_id, { status: x.status, comentario: x.comentario });
    }
    return m;
  }, [data.respostas]);

  const grouped = useMemo(() => {
    const g = new Map<string, Array<{ id: string; titulo: string; descricao: string | null; secao: string }>>();
    for (const t of data.template as Array<{ id: string; titulo: string; descricao: string | null; secao: string }>) {
      const arr = g.get(t.secao) ?? [];
      arr.push(t);
      g.set(t.secao, arr);
    }
    return g;
  }, [data.template]);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium">Progresso</span>
          <span className="tabular-nums">{r.progresso ?? 0}%</span>
        </div>
        <Progress value={r.progresso ?? 0} />
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">OK: {r.ok_count ?? 0}</Badge>
          <Badge variant="outline">NOK: {r.nok_count ?? 0}</Badge>
          <Badge variant="outline">N/A: {r.na_count ?? 0}</Badge>
        </div>
      </Card>

      {FAT_SECOES.map((s) => {
        const itens = grouped.get(s.id) ?? [];
        if (itens.length === 0) return null;
        return (
          <Card key={s.id} className="p-4">
            <h2 className="mb-3 text-sm font-semibold">{s.label}</h2>
            <div className="space-y-3">
              {itens.map((it) => (
                <FatChecklistRow
                  key={it.id}
                  templateId={it.id}
                  titulo={it.titulo}
                  descricao={it.descricao}
                  current={respMap.get(it.id)}
                  token={token}
                  onSaved={onChange}
                />
              ))}
            </div>
          </Card>
        );
      })}

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold">Assinatura em campo</h2>
        <SignaturePad token={token} kind="fat" onSaved={onChange} />
      </Card>
    </div>
  );
}

function FatChecklistRow({
  templateId, titulo, descricao, current, token, onSaved,
}: {
  templateId: string; titulo: string; descricao: string | null;
  current?: { status: string; comentario: string | null };
  token: string; onSaved: () => void;
}) {
  const setResp = useServerFn(publicSetChecklistResposta);
  const [status, setStatus] = useState<string>(current?.status ?? "pendente");
  const [comentario, setComentario] = useState<string>(current?.comentario ?? "");
  const [saving, setSaving] = useState(false);

  async function save(next: "ok" | "nok" | "na", coment?: string) {
    setSaving(true);
    setStatus(next);
    try {
      await setResp({ data: { token, template_id: templateId, status: next, comentario: coment ?? comentario ?? null } });
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded border border-[var(--border)] p-3">
      <div className="mb-2">
        <p className="text-sm font-medium">{titulo}</p>
        {descricao && <p className="text-xs text-[var(--text-muted)]">{descricao}</p>}
      </div>
      <div className="mb-2 flex flex-wrap gap-2">
        <TriBtn val="ok" current={status} disabled={saving} onClick={() => save("ok")} Icon={CheckCircle2} color="bg-green-600 hover:bg-green-700">OK</TriBtn>
        <TriBtn val="nok" current={status} disabled={saving} onClick={() => save("nok")} Icon={XCircle} color="bg-red-600 hover:bg-red-700">NOK</TriBtn>
        <TriBtn val="na" current={status} disabled={saving} onClick={() => save("na")} Icon={MinusCircle} color="bg-zinc-500 hover:bg-zinc-600">N/A</TriBtn>
      </div>
      <Textarea
        placeholder="Observação (opcional)"
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        onBlur={() => {
          if (status === "ok" || status === "nok" || status === "na") {
            void save(status as "ok" | "nok" | "na", comentario);
          }
        }}
        rows={2}
      />
    </div>
  );
}

function TriBtn({
  val, current, onClick, Icon, color, disabled, children,
}: {
  val: string; current: string; onClick: () => void; Icon: typeof CheckCircle2; color: string;
  disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <Button
      type="button" size="sm"
      variant={current === val ? "default" : "outline"}
      onClick={onClick} disabled={disabled}
      className={current === val ? color : ""}
    >
      <Icon className="mr-1 h-4 w-4" /> {children}
    </Button>
  );
}

/* ====================================================
 * SAT
 * ====================================================*/

function SatPublicForm({ data, token, onChange }: { data: PublicData; token: string; onChange: () => void }) {
  type Sec = {
    id: string; ordem: number; titulo: string; descricao: string | null;
    sat_template_item: Array<{ id: string; secao_id: string; ordem: number; label: string; tipo: string; obrigatorio: boolean; opcoes: string[] | null; ajuda: string | null }>;
  };
  const secoes = (data.template as unknown as Sec[]) ?? [];
  const dados = (((data.relatorio as any).dados) as Record<string, any>) ?? {};

  return (
    <div className="space-y-4">
      {secoes.length === 0 && (
        <Alert>
          <AlertTitle>Nenhum template configurado</AlertTitle>
          <AlertDescription>O relatório SAT ainda não tem template vinculado.</AlertDescription>
        </Alert>
      )}
      {[...secoes].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)).map((s) => (
        <Card key={s.id} className="p-4">
          <h2 className="text-sm font-semibold">{s.titulo}</h2>
          {s.descricao && <p className="mb-3 text-xs text-[var(--text-muted)]">{s.descricao}</p>}
          <div className="space-y-3">
            {(s.sat_template_item ?? []).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)).map((it) => (
              <SatItemRow
                key={it.id}
                item={it}
                current={dados[it.id]}
                token={token}
                onSaved={onChange}
              />
            ))}
          </div>
        </Card>
      ))}

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold">Assinatura em campo</h2>
        <SignaturePad token={token} kind="sat" onSaved={onChange} />
      </Card>
    </div>
  );
}

function SatItemRow({
  item, current, token, onSaved,
}: {
  item: { id: string; label: string; tipo: string; obrigatorio: boolean; opcoes: string[] | null; ajuda: string | null };
  current: any; token: string; onSaved: () => void;
}) {
  const setResp = useServerFn(publicSetSatResposta);
  const [valor, setValor] = useState<any>(current?.valor ?? "");
  const [comentario, setComentario] = useState<string>(current?.comentario ?? "");
  const [saving, setSaving] = useState(false);

  async function persist(nextValor: any, nextComent?: string) {
    setSaving(true);
    try {
      await setResp({ data: { token, item_id: item.id, valor: nextValor ?? null, comentario: (nextComent ?? comentario) || null } });
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  const tipo = item.tipo;
  return (
    <div className="rounded border border-[var(--border)] p-3">
      <p className="text-sm font-medium">
        {item.label}{item.obrigatorio && <span className="text-red-500"> *</span>}
      </p>
      {item.ajuda && <p className="mb-2 text-xs text-[var(--text-muted)]">{item.ajuda}</p>}

      {tipo === "ok_nok_na" || tipo === "checklist" ? (
        <div className="mb-2 flex flex-wrap gap-2">
          <TriBtn val="ok" current={String(valor)} disabled={saving} onClick={() => { setValor("ok"); void persist("ok"); }} Icon={CheckCircle2} color="bg-green-600 hover:bg-green-700">OK</TriBtn>
          <TriBtn val="nok" current={String(valor)} disabled={saving} onClick={() => { setValor("nok"); void persist("nok"); }} Icon={XCircle} color="bg-red-600 hover:bg-red-700">NOK</TriBtn>
          <TriBtn val="na" current={String(valor)} disabled={saving} onClick={() => { setValor("na"); void persist("na"); }} Icon={MinusCircle} color="bg-zinc-500 hover:bg-zinc-600">N/A</TriBtn>
        </div>
      ) : tipo === "choice" || tipo === "select" ? (
        <select
          className="mb-2 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm"
          value={valor ?? ""}
          onChange={(e) => { setValor(e.target.value); void persist(e.target.value); }}
          disabled={saving}
        >
          <option value="">Selecione…</option>
          {(item.opcoes ?? []).map((op) => <option key={op} value={op}>{op}</option>)}
        </select>
      ) : tipo === "boolean" || tipo === "sim_nao" ? (
        <div className="mb-2 flex gap-2">
          <Button type="button" size="sm" variant={valor === true || valor === "sim" ? "default" : "outline"} onClick={() => { setValor("sim"); void persist("sim"); }} disabled={saving}>Sim</Button>
          <Button type="button" size="sm" variant={valor === false || valor === "nao" ? "default" : "outline"} onClick={() => { setValor("nao"); void persist("nao"); }} disabled={saving}>Não</Button>
        </div>
      ) : tipo === "number" || tipo === "numero" ? (
        <Input
          type="number" inputMode="decimal"
          value={valor ?? ""} onChange={(e) => setValor(e.target.value)}
          onBlur={() => void persist(valor === "" ? null : Number(valor))}
          className="mb-2"
        />
      ) : (
        <Input
          value={valor ?? ""} onChange={(e) => setValor(e.target.value)}
          onBlur={() => void persist(valor)}
          className="mb-2"
        />
      )}

      <Textarea
        placeholder="Observação (opcional)"
        value={comentario} onChange={(e) => setComentario(e.target.value)}
        onBlur={() => void persist(valor, comentario)}
        rows={2}
      />
    </div>
  );
}

/* ====================================================
 * Signature pad (shared)
 * ====================================================*/

function SignaturePad({ token, kind, onSaved }: { token: string; kind: "fat" | "sat"; onSaved: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const submit = useServerFn(publicSubmitAssinatura);
  const [nome, setNome] = useState("");
  const [cargo, setCargo] = useState("");
  const [papel, setPapel] = useState<"tecnico" | "cliente" | "inspetor" | "testemunha">(
    kind === "fat" ? "testemunha" : "tecnico",
  );
  const [saving, setSaving] = useState(false);

  function pos(e: RPointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!;
    const rect = c.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function start(e: RPointerEvent<HTMLCanvasElement>) {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
  }
  function move(e: RPointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = "#111"; ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.stroke();
  }
  function end() { drawing.current = false; }
  function limpar() {
    const c = canvasRef.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
  }
  async function salvar() {
    if (!nome.trim()) { toast.error("Informe o nome de quem assina"); return; }
    const c = canvasRef.current!;
    const blank = document.createElement("canvas");
    blank.width = c.width; blank.height = c.height;
    if (c.toDataURL() === blank.toDataURL()) {
      toast.error("Assine no campo antes de enviar"); return;
    }
    const dataUrl = c.toDataURL("image/png");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${c.width}" height="${c.height}"><image href="${dataUrl}" width="${c.width}" height="${c.height}"/></svg>`;
    setSaving(true);
    try {
      await submit({ data: { token, tipo: papel, nome, cargo: cargo || null, assinatura_svg: svg } });
      toast.success("Assinatura registrada");
      onSaved(); limpar(); setNome(""); setCargo("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao assinar");
    } finally { setSaving(false); }
  }

  const papelOpts: Array<{ value: "tecnico" | "cliente" | "inspetor" | "testemunha"; label: string }> =
    kind === "fat"
      ? [{ value: "inspetor", label: "Inspetor" }, { value: "testemunha", label: "Testemunha" }]
      : [{ value: "tecnico", label: "Técnico" }, { value: "cliente", label: "Cliente" }];

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor="sig-papel">Papel</Label>
          <select
            id="sig-papel"
            className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1.5 text-sm"
            value={papel}
            onChange={(e) => setPapel(e.target.value as typeof papel)}
          >
            {papelOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="sig-nome">Nome</Label>
          <Input id="sig-nome" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="sig-cargo">Cargo (opcional)</Label>
          <Input id="sig-cargo" value={cargo} onChange={(e) => setCargo(e.target.value)} />
        </div>
      </div>
      <div className="rounded border border-[var(--border)] bg-white">
        <canvas
          ref={canvasRef} width={600} height={180}
          className="block w-full touch-none"
          onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end}
        />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={limpar} type="button">Limpar</Button>
        <Button onClick={salvar} disabled={saving} type="button">
          {saving ? "Enviando…" : "Registrar assinatura"}
        </Button>
      </div>
    </div>
  );
}
