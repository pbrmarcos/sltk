import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createCotacao,
  listFornecedoresParaCotacao,
  listInsumosAprovados,
  listInsumosParaRFQ,
} from "@/lib/cotacoes.functions";
import { INCOTERMS, MOEDAS } from "@/lib/cotacoes.shared";

const searchSchema = z.object({
  insumo_id: z.string().uuid().optional(),
  insumo_ids: z.string().optional(),
  projeto_id: z.string().uuid().optional(),
  origem: z.enum(["manual", "bom"]).optional(),
});

export const Route = createFileRoute("/_authenticated/compras/cotacoes/nova")({
  component: NovaCotacaoPage,
  validateSearch: (s) => searchSchema.parse(s),
});

function NovaCotacaoPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const insumosFn = useServerFn(listInsumosAprovados);
  const insumosByIdsFn = useServerFn(listInsumosParaRFQ);
  const fornsFn = useServerFn(listFornecedoresParaCotacao);
  const createFn = useServerFn(createCotacao);

  const preIds = useMemo(() => {
    const list: string[] = [];
    if (search.insumo_id) list.push(search.insumo_id);
    if (search.insumo_ids) {
      for (const s of search.insumo_ids.split(",")) {
        const t = s.trim();
        if (t && !list.includes(t)) list.push(t);
      }
    }
    return list;
  }, [search.insumo_id, search.insumo_ids]);
  const fromBom = search.origem === "bom" || preIds.length > 1;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [insumoSel, setInsumoSel] = useState<Set<string>>(() => new Set(preIds));
  const [fornSel, setFornSel] = useState<Set<string>>(new Set());

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prazo, setPrazo] = useState("");
  const [incoterm, setIncoterm] = useState<string>("");
  const [moeda, setMoeda] = useState<string>("BRL");
  const [condPag, setCondPag] = useState("30 dias após NF");
  const [obs, setObs] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Se veio da BOM, carrega os insumos pelos IDs (independente do status).
  // Caso contrário, usa a lista de aprovados padrão.
  const insumosQ = useQuery({
    queryKey: fromBom ? ["cotacoes", "insumos-bom", preIds] : ["cotacoes", "insumos-aprovados"],
    queryFn: () => (fromBom ? insumosByIdsFn({ data: { ids: preIds } }) : insumosFn()),
  });

  useEffect(() => {
    if (titulo || !insumosQ.data) return;
    const arr = insumosQ.data as Array<{ id: string; descricao: string }>;
    if (fromBom && preIds.length > 1) {
      setTitulo(`Checklist — ${preIds.length} itens da B.O.M.`);
    } else if (preIds.length === 1) {
      const it = arr.find((i) => i.id === preIds[0]);
      if (it) setTitulo(`Checklist — ${it.descricao}`);
    }
  }, [fromBom, preIds, insumosQ.data, titulo]);

  const categoriasSel = useMemo(() => {
    const set = new Set<string>();
    for (const i of insumosQ.data ?? []) {
      const slug = (i as { categoria_slug: string | null }).categoria_slug;
      if (slug && insumoSel.has((i as { id: string }).id)) set.add(slug);
    }
    return Array.from(set);
  }, [insumosQ.data, insumoSel]);

  const fornsQ = useQuery({
    queryKey: ["cotacoes", "forns", categoriasSel],
    queryFn: () => fornsFn({ data: { categoria_slugs: categoriasSel } }),
    enabled: step >= 3,
  });

  async function submit(abrir: boolean) {
    if (!titulo.trim()) {
      toast.error("Informe o título da cotação");
      return;
    }
    if (insumoSel.size === 0) {
      toast.error("Selecione ao menos um insumo");
      return;
    }
    setEnviando(true);
    try {
      const res = await createFn({
        data: {
          titulo: titulo.trim(),
          descricao: descricao || null,
          prazo_resposta: prazo || null,
          incoterm: incoterm || null,
          moeda,
          condicoes_pagamento: condPag || null,
          observacoes: obs || null,
          insumo_ids: Array.from(insumoSel),
          fornecedor_ids: Array.from(fornSel),
          abrir,
          origem: fromBom ? "bom" : "manual",
          projeto_id: search.projeto_id ?? null,
        },
      });
      toast.success(`Cotação ${res.codigo} criada`);
      navigate({ to: "/compras/cotacoes/$id", params: { id: res.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao criar cotação");
    } finally {
      setEnviando(false);
    }
  }

  async function submitPorCategoria() {
    if (!titulo.trim()) {
      toast.error("Informe o título da cotação");
      return;
    }
    // Agrupa selecionados por categoria_slug
    const groups = new Map<string, string[]>();
    for (const i of insumosQ.data ?? []) {
      const it = i as { id: string; categoria_slug: string | null };
      if (!insumoSel.has(it.id)) continue;
      const key = it.categoria_slug ?? "sem_categoria";
      const arr = groups.get(key) ?? [];
      arr.push(it.id);
      groups.set(key, arr);
    }
    if (groups.size < 2) {
      toast.info("Só uma categoria selecionada — use 'Criar checklist' normal.");
      return;
    }
    setEnviando(true);
    let ok = 0;
    try {
      for (const [slug, ids] of groups) {
        const suffix = slug === "sem_categoria" ? "sem categoria" : slug;
        await createFn({
          data: {
            titulo: `${titulo.trim()} — ${suffix}`,
            descricao: descricao || null,
            prazo_resposta: prazo || null,
            incoterm: incoterm || null,
            moeda,
            condicoes_pagamento: condPag || null,
            observacoes: obs || null,
            insumo_ids: ids,
            fornecedor_ids: [],
            abrir: false,
            origem: fromBom ? "bom" : "manual",
            projeto_id: search.projeto_id ?? null,
          },
        });
        ok += 1;
      }
      toast.success(`${ok} checklists criados (uma por categoria).`);
      navigate({ to: "/compras/cotacoes" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao dividir por categoria");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Compras" },
          { label: "Cotações", href: "/compras/cotacoes" },
          { label: "Nova" },
        ]}
        title="Nova cotação (Checklist)"
        subtitle={`Passo ${step} de 3`}
      />

      <div className="mt-4 rounded-md border bg-[var(--bg-surface)] p-6">
        {step === 1 && (
          <div className="space-y-3">
            <h3 className="text-base font-semibold">
              {fromBom
                ? "1. Itens da B.O.M. pré-selecionados"
                : "1. Selecione os insumos aprovados"}
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
              {insumoSel.size} item(ns) selecionado(s) de {insumosQ.data?.length ?? 0}
              {fromBom ? " itens da B.O.M." : " aprovados"}.
              {categoriasSel.length > 1 && (
                <span className="ml-1 text-amber-700">
                  · {categoriasSel.length} categorias distintas — considere{" "}
                  <button
                    type="button"
                    className="underline"
                    onClick={submitPorCategoria}
                    disabled={enviando}
                  >
                    dividir em {categoriasSel.length} Checklists
                  </button>
                  .
                </span>
              )}
            </p>
            <div className="max-h-[500px] overflow-auto rounded border">
              {(insumosQ.data ?? []).length === 0 ? (
                <div className="p-6 text-sm text-[var(--text-muted)]">
                  Nenhum insumo aprovado disponível. Aprove insumos na aba de um projeto antes de
                  criar o checklist.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[var(--bg-elevated)]">
                    <tr className="text-left text-xs text-[var(--text-secondary)]">
                      <th className="p-2 w-10" />
                      <th className="p-2">Descrição</th>
                      <th className="p-2">Projeto</th>
                      <th className="p-2">Qtde</th>
                      <th className="p-2">Crítico</th>
                      <th className="p-2">Necessidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(insumosQ.data ?? []).map((i) => {
                      const it = i as {
                        id: string;
                        descricao: string;
                        part_number: string | null;
                        quantidade: number;
                        unidade: string;
                        criticidade: string;
                        necessidade_em: string | null;
                        equipamento_projetos?: {
                          cliente_equipamentos?: { codigo: string; modelo: string } | null;
                        } | null;
                      };
                      const checked = insumoSel.has(it.id);
                      return (
                        <tr key={it.id} className="border-t hover:bg-[var(--bg-elevated)]">
                          <td className="p-2">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => {
                                const next = new Set(insumoSel);
                                if (v) next.add(it.id);
                                else next.delete(it.id);
                                setInsumoSel(next);
                              }}
                            />
                          </td>
                          <td className="p-2">
                            <div className="font-medium">{it.descricao}</div>
                            {it.part_number && (
                              <div className="text-xs text-[var(--text-muted)]">
                                PN: {it.part_number}
                              </div>
                            )}
                          </td>
                          <td className="p-2 text-xs text-[var(--text-secondary)]">
                            {it.equipamento_projetos?.cliente_equipamentos?.codigo ?? "—"}
                          </td>
                          <td className="p-2">
                            {it.quantidade} {it.unidade}
                          </td>
                          <td className="p-2">
                            {(it.criticidade === "alta" || it.criticidade === "critica") && (
                              <Badge
                                variant="outline"
                                className="border-rose-200 bg-rose-50 text-rose-700"
                              >
                                {it.criticidade}
                              </Badge>
                            )}
                          </td>
                          <td className="p-2 text-xs">
                            {it.necessidade_em
                              ? new Date(it.necessidade_em).toLocaleDateString("pt-BR")
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setStep(2)} disabled={insumoSel.size === 0}>
                Próximo →
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold">2. Dados gerais</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label>Título *</Label>
                <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
              </div>
              <div>
                <Label>Prazo de resposta</Label>
                <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
              </div>
              <div>
                <Label>Incoterm</Label>
                <Select value={incoterm} onValueChange={setIncoterm}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {INCOTERMS.map((i) => (
                      <SelectItem key={i} value={i}>
                        {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Moeda</Label>
                <Select value={moeda} onValueChange={setMoeda}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOEDAS.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Condições de pagamento</Label>
                <Input value={condPag} onChange={(e) => setCondPag(e.target.value)} />
              </div>
              <div className="md:col-span-2">
                <Label>Descrição</Label>
                <Textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Observações</Label>
                <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} />
              </div>
            </div>
            <div className="flex justify-between gap-2">
              <Button variant="ghost" onClick={() => setStep(1)}>
                ← Voltar
              </Button>
              <Button onClick={() => setStep(3)} disabled={!titulo.trim()}>
                Próximo →
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <h3 className="text-base font-semibold">3. Fornecedores convidados</h3>
            <p className="text-sm text-[var(--text-muted)]">
              {fornSel.size} fornecedor(es) selecionado(s).
              {categoriasSel.length > 0
                ? ` Filtrando por ${categoriasSel.length} categoria(s) dos insumos selecionados.`
                : ""}
            </p>
            <div className="max-h-[400px] overflow-auto rounded border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[var(--bg-elevated)]">
                  <tr className="text-left text-xs text-[var(--text-secondary)]">
                    <th className="p-2 w-10" />
                    <th className="p-2">Código</th>
                    <th className="p-2">Fornecedor</th>
                    <th className="p-2">País</th>
                    <th className="p-2">E-mail</th>
                  </tr>
                </thead>
                <tbody>
                  {(fornsQ.data ?? []).map((f) => {
                    const it = f as {
                      id: string;
                      codigo: string;
                      nome_fantasia: string;
                      razao_social: string;
                      pais: string;
                      email_geral: string | null;
                    };
                    const checked = fornSel.has(it.id);
                    return (
                      <tr key={it.id} className="border-t hover:bg-[var(--bg-elevated)]">
                        <td className="p-2">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              const next = new Set(fornSel);
                              if (v) next.add(it.id);
                              else next.delete(it.id);
                              setFornSel(next);
                            }}
                          />
                        </td>
                        <td className="p-2 font-mono text-xs">{it.codigo}</td>
                        <td className="p-2 font-medium">{it.nome_fantasia || it.razao_social}</td>
                        <td className="p-2">{it.pais}</td>
                        <td className="p-2 text-xs">{it.email_geral ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between gap-2">
              <Button variant="ghost" onClick={() => setStep(2)}>
                ← Voltar
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" disabled={enviando} onClick={() => submit(false)}>
                  Salvar como rascunho
                </Button>
                <Button disabled={enviando} onClick={() => submit(true)}>
                  Criar e abrir Checklist
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
