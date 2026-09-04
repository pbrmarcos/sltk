import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { getMyModules, type AppModule } from "@/lib/permissoes.functions";
import { useAuth } from "@/hooks/use-auth";

export function useMyModules() {
  const { user } = useAuth();
  const fetchFn = useServerFn(getMyModules);
  const q = useQuery({
    queryKey: ["my-modules", user?.id ?? null],
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (prev) => prev,
    queryFn: () => fetchFn(),
  });
  const set = useMemo(() => new Set<AppModule>((q.data ?? []) as AppModule[]), [q.data]);
  return {
    modules: set,
    // Primeiro carregamento apenas; revalidação de fundo não é "loading".
    loading: !!user && q.isPending && q.data === undefined,
    canAccess: (m: AppModule) => set.has(m),
  };
}
