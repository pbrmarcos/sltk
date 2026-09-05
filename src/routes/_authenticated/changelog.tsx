import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Pagination } from "@/components/data/Pagination";
// Fonte única do changelog: CHANGELOG.md na raiz do projeto.
// Vite injeta o conteúdo como string em build/dev via `?raw`.
import changelogRaw from "../../../CHANGELOG.md?raw";

export const Route = createFileRoute("/_authenticated/changelog")({
  component: ChangelogPage,
  head: () => ({
    meta: [
      { title: "Changelog · SLTK App" },
      { name: "description", content: "Histórico de mudanças do SLTK App." },
    ],
  }),
});

type EntryType = "feature" | "fix" | "design" | "infra";

type Entry = {
  version: string;
  date: string;
  type: EntryType;
  title: string;
  items: string[];
};

// -----------------------------------------------------------------------------
// Parser: lê o CHANGELOG.md e transforma cada bloco `## <versão> — <título> — <data>`
// em uma entrada. Bullets de nível 1 (`- ...`) viram itens. Cabeçalhos `### Seção`
// entram como um item em negrito para separar visualmente. Assim, cada nova
// entrada adicionada ao CHANGELOG.md aparece automaticamente aqui.
// -----------------------------------------------------------------------------

function detectType(title: string, body: string): EntryType {
  const t = `${title}\n${body}`.toLowerCase();
  if (/\b(fix|corre[çc][aã]o|bug|hotfix|ajuste)\b/.test(t)) return "fix";
  if (/\b(design|tema|ui|layout|visual|tipografia)\b/.test(t)) return "design";
  if (/\b(infra|deploy|migration|migra[çc][aã]o|ci\/cd|cron|worker)\b/.test(t)) return "infra";
  return "feature";
}

function parseChangelog(raw: string): Entry[] {
  const lines = raw.split(/\r?\n/);
  const blocks: { header: string; body: string[] }[] = [];
  let current: { header: string; body: string[] } | null = null;

  for (const line of lines) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      if (current) blocks.push(current);
      current = { header: m[1], body: [] };
      continue;
    }
    if (current) current.body.push(line);
  }
  if (current) blocks.push(current);

  const entries: Entry[] = [];
  for (const b of blocks) {
    // Divide o header em partes por " — " (em dash) ou " - " (hífen).
    const parts = b.header.split(/\s+[—–]\s+/);
    if (parts.length < 2) continue;
    const version = parts[0].trim();
    // Se a última parte parece uma data ISO, separa
    const last = parts[parts.length - 1].trim();
    const dateMatch = last.match(/^(\d{4}-\d{2}-\d{2})$/);
    let date = "";
    let titleParts: string[];
    if (dateMatch) {
      date = dateMatch[1];
      titleParts = parts.slice(1, -1);
    } else {
      titleParts = parts.slice(1);
    }
    const title = titleParts.join(" — ").trim();
    if (!version.match(/^\d+\.\d+/)) continue;

    // Extrai itens: bullets top-level e headings de seção.
    const items: string[] = [];
    let currentItem: string | null = null;
    const push = () => {
      if (currentItem) {
        items.push(currentItem.trim());
        currentItem = null;
      }
    };
    for (const rawLine of b.body) {
      const line = rawLine.replace(/\s+$/, "");
      if (!line.trim()) {
        push();
        continue;
      }
      if (line.startsWith("---")) {
        push();
        continue;
      }
      const h = line.match(/^###\s+(.+)$/);
      if (h) {
        push();
        items.push(`__SECTION__${h[1].trim()}`);
        continue;
      }
      const bullet = line.match(/^-\s+(.*)$/);
      if (bullet) {
        push();
        currentItem = bullet[1];
        continue;
      }
      // continuação de bullet (linha indentada ou texto solto após bullet)
      if (currentItem !== null && (line.startsWith("  ") || !line.startsWith("#"))) {
        currentItem += " " + line.trim();
        continue;
      }
    }
    push();

    entries.push({
      version,
      date,
      title,
      items,
      type: detectType(title, b.body.join("\n")),
    });
  }

  // Ordena por data DESC; empate → versão DESC (semver-ish).
  entries.sort((a, b) => {
    if (a.date && b.date && a.date !== b.date) return a.date < b.date ? 1 : -1;
    if (a.date && !b.date) return -1;
    if (!a.date && b.date) return 1;
    return compareVersion(b.version, a.version);
  });

  return entries;
}

