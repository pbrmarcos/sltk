import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";
import { manterSessaoAcesso, registrarPaginaAcesso } from "@/lib/acesso-log";

const SINAL_MS = 60_000;

/**
 * Mantém a sessão do log de acesso viva enquanto a aba está aberta e visível
 * e registra cada página aberta. Montado uma vez no layout autenticado.
 */
export function useRegistroAcesso(userId: string | null | undefined) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const pronto = useRef(false);
  const ultimaRota = useRef<string | null>(null);

  // Sessão + sinal de vida (só com a aba visível, para medir uso real).
  useEffect(() => {
    if (!userId || typeof window === "undefined") return;
    let ativo = true;
    const sinal = () => {
      if (document.visibilityState !== "visible") return;
      void manterSessaoAcesso(userId)
        .catch(() => undefined)
        .finally(() => {
          if (ativo) pronto.current = true;
        });
    };
    sinal();
    const t = setInterval(sinal, SINAL_MS);
    document.addEventListener("visibilitychange", sinal);
    return () => {
      ativo = false;
      clearInterval(t);
      document.removeEventListener("visibilitychange", sinal);
    };
  }, [userId]);

  // Página aberta: espera o título da tela ser aplicado.
  useEffect(() => {
    if (!userId || typeof window === "undefined") return;
    if (pathname === ultimaRota.current) return;
    ultimaRota.current = pathname;
    const t = setTimeout(
      () => {
        const titulo = document.title.replace(/\s*[·|–-]\s*SLTK.*$/i, "").trim();
        void registrarPaginaAcesso(pathname, titulo).catch(() => undefined);
      },
      pronto.current ? 400 : 2500,
    );
    return () => clearTimeout(t);
  }, [pathname, userId]);
}
