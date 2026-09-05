/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { getSupabasePublicConfig } from "@/integrations/supabase/config";
import type { Database } from "@/integrations/supabase/types";

function getPublicSupabase() {
  const { url, publishableKey } = getSupabasePublicConfig();
  return createClient<Database>(url, publishableKey, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  }) as any;
}

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
};

export const Route = createFileRoute("/api/public/entrevista/get")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const codigo = z
            .string()
            .min(4)
            .max(12)
            .parse(url.searchParams.get("codigo") ?? "")
            .toUpperCase();
          const sb = getPublicSupabase();
          const { data, error } = await sb.rpc("get_public_entrevista", { _codigo: codigo });
          if (error) throw error;

          const payload = data ?? { ok: false, error: "not_found" };
          if (payload.ok) return Response.json(payload, { headers: cors });

          const status =
            payload.error === "not_found" ? 404 : payload.error === "invalid" ? 400 : 410;
          return Response.json(payload, { status, headers: cors });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "erro";
          return Response.json({ ok: false, error: msg }, { status: 500, headers: cors });
        }
      },
    },
  },
});
