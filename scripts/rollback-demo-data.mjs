#!/usr/bin/env bun
// Helper de iteração: apaga tudo que está em demo_seed_registry, na ordem
// certa (filho -> pai), e limpa o registro. Não toca no sat_template/
// checklist_formulario_tipo reaproveitados (nunca são rastreados).
// Uso: bun scripts/rollback-demo-data.mjs

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
function loadEnv() {
  const txt = readFileSync(join(__dirname, "..", ".env"), "utf-8");
  for (const line of txt.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) {
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[m[1]] === undefined) process.env[m[1]] = val;
    }
  }
}
loadEnv();

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Filho -> pai. Qualquer tabela não listada aqui, mas presente no registro,
// é apagada por último, numa passada genérica (evita esquecer alguma).
const ORDER = [
  "montagem_etapa_evidencias",
  "montagem_etapa_checklist_resposta",
  "equipamento_montagem_etapas",
  "equipamento_montagens",
  "checklist_submissao",
  "checklist_formulario_link",
  "logistica_embarques",
  "chamados",
  "sat_relatorio",
  "fat_relatorios",
  "equipamento_revisoes",
  "equipamento_projetos",
  "equipamento_etps",
  "cliente_equipamentos",
  "processos",
  "oportunidades",
  "cliente_contatos",
  "clientes",
];

async function main() {
  const { data: rows, error } = await sb.from("demo_seed_registry").select("table_name, record_id");
  if (error) throw new Error(error.message);
  const byTable = new Map();
  for (const r of rows) {
    if (!byTable.has(r.table_name)) byTable.set(r.table_name, []);
    byTable.get(r.table_name).push(r.record_id);
  }

  // Evidências de montagem: apaga o arquivo do storage antes da linha.
  if (byTable.has("montagem_etapa_evidencias")) {
    const { data: evid } = await sb
      .from("montagem_etapa_evidencias")
      .select("id, storage_path")
      .in("id", byTable.get("montagem_etapa_evidencias"));
    for (const e of evid ?? []) {
      if (e.storage_path) await sb.storage.from("montagem-evidencias").remove([e.storage_path]);
    }
  }

  const tables = [
    ...ORDER.filter((t) => byTable.has(t)),
    ...[...byTable.keys()].filter((t) => !ORDER.includes(t)),
  ];
  for (const table of tables) {
    const ids = byTable.get(table);
    const { error: delErr } = await sb.from(table).delete().in("id", ids);
    if (delErr) {
      console.error(`  aviso: falha ao apagar ${table}: ${delErr.message}`);
      continue;
    }
    console.log(`  apagado ${ids.length} de ${table}`);
  }

  const { error: regErr } = await sb.from("demo_seed_registry").delete().neq("table_name", "");
  if (regErr) throw new Error(regErr.message);
  console.log("demo_seed_registry limpo.");
}

main().catch((e) => {
  console.error("FALHA:", e.message);
  process.exit(1);
});
