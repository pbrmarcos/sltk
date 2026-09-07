import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listProcessos, getProcessoDetalhe } from "@/lib/processos.functions";
import { createFat } from "@/lib/fat.functions";

const searchSchema = z.object({
  processo: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/qualidade/fat/novo")({
  validateSearch: (s) => searchSchema.parse(s),
  component: NovoFatPage,
});

// Conexão mínima Montagem concluída -> FAT: só prefill de processo, sem
// vínculo formal no banco entre equipamento_montagens e fat_relatorios.
function NovoFatPage() {
  const nav = useNavigate();
  const { processo: processoPrefill } = Route.useSearch();
  const fetchProc = useServerFn(listProcessos);
  const fetchProcessoDetalhe = useServerFn(getProcessoDetalhe);
  const create = useServerFn(createFat);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!processoPrefill) return;
    setSelected(processoPrefill);
    fetchProcessoDetalhe({ data: { id: processoPrefill } })
      .then((proc: any) => {
        if (proc?.codigo) setQ(proc.codigo);
      })
      .catch(() => {
        toast.error("Processo vinculado não encontrado.");
        setSelected(null);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processoPrefill]);

  const { data: processos = [], isLoading } = useQuery({
    queryKey: ["processos", "for-fat", q],
    queryFn: () => fetchProc({ data: { q } }),
  });

  const filtered = useMemo(() => (processos as any[]).slice(0, 50), [processos]);

  async function handleCreate() {
    if (!selected) return;
    setSaving(true);
    try {
      const r = await create({ data: { processo_id: selected } });
      toast.success("FAT criado");
      nav({ to: "/qualidade/fat/$id", params: { id: r.id } });
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao criar FAT");
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Qualidade" },
          { label: "FAT", href: "/qualidade/fat" },
          { label: "Novo" },
        ]}
        title="Novo FAT"
        subtitle="Selecione o processo de origem para iniciar o relatório"
        actions={
          <>
            <Button onClick={handleCreate} disabled={!selected || saving}>
              {saving ? "Criando…" : "Criar e abrir"}
            </Button>
            <Button variant="outline" onClick={() => nav({ to: "/qualidade/fat" })}>
              Cancelar
            </Button>
          </>
        }
      />
      <div className="mb-4">
        <Input
          placeholder="Buscar processo por código ou título…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">
            Carregando processos…
          </div>
        ) : !filtered.length ? (
          <div className="p-8 text-center text-sm text-[var(--text-muted)]">
            Nenhum processo encontrado.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--bg-border)]">
            {filtered.map((p: any) => (
              <li key={p.id}>
                <label className="flex cursor-pointer items-center gap-3 p-4 hover:bg-[var(--bg-elevated)]">
                  <input
                    type="radio"
                    name="processo"
                    checked={selected === p.id}
                    onChange={() => setSelected(p.id)}
                  />
                  <span className="font-mono text-xs text-[var(--text-muted)]">{p.codigo}</span>
                  <span className="flex-1 truncate text-sm">{p.titulo}</span>
                  <span className="text-xs text-[var(--text-muted)]">{p.stage}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageContainer>
  );
}
