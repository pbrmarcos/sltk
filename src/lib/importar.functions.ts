import { createServerFn } from "@tanstack/react-start";
import { assertCanAccessModule } from "@/lib/admin-guard";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { loadPais } from "@/lib/clientes.functions";
import { normalizeDocumento } from "@/lib/clientes.shared";
import { validarDocumentoFiscal } from "@/lib/documentos-fiscais";

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
        const docRaw = String(r.cnpj ?? r.documento_fiscal_numero ?? "").trim();
        if (!razao || !docRaw) {
          results.skipped++;
          continue;
        }
        const paisCodigo = r.pais ? String(r.pais) : "BR";
        try {
          const pais = await loadPais(sb, paisCodigo);
          const documento = normalizeDocumento(docRaw);
          const check = validarDocumentoFiscal(paisCodigo, documento);
          if (!check.ok) {
            results.errors.push(`${razao}: ${check.mensagem ?? "documento fiscal inválido"}`);
            continue;
          }
          const payload: Record<string, unknown> = {
            razao_social: razao,
            nome_fantasia: r.nome_fantasia ? String(r.nome_fantasia) : null,
            documento_fiscal_numero: documento,
            documento_fiscal_tipo: pais.documento_nome,
            pais: paisCodigo,
            email_corporativo: r.email ? String(r.email) : null,
            telefone_corporativo_numero: r.telefone ? String(r.telefone) : null,
            endereco_cidade: r.cidade ? String(r.cidade) : null,
            endereco_estado: r.estado ? String(r.estado) : null,
            status: "ativo",
          };
          const { error } = await sb.from("clientes").insert(payload);
          if (error) {
            results.errors.push(`${razao}: ${error.message}`);
          } else {
            results.inserted++;
          }
        } catch (e) {
          results.errors.push(`${razao}: ${e instanceof Error ? e.message : "erro desconhecido"}`);
        }
      }
    } else {
      for (const r of data.rows) {
        const nome = String(r.razao_social ?? r.nome ?? "").trim();
        if (!nome) {
          results.skipped++;
          continue;
        }
        const paisCodigo = r.pais ? String(r.pais) : "BR";
        const taxId = r.cnpj ? String(r.cnpj).replace(/\D/g, "") : null;
        const payload: Record<string, unknown> = {
          nome,
          nome_fantasia: r.nome_fantasia ? String(r.nome_fantasia) : null,
          tax_id: taxId,
          tax_id_tipo: taxId ? (paisCodigo === "BR" ? "CNPJ" : "OTHER") : null,
          pais: paisCodigo,
          email_corporativo: r.email ? String(r.email) : null,
          telefone_numero: r.telefone ? String(r.telefone) : null,
          status: "ativo",
        };
        const { error } = await sb.from("fornecedores").insert(payload);
        if (error) {
          results.errors.push(`${nome}: ${error.message}`);
        } else {
          results.inserted++;
        }
      }
    }
    return results;
  });
