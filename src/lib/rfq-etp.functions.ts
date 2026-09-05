import { createServerFn } from "@tanstack/react-start";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertEngineerOrHigher } from "@/lib/admin-guard";

/** Equipamentos de um cliente, para escolher onde o ETP será criado. */
export const listEquipamentosDoCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ cliente_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("cliente_equipamentos")
      .select("id, codigo, modelo, status")
      .eq("cliente_id", data.cliente_id)
      .is("deleted_at", null)
      .order("codigo", { ascending: true })
      .limit(200);
    if (error) throw friendlyDbError(error);
    return rows ?? [];
  });

/**
 * Converte o checklist respondido (submissão de RFQ) em um ETP rascunho
 * vinculado a um equipamento do cliente, preservando a rastreabilidade.
 */
export const gerarEtpDeRfq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        submissao_id: z.string().uuid(),
        equipamento_id: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertEngineerOrHigher(context.supabase, context.userId).catch(() => {
      throw new Error("Sem permissão para gerar ETP a partir de um checklist.");
    });

    const { data: sub, error: subErr } = await context.supabase
      .from("rfq_submissao")
      .select(
        "id, cliente_id, idioma, respostas, criado_em, preenchido_por_nome, rfq_formulario_tipo(nome_pt, campos_schema)",
      )
      .eq("id", data.submissao_id)
      .single();
    if (subErr || !sub) throw new Error("Checklist não encontrado.");

    const { data: eqp, error: eqpErr } = await context.supabase
      .from("cliente_equipamentos")
      .select("id, codigo, cliente_id")
      .eq("id", data.equipamento_id)
      .single();
    if (eqpErr || !eqp) throw new Error("Equipamento não encontrado.");

    type Rotulo = { pt?: string; es?: string; en?: string };
    type Campo = { id: string; label?: Rotulo };
    type Secao = { id: string; titulo?: Rotulo; campos?: Campo[] };
    const schema = ((sub as { rfq_formulario_tipo?: { campos_schema?: { secoes?: Secao[] } } })
      .rfq_formulario_tipo?.campos_schema ?? { secoes: [] }) as { secoes?: Secao[] };
    const respostas = (sub.respostas ?? {}) as Record<string, unknown>;

    const blocos: string[] = [];
    for (const sec of schema.secoes ?? []) {
      const linhas: string[] = [];
      for (const campo of sec.campos ?? []) {
        const v = respostas[campo.id];
        if (v === undefined || v === null || v === "") continue;
        const valor = Array.isArray(v)
          ? v.join(", ")
          : typeof v === "boolean"
            ? v
              ? "Sim"
              : "Não"
            : String(v);
        linhas.push(`- ${campo.label?.pt ?? campo.id}: ${valor}`);
      }
      if (linhas.length) {
        blocos.push(`${sec.titulo?.pt ?? sec.id}\n${linhas.join("\n")}`);
      }
    }
    const requisitos = blocos.join("\n\n") || "Checklist sem respostas preenchidas.";
    const tipoNome =
      (sub as { rfq_formulario_tipo?: { nome_pt?: string } }).rfq_formulario_tipo?.nome_pt ??
      "Checklist técnico";

    const { data: maior } = await context.supabase
      .from("equipamento_etps")
      .select("versao")
      .eq("equipamento_id", data.equipamento_id)
      .is("deleted_at", null)
      .order("versao", { ascending: false })
      .limit(1);
    const versao = ((maior?.[0]?.versao as number | undefined) ?? 0) + 1;

    const { data: novo, error } = await context.supabase
      .from("equipamento_etps")
      .insert({
        equipamento_id: data.equipamento_id,
        cliente_id: eqp.cliente_id,
        versao,
        status: "rascunho",
        requisitos_tecnicos: requisitos,
        premissas: `Origem: ${tipoNome} respondido em ${new Date(sub.criado_em as string).toLocaleString("pt-BR")}${sub.preenchido_por_nome ? ` por ${sub.preenchido_por_nome}` : ""}.`,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (error) throw friendlyDbError(error);

    const { data: prof } = await context.supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", context.userId)
      .maybeSingle();
    const nome =
      (prof as { full_name?: string; email?: string } | null)?.full_name ??
      (prof as { full_name?: string; email?: string } | null)?.email ??
      "Usuário";

    await (
      context.supabase as unknown as {
        from: (t: string) => {
          insert: (v: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
        };
      }
    )
      .from("equipamento_etp_historico")
      .insert({
        etp_id: novo.id,
        tipo: "nota",
        mensagem: `ETP gerado a partir do checklist "${tipoNome}" (submissão ${data.submissao_id}) para o equipamento ${eqp.codigo ?? data.equipamento_id}.`,
        created_by: context.userId,
        created_by_nome: nome,
      });

    return { ok: true, etp_id: novo.id as string, versao };
  });
