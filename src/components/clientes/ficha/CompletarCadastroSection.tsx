import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ComboboxAdd } from "@/components/ui/combobox-add";
import { FormCollapsibleSection } from "@/components/form/FormCollapsibleSection";
import { FormField } from "@/components/form/FormField";
import { FormGrid } from "@/components/form/FormGrid";
import { updateCliente } from "@/lib/clientes.functions";
import { leadOrigensQueryOptions, segmentosQueryOptions } from "@/lib/cadastros.queries";
import { createSegmento } from "@/lib/segmentos.functions";
import { createLeadOrigem } from "@/lib/lead-origens.functions";
import { MATRIZ_FILIAL, REGIMES_TRIBUTARIOS } from "@/lib/clientes.shared";
import type { ClienteRow } from "./ficha-utils";

type Campo = { key: keyof ClienteRow; label: string; tipo?: "text" | "number" | "date" };

type Secao = {
  id: string;
  titulo: string;
  campos: Campo[];
  /** Só aparece para clientes do Brasil. */
  soBR?: boolean;
};

const SECOES: Secao[] = [
  {
    id: "contato",
    titulo: "Contato da empresa",
    campos: [
      { key: "email_corporativo", label: "E-mail" },
      { key: "telefone_corporativo_ddi", label: "DDI" },
      { key: "telefone_corporativo_numero", label: "Telefone" },
      { key: "site", label: "Site" },
    ],
  },
  {
    id: "endereco",
    titulo: "Endereço",
    campos: [
      { key: "endereco_logradouro", label: "Logradouro" },
      { key: "endereco_numero", label: "Número" },
      { key: "endereco_complemento", label: "Complemento" },
      { key: "endereco_bairro", label: "Bairro" },
      { key: "endereco_cidade", label: "Cidade" },
      { key: "endereco_estado", label: "Estado / UF" },
      { key: "endereco_codigo_postal", label: "CEP" },
    ],
  },
  {
    id: "fiscal",
    titulo: "Dados fiscais",
    soBR: true,
    campos: [
      { key: "inscricao_estadual", label: "Inscrição estadual" },
      { key: "cnae_principal", label: "CNAE principal" },
      { key: "natureza_juridica_descricao", label: "Natureza jurídica" },
      { key: "porte", label: "Porte" },
      { key: "data_abertura", label: "Abertura", tipo: "date" },
      { key: "capital_social", label: "Capital social (R$)", tipo: "number" },
      { key: "situacao_cadastral", label: "Situação cadastral" },
    ],
  },
  {
    id: "redes",
    titulo: "Redes sociais",
    campos: [
      { key: "social_linkedin", label: "LinkedIn" },
      { key: "social_instagram", label: "Instagram" },
      { key: "social_facebook", label: "Facebook" },
      { key: "social_whatsapp", label: "WhatsApp" },
    ],
  },
];

function str(v: unknown) {
  return v == null ? "" : String(v);
}

/**
 * "Completar cadastro": seções recolhidas com contador "2/7", cada uma com o
 * próprio Salvar. Só grava o que mudou (`updateCliente` aceita patch parcial).
 */
export function CompletarCadastroSection({
  cliente,
  abrirPrimeira,
}: {
  cliente: ClienteRow;
  abrirPrimeira?: boolean;
}) {
  const isBR = cliente.pais === "BR";
  const secoes = SECOES.filter((s) => !s.soBR || isBR);
  return (
    <div className="space-y-2">
      <SecaoComercial cliente={cliente} defaultOpen={!!abrirPrimeira} />
      {secoes.map((s) => (
        <SecaoCampos key={s.id} secao={s} cliente={cliente} />
      ))}
    </div>
  );
}

function useSalvar(clienteId: string) {
  const qc = useQueryClient();
  const fn = useServerFn(updateCliente);
  return useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      fn({ data: { id: clienteId, patch: patch as never } }),
    onSuccess: () => {
      toast.success("Cadastro atualizado.");
      qc.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao salvar."),
  });
}

function SecaoCampos({ secao, cliente }: { secao: Secao; cliente: ClienteRow }) {
  const inicial = useMemo(
    () => Object.fromEntries(secao.campos.map((c) => [c.key, str(cliente[c.key])])),
    [secao, cliente],
  );
  const [form, setForm] = useState<Record<string, string>>(inicial);
  useEffect(() => setForm(inicial), [inicial]);
  const salvar = useSalvar(cliente.id);

  const preenchidos = secao.campos.filter((c) => str(cliente[c.key]).trim()).length;
  const mudou = secao.campos.some((c) => (form[c.key] ?? "") !== inicial[c.key]);

  function onSalvar() {
    const patch: Record<string, unknown> = {};
    for (const c of secao.campos) {
      const v = (form[c.key] ?? "").trim();
      if (v === inicial[c.key]) continue;
      if (c.tipo === "number") patch[c.key] = v ? Number(v) : null;
      else patch[c.key] = v || null;
    }
    salvar.mutate(patch);
  }

  return (
    <FormCollapsibleSection title={secao.titulo} count={`${preenchidos}/${secao.campos.length}`}>
      <FormGrid cols={3}>
        {secao.campos.map((c) => (
          <FormField key={c.key} label={c.label} htmlFor={`cc-${secao.id}-${c.key}`}>
            <Input
              id={`cc-${secao.id}-${c.key}`}
              type={c.tipo === "date" ? "date" : c.tipo === "number" ? "number" : "text"}
              value={form[c.key] ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, [c.key]: e.target.value }))}
            />
          </FormField>
        ))}
      </FormGrid>
      <div className="mt-3 flex justify-end">
        <Button size="sm" disabled={!mudou || salvar.isPending} onClick={onSalvar}>
          {salvar.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
          Salvar
        </Button>
      </div>
    </FormCollapsibleSection>
  );
}

