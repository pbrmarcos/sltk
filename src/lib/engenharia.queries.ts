import { queryOptions } from "@tanstack/react-query";
import { listEquipamentoEtps, listAllEtps, getEtp } from "@/lib/equipamento-etps.functions";
import { listEtpHistorico } from "@/lib/equipamento-etp-historico.functions";
import { listEquipamentoEtapas, listHHConsolidado } from "@/lib/equipamento-etapas.functions";
import {
  listProjetosByEquipamento,
  listAllProjetos,
} from "@/lib/equipamento-projetos.functions";
import { listAllMontagens } from "@/lib/equipamento-montagens.functions";
import { listAllRevisoes } from "@/lib/equipamento-revisoes.functions";
import type {
  ProjetoDisciplina,
  EtpStatus,
  ProjetoStatus,
  MontagemStatus,
  RevisaoDisciplina,
  RevisaoStatus,
} from "@/lib/engenharia.shared";

export const equipamentoEtpsQueryOptions = (equipamentoId: string) =>
  queryOptions({
    queryKey: ["engenharia", "etps", equipamentoId],
    queryFn: () => listEquipamentoEtps({ data: { equipamento_id: equipamentoId } }),
    enabled: !!equipamentoId,
  });

export const allEtpsQueryOptions = (params: {
  q?: string;
  status?: "todos" | EtpStatus;
  page?: number;
}) =>
  queryOptions({
    queryKey: ["engenharia", "etps", "all", params],
    queryFn: () => listAllEtps({ data: params }),
  });

export const etpQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["engenharia", "etp", id],
    queryFn: () => getEtp({ data: { id } }),
    enabled: !!id,
  });

export const etpHistoricoQueryOptions = (etpId: string) =>
  queryOptions({
    queryKey: ["engenharia", "etp", etpId, "historico"],
    queryFn: () => listEtpHistorico({ data: { etp_id: etpId } }),
    enabled: !!etpId,
  });

export const equipamentoEtapasQueryOptions = (equipamentoId: string) =>
  queryOptions({
    queryKey: ["engenharia", "etapas", equipamentoId],
    queryFn: () => listEquipamentoEtapas({ data: { equipamento_id: equipamentoId } }),
    enabled: !!equipamentoId,
  });

export const hhConsolidadoQueryOptions = (params: {
  cliente_id?: string;
  q?: string;
  only_with_etapas?: boolean;
  page?: number;
}) =>
  queryOptions({
    queryKey: ["engenharia", "hh", params],
    queryFn: () => listHHConsolidado({ data: params }),
  });

export const equipamentoProjetosQueryOptions = (equipamentoId: string) =>
  queryOptions({
    queryKey: ["engenharia", "projetos", equipamentoId],
    queryFn: () => listProjetosByEquipamento({ data: { equipamento_id: equipamentoId } }),
    enabled: !!equipamentoId,
  });

export const allProjetosQueryOptions = (params: {
  disciplina: ProjetoDisciplina;
  q?: string;
  status?: "todos" | ProjetoStatus;
  page?: number;
}) =>
  queryOptions({
    queryKey: ["engenharia", "projetos", "all", params],
    queryFn: () => listAllProjetos({ data: params }),
  });

export const allMontagensQueryOptions = (params: {
  q?: string;
  status?: "todos" | MontagemStatus;
  page?: number;
}) =>
  queryOptions({
    queryKey: ["producao", "montagens", "all", params],
    queryFn: () => listAllMontagens({ data: params }),
  });

export const allRevisoesQueryOptions = (params: {
  disciplina: RevisaoDisciplina;
  q?: string;
  status?: "todos" | RevisaoStatus;
  page?: number;
}) =>
  queryOptions({
    queryKey: ["qualidade", "revisoes", "all", params],
    queryFn: () => listAllRevisoes({ data: params }),
  });