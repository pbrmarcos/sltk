import { queryOptions } from "@tanstack/react-query";
import {
  listClientes,
  listPaises,
  getCliente,
  getClienteByCodigo,
  listClienteOportunidades,
  listClienteProcessos,
  listClienteDocumentos,
  listClienteTimeline,
} from "@/lib/clientes.functions";
import { listDocumentos } from "@/lib/docs/docs.functions";

export type ClientesListSearch = {
  q?: string;
  status?: "todos" | "ativo" | "inativo" | "prospect";
  lifecycle?: "todos" | "suspect" | "prospect" | "cliente" | "inativo";
  pais?: string;
  page?: number;
  pageSize?: 25 | 50 | 100;
};

export const paisesQueryOptions = () =>
  queryOptions({
    queryKey: ["paises"],
    queryFn: () => listPaises(),
    staleTime: 1000 * 60 * 60,
  });

export const clientesListQueryOptions = (search: ClientesListSearch) =>
  queryOptions({
    queryKey: ["clientes", "list", search],
    queryFn: () => listClientes({ data: search }),
  });

export const clienteQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["clientes", "detail", id],
    queryFn: () => getCliente({ data: { id } }),
  });

export const clienteByCodigoQueryOptions = (codigo: string) =>
  queryOptions({
    queryKey: ["clientes", "detail-codigo", codigo],
    queryFn: () => getClienteByCodigo({ data: { codigo } }),
  });

export const clienteOportunidadesQueryOptions = (clienteId: string) =>
  queryOptions({
    queryKey: ["clientes", clienteId, "oportunidades"],
    queryFn: () => listClienteOportunidades({ data: { clienteId } }),
    enabled: !!clienteId,
  });

export const clienteProcessosQueryOptions = (clienteId: string) =>
  queryOptions({
    queryKey: ["clientes", clienteId, "processos"],
    queryFn: () => listClienteProcessos({ data: { clienteId } }),
    enabled: !!clienteId,
  });

export const clienteDocumentosQueryOptions = (clienteId: string) =>
  queryOptions({
    queryKey: ["clientes", clienteId, "documentos"],
    queryFn: () => listClienteDocumentos({ data: { clienteId } }),
    enabled: !!clienteId,
  });

export const clienteTimelineQueryOptions = (clienteId: string) =>
  queryOptions({
    queryKey: ["clientes", clienteId, "timeline"],
    queryFn: () => listClienteTimeline({ data: { clienteId } }),
    enabled: !!clienteId,
  });

export const clienteOrcamentosQueryOptions = (clienteId: string) =>
  queryOptions({
    queryKey: ["clientes", clienteId, "orcamentos"],
    queryFn: () => listDocumentos({ data: { tipo: "orcamento", cliente_id: clienteId } }),
    enabled: !!clienteId,
  });
