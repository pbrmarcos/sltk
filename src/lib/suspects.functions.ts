// Suspect por foto: o vendedor fotografa um cartão de visita OU a parte do
// produto que identifica o fabricante; o Gemini extrai os dados, o motor de
// qualificação dá a nota A/B/C, e o sistema cria cliente (status suspect) +
// oportunidade no estágio "novo" do pipeline.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { friendlyDbError } from "@/lib/db-errors";
import { logAuditServer } from "@/lib/audit.server";
import type { QualifyResult } from "@/lib/lead-qualify.server";

export type SuspectExtracted = {
  tipo_detectado?: "cartao_visita" | "produto" | "outro" | null;
  empresa?: string | null;
  nome?: string | null;
  cargo?: string | null;
  email?: string | null;
  telefone?: string | null;
  site?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  pais_iso2?: string | null;
  documento_fiscal?: string | null;
  produto_descricao?: string | null;
  segmento_sugerido?: string | null;
  observacoes?: string | null;
};

const SCAN_SUSPECT_PROMPT = `Você extrai dados de leads industriais para a SLTK Americas (máquinas de envase e embalagem).
As imagens podem ser: (a) CARTÃO DE VISITA de um contato, ou (b) FOTO DE UM PRODUTO/EMBALAGEM mostrando quem fabrica (rótulo com "fabricado por", marca, CNPJ, site).
Extraia o MÁXIMO de informação e devolva APENAS JSON válido:
{
  "tipo_detectado": "cartao_visita|produto|outro",
  "empresa": "nome da empresa/fabricante",
  "nome": "nome da pessoa (cartão)",
  "cargo": "cargo da pessoa",
  "email": "e-mail",
  "telefone": "telefone com DDD/DDI, só dígitos e +",
  "site": "site sem http",
  "endereco": "endereço se visível",
  "cidade": "cidade",
  "pais_iso2": "BR|AR|CL|MX|... (deduza pelo idioma/DDI/endereço)",
  "documento_fiscal": "CNPJ/RUT/RUC se visível no rótulo",
  "produto_descricao": "o que é o produto da foto (ex.: 'molho de pimenta 150ml vidro, tampa rosca')",
  "segmento_sugerido": "segmento industrial provável do fabricante (ex.: alimentos - molhos e condimentos)",
  "observacoes": "qualquer outra informação útil pro vendedor (1-2 frases)"
}
Campos não visíveis = null. NÃO invente dados.`;

const scanInput = z.object({
  imagens: z
    .array(z.object({ base64: z.string().min(20), mime: z.string().min(3).max(60) }))
    .min(1)
    .max(3),
});

export const scanSuspectFoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof scanInput>) => scanInput.parse(d))
  .handler(
    async ({
      data,
      context,
    }): Promise<
      | {
          ok: true;
          extracted: SuspectExtracted;
          qualify: QualifyResult | null;
          qualifyError: string | null;
        }
      | { ok: false; error: string }
    > => {
      const { assertCanAccessModule } = await import("@/lib/admin-guard");
      await assertCanAccessModule(
        context.supabase,
        context.userId,
        "clientes",
        "Acesso restrito ao módulo de clientes.",
      );

      const { aiVisionJson } = await import("@/lib/ai-gateway.server");
      let extracted: SuspectExtracted | null = null;
      try {
        extracted = await aiVisionJson<SuspectExtracted>({
          prompt: SCAN_SUSPECT_PROMPT,
          imagens: data.imagens,
          maxOutputTokens: 800,
        });
      } catch (err) {
        return {
          ok: false as const,
          error: err instanceof Error ? err.message : "Falha na leitura por IA.",
        };
      }
      if (!extracted?.empresa && !extracted?.nome && !extracted?.produto_descricao) {
        return {
          ok: false as const,
          error:
            "A IA não conseguiu identificar empresa, contato ou produto nas imagens. Tente uma foto mais nítida ou preencha manualmente.",
        };
      }

      // Qualificação completa (site → CNPJ/Receita → já-é-cliente → regras → nota).
      let qualify: QualifyResult | null = null;
      let qualifyError: string | null = null;
      if (extracted.empresa) {
        try {
          const { qualificarLead } = await import("@/lib/lead-qualify.server");
          qualify = await qualificarLead({
            empresa: extracted.empresa,
            pais: extracted.pais_iso2,
            cidade: extracted.cidade,
            telefone: extracted.telefone,
            email: extracted.email,
            site: extracted.site,
            documento: extracted.documento_fiscal,
            segmento: extracted.segmento_sugerido,
            origem: "foto",
            extras: [extracted.produto_descricao, extracted.observacoes]
              .filter(Boolean)
              .join(" · "),
            imagens: data.imagens,
            userId: context.userId,
          });
        } catch (err) {
          qualifyError = err instanceof Error ? err.message : "Falha na qualificação.";
        }
      }

      return { ok: true as const, extracted, qualify, qualifyError };
    },
  );

const createInput = z.object({
  empresa: z.string().trim().min(2).max(200),
  pais: z.string().trim().length(2).toUpperCase().default("BR"),
  cidade: z.string().trim().max(120).optional().nullable(),
  endereco: z.string().trim().max(300).optional().nullable(),
  site: z.string().trim().max(200).optional().nullable(),
  documento_fiscal: z.string().trim().max(40).optional().nullable(),
  contato_nome: z.string().trim().min(1).max(120),
  contato_cargo: z.string().trim().max(120).optional().nullable(),
  contato_email: z.string().trim().email().max(255).optional().nullable().or(z.literal("")),
  contato_telefone: z.string().trim().max(40).optional().nullable(),
  observacoes: z.string().trim().max(2000).optional().nullable(),
  grade: z.enum(["A", "B", "C"]).optional().nullable(),
  analise_motivo: z.string().max(1000).optional().nullable(),
  confirmar_duplicata: z.boolean().optional().default(false),
});

