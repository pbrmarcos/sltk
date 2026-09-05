import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "admin"
  | "manager"
  | "engineer"
  | "production"
  | "purchasing"
  | "assembly"
  | "field"
  | "sales";

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Admin",
  manager: "Estratégico",
  engineer: "Projeto",
  production: "Automação",
  purchasing: "Compras / PCP",
  assembly: "Montagem",
  field: "Ajuste / Instalação",
  sales: "Pilares",
};

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  language: string;
  avatar_url: string | null;
  must_change_password?: boolean | null;
};

export const SESSION_MAX_MS = 8 * 60 * 60 * 1000; // 8h
export const LOGIN_AT_KEY = "sltk_login_at";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  roleLoading: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const signOut = useMemo(
    () => async () => {
      try {
        await queryClient.cancelQueries();
      } catch {
        /* ignore */
      }
      localStorage.removeItem(LOGIN_AT_KEY);
      try {
        await supabase.auth.signOut();
      } catch {
        /* ignore */
      }
      queryClient.clear();
      // Hard reload to fully tear down any in-flight protected queries / cached UI.
      if (typeof window !== "undefined") {
        window.location.replace("/login");
      } else {
        navigate({ to: "/login", replace: true });
      }
    },
    [queryClient, navigate],
  );

  // Initial session + listener
  const lastUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      lastUserIdRef.current = data.session?.user.id ?? null;
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      const nextUserId = s?.user.id ?? null;
      const changedIdentity = nextUserId !== lastUserIdRef.current;

      // Só trocamos o objeto de sessão no state quando a identidade (ou a
      // presença de sessão) muda. TOKEN_REFRESHED apenas rotaciona o access
      // token, que o supabase-js guarda internamente — tanto o cliente do
      // browser quanto o attacher (supabase.auth.getSession() no momento da
      // chamada) sempre usam o token mais recente, sem depender deste state.
      if (changedIdentity) {
        lastUserIdRef.current = nextUserId;
        setSession(s);
      }

      if (event === "SIGNED_OUT") {
        localStorage.removeItem(LOGIN_AT_KEY);
        queryClient.clear();
        return;
      }
      // INITIAL_SESSION hidrata a sessão (acima) mas nunca invalida queries.
      if (event === "USER_UPDATED" || (event === "SIGNED_IN" && changedIdentity)) {
        queryClient.invalidateQueries({ queryKey: ["user-role"] });
        queryClient.invalidateQueries({ queryKey: ["profile"] });
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [queryClient]);

  // 8h fixed-session timer
  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (!session) return;
    const raw = localStorage.getItem(LOGIN_AT_KEY);
    const loginAt = raw ? Number(raw) : NaN;
    if (!Number.isFinite(loginAt)) return;
    const remaining = loginAt + SESSION_MAX_MS - Date.now();
    if (remaining <= 0) {
      void signOut();
      return;
    }
    timeoutRef.current = setTimeout(() => {
      void signOut();
    }, remaining);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [session, signOut]);

  const userId = session?.user.id ?? null;

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, language, avatar_url, must_change_password")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      return (data as Profile | null) ?? null;
    },
  });

  const { data: role, isPending: rolePending } = useQuery({
    queryKey: ["user-role", userId],
    enabled: !!userId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!);
      if (error) throw error;
      const roles = ((data ?? []) as { role: AppRole }[]).map((row) => row.role);
      const priority: AppRole[] = [
        "admin",
        "manager",
        "engineer",
        "production",
        "purchasing",
        "assembly",
        "field",
        "sales",
      ];
      return priority.find((candidate) => roles.includes(candidate)) ?? null;
    },
  });

  // Só é "loading" no primeiro carregamento sem nenhum dado em cache.
  // Revalidação de fundo nunca volta a ligar esta flag.
  const roleLoading = !!userId && rolePending && role === undefined;

  const user = session?.user ?? null;
  const userEmail = user?.email ?? null;
  const profileValue = profile ?? null;
  const roleValue = role ?? null;

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      profile: profileValue,
      role: roleValue,
      roleLoading,
      loading,
      signOut,
    }),
    // Dependências mínimas e estáveis: identidade, papel e flags.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId, userEmail, profileValue, roleValue, roleLoading, loading, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
