import { queryOptions } from "@tanstack/react-query";
import { listSegmentos } from "@/lib/segmentos.functions";
import { listLeadOrigens } from "@/lib/lead-origens.functions";

export const segmentosQueryOptions = () =>
  queryOptions({
    queryKey: ["cadastros", "segmentos"],
    queryFn: () => listSegmentos(),
    staleTime: 1000 * 60 * 5,
  });

export const leadOrigensQueryOptions = () =>
  queryOptions({
    queryKey: ["cadastros", "lead_origens"],
    queryFn: () => listLeadOrigens(),
    staleTime: 1000 * 60 * 5,
  });