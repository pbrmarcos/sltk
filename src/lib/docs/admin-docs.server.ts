/* eslint-disable @typescript-eslint/no-explicit-any */

export async function snapshotBloco(
  supabaseAdmin: any,
  blocoId: string,
  userId: string,
  userNome: string | null,
  acao: "editado" | "restaurado" | "traduzido_auto" | "criado",
  comentario: string | null,
  restauradoDe: string | null,
): Promise<void> {
  const { data: cur } = await supabaseAdmin
    .from("documento_blocos")
    .select("*")
    .eq("id", blocoId)
    .maybeSingle();
  if (!cur) return;

  const { data: last } = await supabaseAdmin
    .from("documento_bloco_versoes")
    .select("versao_seq")
    .eq("bloco_id", blocoId)
    .order("versao_seq", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSeq = ((last?.versao_seq as number | undefined) ?? 0) + 1;
  await supabaseAdmin.from("documento_bloco_versoes").insert({
    bloco_id: blocoId,
    tipo_codigo: cur.tipo_codigo,
    versao_seq: nextSeq,
    conteudo_pt: cur.conteudo_pt ?? {},
    conteudo_es: cur.conteudo_es ?? {},
    conteudo_en: cur.conteudo_en ?? {},
    obrigatorio: !!cur.obrigatorio,
    ordem_padrao: cur.ordem_padrao ?? 0,
    alterado_por: userId,
    alterado_por_nome: userNome,
    comentario,
    acao,
    restaurado_de: restauradoDe,
  });
}

export async function getUserDisplayName(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", userId)
    .maybeSingle();
  return (data?.full_name as string | null) || (data?.email as string | null) || null;
}

export function extractPlaceholders(s: string): string[] {
  const re = /\{\{\s*([\w.]+)\s*\}\}/g;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(s || "")) !== null) out.push(m[1]);
  return out;
}

export { translatePtTo as translateText } from "@/lib/ai-gateway.server";
