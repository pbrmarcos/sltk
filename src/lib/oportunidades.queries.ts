import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  listPipeline,
  updateStage,
  restoreOportunidade,
  createOportunidade,
  updateOportunidade,
  convertToProcesso,
  type PipelineStage,
  type OportunidadeLite,
} from "@/lib/oportunidades.functions";

export const pipelineQueryOptions = (params: { responsavel?: string; q?: string } = {}) =>
  queryOptions({
    queryKey: ["oportunidades", "pipeline", params],
    queryFn: () => listPipeline({ data: params }),
  });

export function useUpdateStage() {
  const qc = useQueryClient();
  const fn = useServerFn(updateStage);
  return useMutation({
    mutationFn: (vars: { id: string; stage: PipelineStage; lost_reason?: string }) =>
      fn({ data: vars }),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["oportunidades", "pipeline"] });
      const snaps = qc.getQueriesData<OportunidadeLite[]>({
        queryKey: ["oportunidades", "pipeline"],
      });
      for (const [key, data] of snaps) {
        if (!data) continue;
        qc.setQueryData<OportunidadeLite[]>(
          key,
          data.map((o) =>
            o.id === vars.id
              ? {
                  ...o,
                  pipeline_stage: vars.stage,
                  lost_reason:
                    vars.stage === "perdido" ? (vars.lost_reason ?? o.lost_reason) : null,
                }
              : o,
          ),
        );
      }
      return { snaps };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.snaps) for (const [key, data] of ctx.snaps) qc.setQueryData(key, data);
      toast.error(err instanceof Error ? err.message : "Falha ao mover oportunidade");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["oportunidades", "pipeline"] });
    },
  });
}

export function useRestoreOportunidade() {
  const qc = useQueryClient();
  const fn = useServerFn(restoreOportunidade);
  return useMutation({
    mutationFn: (vars: { id: string; stage?: Exclude<PipelineStage, "perdido"> }) =>
      fn({ data: vars }),
    onSuccess: () => {
      toast.success("Oportunidade restaurada");
      qc.invalidateQueries({ queryKey: ["oportunidades", "pipeline"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Falha ao restaurar"),
  });
}

export function useCreateOportunidade() {
  const qc = useQueryClient();
  const fn = useServerFn(createOportunidade);
  return useMutation({
    mutationFn: (vars: Parameters<typeof createOportunidade>[0]["data"]) => fn({ data: vars }),
    onSuccess: (r) => {
      // needsConfirm = nada foi criado; a tela pede confirmação ao usuário.
      if ((r as { needsConfirm?: boolean })?.needsConfirm) return;
      if ((r as { reused?: boolean })?.reused) {
        toast.info("Esta oportunidade já havia sido criada — reaproveitamos o registro existente.");
      } else {
        toast.success("Oportunidade criada");
      }
      qc.invalidateQueries({ queryKey: ["oportunidades", "pipeline"] });
    },

    onError: (err) => toast.error(err instanceof Error ? err.message : "Falha ao criar"),
  });
}

export function useUpdateOportunidade() {
  const qc = useQueryClient();
  const fn = useServerFn(updateOportunidade);
  return useMutation({
    mutationFn: (vars: Parameters<typeof updateOportunidade>[0]["data"]) => fn({ data: vars }),
    onSuccess: () => {
      toast.success("Oportunidade atualizada");
      qc.invalidateQueries({ queryKey: ["oportunidades", "pipeline"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Falha ao atualizar"),
  });
}

export function useConvertToProcesso() {
  const qc = useQueryClient();
  const fn = useServerFn(convertToProcesso);
  return useMutation({
    mutationFn: (vars: { id: string; cliente_id?: string }) => fn({ data: vars }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["oportunidades", "pipeline"] });
      toast.success("Convertida em processo");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Falha ao converter"),
  });
}
