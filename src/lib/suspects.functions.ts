// Suspect por foto: dentro do "Nova oportunidade" o vendedor fotografa um
// cartão de visita OU o rótulo de um produto (ex.: pacote no supermercado). O
// Gemini lê a foto (rápido, sem pesquisa), lista as empresas do rótulo com o
// papel de cada uma e casa o ramo com a tabela `segmentos`. A pesquisa pesada
// (Receita, site, Google, nota A/B/C) fica para o "Minerar dados" da ficha.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { friendlyDbError } from "@/lib/db-errors";
import { logAuditServer } from "@/lib/audit.server";

export type SuspectPapel = "fabricante" | "importador" | "distribuidor" | "marca" | "contato";

export type SuspectEmpresa = {
  papel: SuspectPapel;
  nome: string;
  documento?: string | null;
  pais_iso2?: string | null;
  cidade?: string | null;
  endereco?: string | null;
  site?: string | null;
  telefone?: string | null;
  email?: string | null;
};

export type SuspectScan = {
  tipo_detectado: "cartao_visita" | "produto" | "outro";
  empresas: SuspectEmpresa[];
  contato: {
    nome?: string | null;
    cargo?: string | null;
    email?: string | null;
    telefone?: string | null;
  };
  produto_descricao: string | null;
  ramo: { segmento_id: string | null; nome: string | null };
  observacoes: string | null;
};

type ScanRaw = {
  tipo_detectado?: string | null;
  empresas?: Array<Partial<SuspectEmpresa>> | null;
  contato?: SuspectScan["contato"] | null;
  produto_descricao?: string | null;
  ramo?: string | null;
  observacoes?: string | null;
};

function scanPrompt(ramos: string[]) {
  return `Você lê fotos para a SLTK Americas (máquinas de envase e embalagem) e identifica empresas que podem virar clientes.
A foto pode ser: (a) CARTÃO DE VISITA, ou (b) RÓTULO/EMBALAGEM de produto (ex.: pacote de supermercado) com "fabricado por", "importado por", "distribuído por", CNPJ, SAC, site.
Liste TODAS as empresas visíveis com o papel de cada uma. Devolva APENAS JSON válido:
{
  "tipo_detectado": "cartao_visita|produto|outro",
  "empresas": [
    { "papel": "fabricante|importador|distribuidor|marca|contato", "nome": "razão social ou nome", "documento": "CNPJ/RUT/RUC só se visível", "pais_iso2": "BR|CL|AR|...", "cidade": "...", "endereco": "...", "site": "sem http", "telefone": "com DDI/DDD", "email": "..." }
  ],
  "contato": { "nome": "pessoa do cartão", "cargo": "...", "email": "...", "telefone": "..." },
  "produto_descricao": "o que é o produto (ex.: papinha de fruta 120g, sachê stand-up com bico)",
  "ramo": "ramo do produto/empresa — use EXATAMENTE um nome desta lista se algum servir: ${ramos.join(" | ")}. Se nenhum servir, sugira um nome curto novo (ex.: Arroz, Leite em pó).",
  "observacoes": "1 frase útil para o vendedor ou null"
}
Regras: cartão de visita → a empresa do cartão tem papel "contato". Rótulo → fabricante primeiro. Campos não visíveis = null. NÃO invente dados.`;
}

const PAPEIS: SuspectPapel[] = ["fabricante", "importador", "distribuidor", "marca", "contato"];
const ORDEM_PAPEL: Record<SuspectPapel, number> = {
  fabricante: 0,
  contato: 1,
  importador: 2,
  distribuidor: 3,
  marca: 4,
};

