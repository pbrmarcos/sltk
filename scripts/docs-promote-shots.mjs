#!/usr/bin/env bun
/**
 * Promove screenshots capturados em `/tmp/docs-shots/<categoria>/*.png`
 * para o CDN via `lovable-assets create`, gerando os pointers em
 * `src/assets/docs/<categoria>/<file>.asset.json`.
 *
 * Opcionalmente insere/atualiza uma seção `## Imagens da tela` no fim do
 * artigo correspondente, com blocos `:::step` referenciando cada PNG
 * (legendas vêm de um manifesto opcional).
 *
 * Manifesto (opcional):
 *   /tmp/docs-shots/<categoria>/<slug>.captions.json
 *   {
 *     "<slug>-1.png": "Kanban de oportunidades com filtros por estágio",
 *     "<slug>-2.png": "Card aberto mostrando histórico"
 *   }
 *
 * O mapeamento categoria→artigos vem de `src/content/docs/route-map.ts`
 * (via glob dos MDs para achar o slug do artigo pelo prefixo do PNG).
 *
 * Uso:
 *   bun scripts/docs-promote-shots.mjs              # promove tudo e injeta blocos
 *   bun scripts/docs-promote-shots.mjs --dry        # só lista o que faria
 *   bun scripts/docs-promote-shots.mjs comercial    # limita à categoria
 *   bun scripts/docs-promote-shots.mjs --no-inject  # só gera assets, não toca .md
 */

import { readdir, readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SHOTS = "/tmp/docs-shots";
const ASSETS_DIR = join(ROOT, "src/assets/docs");
const ARTICLES_DIR = join(ROOT, "src/content/docs/articles");

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const noInject = args.includes("--no-inject");
const onlyCat = args.find((a) => !a.startsWith("--"));

if (!existsSync(SHOTS)) {
  console.error(`Sem screenshots em ${SHOTS}. Rode primeiro: bun run docs:shots`);
  process.exit(1);
}

if (spawnSync("command", ["-v", "lovable-assets"]).status !== 0) {
  // fallback direto: procurar no PATH via which
  const which = spawnSync("which", ["lovable-assets"], { encoding: "utf8" });
  if (which.status !== 0) {
    console.error("`lovable-assets` não encontrado no PATH — o sandbox de assets não está ativo.");
    process.exit(1);
  }
}

const cats = (await readdir(SHOTS).catch(() => [])).filter(
  (c) => !c.startsWith(".") && (onlyCat ? c === onlyCat : true),
);

let promoted = 0;
let injected = 0;
const summary = [];

for (const cat of cats) {
  const shotsDir = join(SHOTS, cat);
  const st = await stat(shotsDir).catch(() => null);
  if (!st?.isDirectory()) continue;

  const files = (await readdir(shotsDir)).filter((f) => f.toLowerCase().endsWith(".png")).sort();
  if (files.length === 0) continue;

  const outDir = join(ASSETS_DIR, cat);
  await mkdir(outDir, { recursive: true });

  // Agrupa por slug (prefixo antes do "-N.png")
  const bySlug = new Map();
  for (const f of files) {
    const m = f.match(/^(.+?)-(\d+)\.png$/i);
    const slug = m ? m[1] : f.replace(/\.png$/i, "");
    if (!bySlug.has(slug)) bySlug.set(slug, []);
    bySlug.get(slug).push(f);
  }

  for (const [slug, list] of bySlug) {
    // Carrega manifesto de legendas, se houver
    let captions = {};
    const capFile = join(shotsDir, `${slug}.captions.json`);
    if (existsSync(capFile)) {
      try {
        captions = JSON.parse(await readFile(capFile, "utf8"));
      } catch (e) {
        console.error(`  ! manifesto inválido em ${capFile}: ${e.message}`);
      }
    }

    const uploaded = [];
    for (const f of list) {
      const src = join(shotsDir, f);
      const pointer = join(outDir, `${f}.asset.json`);
      if (existsSync(pointer)) {
        console.error(`  · ${cat}/${f} — pointer já existe, pulando upload`);
        uploaded.push({ file: f, caption: captions[f] });
        continue;
      }
      console.error(`  → ${cat}/${f}${dry ? " (dry)" : ""}`);
      if (dry) {
        uploaded.push({ file: f, caption: captions[f] });
        continue;
      }
      const r = spawnSync("lovable-assets", ["create", "--file", src, "--filename", f], { encoding: "utf8" });
      if (r.status !== 0) {
        console.error(`    ✗ lovable-assets create falhou: ${r.stderr || r.stdout}`);
        continue;
      }
      await writeFile(pointer, r.stdout, "utf8");
      promoted++;
      uploaded.push({ file: f, caption: captions[f] });
    }

    // Injeta seção no MD
    if (noInject || uploaded.length === 0) continue;
    const mdPath = join(ARTICLES_DIR, cat, `${slug}.md`);
    if (!existsSync(mdPath)) {
      console.error(`  ? nenhum artigo em ${cat}/${slug}.md — pulando injeção`);
      continue;
    }

    const raw = await readFile(mdPath, "utf8");
    const marker = "<!-- SHOTS:AUTO -->";
    const endMarker = "<!-- /SHOTS:AUTO -->";
    const steps = uploaded
      .map((u, i) => {
        const cap = u.caption ?? `Tela ${i + 1}`;
        // usa doc-step com img={filename} — resolveDocImage lê pelo nome
        return `:::step{n="${i + 1}" title="${cap.replace(/"/g, "'")}" img="${u.file}" alt="${cap.replace(/"/g, "'")}"}\n${cap}\n:::`;
      })
      .join("\n\n");

    const section = `${marker}\n\n## Imagens da tela\n\n${steps}\n\n${endMarker}`;

    let next;
    if (raw.includes(marker) && raw.includes(endMarker)) {
      next = raw.replace(new RegExp(`${marker}[\\s\\S]*?${endMarker}`), section);
    } else {
      next = raw.trimEnd() + "\n\n" + section + "\n";
    }
    if (next !== raw) {
      if (dry) {
        console.error(`  ~ ${cat}/${slug}.md (injeção pronta — dry)`);
      } else {
        await writeFile(mdPath, next, "utf8");
        console.error(`  ✓ injetado em ${cat}/${slug}.md (${uploaded.length} imagens)`);
        injected++;
      }
    }
    summary.push({ cat, slug, images: uploaded.length });
  }
}

console.error(`\n== Resumo ==\nAssets promovidos: ${promoted}\nArtigos atualizados: ${injected}`);
for (const s of summary) console.error(`  · ${s.cat}/${s.slug} — ${s.images} img`);
if (dry) console.error("\n(dry-run — nenhum arquivo modificado)");