function compareVersion(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
}

// Renderiza texto com **negrito** e `código` inline, mantendo o restante como texto.
function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) {
      parts.push(
        <strong key={`b${key++}`} className="font-semibold">
          {tok.slice(2, -2)}
        </strong>,
      );
    } else {
      parts.push(
        <code
          key={`c${key++}`}
          className="rounded px-1 py-0.5 font-mono text-[12px]"
          style={{ background: "var(--color-bg-elevated)" }}
        >
          {tok.slice(1, -1)}
        </code>,
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

const typeStyle: Record<EntryType, { bg: string; fg: string; border: string; label: string }> = {
  feature: {
    bg: "var(--badge-success-bg)",
    fg: "var(--badge-success-fg)",
    border: "var(--badge-success-border)",
    label: "FEATURE",
  },
  fix: {
    bg: "var(--badge-danger-bg)",
    fg: "var(--badge-danger-fg)",
    border: "var(--badge-danger-border)",
    label: "FIX",
  },
  design: {
    bg: "var(--badge-info-bg)",
    fg: "var(--badge-info-fg)",
    border: "var(--badge-info-border)",
    label: "DESIGN",
  },
  infra: {
    bg: "var(--badge-warning-bg)",
    fg: "var(--badge-warning-fg)",
    border: "var(--badge-warning-border)",
    label: "INFRA",
  },
};

const PAGE_SIZE = 20;

function ChangelogPage() {
  const entries = useMemo(() => parseChangelog(changelogRaw), []);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const start = (current - 1) * PAGE_SIZE;
  const pageEntries = entries.slice(start, start + PAGE_SIZE);

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Central de ajuda" },
          { label: "Changelog" },
        ]}
        title="Changelog"
        subtitle="Registro cronológico de mudanças no sistema."
      />

      <div className="mb-4">
        <Pagination
          page={current}
          pageSize={PAGE_SIZE}
          total={entries.length}
          onPageChange={setPage}
        />
      </div>

      <ol className="space-y-6">
        {pageEntries.map((e) => (
          <li
            key={e.version}
            className="rounded-lg border p-6"
            style={{ background: "var(--color-bg-surface)", borderColor: "var(--color-bg-border)" }}
          >
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold tracking-wide"
                style={{
                  background: typeStyle[e.type].bg,
                  color: typeStyle[e.type].fg,
                  borderColor: typeStyle[e.type].border,
                }}
              >
                {typeStyle[e.type].label}
              </span>
              <span className="font-mono text-sm" style={{ color: "var(--color-text-secondary)" }}>
                v{e.version}
              </span>
              {e.date && (
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {e.date}
                </span>
              )}
            </div>
            <h2 className="mt-2 text-lg font-semibold">{e.title}</h2>
            <ul
              className="mt-3 space-y-1.5 text-sm"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {e.items.map((it, idx) => {
                if (it.startsWith("__SECTION__")) {
                  return (
                    <li
                      key={`s-${idx}`}
                      className="mt-3 list-none text-xs font-semibold uppercase tracking-wide"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {it.slice("__SECTION__".length)}
                    </li>
                  );
                }
                return (
                  <li key={`i-${idx}`} className="ml-5 list-disc">
                    {renderInline(it)}
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ol>

      <div className="mt-6">
        <Pagination
          page={current}
          pageSize={PAGE_SIZE}
          total={entries.length}
          onPageChange={setPage}
        />
      </div>
    </PageContainer>
  );
}