function norm(v: string) {
  return v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

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
    }): Promise<{ ok: true; scan: SuspectScan } | { ok: false; error: string }> => {
      const { assertCanAccessModule } = await import("@/lib/admin-guard");
      await assertCanAccessModule(
        context.supabase,
        context.userId,
        "clientes",
        "Acesso restrito ao módulo de clientes.",
      );

      const { data: segs } = await context.supabase
        .from("segmentos")
        .select("id, nome")
        .is("deleted_at", null)
        .eq("ativo", true);
      const segmentos = (segs ?? []) as Array<{ id: string; nome: string }>;

      const { aiVisionJson } = await import("@/lib/ai-gateway.server");
      let raw: ScanRaw | null = null;
      try {
        raw = await aiVisionJson<ScanRaw>({
          prompt: scanPrompt(segmentos.map((x) => x.nome)),
          imagens: data.imagens,
          maxOutputTokens: 1200,
        });
      } catch (err) {
        return {
          ok: false as const,
          error: err instanceof Error ? err.message : "Falha na leitura por IA.",
        };
      }

      const empresas: SuspectEmpresa[] = (raw?.empresas ?? [])
        .filter((e) => !!e?.nome && String(e.nome).trim().length >= 2)
        .map((e) => ({
          ...e,
          nome: String(e.nome).trim(),
          papel: PAPEIS.includes(e.papel as SuspectPapel) ? (e.papel as SuspectPapel) : "marca",
          pais_iso2: e.pais_iso2 ? String(e.pais_iso2).slice(0, 2).toUpperCase() : null,
        }))
        .sort((x, y) => ORDEM_PAPEL[x.papel] - ORDEM_PAPEL[y.papel]);

      if (!empresas.length && !raw?.contato?.nome) {
        return {
          ok: false as const,
          error:
            'Não encontrei empresa na foto. Fotografe mais perto do texto "fabricado por" ou preencha à mão.',
        };
      }

      const ramoNome = raw?.ramo?.trim() || null;
      const ramoMatch = ramoNome
        ? segmentos.find((x) => norm(x.nome) === norm(ramoNome))
        : undefined;
      const tipo = raw?.tipo_detectado;

      return {
        ok: true as const,
        scan: {
          tipo_detectado: tipo === "cartao_visita" || tipo === "produto" ? tipo : "outro",
          empresas,
          contato: raw?.contato ?? {},
          produto_descricao: raw?.produto_descricao ?? null,
          ramo: { segmento_id: ramoMatch?.id ?? null, nome: ramoMatch?.nome ?? ramoNome },
          observacoes: raw?.observacoes ?? null,
        },
      };
    },
  );

const createInput = z.object({
  empresa: z.string().trim().min(2).max(200),
  pais: z.string().trim().length(2).toUpperCase().default("BR"),
  cidade: z.string().trim().max(120).optional().nullable(),
  endereco: z.string().trim().max(300).optional().nullable(),
  site: z.string().trim().max(200).optional().nullable(),
  documento_fiscal: z.string().trim().max(40).optional().nullable(),
  contato_nome: z.string().trim().max(120).optional().nullable(),
  contato_cargo: z.string().trim().max(120).optional().nullable(),
  contato_email: z.string().trim().email().max(255).optional().nullable().or(z.literal("")),
  contato_telefone: z.string().trim().max(40).optional().nullable(),
  observacoes: z.string().trim().max(2000).optional().nullable(),
  segmento_id: z.string().uuid().optional().nullable(),
  titulo: z.string().trim().max(200).optional().nullable(),
  origem_id: z.string().uuid().optional().nullable(),
  valor_estimado: z.number().min(0).max(99999999).optional().nullable(),
  valor_estimado_usd: z.number().min(0).max(99999999).optional().nullable(),
  probabilidade: z.number().int().min(0).max(100).optional().nullable(),
  confirmar_duplicata: z.boolean().optional().default(false),
});

export const createSuspectRapido = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: z.input<typeof createInput>) => createInput.parse(d))
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
        segmento_id: data.segmento_id || null,
        lead_origem_id: data.origem_id || null,
        site: data.site || null,
        endereco_cidade: data.cidade || null,
        endereco_logradouro: data.endereco || null,
        observacoes:
          ["Criado por foto no Nova oportunidade.", data.observacoes || null]
            .filter(Boolean)
            .join("\n") || null,
        created_by: context.userId,
      })
      .select("id, codigo, razao_social")
      .single();
    if (cliErr) throw friendlyDbError(cliErr as never);
    const clienteRow = cliente as { id: string; codigo: string; razao_social: string };

    if (data.contato_nome || data.contato_email || data.contato_telefone) {
      const { error: ctErr } = (await (
        admin as unknown as {
          from: (t: string) => { insert: (v: unknown) => Promise<{ error: unknown }> };
        }
      )
        .from("cliente_contatos")
        .insert({
          cliente_id: clienteRow.id,
          nome: data.contato_nome || data.contato_email || data.contato_telefone,
          cargo: data.contato_cargo || null,
          email: data.contato_email || null,
          telefone_numero: data.contato_telefone || null,
          principal: true,
        })) as { error: unknown };
      if (ctErr) throw friendlyDbError(ctErr as never);
    }

    // Oportunidade no pipeline (estágio padrão "novo" = suspect).
    const { data: op, error: opErr } = await admin
      .from("oportunidades")
      .insert({
        titulo: (data.titulo || data.empresa).slice(0, 200),
        empresa_lead: data.empresa,
        nome_lead: data.contato_nome || null,
        email: data.contato_email || null,
        telefone: data.contato_telefone || null,
        cliente_id: clienteRow.id,
        responsavel_id: context.userId,
        probabilidade: data.probabilidade ?? 10,
        valor_estimado: data.valor_estimado ?? null,
        valor_estimado_usd: data.valor_estimado_usd ?? null,
        origem_id: data.origem_id || null,
        observacoes: data.observacoes || null,
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
        new_value: { empresa: data.empresa, segmento_id: data.segmento_id ?? null },
      },
    ]);

    return {
      ok: true as const,
      cliente: clienteRow,
      oportunidade: opRow,
    };
  });