export const createSuspectRapido = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.infer<typeof createInput>) => createInput.parse(d))
  .handler(async ({ data, context }) => {
    const { assertCanAccessModule } = await import("@/lib/admin-guard");
    await assertCanAccessModule(
      context.supabase,
      context.userId,
      "clientes",
      "Acesso restrito ao módulo de clientes.",
    );

    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const admin = (await getCriticalClient()) as unknown as {
      from: (t: string) => {
        select: (c: string) => {
          ilike: (
            c: string,
            v: string,
          ) => { limit: (n: number) => Promise<{ data: Array<Record<string, unknown>> | null }> };
          eq: (
            c: string,
            v: string,
          ) => { maybeSingle: () => Promise<{ data: Record<string, unknown> | null }> };
        };
        insert: (v: unknown) => {
          select: (c: string) => {
            single: () => Promise<{ data: Record<string, unknown> | null; error: unknown }>;
          };
        };
      };
    };

    // Duplicata por razão social (confirmável).
    if (!data.confirmar_duplicata) {
      const { data: parecidos } = await admin
        .from("clientes")
        .select("id, razao_social, codigo")
        .ilike("razao_social", `%${data.empresa.slice(0, 40)}%`)
        .limit(3);
      if (parecidos?.length) {
        return {
          ok: false as const,
          needsConfirm: true as const,
          candidatos: parecidos as Array<{ id: string; razao_social: string; codigo: string }>,
        };
      }
    }

    // País → moeda/idioma/tipo de documento (fallback BR).
    const { data: paisCfg } = await admin
      .from("paises_config")
      .select("codigo, documento_nome, moeda_padrao, idioma_padrao")
      .eq("codigo", data.pais)
      .maybeSingle();
    const { toMoedaISO } = await import("@/lib/moedas");
    const moeda = toMoedaISO(paisCfg?.moeda_padrao ?? "BRL", "USD");
    const idioma = (paisCfg?.idioma_padrao as string) ?? "pt";
    const docTipo = (paisCfg?.documento_nome as string) ?? "CNPJ";

    const docDigits = (data.documento_fiscal ?? "").replace(/\D/g, "");
    const documento = docDigits || `SUSPECT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

    const { data: cliente, error: cliErr } = await admin
      .from("clientes")
      .insert({
        codigo: "",
        razao_social: data.empresa,
        nome_fantasia: data.empresa,
        pais: data.pais,
        documento_fiscal_tipo: docTipo,
        documento_fiscal_numero: documento,
        moeda,
        idioma,
        status: "suspect",
        site: data.site || null,
        endereco_cidade: data.cidade || null,
        endereco_logradouro: data.endereco || null,
        observacoes:
          [
            "Criado via Suspect por foto.",
            data.grade ? `Qualificação IA: nota ${data.grade}.` : null,
            data.analise_motivo || null,
            data.observacoes || null,
          ]
            .filter(Boolean)
            .join("\n") || null,
        created_by: context.userId,
      })
      .select("id, codigo, razao_social")
      .single();
    if (cliErr) throw friendlyDbError(cliErr as never);
    const clienteRow = cliente as { id: string; codigo: string; razao_social: string };

    const { error: ctErr } = (await (
      admin as unknown as {
        from: (t: string) => { insert: (v: unknown) => Promise<{ error: unknown }> };
      }
    )
      .from("cliente_contatos")
      .insert({
        cliente_id: clienteRow.id,
        nome: data.contato_nome,
        cargo: data.contato_cargo || null,
        email: data.contato_email || null,
        telefone_numero: data.contato_telefone || null,
        principal: true,
      })) as { error: unknown };
    if (ctErr) throw friendlyDbError(ctErr as never);

    // Oportunidade no pipeline (estágio padrão "novo" = suspect).
    const { data: op, error: opErr } = await admin
      .from("oportunidades")
      .insert({
        titulo: `Suspect por foto — ${data.empresa}`.slice(0, 200),
        empresa_lead: data.empresa,
        nome_lead: data.contato_nome,
        email: data.contato_email || null,
        telefone: data.contato_telefone || null,
        cliente_id: clienteRow.id,
        responsavel_id: context.userId,
        probabilidade: 10,
        observacoes:
          [
            "Origem: suspect por foto (cartão de visita / produto).",
            data.grade ? `Qualificação IA: nota ${data.grade}.` : null,
            data.analise_motivo || null,
            data.observacoes || null,
          ]
            .filter(Boolean)
            .join("\n") || null,
        created_by: context.userId,
      })
      .select("id, codigo")
      .single();
    if (opErr) throw friendlyDbError(opErr as never);
    const opRow = op as { id: string; codigo: string };

    const adminClient = await getCriticalClient();
    await logAuditServer(adminClient, context.userId, [
      {
        table_name: "clientes",
        record_id: clienteRow.id,
        action: "INSERT",
        field_changed: "suspect_por_foto",
        new_value: { empresa: data.empresa, grade: data.grade ?? null },
      },
    ]);

    return {
      ok: true as const,
      cliente: clienteRow,
      oportunidade: opRow,
    };
  });
