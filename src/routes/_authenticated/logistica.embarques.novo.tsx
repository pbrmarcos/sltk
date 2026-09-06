import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
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
import {
  createEmbarque,
  listProjetosDisponiveis,
  listTransportadoras,
} from "@/lib/logistica.functions";
import { useAuth } from "@/hooks/use-auth";
import { useMyModules } from "@/hooks/use-my-modules";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/logistica/embarques/novo")({
  component: NovoEmbarque,
});

function NovoEmbarque() {
  const { role } = useAuth();
  const { modules } = useMyModules();
  const canCreate = role === "admin" || modules.has("logistica");
  const navigate = useNavigate();

  const projetos = useQuery({
    queryKey: ["logistica", "projetos"],
    queryFn: () => listProjetosDisponiveis(),
    enabled: canCreate,
  });
  const transportadoras = useQuery({
    queryKey: ["logistica", "transportadoras"],
    queryFn: () => listTransportadoras(),
    enabled: canCreate,
  });

  const [projetoId, setProjetoId] = useState("");
  const [transportadoraId, setTransportadoraId] = useState<string>("none");
  const [previsaoSaida, setPrevisaoSaida] = useState("");
  const [destino, setDestino] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const createFn = useServerFn(createEmbarque);
  const mut = useMutation({
    mutationFn: async () => {
      if (!projetoId) throw new Error("Escolha um projeto.");
      return createFn({
        data: {
          projeto_id: projetoId,
          transportadora_id: transportadoraId === "none" ? null : transportadoraId,
          previsao_saida: previsaoSaida || null,
          destino: destino.trim() || null,
          observacoes: observacoes.trim() || null,
        },
      });
    },
    onSuccess: (row) => {
      toast.success(`Embarque ${row.numero} criado.`);
      navigate({ to: "/logistica/embarques/$id", params: { id: row.id } });
    },
    onError: (e: unknown) => toast.error((e as Error).message),
  });

  if (!canCreate) {
    return (
      <PageContainer>
        <p className="text-sm text-[var(--text-muted)]">
          Apenas gestão, admin ou campo podem criar embarques.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-4">
          <Link to="/logistica/embarques">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
          </Link>
        </Button>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Logística", href: "/logistica/embarques" },
          { label: "Novo embarque" },
        ]}
        title="Novo embarque"
        subtitle="Selecione o projeto pronto para expedição."
      />

      <div className="max-w-3xl space-y-4">
        <div>
          <Label className="mb-1 block text-xs uppercase text-[var(--text-muted)]">Projeto</Label>
          <Select value={projetoId} onValueChange={setProjetoId}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha um projeto…" />
            </SelectTrigger>
            <SelectContent>
              {(projetos.data ?? []).map((p: any) => {
                const cli = p.cliente?.nome_fantasia || p.cliente?.razao_social || "Cliente";
                const eq = p.equipamento?.apelido || p.equipamento?.modelo || "Equipamento";
                return (
                  <SelectItem key={p.id} value={p.id}>
                    {cli} — {eq} (rev. {p.revisao})
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Ideal: projetos com FAT já homologado. A liberação final acontece ao marcar como
            embarcado.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label className="mb-1 block text-xs uppercase text-[var(--text-muted)]">
              Transportadora
            </Label>
            <Select value={transportadoraId} onValueChange={setTransportadoraId}>
              <SelectTrigger>
                <SelectValue placeholder="A definir" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">A definir</SelectItem>
                {(transportadoras.data ?? []).map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-1 block text-xs uppercase text-[var(--text-muted)]">
              Previsão de saída
            </Label>
            <Input
              type="date"
              value={previsaoSaida}
              onChange={(e) => setPrevisaoSaida(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label className="mb-1 block text-xs uppercase text-[var(--text-muted)]">Destino</Label>
          <Input
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            placeholder="Ex.: Cliente XPTO — Planta Rio Verde/GO"
            maxLength={500}
          />
        </div>

        <div>
          <Label className="mb-1 block text-xs uppercase text-[var(--text-muted)]">
            Observações
          </Label>
          <Textarea
            rows={4}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            maxLength={2000}
            placeholder="Cuidados de transporte, restrições, contato no destino…"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
            <Save className="mr-1.5 h-4 w-4" /> Criar embarque
          </Button>
          <Button asChild variant="outline">
            <Link to="/logistica/embarques">Cancelar</Link>
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
