import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowDown, ArrowUp, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  listLeadOrigensAdmin,
  createLeadOrigem,
  renameLeadOrigem,
  toggleLeadOrigem,
  reorderLeadOrigens,
  type LeadOrigemRow,
} from "@/lib/lead-origens.functions";

export function OrigensLeadTab() {
  const qc = useQueryClient();
  const listFn = useServerFn(listLeadOrigensAdmin);
  const createFn = useServerFn(createLeadOrigem);
  const renameFn = useServerFn(renameLeadOrigem);
  const toggleFn = useServerFn(toggleLeadOrigem);
  const reorderFn = useServerFn(reorderLeadOrigens);

  const [nova, setNova] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");

  const q = useQuery({
    queryKey: ["admin", "lead_origens"],
    queryFn: () => listFn(),
    placeholderData: (prev) => prev,
  });

  const rows = (q.data ?? []) as LeadOrigemRow[];

  function refresh() {
    void qc.invalidateQueries({ queryKey: ["admin", "lead_origens"] });
    void qc.invalidateQueries({ queryKey: ["cadastros", "lead_origens"] });
  }

  const criar = useMutation({
    mutationFn: (nome: string) => createFn({ data: { nome } }),
    onSuccess: () => {
      setNova("");
      toast.success("Origem cadastrada.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renomear = useMutation({
    mutationFn: (v: { id: string; nome: string }) => renameFn({ data: v }),
    onSuccess: () => {
      setEditId(null);
      toast.success("Origem renomeada.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const alternar = useMutation({
    mutationFn: (v: { id: string; ativo: boolean }) => toggleFn({ data: v }),
    onSuccess: () => refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  const reordenar = useMutation({
    mutationFn: (ids: string[]) => reorderFn({ data: { ids } }),
    onSuccess: () => refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  function mover(index: number, delta: number) {
    const next = [...rows];
    const alvo = index + delta;
    if (alvo < 0 || alvo >= next.length) return;
    const [item] = next.splice(index, 1);
    next.splice(alvo, 0, item!);
    reordenar.mutate(next.map((r) => r.id));
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-4">
        <h3 className="text-sm font-semibold">Origens de lead</h3>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Usadas no cadastro de clientes e leads. Origens nunca são excluídas — apenas desativadas,
          para preservar o histórico dos registros já vinculados.
        </p>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const nome = nova.trim();
            if (nome.length < 2) return;
            criar.mutate(nome);
          }}
        >
          <Input
            value={nova}
            onChange={(e) => setNova(e.target.value)}
            placeholder="Nova origem…"
            className="max-w-sm"
          />
          <Button type="submit" disabled={criar.isPending || nova.trim().length < 2}>
            {criar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Adicionar
          </Button>
        </form>
      </div>

      <div className="overflow-hidden rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)]">
        {q.isPending && !q.data ? (
          <div className="flex items-center gap-2 p-6 text-sm text-[var(--text-muted)]">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : rows.length === 0 ? (
          <div className="p-6 text-sm text-[var(--text-muted)]">Nenhuma origem cadastrada.</div>
        ) : (
          <ul className="divide-y divide-[var(--bg-border)]">
            {rows.map((o, i) => (
              <li key={o.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="flex flex-col">
                  <button
                    type="button"
                    aria-label="Mover para cima"
                    className="text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-30"
                    disabled={i === 0 || reordenar.isPending}
                    onClick={() => mover(i, -1)}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Mover para baixo"
                    className="text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-30"
                    disabled={i === rows.length - 1 || reordenar.isPending}
                    onClick={() => mover(i, 1)}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                {editId === o.id ? (
                  <form
                    className="flex flex-1 gap-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      renomear.mutate({ id: o.id, nome: editNome.trim() });
                    }}
                  >
                    <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} className="max-w-sm" />
                    <Button type="submit" size="sm" disabled={renomear.isPending}>
                      Salvar
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditId(null)}>
                      Cancelar
                    </Button>
                  </form>
                ) : (
                  <button
                    type="button"
                    className="flex-1 text-left text-sm hover:underline"
                    onClick={() => {
                      setEditId(o.id);
                      setEditNome(o.nome);
                    }}
                  >
                    {o.nome}
                    {!o.ativo && <span className="ml-2 text-xs text-[var(--text-muted)]">(inativa)</span>}
                  </button>
                )}

                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span>{o.ativo ? "Ativa" : "Inativa"}</span>
                  <Switch
                    checked={o.ativo}
                    onCheckedChange={(v) => alternar.mutate({ id: o.id, ativo: v })}
                    aria-label={`Ativar origem ${o.nome}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
