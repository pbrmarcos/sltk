#!/usr/bin/env node

/**
 * Backfill translations (ES/EN) for entrevista_perguntas.enunciado_* and
 * entrevista_opcoes.label_*.  Uses Lovable AI Gateway.
 *
 * Env: LOVABLE_API_KEY, SB_MANAGEMENT_ACCESS_TOKEN
 */

const PROJECT_REF = "zdrjvjwvrxwxztvrxtwp";
const MGMT = process.env.SB_MANAGEMENT_ACCESS_TOKEN;
const AI_KEY = process.env.GEMINI_API_KEY || process.env.LOVABLE_API_KEY;
const USE_GEMINI = !!process.env.GEMINI_API_KEY;
if (!MGMT || !AI_KEY) {
  console.error("Missing SB_MANAGEMENT_ACCESS_TOKEN or GEMINI_API_KEY/LOVABLE_API_KEY");
  process.exit(1);
}

const BATCH = 25;
const GEMINI_MODEL = "gemini-flash-lite-latest";
const LOVABLE_MODEL = "google/gemini-flash-lite-latest";

async function sql(query) {
  let lastErr;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const r = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
        method: "POST",
        headers: { Authorization: `Bearer ${MGMT}`, "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const t = await r.text();
      if (r.status === 503 || r.status === 502 || r.status === 504 || r.status === 429) {
        const wait = 2000 * Math.pow(2, attempt);
        console.warn(`  SQL ${r.status}, retry in ${wait}ms`);
        await new Promise((res) => setTimeout(res, wait));
        continue;
      }
      if (!r.ok) throw new Error(`SQL ${r.status}: ${t}`);
      return JSON.parse(t);
    } catch (e) {
      lastErr = e;
      const wait = 2000 * Math.pow(2, attempt);
      console.warn(`  SQL exception, retry in ${wait}ms:`, e.message);
      await new Promise((res) => setTimeout(res, wait));
    }
  }
  throw lastErr || new Error("SQL exhausted retries");
}

function esc(s) {
  return String(s).replace(/'/g, "''");
}

function extractArray(content) {
  const tryParse = (s) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };
  let parsed = tryParse(content);
  if (!parsed) {
    const m = content.match(/\[[\s\S]*\]/);
    parsed = m ? tryParse(m[0]) : null;
  }
  if (!parsed) return [];
  return Array.isArray(parsed)
    ? parsed
    : parsed.items ||
        parsed.results ||
        parsed.translations ||
        Object.values(parsed).find(Array.isArray) ||
        [];
}

async function translateBatch(items, target) {
  const langName =
    target === "es" ? "Spanish (neutral, Latin America)" : "English (US, professional)";
  const prompt =
    `Translate each item to ${langName}. Keep meaning, keep it short and professional (industrial B2B / procurement / manufacturing context). ` +
    `Do NOT add explanations. Return ONLY a compact JSON array of objects {"id":"...","t":"..."} matching input length.\n\n` +
    `Input:\n${JSON.stringify(items.map((i) => ({ id: i.id, s: i.text })))}`;

  for (let attempt = 0; attempt < 4; attempt++) {
    let res, content;
    if (USE_GEMINI) {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${AI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
          }),
        },
      );
      if (res.status === 429 || res.status >= 500) {
        const wait = 1000 * Math.pow(2, attempt) * 15;
        console.warn(`  retry in ${wait}ms (status ${res.status})`);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
      const j = await res.json();
      content = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "[]";
    } else {
      res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${AI_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: LOVABLE_MODEL,
          messages: [
            {
              role: "system",
              content: "You are a precise industrial translator. Output valid JSON only.",
            },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (res.status === 429 || res.status >= 500) {
        const wait = 1000 * Math.pow(2, attempt) * 15;
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
      if (!res.ok) throw new Error(`AI ${res.status}: ${await res.text()}`);
      const j = await res.json();
      content = j.choices?.[0]?.message?.content ?? "[]";
    }
    return extractArray(content);
  }
  throw new Error("translate: exhausted retries");
}

async function processTable({ table, textCol, targetPrefix }) {
  for (const target of ["es", "en"]) {
    const targetCol = `${targetPrefix}_${target}`;

    while (true) {
      const rows = await sql(
        `select id, ${textCol} as text from ${table} where ${targetCol} is null or ${targetCol}='' limit ${BATCH};`,
      );
      if (!rows.length) break;
      process.stdout.write(`[${table} ${target}] batch ${rows.length}… `);
      const t0 = Date.now();
      const translated = await translateBatch(rows, target);
      const map = new Map(translated.map((x) => [String(x.id), String(x.t ?? "")]));
      // Build a single UPDATE using CASE
      const cases = rows
        .map((r) => {
          const t = map.get(String(r.id));
          if (!t) return null;
          return `WHEN '${r.id}' THEN '${esc(t)}'`;
        })
        .filter(Boolean)
        .join(" ");
      if (!cases) {
        console.log("no translations returned, skipping ids");
        // mark with source text to avoid infinite loop
        const ids = rows.map((r) => `'${r.id}'`).join(",");
        await sql(`update ${table} set ${targetCol} = ${textCol} where id in (${ids});`);
        continue;
      }
      const ids = rows
        .filter((r) => map.has(String(r.id)))
        .map((r) => `'${r.id}'`)
        .join(",");
      await sql(
        `update ${table} set ${targetCol} = case id::text ${cases} else ${targetCol} end where id in (${ids});`,
      );
      // fallback fill for missing ids
      const missing = rows.filter((r) => !map.has(String(r.id))).map((r) => `'${r.id}'`);
      if (missing.length) {
        await sql(
          `update ${table} set ${targetCol} = ${textCol} where id in (${missing.join(",")});`,
        );
      }
      console.log(`done ${Date.now() - t0}ms`);
    }
  }
}

(async () => {
  console.log("== entrevista_perguntas ==");
  await processTable({
    table: "entrevista_perguntas",
    textCol: "enunciado_pt",
    targetPrefix: "enunciado",
  });
  console.log("== entrevista_opcoes ==");
  await processTable({ table: "entrevista_opcoes", textCol: "label_pt", targetPrefix: "label" });
  console.log("DONE");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
