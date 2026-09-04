#!/usr/bin/env bun
/**
 * One-off: reescreve os blocos `<!-- SHOTS:AUTO --> ... <!-- /SHOTS:AUTO -->`
 * dos artigos já injetados usando legendas descritivas por slug — evita
 * ter que rodar Playwright de novo só para consertar o texto.
 *
 * Uso: bun scripts/docs-relegenda.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ARTICLES = join(ROOT, "src/content/docs/articles");

/** slug → array de legendas na ordem em que aparecem (`slug-1.png`, `slug-2.png`, …). */
const CAPTIONS = {
  "admin/gerenciar-usuarios": ["Lista de usuários com filtros por papel e status"],
  "admin/paginas-e-etapas-equipamentos": [
    "Editor de páginas de equipamentos com blocos versionados",
    "Editor de etapas padrão por equipamento",
  ],
  "admin/sla-chamados": ["Configuração de SLA por prioridade de chamado"],
  "admin/tipos-de-checklist": ["Lista de tipos de Checklist ativos com blocos configuráveis"],
  "clientes-fornecedores/cadastrar-cliente": [
    "Lista de clientes com filtros por país, status e categoria",
    "Formulário Novo cliente com scan automático e enriquecimento",
  ],
  "clientes-fornecedores/cadastrar-fornecedor": [
    "Lista de fornecedores com filtros de país, status, categoria e ranking",
    "Formulário Novo fornecedor com scan automático (OCR + enriquecimento)",
  ],
  "comercial/novo-orcamento": [
    "Lista de orçamentos com filtros por status e cliente",
    "Wizard de novo orçamento — seleção de equipamento e cliente",
  ],
  "comercial/pipeline-de-oportunidades": ["Kanban de oportunidades por estágio comercial"],
  "compras/cotacao-multiplos-fornecedores": [
    "Cotação com múltiplos fornecedores lado a lado",
  ],
  "compras/criar-solicitacao": ["Formulário de nova solicitação de compra"],
  "compras/emitir-e-aprovar-oc": [
    "Lista de ordens de compra com fila de aprovação",
    "Wizard de nova ordem de compra",
  ],
  "engenharia/criar-etp": ["Lista de ETPs por status (rascunho, revisão, aprovado, obsoleto)"],
  "engenharia/etapas-e-kanban": ["Kanban de etapas de engenharia por projeto"],
  "logistica/criar-embarque": ["Formulário de novo embarque logístico"],
  "logistica/visao-geral": ["Painel de embarques com status e alertas de prazo"],
  "pos-vendas/atender-chamado": ["Fila de chamados com SLA e prioridade"],
  "producao/kanban-montagem": ["Kanban de montagem por linha e etapa"],
  "qualidade/agendar-e-preparar-fat": [
    "Lista de FATs agendados com checklist de preparação",
    "Formulário de novo FAT com template e itens de verificação",
  ],
};

const START = "<!-- SHOTS:AUTO -->";
const END = "<!-- /SHOTS:AUTO -->";

let updated = 0;
for (const [key, captions] of Object.entries(CAPTIONS)) {
  const [cat, slug] = key.split("/");
  const path = join(ARTICLES, cat, `${slug}.md`);
  if (!existsSync(path)) {
    console.error(`? artigo ausente: ${key}`);
    continue;
  }
  const raw = await readFile(path, "utf8");
  const re = new RegExp(`${START}[\\s\\S]*?${END}`);
  if (!re.test(raw)) continue;

  const steps = captions
    .map((cap, i) => {
      const file = `${slug}-${i + 1}.png`;
      const safe = cap.replace(/"/g, "'");
      return `:::step{n="${i + 1}" title="${safe}" img="${file}" alt="${safe}"}\n${cap}\n:::`;
    })
    .join("\n\n");
  const section = `${START}\n\n## Imagens da tela\n\n${steps}\n\n${END}`;
  const next = raw.replace(re, section);
  if (next !== raw) {
    await writeFile(path, next, "utf8");
    console.error(`  ✓ ${key}`);
    updated++;
  }
}
console.error(`\n${updated} artigo(s) atualizado(s).`);
