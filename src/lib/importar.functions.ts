import { createServerFn } from "@tanstack/react-start";
import { assertCanAccessModule } from "@/lib/admin-guard";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type AnySb = any;

const RowSchema = z.record(z.string(), z.union([z.string(), z.number(), z.null()]));

const ImportInput = z.object({
  entity: z.enum(["clientes", "fornecedores"]),
  rows: z.array(RowSchema).min(1).max(500),
});

export const bulkImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ImportInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, data.entity);
    const sb = context.supabase as AnySb;
    const results = { inserted: 0, skipped: 0, errors: [] as string[] };

    if (data.entity === "clientes") {
      for (const r of data.rows) {
        const razao = String(r.razao_social ?? "").trim();
        if (!razao) {
          results.skipped++;
          continue;
        }
        const payload: any = {
          razao_social: razao,
          nome_fantasia: r.nome_fantasia ? String(r.nome_fantasia) : null,
          cnpj: r.cnpj ? String(r.cnpj).replace(/\D/g, "") : null,
          pais: r.pais ? String(r.pais) : "BR",
          email: r.email ? String(r.email) : null,
          telefone: r.telefone ? String(r.telefone) : null,
          endereco_cidade: r.cidade ? String(r.cidade) : null,
          endereco_estado: r.estado ? String(r.estado) : null,
          status: "ativo",
          origem_criacao: "import_wizard",
        };
        const { error } = await sb.from("clientes").insert(payload);
        if (error) {
          results.errors.push(`${razao}: ${error.message}`);
        } else {
          results.inserted++;
        }
      }
    } else {
      for (const r of data.rows) {
        const razao = String(r.razao_social ?? "").trim();
        if (!razao) {
          results.skipped++;
          continue;
        }
        const payload: any = {
          razao_social: razao,
          nome_fantasia: r.nome_fantasia ? String(r.nome_fantasia) : null,
          cnpj: r.cnpj ? String(r.cnpj).replace(/\D/g, "") : null,
          pais: r.pais ? String(r.pais) : "BR",
          email: r.email ? String(r.email) : null,
          telefone: r.telefone ? String(r.telefone) : null,
          status: "ativo",
        };
        const { error } = await sb.from("fornecedores").insert(payload);
        if (error) {
          results.errors.push(`${razao}: ${error.message}`);
        } else {
          results.inserted++;
        }
      }
    }
    return results;
  });
