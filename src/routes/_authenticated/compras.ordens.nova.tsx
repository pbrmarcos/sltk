import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  createOrdemCompra,
  createOrdemDeInsumo,
  listFornecedoresAtivos,
} from "@/lib/ordens-compra.functions";
import { Building2, Package, Wand2, ShieldCheck } from "lucide-react";

const searchSchema = z.object({
  insumo_id: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/compras/ordens/nova")({
  validateSearch: searchSchema,
  component: NovaOcPage,
});

function NovaOcPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const insumoIdSearch = search.insumo_id ?? null;
  const [origem, setOrigem] = useState<"manual" | "insumo">(
    insumoIdSearch ? "insumo" : "manual",
  );
  const [fornecedorId, setFornecedorId] = useState<string>("");
  const [tipo, setTipo] = useState<"normal" | "terceiros">("normal");
  const [busca, setBusca] = useState("");

  const fornFn = useServerFn(listFornecedoresAtivos);
  const fromInsumoFn = useServerFn(createOrdemDeInsumo);
  const createFn = useServerFn(createOrdemCompra);

  useEffect(() => {
    if (insumoIdSearch) setOrigem("insumo");
  }, [insumoIdSearch]);

  const fornQ = useQuery({
    queryKey: ["oc", "forn", busca],
    queryFn: () => fornFn({ data: { q: busca || undefined } }),
  });

  async function handleCriar() {
    try {
      if (origem === "insumo") {
        if (!insumoIdSearch) return toast.error("Insumo não informado");
        const oc = await fromInsumoFn({
          data: {
            insumo_id: insumoIdSearch,
            fornecedor_id: fornecedorId || null,
            tipo,
          },
        });
        toast.success(`OC ${oc.numero} criada — PDFs PT/ES/EN sendo enviados ao Drive`);
        navigate({ to: "/compras/ordens/$id", params: { id: oc.id } });
      } else {
        if (!fornecedorId) return toast.error("Selecione um fornecedor");
        const oc = await createFn({ data: { fornecedor_id: fornecedorId, tipo } });
        toast.success(`OC ${oc.numero} criada`);
        navigate({ to: "/compras/ordens/$id", params: { id: oc.id } });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar OC");
    }
  }

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Compras", href: "/compras/solicitacao" },
          { label: "Ordens de Compra", href: "/compras/ordens" },
          { label: "Nova" },
        ]}
        title="Nova Ordem de Compra"
        subtitle="Emissão direta a partir de um insumo aprovado, ou manual."
      />

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Origem da OC
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-xs text-muted-foreground rounded-md border bg-amber-50 border-amber-200 p-3">
            A OC gerada a partir de um insumo só é emitida se houver <b>aprovação vigente</b> por
            um engenheiro, gerente ou admin. Os PDFs (PT/ES/EN) são gerados automaticamente e
            salvos na pasta do item no Google Drive.
          </div>

          <RadioGroup value={origem} onValueChange={(v) => setOrigem(v as typeof origem)} className="grid grid-cols-1 gap-3">
            <Label
              htmlFor="orig-ins"
              className={
                "flex items-start gap-3 rounded-md border p-4 cursor-pointer hover:bg-muted/50 [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5 " +
                (insumoIdSearch ? "" : "opacity-60")
              }
            >
              <RadioGroupItem id="orig-ins" value="insumo" disabled={!insumoIdSearch} />
              <div>
                <div className="flex items-center gap-2 font-medium">
                  <Package className="h-4 w-4" /> A partir de Insumo (aprovado)
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {insumoIdSearch
                    ? "Cria OC para o insumo selecionado usando o fornecedor sugerido na aprovação."
                    : "Abra pelo dashboard do insumo (Solicitações de Compra) clicando em 'Emitir OC'."}
                </div>
              </div>
            </Label>
            <Label
              htmlFor="orig-man"
              className="flex items-start gap-3 rounded-md border p-4 cursor-pointer hover:bg-muted/50 [&:has(:checked)]:border-primary [&:has(:checked)]:bg-primary/5"
            >
              <RadioGroupItem id="orig-man" value="manual" />
              <div>
                <div className="flex items-center gap-2 font-medium">
                  <Wand2 className="h-4 w-4" /> Manual / Avulsa
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Cria uma OC em branco para preencher itens manualmente.
                </div>
              </div>
            </Label>
          </RadioGroup>

          {origem === "insumo" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2 text-sm text-muted-foreground rounded-md border bg-muted/40 p-3">
                <strong className="text-foreground">Insumo:</strong> {insumoIdSearch}
                <div className="mt-1 text-xs">
                  Se nenhum fornecedor for informado, o sistema usará o sugerido na aprovação ou
                  o último Checklist respondido.
                </div>
              </div>
              <div className="space-y-2">
                <Label>Fornecedor (opcional — sobrescreve)</Label>
                <Input
                  placeholder="Buscar fornecedor..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
                <Select value={fornecedorId} onValueChange={setFornecedorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Usar o sugerido na aprovação" />
                  </SelectTrigger>
                  <SelectContent>
                    {(fornQ.data ?? []).map((f: any) => (
                      <SelectItem key={f.id} value={f.id}>
                        <span className="flex items-center gap-2">
                          <Building2 className="h-3 w-3" />
                          {f.codigo} — {f.nome}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de OC</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="terceiros">Terceiros (pass-through)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {origem === "manual" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Fornecedor</Label>
                <Input
                  placeholder="Buscar fornecedor..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
                <Select value={fornecedorId} onValueChange={setFornecedorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {(fornQ.data ?? []).map((f: any) => (
                      <SelectItem key={f.id} value={f.id}>
                        <span className="flex items-center gap-2">
                          <Building2 className="h-3 w-3" />
                          {f.codigo} — {f.nome}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de OC</Label>
                <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="terceiros">Terceiros (pass-through)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" asChild>
              <Link to="/compras/ordens">Cancelar</Link>
            </Button>
            <Button onClick={handleCriar}>Criar OC</Button>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