function SecaoComercial({ cliente, defaultOpen }: { cliente: ClienteRow; defaultOpen: boolean }) {
  const qc = useQueryClient();
  const segmentos = useQuery(segmentosQueryOptions());
  const origens = useQuery(leadOrigensQueryOptions());
  const createSegmentoFn = useServerFn(createSegmento);
  const createOrigemFn = useServerFn(createLeadOrigem);
  const salvar = useSalvar(cliente.id);

  const [segmentoId, setSegmentoId] = useState<string | null>(cliente.segmento_id);
  const [origemId, setOrigemId] = useState<string | null>(cliente.lead_origem_id);
  const [matriz, setMatriz] = useState<string>(cliente.matriz_filial ?? "");
  const [regime, setRegime] = useState<string>(cliente.regime_tributario ?? "");
  useEffect(() => {
    setSegmentoId(cliente.segmento_id);
    setOrigemId(cliente.lead_origem_id);
    setMatriz(cliente.matriz_filial ?? "");
    setRegime(cliente.regime_tributario ?? "");
  }, [cliente]);

  const total = cliente.pais === "BR" ? 4 : 3;
  const preenchidos = [
    cliente.segmento_id,
    cliente.lead_origem_id,
    cliente.matriz_filial,
    cliente.pais === "BR" ? cliente.regime_tributario : "x",
  ].filter(Boolean).length;
  const mudou =
    segmentoId !== cliente.segmento_id ||
    origemId !== cliente.lead_origem_id ||
    matriz !== (cliente.matriz_filial ?? "") ||
    regime !== (cliente.regime_tributario ?? "");

  return (
    <FormCollapsibleSection
      title="Dados comerciais"
      count={`${Math.min(preenchidos, total)}/${total}`}
      defaultOpen={defaultOpen}
    >
      <FormGrid cols={cliente.pais === "BR" ? 4 : 3}>
        <FormField label="Ramo">
          <ComboboxAdd
            options={segmentos.data ?? []}
            value={segmentoId}
            onChange={setSegmentoId}
            placeholder="Arroz, Café…"
            emptyText="Digite para adicionar um ramo."
            onCreate={async (n) => {
              const r = await createSegmentoFn({ data: { nome: n } });
              await qc.invalidateQueries({ queryKey: ["cadastros", "segmentos"] });
              return r;
            }}
          />
        </FormField>
        <FormField label="Origem do lead">
          <ComboboxAdd
            options={origens.data ?? []}
            value={origemId}
            onChange={setOrigemId}
            placeholder="Indicação, feira…"
            emptyText="Digite para adicionar uma origem."
            onCreate={async (n) => {
              const r = await createOrigemFn({ data: { nome: n } });
              await qc.invalidateQueries({ queryKey: ["cadastros", "lead_origens"] });
              return r;
            }}
          />
        </FormField>
        <FormField label="Matriz / filial">
          <Select value={matriz || "none"} onValueChange={(v) => setMatriz(v === "none" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              {MATRIZ_FILIAL.map((m) => (
                <SelectItem key={m} value={m} className="capitalize">
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        {cliente.pais === "BR" && (
          <FormField label="Regime tributário">
            <Select
              value={regime || "none"}
              onValueChange={(v) => setRegime(v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {REGIMES_TRIBUTARIOS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r === "mei"
                      ? "MEI"
                      : r === "simples"
                        ? "Simples Nacional"
                        : r === "lucro_presumido"
                          ? "Lucro Presumido"
                          : "Lucro Real"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        )}
      </FormGrid>
      <div className="mt-3 flex justify-end">
        <Button
          size="sm"
          disabled={!mudou || salvar.isPending}
          onClick={() =>
            salvar.mutate({
              segmento_id: segmentoId,
              lead_origem_id: origemId,
              matriz_filial: matriz || null,
              ...(cliente.pais === "BR" ? { regime_tributario: regime || null } : {}),
            })
          }
        >
          {salvar.isPending && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
          Salvar
        </Button>
      </div>
    </FormCollapsibleSection>
  );
}
