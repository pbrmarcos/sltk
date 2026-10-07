import { createMiddleware } from "@tanstack/react-start";
import { SESSAO_HEADER, sessaoAcessoAtual } from "@/lib/acesso-log";
import { ehAcaoRegistravel } from "@/lib/acesso-log.shared";

/**
 * Registra no log de acesso cada ação feita no servidor (criar, alterar,
 * arquivar, gerar…), inclusive as recusadas — útil para entender um
 * "sem permissão". Leituras ficam de fora. Nunca atrasa nem derruba a ação:
 * o registro é disparado em segundo plano e qualquer falha é ignorada.
 */
export const registrarAcoesDeAcesso = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    const sessao = sessaoAcessoAtual();
    return next({ headers: sessao ? { [SESSAO_HEADER]: sessao } : {} });
  })
  .server(async ({ next, serverFnMeta }) => {
    const nome = serverFnMeta?.name ?? "";
    if (!ehAcaoRegistravel(nome)) return next();
    try {
      const res = await next();
      void registrar(nome, serverFnMeta?.filename ?? null, true, null);
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      void registrar(nome, serverFnMeta?.filename ?? null, false, msg);
      throw err;
    }
  });

async function registrar(
  funcao: string,
  arquivo: string | null,
  sucesso: boolean,
  erro: string | null,
) {
  try {
    const [{ getRequest }, { createClient }, { getSupabasePublicConfig }] = await Promise.all([
      import("@tanstack/react-start/server"),
      import("@supabase/supabase-js"),
      import("@/integrations/supabase/config"),
    ]);
    const req = getRequest();
    const auth = req?.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) return; // sem usuário logado: nada a registrar
    const { url, publishableKey } = getSupabasePublicConfig();
    if (!url || !publishableKey) return;
    const sb = createClient(url, publishableKey, {
      global: { headers: { Authorization: auth } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const rpc = sb.rpc.bind(sb) as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<unknown>;
    await rpc("acesso_registrar_acao", {
      _sessao: req?.headers.get(SESSAO_HEADER) || null,
      _funcao: funcao,
      _arquivo: arquivo,
      _sucesso: sucesso,
      _erro: erro,
    });
  } catch {
    /* log é melhor esforço */
  }
}
