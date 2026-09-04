import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useRef, useState, type ReactNode, type PointerEvent as RPointerEvent } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  getFat,
  updateFatIdentificacao,
  setChecklistResposta,
  upsertMedicao,
  deleteMedicao,
  upsertRnc,
  submitAssinatura,
  removeAssinatura,
  homologarFat,
  getFatFotoSignedUrl,
  FAT_STATUS_LABEL,
  FAT_SECOES,
  MOTIVOS_VIAGEM,
} from "@/lib/fat.functions";
import { generateFatDocument } from "@/lib/docs/docs.functions";
import { ShareLinkDialog } from "@/components/share/ShareLinkDialog";
import { ShareLinksManager } from "@/components/share/ShareLinksManager";
import { FileText, Share2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/qualidade/fat/$id")({
  component: FatDetailPage,
});

type FatData = Awaited<ReturnType<typeof getFat>>;

function FatDetailPage() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const fetchFn = useServerFn(getFat);
  const homologar = useServerFn(homologarFat);
  const genDoc = useServerFn(generateFatDocument);
  const [homologating, setHomologating] = useState(false);
  const [generatingDoc, setGeneratingDoc] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  async function gerarDocumento() {
    setGeneratingDoc(true);
    try {
      const res = await genDoc({ data: { fat_id: id } });
      toast.success(`Documento gerado: ${res.codigo} v${res.versao}`);
      nav({ to: "/documentos/$id", params: { id: res.documento_id } });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao gerar documento");
    } finally {
      setGeneratingDoc(false);
    }
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ["fat", "detail", id],
    queryFn: () => fetchFn({ data: { id } }),
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["fat", "detail", id] });
  }

  const blockers = useMemo(() => computeBlockers(data), [data]);

  async function doHomologar() {
    if (blockers.length > 0) {
      toast.error("Existem pendências para homologar");
      return;
    }
    setHomologating(true);
    try {
      await homologar({ data: { id } });
      toast.success("FAT homologado");
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao homologar");
    } finally {
      setHomologating(false);
    }
  }

  if (isLoading) {
    return (
      <PageContainer>
        <div className="p-8 text-center text-sm text-[var(--text-muted)]">Carregando FAT…</div>
      </PageContainer>
    );
  }
  if (error || !data) {
    return (
      <PageContainer>
        <Alert variant="destructive">
          <AlertTitle>Não foi possível carregar o FAT</AlertTitle>
          <AlertDescription>{(error as Error)?.message ?? "FAT não encontrado."}</AlertDescription>
        </Alert>
      </PageContainer>
    );
  }

  const fat = data.fat as any;
  const isHomologado = fat.status === "homologado";

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Qualidade" },
          { label: "FAT", href: "/qualidade/fat" },
          { label: fat.codigo ?? "—" },
        ]}
        title={fat.codigo ?? "FAT"}
        subtitle={`${data.cliente?.nome_fantasia || data.cliente?.razao_social || "—"} · ${data.processo?.codigo ?? ""} ${data.processo?.titulo ?? ""}`}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => setShareOpen(true)}
              title="Gera um link assinado para o técnico em campo preencher pelo tablet/celular"
            >
              <Share2 className="mr-1.5 h-4 w-4" />
              Link de campo
            </Button>
            <Button
              variant="outline"
              onClick={gerarDocumento}
              disabled={generatingDoc}
              title="Gera PDFs PT/ES/EN e abre a ficha do documento (versão, aprovação, Drive, assinatura)"
            >
              <FileText className="mr-1.5 h-4 w-4" />
              {generatingDoc ? "Gerando…" : "Gerar documento (PT/ES/EN)"}
            </Button>
            <Button
              onClick={doHomologar}
              disabled={homologating || isHomologado || blockers.length > 0}
              title={blockers.length ? "Resolva as pendências abaixo" : ""}
            >
              {isHomologado ? "Homologado" : homologating ? "Homologando…" : "Homologar"}
            </Button>
            <Button variant="outline" onClick={() => nav({ to: "/qualidade/fat" })}>
              Voltar
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Progresso do checklist</span>
            <span className="text-sm tabular-nums">{fat.progresso ?? 0}%</span>
          </div>
          <Progress value={fat.progresso ?? 0} />
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary">{FAT_STATUS_LABEL[fat.status] ?? fat.status}</Badge>
            <Badge variant="outline">OK: {fat.ok_count ?? 0}</Badge>
            <Badge variant="outline">NOK: {fat.nok_count ?? 0}</Badge>
            <Badge variant="outline">N/A: {fat.na_count ?? 0}</Badge>
            <Badge variant="outline">RNCs abertas: {data.rncs.filter((r: any) => r.status === "aberta" || r.status === "em_tratativa").length}</Badge>
            <Badge variant="outline">Assinaturas: {data.assinaturas.length}/2</Badge>
          </div>
        </Card>
      </div>

      {blockers.length > 0 && !isHomologado && (
        <Alert className="mb-4" variant="destructive">
          <AlertTitle>Pendências para homologação</AlertTitle>
          <AlertDescription>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {blockers.map((b) => (
                <li key={b.code}>
                  <strong>{b.step}:</strong> {b.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      {isHomologado && (
        <Alert className="mb-4">
          <AlertTitle>FAT homologado</AlertTitle>
          <AlertDescription>
            Homologado em {fat.homologado_em ? new Date(fat.homologado_em).toLocaleString("pt-BR") : "—"}.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="identificacao">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="identificacao">Identificação</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="medicoes">Medições</TabsTrigger>
          <TabsTrigger value="rnc">RNCs</TabsTrigger>
          <TabsTrigger value="assinaturas">Assinaturas</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="identificacao">
          <IdentificacaoCard fat={fat} disabled={isHomologado} onSaved={refresh} />
        </TabsContent>
        <TabsContent value="checklist">
          <ChecklistCard data={data} disabled={isHomologado} onSaved={refresh} />
        </TabsContent>
        <TabsContent value="medicoes">
          <MedicoesCard data={data} disabled={isHomologado} onSaved={refresh} />
        </TabsContent>
        <TabsContent value="rnc">
          <RncCard data={data} disabled={isHomologado} onSaved={refresh} />
        </TabsContent>
        <TabsContent value="assinaturas">
          <AssinaturasCard data={data} disabled={isHomologado} onSaved={refresh} />
        </TabsContent>
        <TabsContent value="historico">
          <div className="space-y-4">
            <ShareLinksManager tipo="fat" relatorioId={id} relatorioCodigo={fat.codigo} />
            <HistoricoCard fatId={id} />
          </div>
        </TabsContent>
      </Tabs>

      <ShareLinkDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        tipo="fat"
        relatorioId={id}
        relatorioCodigo={fat.codigo}
      />
    </PageContainer>
  );
}

// ====================== Blockers ======================
type Blocker = { code: string; step: string; message: string };
function computeBlockers(data: FatData | undefined): Blocker[] {
  if (!data) return [];
  const out: Blocker[] = [];
  const fat = data.fat as any;
  if (!fat.tag_equipamento || !fat.data_ensaio) {
    out.push({ code: "ident", step: "Identificação", message: "Preencha TAG do equipamento e data do ensaio." });
  }
  if ((fat.progresso ?? 0) < 100) {
    out.push({ code: "checklist", step: "Checklist", message: `Faltam itens para responder (${fat.progresso ?? 0}% concluído).` });
  }
  const nokSemFoto = (data.respostas as any[]).filter((r) => {
    if (r.status !== "nok") return false;
    const tpl = (data.template as any[]).find((t) => t.id === r.template_id);
    return tpl?.requer_foto_nok && !r.foto_path;
  });
  if (nokSemFoto.length > 0) {
    out.push({ code: "foto", step: "Checklist", message: `${nokSemFoto.length} item(ns) NOK exigem foto de evidência.` });
  }
  const rncAbertas = (data.rncs as any[]).filter((r) => r.status === "aberta" || r.status === "em_tratativa");
  if (rncAbertas.length > 0) {
    out.push({ code: "rnc", step: "RNCs", message: `${rncAbertas.length} RNC(s) em aberto. Feche ou cancele antes de homologar.` });
  }
  const tipos = new Set((data.assinaturas as any[]).map((a) => a.tipo));
  if (!tipos.has("inspetor")) out.push({ code: "ass-insp", step: "Assinaturas", message: "Assinatura do inspetor pendente." });
  if (!tipos.has("testemunha")) out.push({ code: "ass-test", step: "Assinaturas", message: "Assinatura da testemunha pendente." });
  return out;
}

// ====================== Identificação ======================
function IdentificacaoCard({ fat, disabled, onSaved }: { fat: any; disabled: boolean; onSaved: () => void }) {
  const update = useServerFn(updateFatIdentificacao);
  const [form, setForm] = useState<any>({
    os_codigo: fat.os_codigo ?? "",
    tag_equipamento: fat.tag_equipamento ?? "",
    data_ensaio: fat.data_ensaio ?? "",
    hora_inicio: fat.hora_inicio ?? "",
    testemunha_nome: fat.testemunha_nome ?? "",
    local_ensaio: fat.local_ensaio ?? "",
    temperatura_c: fat.temperatura_c ?? "",
    umidade_rel: fat.umidade_rel ?? "",
    tensao_alimentacao: fat.tensao_alimentacao ?? "",
    motivos_viagem: fat.motivos_viagem ?? [],
    tecnicos: fat.tecnicos ?? "",
    observacoes_gerais: fat.observacoes_gerais ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await update({
        data: {
          id: fat.id,
          patch: {
            ...form,
            temperatura_c: form.temperatura_c === "" ? null : Number(form.temperatura_c),
            umidade_rel: form.umidade_rel === "" ? null : Number(form.umidade_rel),
            data_ensaio: form.data_ensaio || null,
            hora_inicio: form.hora_inicio || null,
          },
        },
      });
      toast.success("Identificação salva");
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  function toggleMotivo(m: string) {
    setForm((f: any) => ({
      ...f,
      motivos_viagem: f.motivos_viagem.includes(m)
        ? f.motivos_viagem.filter((x: string) => x !== m)
        : [...f.motivos_viagem, m],
    }));
  }

  return (
    <Card className="p-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="OS"><Input value={form.os_codigo} onChange={(e) => setForm({ ...form, os_codigo: e.target.value })} disabled={disabled} /></Field>
        <Field label="TAG do equipamento *"><Input value={form.tag_equipamento} onChange={(e) => setForm({ ...form, tag_equipamento: e.target.value })} disabled={disabled} /></Field>
        <Field label="Local do ensaio"><Input value={form.local_ensaio} onChange={(e) => setForm({ ...form, local_ensaio: e.target.value })} disabled={disabled} /></Field>
        <Field label="Data *"><Input type="date" value={form.data_ensaio} onChange={(e) => setForm({ ...form, data_ensaio: e.target.value })} disabled={disabled} /></Field>
        <Field label="Hora início"><Input type="time" value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} disabled={disabled} /></Field>
        <Field label="Testemunha (cliente)"><Input value={form.testemunha_nome} onChange={(e) => setForm({ ...form, testemunha_nome: e.target.value })} disabled={disabled} /></Field>
        <Field label="Temperatura (°C)"><Input type="number" step="0.1" value={form.temperatura_c} onChange={(e) => setForm({ ...form, temperatura_c: e.target.value })} disabled={disabled} /></Field>
        <Field label="Umidade (%)"><Input type="number" step="0.1" value={form.umidade_rel} onChange={(e) => setForm({ ...form, umidade_rel: e.target.value })} disabled={disabled} /></Field>
        <Field label="Tensão alimentação"><Input value={form.tensao_alimentacao} onChange={(e) => setForm({ ...form, tensao_alimentacao: e.target.value })} disabled={disabled} /></Field>
        <Field label="Técnicos"><Input value={form.tecnicos} onChange={(e) => setForm({ ...form, tecnicos: e.target.value })} disabled={disabled} /></Field>
      </div>
      <div className="mt-4">
        <div className="mb-2 text-sm font-medium">Motivos da viagem</div>
        <div className="flex flex-wrap gap-2">
          {MOTIVOS_VIAGEM.map((m) => (
            <button
              key={m}
              type="button"
              disabled={disabled}
              onClick={() => toggleMotivo(m)}
              className={`rounded-full border px-3 py-1 text-xs transition ${form.motivos_viagem.includes(m) ? "border-[var(--accent)] bg-[var(--accent)] text-white" : "border-[var(--bg-border)] bg-[var(--bg-surface)]"}`}
            >
              {m.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4">
        <Field label="Observações gerais">
          <Textarea rows={4} value={form.observacoes_gerais} onChange={(e) => setForm({ ...form, observacoes_gerais: e.target.value })} disabled={disabled} />
        </Field>
      </div>
      <div className="mt-4 flex justify-end">
        <Button onClick={save} disabled={disabled || saving}>{saving ? "Salvando…" : "Salvar identificação"}</Button>
      </div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[var(--text-muted)]">{label}</span>
      {children}
    </label>
  );
}

// ====================== Checklist ======================
function ChecklistCard({ data, disabled, onSaved }: { data: FatData; disabled: boolean; onSaved: () => void }) {
  const setResp = useServerFn(setChecklistResposta);
  const fat = data.fat as any;
  const respMap = useMemo(() => {
    const m = new Map<string, any>();
    (data.respostas as any[]).forEach((r) => m.set(r.template_id, r));
    return m;
  }, [data.respostas]);

  async function update(templateId: string, patch: any) {
    const existing = respMap.get(templateId) ?? {};
    try {
      await setResp({
        data: {
          fat_id: fat.id,
          template_id: templateId,
          status: patch.status ?? existing.status ?? "pendente",
          comentario: patch.comentario ?? existing.comentario ?? null,
          foto_path: patch.foto_path ?? existing.foto_path ?? null,
        },
      });
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar resposta");
    }
  }

  async function uploadFoto(file: File, templateId: string) {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${fat.id}/${templateId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("fat-evidencias").upload(path, file, { upsert: true });
    if (error) {
      toast.error(error.message);
      return;
    }
    await update(templateId, { foto_path: path });
    toast.success("Foto enviada");
  }

  const grouped = useMemo(() => {
    const g = new Map<string, any[]>();
    (data.template as any[]).forEach((t) => {
      if (!g.has(t.secao)) g.set(t.secao, []);
      g.get(t.secao)!.push(t);
    });
    return g;
  }, [data.template]);

  return (
    <div className="space-y-4">
      {FAT_SECOES.map((s) => {
        const items = grouped.get(s.id) ?? [];
        if (!items.length) return null;
        return (
          <Card key={s.id} className="p-4">
            <h3 className="mb-3 text-sm font-semibold">{s.label}</h3>
            <ul className="space-y-3">
              {items.map((t) => {
                const r = respMap.get(t.id);
                const status = r?.status ?? "pendente";
                return (
                  <li key={t.id} className="rounded border border-[var(--bg-border)] p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium">{t.titulo}</div>
                        {t.descricao && <div className="text-xs text-[var(--text-muted)]">{t.descricao}</div>}
                      </div>
                      <div className="flex gap-1">
                        {(["ok", "nok", "na"] as const).map((k) => (
                          <button
                            key={k}
                            type="button"
                            disabled={disabled}
                            onClick={() => update(t.id, { status: k })}
                            className={`rounded border px-2.5 py-1 text-xs font-medium uppercase ${
                              status === k
                                ? k === "ok"
                                  ? "border-green-600 bg-green-600 text-white"
                                  : k === "nok"
                                    ? "border-red-600 bg-red-600 text-white"
                                    : "border-gray-500 bg-gray-500 text-white"
                                : "border-[var(--bg-border)] bg-[var(--bg-surface)]"
                            }`}
                          >
                            {k}
                          </button>
                        ))}
                      </div>
                    </div>
                    {(status === "nok" || r?.comentario) && (
                      <Textarea
                        className="mt-2"
                        rows={2}
                        placeholder="Comentário"
                        defaultValue={r?.comentario ?? ""}
                        disabled={disabled}
                        onBlur={(e) => {
                          if ((e.target.value ?? "") !== (r?.comentario ?? "")) update(t.id, { comentario: e.target.value });
                        }}
                      />
                    )}
                    {status === "nok" && t.requer_foto_nok && (
                      <div className="mt-2 flex items-center gap-3 text-xs">
                        {r?.foto_path ? (
                          <FotoPreview path={r.foto_path} />
                        ) : (
                          <span className="text-red-600">Foto obrigatória</span>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          disabled={disabled}
                          onChange={(e) => e.target.files?.[0] && uploadFoto(e.target.files[0], t.id)}
                        />
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}

function FotoPreview({ path }: { path: string }) {
  const sign = useServerFn(getFatFotoSignedUrl);
  const { data } = useQuery({ queryKey: ["fat-foto", path], queryFn: () => sign({ data: { path } }) });
  if (!data?.url) return <span className="text-[var(--text-muted)]">Carregando…</span>;
  return <a href={data.url} target="_blank" rel="noreferrer" className="underline">Ver foto</a>;
}

// ====================== Medições ======================
function MedicoesCard({ data, disabled, onSaved }: { data: FatData; disabled: boolean; onSaved: () => void }) {
  const upsert = useServerFn(upsertMedicao);
  const del = useServerFn(deleteMedicao);
  const fat = data.fat as any;
  const [novo, setNovo] = useState({ parametro: "", unidade: "", nominal: "", tolerancia: "", medido: "" });

  async function addRow() {
    if (!novo.parametro) return;
    try {
      await upsert({
        data: {
          fat_id: fat.id,
          ordem: (data.medicoes as any[]).length,
          parametro: novo.parametro,
          unidade: novo.unidade || null,
          nominal: novo.nominal === "" ? null : Number(novo.nominal),
          tolerancia: novo.tolerancia || null,
          medido: novo.medido === "" ? null : Number(novo.medido),
        },
      });
      setNovo({ parametro: "", unidade: "", nominal: "", tolerancia: "", medido: "" });
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro");
    }
  }
  async function removeRow(id: string) {
    try {
      await del({ data: { id } });
      onSaved();
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  }

  return (
    <Card className="p-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-[var(--text-muted)]">
            <tr>
              <th className="p-2">Parâmetro</th>
              <th className="p-2">Unidade</th>
              <th className="p-2">Nominal</th>
              <th className="p-2">Tolerância</th>
              <th className="p-2">Medido</th>
              <th className="p-2">Status</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {(data.medicoes as any[]).map((m) => (
              <tr key={m.id} className="border-t border-[var(--bg-border)]">
                <td className="p-2">{m.parametro}</td>
                <td className="p-2">{m.unidade ?? "—"}</td>
                <td className="p-2 tabular-nums">{m.nominal ?? "—"}</td>
                <td className="p-2">{m.tolerancia ?? "—"}</td>
                <td className="p-2 tabular-nums">{m.medido ?? "—"}</td>
                <td className="p-2">
                  {m.status_auto ? (
                    <Badge variant={m.status_auto === "Aprovado" ? "default" : "destructive"}>{m.status_auto}</Badge>
                  ) : "—"}
                </td>
                <td className="p-2 text-right">
                  <Button size="sm" variant="ghost" disabled={disabled} onClick={() => removeRow(m.id)}>Remover</Button>
                </td>
              </tr>
            ))}
            {!disabled && (
              <tr className="border-t border-[var(--bg-border)] bg-[var(--bg-elevated)]">
                <td className="p-2"><Input value={novo.parametro} onChange={(e) => setNovo({ ...novo, parametro: e.target.value })} placeholder="Ex: Velocidade" /></td>
                <td className="p-2"><Input value={novo.unidade} onChange={(e) => setNovo({ ...novo, unidade: e.target.value })} placeholder="ppm" /></td>
                <td className="p-2"><Input type="number" value={novo.nominal} onChange={(e) => setNovo({ ...novo, nominal: e.target.value })} /></td>
                <td className="p-2"><Input value={novo.tolerancia} onChange={(e) => setNovo({ ...novo, tolerancia: e.target.value })} placeholder="±5%" /></td>
                <td className="p-2"><Input type="number" value={novo.medido} onChange={(e) => setNovo({ ...novo, medido: e.target.value })} /></td>
                <td className="p-2">—</td>
                <td className="p-2 text-right"><Button size="sm" onClick={addRow}>Adicionar</Button></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ====================== RNC ======================
function RncCard({ data, disabled, onSaved }: { data: FatData; disabled: boolean; onSaved: () => void }) {
  const upsert = useServerFn(upsertRnc);
  const fat = data.fat as any;

  async function patch(rnc: any, p: any) {
    try {
      await upsert({
        data: {
          id: rnc.id,
          fat_id: fat.id,
          titulo: rnc.titulo,
          descricao: rnc.descricao,
          plano_acao: rnc.plano_acao,
          status: rnc.status,
          ...p,
        },
      });
      onSaved();
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  }

  async function novaRnc() {
    try {
      await upsert({
        data: { fat_id: fat.id, titulo: "Nova não conformidade", status: "aberta" },
      });
      onSaved();
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Não conformidades</h3>
        <Button size="sm" onClick={novaRnc} disabled={disabled}>Adicionar RNC</Button>
      </div>
      {!(data.rncs as any[]).length ? (
        <div className="rounded border border-dashed border-[var(--bg-border)] p-6 text-center text-sm text-[var(--text-muted)]">
          Nenhuma RNC registrada.
        </div>
      ) : (
        <ul className="space-y-3">
          {(data.rncs as any[]).map((r) => (
            <li key={r.id} className="rounded border border-[var(--bg-border)] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs">{r.codigo ?? "—"}</span>
                <select
                  value={r.status}
                  onChange={(e) => patch(r, { status: e.target.value })}
                  disabled={disabled}
                  className="h-8 rounded border border-[var(--bg-border)] bg-[var(--bg-surface)] px-2 text-xs"
                >
                  <option value="aberta">Aberta</option>
                  <option value="em_tratativa">Em tratativa</option>
                  <option value="fechada">Fechada</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
              <Input
                className="mt-2"
                defaultValue={r.titulo}
                disabled={disabled}
                onBlur={(e) => e.target.value !== r.titulo && patch(r, { titulo: e.target.value })}
              />
              <Textarea
                className="mt-2"
                rows={2}
                placeholder="Descrição"
                defaultValue={r.descricao ?? ""}
                disabled={disabled}
                onBlur={(e) => (e.target.value ?? "") !== (r.descricao ?? "") && patch(r, { descricao: e.target.value })}
              />
              <Textarea
                className="mt-2"
                rows={2}
                placeholder="Plano de ação"
                defaultValue={r.plano_acao ?? ""}
                disabled={disabled}
                onBlur={(e) => (e.target.value ?? "") !== (r.plano_acao ?? "") && patch(r, { plano_acao: e.target.value })}
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ====================== Assinaturas ======================
function AssinaturasCard({ data, disabled, onSaved }: { data: FatData; disabled: boolean; onSaved: () => void }) {
  const fat = data.fat as any;
  const byTipo: Record<string, any> = {};
  (data.assinaturas as any[]).forEach((a) => (byTipo[a.tipo] = a));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <AssinaturaBox tipo="inspetor" label="Inspetor (Solutek)" fatId={fat.id} disabled={disabled} existing={byTipo.inspetor} onSaved={onSaved} />
      <AssinaturaBox tipo="testemunha" label="Testemunha (Cliente)" fatId={fat.id} disabled={disabled} existing={byTipo.testemunha} onSaved={onSaved} />
    </div>
  );
}

function AssinaturaBox({
  tipo, label, fatId, disabled, existing, onSaved,
}: {
  tipo: "inspetor" | "testemunha"; label: string; fatId: string; disabled: boolean; existing?: any; onSaved: () => void;
}) {
  const submit = useServerFn(submitAssinatura);
  const remove = useServerFn(removeAssinatura);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [nome, setNome] = useState(existing?.nome ?? "");
  const [cargo, setCargo] = useState(existing?.cargo ?? "");
  const drawing = useRef(false);

  function start(e: RPointerEvent) {
    if (disabled || existing) return;
    drawing.current = true;
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    const rect = c.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  }
  function move(e: RPointerEvent) {
    if (!drawing.current) return;
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    const rect = c.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#111";
    ctx.lineCap = "round";
    ctx.stroke();
  }
  function end() { drawing.current = false; }
  function clear() {
    const c = canvasRef.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
  }
  async function save() {
    if (!nome.trim()) { toast.error("Informe o nome"); return; }
    const c = canvasRef.current!;
    const dataUrl = c.toDataURL("image/png");
    // detect empty canvas
    const ctx = c.getContext("2d")!;
    const pixels = ctx.getImageData(0, 0, c.width, c.height).data;
    let hasInk = false;
    for (let i = 3; i < pixels.length; i += 4) { if (pixels[i] !== 0) { hasInk = true; break; } }
    if (!hasInk) { toast.error("Assine no quadro"); return; }
    try {
      await submit({ data: { fat_id: fatId, tipo, nome, cargo: cargo || null, assinatura_svg: dataUrl } });
      toast.success("Assinatura registrada");
      onSaved();
    } catch (e: any) { toast.error(e?.message ?? "Erro"); }
  }
  async function reset() {
    try { await remove({ data: { fat_id: fatId, tipo } }); onSaved(); }
    catch (e: any) { toast.error(e?.message ?? "Erro"); }
  }

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{label}</h3>
        {existing && <Badge>Assinado</Badge>}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Input placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} disabled={disabled || !!existing} />
        <Input placeholder="Cargo" value={cargo} onChange={(e) => setCargo(e.target.value)} disabled={disabled || !!existing} />
      </div>
      {existing ? (
        <div className="mt-3">
          <img src={existing.assinatura_svg} alt="assinatura" className="max-h-32 rounded border border-[var(--bg-border)] bg-white" />
          <div className="mt-1 text-xs text-[var(--text-muted)]">
            Assinado em {existing.assinado_em ? new Date(existing.assinado_em).toLocaleString("pt-BR") : "—"} · hash {existing.hash_sha256?.slice(0, 12)}…
          </div>
          <div className="mt-2">
            <Button size="sm" variant="outline" onClick={reset} disabled={disabled}>Refazer</Button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <canvas
            ref={canvasRef}
            width={500}
            height={140}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
            className="w-full touch-none rounded border border-[var(--bg-border)] bg-white"
          />
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={save} disabled={disabled}>Salvar assinatura</Button>
            <Button size="sm" variant="outline" onClick={clear} disabled={disabled}>Limpar</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

// ====================== Histórico ======================
function HistoricoCard({ fatId }: { fatId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["fat", "audit", fatId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_log")
        .select("id, action, field_changed, old_value, new_value, created_at, user_id")
        .eq("table_name", "fat_relatorios")
        .eq("record_id", fatId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
  if (isLoading) return <Card className="p-4 text-sm text-[var(--text-muted)]">Carregando histórico…</Card>;
  if (!data?.length) return <Card className="p-4 text-sm text-[var(--text-muted)]">Sem eventos registrados.</Card>;
  return (
    <Card className="p-4">
      <ul className="divide-y divide-[var(--bg-border)] text-sm">
        {data.map((e: any) => (
          <li key={e.id} className="py-2">
            <div className="flex items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
              <span>{new Date(e.created_at).toLocaleString("pt-BR")}</span>
              <span className="uppercase">{e.action}</span>
            </div>
            {e.field_changed && (
              <div className="text-sm">
                <strong>{e.field_changed}</strong>: <span className="text-[var(--text-muted)]">{JSON.stringify(e.old_value)}</span> → {JSON.stringify(e.new_value)}
              </div>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}