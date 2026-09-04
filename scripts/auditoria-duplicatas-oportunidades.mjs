#!/usr/bin/env node
/**
 * Auditoria de oportunidades duplicadas.
 *
 * NÃO apaga nada. Por padrão só LISTA os grupos suspeitos.
 * Ações opcionais (sempre explícitas e uma de cada vez):
 *   --merge <codigo-principal> <codigo-secundario>   → move nada; apenas
 *      registra a secundária como perdida com motivo "duplicada de X"
 *      e copia cliente/valor para a principal se estiverem vazios.
 *   --arquivar <codigo>                              → soft delete (deleted_at)
 *
 * Uso:
 *   SB_ACCESS_TOKEN=... node scripts/auditoria-duplicatas-oportunidades.mjs
 *   ... --merge OPP-2026-0009 OPP-2026-0008
 *   ... --arquivar OPP-2026-0008
 */

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? "zdrjvjwvrxwxztvrxtwp";
const TOKEN = process.env.SB_ACCESS_TOKEN;
if (!TOKEN) {
  console.error("Defina SB_ACCESS_TOKEN (token da Management API do Supabase).");
  process.exit(1);
}

async function sql(query) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    },
  );
  const json = await res.json();
  if (!res.ok || json?.message) throw new Error(json?.message ?? `HTTP ${res.status}`);
  return json;
}

const LISTAR = `
WITH base AS (
  SELECT id, codigo, titulo, cliente_id, empresa_lead, valor_estimado,
         pipeline_stage, created_at,
         lower(btrim(titulo)) AS titulo_norm,
         coalesce(cliente_id::text, lower(btrim(coalesce(empresa_lead,'')))) AS alvo
  FROM public.oportunidades
  WHERE deleted_at IS NULL
)
SELECT alvo, titulo_norm, count(*) AS qtd,
       json_agg(json_build_object(
         'codigo', codigo, 'titulo', titulo, 'valor', valor_estimado,
         'stage', pipeline_stage, 'criada_em', created_at
       ) ORDER BY created_at) AS registros
FROM base
WHERE alvo <> ''
GROUP BY alvo, titulo_norm
HAVING count(*) > 1
ORDER BY qtd DESC;
`;

/** Segundo passe: mesmo título/valor criados em janela curta, mesmo que um
 *  registro esteja como lead (empresa_lead) e o outro já vinculado a cliente —
 *  foi exatamente o caso de OPP-2026-0008 / OPP-2026-0009. */
const LISTAR_JANELA = `
SELECT a.codigo AS codigo_a, b.codigo AS codigo_b, a.titulo,
       a.valor_estimado, a.pipeline_stage AS stage_a, b.pipeline_stage AS stage_b,
       a.created_at AS criada_a, b.created_at AS criada_b,
       round(extract(epoch FROM (b.created_at - a.created_at))/60)::int AS minutos
FROM public.oportunidades a
JOIN public.oportunidades b
  ON b.created_at > a.created_at
 AND b.created_at < a.created_at + interval '24 hours'
 AND lower(btrim(b.titulo)) = lower(btrim(a.titulo))
 AND (b.valor_estimado IS NOT DISTINCT FROM a.valor_estimado)
WHERE a.deleted_at IS NULL AND b.deleted_at IS NULL
ORDER BY a.created_at DESC;
`;

const args = process.argv.slice(2);

if (args[0] === "--arquivar" && args[1]) {
  const codigo = args[1].replace(/'/g, "");
  await sql(
    `UPDATE public.oportunidades SET deleted_at = now() WHERE codigo = '${codigo}' AND deleted_at IS NULL`,
  );
  console.log(`Arquivada (soft delete): ${codigo}`);
  process.exit(0);
}

if (args[0] === "--merge" && args[1] && args[2]) {
  const principal = args[1].replace(/'/g, "");
  const secundaria = args[2].replace(/'/g, "");
  await sql(`
    UPDATE public.oportunidades p SET
      cliente_id = coalesce(p.cliente_id, s.cliente_id),
      valor_estimado = coalesce(p.valor_estimado, s.valor_estimado),
      observacoes = concat_ws(E'\\n', p.observacoes, 'Mesclada com ${secundaria}.')
    FROM public.oportunidades s
    WHERE p.codigo = '${principal}' AND s.codigo = '${secundaria}';

    UPDATE public.oportunidades SET
      pipeline_stage = 'perdido',
      lost_reason = 'Registro duplicado — mesclado em ${principal}.'
    WHERE codigo = '${secundaria}' AND deleted_at IS NULL;
  `);
  console.log(`Mesclado: ${secundaria} → ${principal} (nada foi apagado).`);
  process.exit(0);
}

const grupos = await sql(LISTAR);
if (grupos.length === 0) {
  console.log("Nenhuma duplicata encontrada.");
} else {
  console.log(`${grupos.length} grupo(s) suspeito(s):\n`);
  for (const g of grupos) {
    console.log(`• ${g.titulo_norm} (alvo ${g.alvo}) — ${g.qtd} registros`);
    for (const r of g.registros) {
      console.log(`   - ${r.codigo} | ${r.stage} | valor ${r.valor ?? "—"} | ${r.criada_em}`);
    }
    console.log("");
  }
  console.log("Nada foi alterado. Use --merge ou --arquivar para agir caso a caso.");
}

const janela = await sql(LISTAR_JANELA);
if (janela.length > 0) {
  console.log(`\n${janela.length} par(es) com mesmo título e valor criados em menos de 24h:\n`);
  for (const r of janela) {
    console.log(
      `• ${r.codigo_a} (${r.stage_a}) x ${r.codigo_b} (${r.stage_b}) — "${r.titulo}" | valor ${r.valor_estimado ?? "—"} | intervalo ${r.minutos} min`,
    );
  }
  console.log("\nNada foi alterado. Use --merge <principal> <secundaria> ou --arquivar <codigo>.");
}
