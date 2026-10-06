import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
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
import { Flag } from "@/components/ui/flag";
import { FormField } from "@/components/form/FormField";
import { FormGrid } from "@/components/form/FormGrid";
import { createClienteRapido } from "@/lib/clientes.functions";
import { paisesQueryOptions } from "@/lib/clientes.queries";
import { segmentosQueryOptions } from "@/lib/cadastros.queries";
import { createSegmento } from "@/lib/segmentos.functions";
import { razaoSocialLabel, type ClienteInput } from "@/lib/clientes.shared";

/**
 * Cadastro rápido: 7 campos. O restante do cadastro se completa depois na
 * ficha ("Cadastro N% completo") ou pelo Minerar dados.
 */
export function ClienteRapidoForm({
  initialValues,
  onCreated,
  onCancel,
}: {
  initialValues?: Partial<ClienteInput>;
  /** Quando informado, não navega: devolve o cliente criado (ex.: dentro do orçamento). */
  onCreated?: (cliente: { id: string; codigo: string }, values: ClienteInput) => void;
  onCancel?: () => void;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const paises = useQuery(paisesQueryOptions());
  const segmentos = useQuery(segmentosQueryOptions());
  const createSegmentoFn = useServerFn(createSegmento);
  const createFn = useServerFn(createClienteRapido);

  const [pais, setPais] = useState(initialValues?.pais ?? "BR");
  const [razao, setRazao] = useState(initialValues?.razao_social ?? "");
  const [documento, setDocumento] = useState(initialValues?.documento_fiscal_numero ?? "");
  const [segmentoId, setSegmentoId] = useState<string | null>(initialValues?.segmento_id ?? null);
  const contato0 = initialValues?.contatos?.[0];
  const [contatoNome, setContatoNome] = useState(contato0?.nome ?? "");
  const [contatoEmail, setContatoEmail] = useState(contato0?.email ?? "");
  const [contatoTel, setContatoTel] = useState(contato0?.telefone_numero ?? "");
  const [erro, setErro] = useState<{ campo?: string; msg: string } | null>(null);

  const paisCfg = paises.data?.find((p) => p.codigo === pais);

  const criar = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          pais,
          razao_social: razao.trim(),
          documento_fiscal_numero: documento.trim() || null,
          segmento_id: segmentoId,
          contato_nome: contatoNome.trim(),
          contato_email: contatoEmail.trim(),
          contato_telefone: contatoTel.trim() || null,
        },
      }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["clientes"] });
      toast.success(`Cliente ${r.codigo} criado.`);
      if (onCreated) {
        onCreated({ id: r.id, codigo: r.codigo }, r.values);
        return;
      }
      navigate({
        to: "/clientes/$codigo",
        params: { codigo: r.codigo },
        search: { tab: "visao", completar: true } as never,
      });
    },
    onError: (e: unknown) => {
      const err = e as { message?: string; field?: string };
      setErro({ campo: err.field, msg: err.message ?? "Falha ao criar cliente." });
    },
  });

  const valido =
    razao.trim().length >= 2 && contatoNome.trim().length >= 1 && /\S+@\S+\.\S+/.test(contatoEmail);

  return (
    <div className="space-y-4">
      <FormGrid cols={3}>
        <FormField label="País" required>
          <Select
            value={pais}
            onValueChange={(v) => {
              setPais(v);
              setErro(null);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(paises.data ?? []).map((p) => (
                <SelectItem key={p.codigo} value={p.codigo}>
                  <span className="inline-flex items-center gap-2">
                    <Flag code={p.codigo} size={16} />
                    {p.nome}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
        <FormField
          label={razaoSocialLabel(pais)}
          required
          className="sm:col-span-2"
          error={erro?.campo === "razao_social" ? erro.msg : null}
        >
          <Input
            value={razao}
            onChange={(e) => setRazao(e.target.value)}
            maxLength={255}
            autoFocus
          />
        </FormField>
        <FormField
          label={paisCfg?.documento_nome ?? "Documento fiscal"}
          hint="Opcional agora: o Minerar dados encontra e confere na Receita."
          error={erro?.campo === "documento_fiscal_numero" ? erro.msg : null}
        >
          <Input
            value={documento}
            onChange={(e) => {
              setDocumento(e.target.value);
              setErro(null);
            }}
            maxLength={40}
            placeholder="—"
          />
        </FormField>
        <FormField label="Ramo" className="sm:col-span-2">
          <ComboboxAdd
            options={segmentos.data ?? []}
            value={segmentoId}
            onChange={setSegmentoId}
            placeholder="Arroz, Café, Leite em pó…"
            emptyText="Digite para adicionar um ramo."
            onCreate={async (n) => {
              const r = await createSegmentoFn({ data: { nome: n } });
              await qc.invalidateQueries({ queryKey: ["cadastros", "segmentos"] });
              return r;
            }}
          />
        </FormField>
        <FormField label="Contato" required>
          <Input
            value={contatoNome}
            onChange={(e) => setContatoNome(e.target.value)}
            maxLength={120}
          />
        </FormField>
        <FormField label="E-mail do contato" required>
          <Input
            type="email"
            value={contatoEmail}
            onChange={(e) => setContatoEmail(e.target.value)}
            maxLength={255}
          />
        </FormField>
        <FormField label="Telefone">
          <Input
            type="tel"
            value={contatoTel}
            onChange={(e) => setContatoTel(e.target.value)}
            maxLength={40}
          />
        </FormField>
      </FormGrid>

      {erro && !erro.campo && <p className="text-[12px] text-destructive">{erro.msg}</p>}

      <div className="flex items-center justify-end gap-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel} disabled={criar.isPending}>
            Cancelar
          </Button>
        )}
        <Button disabled={!valido || criar.isPending} onClick={() => criar.mutate()}>
          {criar.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          Criar cliente
        </Button>
      </div>
    </div>
  );
}
