import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getPendenciasSidebar } from "@/lib/pendencias.functions";
import { useAuth } from "@/hooks/use-auth";

export function usePendenciasSidebar() {
  const { user } = useAuth();
  const fn = useServerFn(getPendenciasSidebar);
  return useQuery({
    queryKey: ["pendencias-sidebar", user?.id],
    queryFn: () => fn(),
    enabled: !!user?.id,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}
