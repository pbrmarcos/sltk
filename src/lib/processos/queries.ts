import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listProcessos,
  getProcessoDetalhe,
  listPilares,
  moveProcesso,
  concluirTarefa,
  createProcesso,
  runSlaAutomations,
  listChecklist,
  toggleChecklistItem,
  marcarComoPerdido,
  restaurarProcesso,
  type ProcessoLite,
  type PipelineStage,
  type Risco,
  type ProcessoTipo,
  type LostCategory,
} from "@/lib/processos.functions";

export type ProcessoUI = {
  id: string;
  code: string;
  titulo: string;
  tipo: ProcessoTipo;
  clienteId: string;
  clienteNome: string;
  pilarId: string;
  pilarNome: string;
  stage: PipelineStage;
  stageEnteredAt: string;
  progresso: number;
  risco: Risco;
  valor: string;
  previsao: string;
  valorRaw: number | null;
  lostAt: string | null;
  lostByNome: string | null;
  lostReason: string | null;
  lostCategory: LostCategory | null;
  restoredAt: string | null;
  restoredByNome: string | null;
  lostCount: number;
};

function formatValor(v: number | null): string {
  if (v === null || v === undefined || v === 0) return "—";
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(2).replace(".", ",")}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return `R$ ${v.toFixed(0)}`;
}

function formatPrevisao(p: string | null): string {
  if (!p) return "—";
  try {
    const [y, m] = p.split("-");
    return `${m}/${y}`;
  } catch {
    return p;
  }
}

export function toUI(p: ProcessoLite): ProcessoUI {
  return {
    id: p.id,
    code: p.codigo,
    titulo: p.titulo,
    tipo: p.tipo,
    clienteId: p.cliente_id,
    clienteNome: p.cliente_nome,
    pilarId: p.pilar_id,
    pilarNome: p.pilar_nome,
    stage: p.stage,
    stageEnteredAt: p.stage_entered_at,
    progresso: p.progresso,
    risco: p.risco,
    valor: formatValor(p.valor),
    previsao: formatPrevisao(p.previsao),
    valorRaw: p.valor,
    lostAt: p.lost_at,
    lostByNome: p.lost_by_nome,
    lostReason: p.lost_reason,
    lostCategory: p.lost_category,
    restoredAt: p.restored_at,
    restoredByNome: p.restored_by_nome,
    lostCount: p.lost_count,
  };
}

export type ProcessosListSearch = {
  q?: string;
  stage?: PipelineStage | "todos";
  risco?: Risco | "todos";
  pilarId?: string | "todos";
  apenasArquivados?: boolean;
};

export const processosListQueryOptions = (search: ProcessosListSearch) =>
  queryOptions({
    queryKey: ["processos", "list", search],
    queryFn: async () => {
      const rows = await listProcessos({ data: search });
      return rows.map(toUI);
    },
    staleTime: 15_000,
  });

export const processosArquivadosQueryOptions = (search: Omit<ProcessosListSearch, "apenasArquivados"> = {}) =>
  queryOptions({
    queryKey: ["processos", "arquivados", search],
    queryFn: async () => {
      const rows = await listProcessos({ data: { ...search, apenasArquivados: true } });
      return rows.map(toUI);
    },
    staleTime: 15_000,
  });

export const processoDetalheQueryOptions = (id: string | null) =>
  queryOptions({
    queryKey: ["processos", "detalhe", id],
    queryFn: async () => {
      if (!id) throw new Error("ID ausente.");
      const det = await getProcessoDetalhe({ data: { id } });
      return { ...det, processo: toUI(det.processo) };
    },
    enabled: !!id,
    staleTime: 10_000,
  });

export const pilaresQueryOptions = () =>
  queryOptions({
    queryKey: ["processos", "pilares"],
    queryFn: () => listPilares(),
    staleTime: 5 * 60_000,
  });

export function useMoveProcesso() {
  const qc = useQueryClient();
  const fn = useServerFn(moveProcesso);
  return useMutation({
    mutationFn: (input: { id: string; toStage: PipelineStage }) => fn({ data: input }),
    onSuccess: (_r, vars) => {
      qc.invalidateQueries({ queryKey: ["processos", "list"] });
      qc.invalidateQueries({ queryKey: ["processos", "detalhe", vars.id] });
    },
    onError: (e) => toast.error((e as Error).message ?? "Falha ao mover processo."),
  });
}

export function useConcluirTarefa(processoId: string | null) {
  const qc = useQueryClient();
  const fn = useServerFn(concluirTarefa);
  return useMutation({
    mutationFn: (id: string) => fn({ data: { id } }),
    onSuccess: () => {
      if (processoId) qc.invalidateQueries({ queryKey: ["processos", "detalhe", processoId] });
    },
    onError: (e) => toast.error((e as Error).message ?? "Falha ao concluir tarefa."),
  });
}

export type CreateProcessoInput = {
  titulo: string;
  cliente_id: string;
  pilar_id: string;
  tipo: ProcessoTipo;
  stage: PipelineStage;
  risco: Risco;
  valor?: number | null;
  previsao?: string | null;
};

export function useCreateProcesso() {
  const qc = useQueryClient();
  const fn = useServerFn(createProcesso);
  return useMutation({
    mutationFn: (input: CreateProcessoInput) => fn({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["processos", "list"] }),
  });
}

export function useRunSlaAutomations() {
  const qc = useQueryClient();
  const fn = useServerFn(runSlaAutomations);
  return useMutation({
    mutationFn: () => fn(),
    onSuccess: (r) => {
      if (r?.tratados && r.tratados > 0) {
        qc.invalidateQueries({ queryKey: ["processos"] });
        toast.warning(`${r.tratados} processo(s) com SLA estourado`, {
          description: "Follow-ups criados e e-mails registrados.",
        });
      }
    },
  });
}

export const checklistQueryOptions = (processoId: string | null) =>
  queryOptions({
    queryKey: ["processos", "checklist", processoId],
    queryFn: async () => {
      if (!processoId) return [];
      return listChecklist({ data: { id: processoId } });
    },
    enabled: !!processoId,
    staleTime: 10_000,
  });

export function useToggleChecklistItem(processoId: string | null) {
  const qc = useQueryClient();
  const fn = useServerFn(toggleChecklistItem);
  return useMutation({
    mutationFn: (input: { template_id: string; done: boolean; comentario?: string }) =>
      fn({ data: { processo_id: processoId!, ...input } }),
    onSuccess: () => {
      if (processoId)
        qc.invalidateQueries({ queryKey: ["processos", "checklist", processoId] });
    },
    onError: (e) => toast.error((e as Error).message ?? "Falha ao atualizar checklist."),
  });
}

export function useMarcarPerdido(processoId: string | null) {
  const qc = useQueryClient();
  const fn = useServerFn(marcarComoPerdido);
  return useMutation({
    mutationFn: (input: { reason: string; category: LostCategory }) =>
      fn({ data: { id: processoId!, ...input } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["processos"] });
      toast.success("Processo arquivado como perdido.");
    },
    onError: (e) => toast.error((e as Error).message ?? "Falha ao arquivar."),
  });
}

export function useRestaurarProcesso(processoId: string | null) {
  const qc = useQueryClient();
  const fn = useServerFn(restaurarProcesso);
  return useMutation({
    mutationFn: (input: { comentario?: string }) =>
      fn({ data: { id: processoId!, comentario: input.comentario ?? "" } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["processos"] });
      toast.success("Processo restaurado.");
    },
    onError: (e) => toast.error((e as Error).message ?? "Falha ao restaurar."),
  });
}