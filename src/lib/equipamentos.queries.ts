import { queryOptions } from "@tanstack/react-query";
import { listClienteEquipamentos } from "@/lib/equipamentos.functions";

export const clienteEquipamentosQueryOptions = (clienteId: string) =>
  queryOptions({
    queryKey: ["clientes", clienteId, "equipamentos"],
    queryFn: () => listClienteEquipamentos({ data: { clienteId } }),
    enabled: !!clienteId,
  });