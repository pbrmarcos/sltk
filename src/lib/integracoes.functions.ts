import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admin-guard";

export const listIntegracoes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("integracoes_config")
      .select("*")
      .order("ordem", { ascending: true })
      .order("pais", { ascending: true });
    if (error) throw friendlyDbError(error);
    const providers = data ?? [];

    // Sincroniza com paises_config: países sem provedor recebem placeholder "Futuro"
    const { data: paises, error: pErr } = await context.supabase
      .from("paises_config")
      .select("codigo, nome")
      .order("nome", { ascending: true });
    if (pErr) throw friendlyDbError(pErr);

    const comProvider = new Set(providers.map((p) => p.pais));
    const placeholders = (paises ?? [])
      .filter((p) => !comProvider.has(p.codigo))
      .map((p) => ({
        provider: `_placeholder_${p.codigo.toLowerCase()}`,
        pais: p.codigo,
        nome: `${p.nome} — em breve`,
        descricao: "Nenhum provedor de autocompletar fiscal cadastrado para este país ainda.",
        ativo: false,
        requer_chave: false,
        secret_name: null as string | null,
        disponivel: false,
        ordem: 9999,
        updated_by: null as string | null,
        created_at: new Date(0).toISOString(),
        updated_at: new Date(0).toISOString(),
      }));

    // Ordena: por país (nome), depois ordem
    const paisNome = new Map((paises ?? []).map((p) => [p.codigo, p.nome] as const));
    const all = [...providers, ...placeholders];
    all.sort((a, b) => {
      const na = paisNome.get(a.pais) ?? a.pais;
      const nb = paisNome.get(b.pais) ?? b.pais;
      if (na !== nb) return na.localeCompare(nb, "pt-BR");
      return (a.ordem ?? 0) - (b.ordem ?? 0);
    });
    return all;
  });

/**
 * Versão leve para uso no formulário de cliente: retorna apenas
 * { pais -> { hasActive, hasAvailable } } com base em integracoes_config.
 * Útil para decidir habilitar/desabilitar o botão "Buscar".
 */
export const listProvedoresAtivosPorPais = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("integracoes_config")
      .select("pais, ativo, disponivel");
    if (error) throw friendlyDbError(error);
    const map: Record<string, { hasActive: boolean; hasAvailable: boolean }> = {};
    for (const r of data ?? []) {
      const cur = map[r.pais] ?? { hasActive: false, hasAvailable: false };
      if (r.ativo && r.disponivel) cur.hasActive = true;
      if (r.disponivel) cur.hasAvailable = true;
      map[r.pais] = cur;
    }
    return map;
  });

const toggleInput = z.object({
  provider: z.string().min(1).max(60),
  ativo: z.boolean(),
});

export const toggleIntegracao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => toggleInput.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const admin = context.supabase;
    const { error } = await admin
      .from("integracoes_config")
      .update({ ativo: data.ativo, updated_by: context.userId })
      .eq("provider", data.provider)
      .eq("disponivel", true);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });