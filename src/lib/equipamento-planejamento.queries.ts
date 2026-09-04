import { queryOptions } from "@tanstack/react-query";
import {
  listPlanejamentoTemplates,
  getPlanejamentoTemplate,
  getEquipamentoPlanejamento,
  listEquipamentoTimeline,
  listUsuariosParaDelegar,
} from "@/lib/equipamento-planejamento.functions";

export const planejamentoTemplatesQueryOptions = () =>
  queryOptions({
    queryKey: ["planejamento-templates"],
    queryFn: () => listPlanejamentoTemplates(),
  });

export const planejamentoTemplateQueryOptions = (slug: string | null) =>
  queryOptions({
    queryKey: ["planejamento-template", slug],
    queryFn: () => (slug ? getPlanejamentoTemplate({ data: { slug } }) : Promise.resolve(null)),
    enabled: !!slug,
  });

export const equipamentoPlanejamentoQueryOptions = (equipamentoId: string) =>
  queryOptions({
    queryKey: ["equipamento", equipamentoId, "planejamento"],
    queryFn: () => getEquipamentoPlanejamento({ data: { equipamentoId } }),
    enabled: !!equipamentoId,
  });

export const equipamentoTimelineQueryOptions = (equipamentoId: string) =>
  queryOptions({
    queryKey: ["equipamento", equipamentoId, "timeline"],
    queryFn: () => listEquipamentoTimeline({ data: { equipamentoId } }),
    enabled: !!equipamentoId,
  });

export const usuariosDelegarQueryOptions = () =>
  queryOptions({
    queryKey: ["usuarios-delegar"],
    queryFn: () => listUsuariosParaDelegar(),
  });
