import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getRoleDashboards } from "@/lib/dashboard.functions";

export type RoleDashboardsData = Awaited<ReturnType<typeof getRoleDashboards>>;

export function useRoleDashboards() {
  const fetchData = useServerFn(getRoleDashboards);
  return useQuery({
    queryKey: ["dashboard", "role-panels"],
    queryFn: () => fetchData(),
    staleTime: 60_000,
  });
}
