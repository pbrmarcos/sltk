import { queryOptions } from "@tanstack/react-query";
import { listEquipamentoDocumentos } from "@/lib/equipamento-documentos.functions";

export const equipamentoDocumentosQueryOptions = (equipamentoId: string) =>
  queryOptions({
    queryKey: ["equipamentos", equipamentoId, "documentos"],
    queryFn: () => listEquipamentoDocumentos({ data: { equipamento_id: equipamentoId } }),
    enabled: !!equipamentoId,
  });