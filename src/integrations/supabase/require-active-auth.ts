/**
 * Middleware server-side que estende `requireSupabaseAuth` bloqueando usuários
 * desabilitados / soft-deleted mesmo com JWT ainda válido.
 *
 * Uso:
 * ```ts
 * export const minhaFn = createServerFn({ method: 'POST' })
 *   .middleware([requireActiveSupabaseAuth])
 *   .handler(async ({ context }) => { ... });
 * ```
 *
 * Context adicionado: nenhum além do que `requireSupabaseAuth` já provê
 * (`supabase`, `userId`, `claims`).
 */
import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertActiveUser, AdminGuardError } from "@/lib/admin-guard";

export const requireActiveSupabaseAuth = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    try {
      await assertActiveUser(context.supabase, context.userId);
    } catch (err) {
      if (err instanceof AdminGuardError) {
        // 401 traduzido pelo TanStack como Unauthorized no cliente.
        throw new Error(err.message);
      }
      throw err;
    }
    return next({ context });
  });
