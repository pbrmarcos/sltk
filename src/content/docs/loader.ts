import type { DocArticle, DocFrontmatter, FaqEntry } from "./types";

/**
 * Frontmatter parser minimalista (evita gray-matter que depende de Buffer).
 * Suporta strings, números, booleans e arrays inline `[a, b, c]`.
 */
function parseFrontmatter(raw: string): { data: Record<string, unknown>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };
  const [, header, body] = match;
  const data: Record<string, unknown> = {};
  for (const line of header.split(/\r?\n/)) {
    const m = line.match(/^([\w-]+):\s*(.*)$/);
    if (!m) continue;
    const [, key, rawValue] = m;
    let value: unknown = rawValue.trim();
    if (typeof value === "string") {
      if (value.startsWith("[") && value.endsWith("]")) {
        value = value
          .slice(1, -1)
          .split(",")
          .map((s) => s.trim().replace(/^["']|["']$/g, ""))
          .filter(Boolean);
      } else if (value === "true" || value === "false") {
        value = value === "true";
      } else if (/^-?\d+(\.\d+)?$/.test(value)) {
        value = Number(value);
      } else {
        value = value.replace(/^["']|["']$/g, "");
      }
    }
    data[key] = value;
  }
  return { data, body: body ?? "" };
}

function firstParagraph(md: string): string {
  const cleaned = md
    .replace(/^#.*$/gm, "")
    .replace(/```[\s\S]*?```/g, "")
    // remove directive opening markers like `:::tldr`, `:::dica{title="..."}`
    .replace(/^:{3,}\s*\w+(?:\{[^}]*\})?\s*/gm, "")
    // remove directive closing markers `:::`
    .replace(/^:{3,}\s*$/gm, "")
    .trim();
  const paragraphs = cleaned
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const para = paragraphs[0] ?? "";
  return para
    .replace(/[*_`>#-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const docsFiles = import.meta.glob("./articles/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const faqFiles = import.meta.glob("./faq/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export const ARTICLES: DocArticle[] = Object.entries(docsFiles)
  .flatMap(([path, raw]): DocArticle[] => {
    const { data, body } = parseFrontmatter(raw);
    const fm = data as unknown as DocFrontmatter;
    if (!fm.slug || !fm.category || !fm.title) {
      console.warn(`[docs] frontmatter incompleto em ${path}`);
      return [];
    }
    return [
      {
        ...fm,
        tags: fm.tags ?? [],
        papeis: fm.papeis ?? [],
        body: body.trim(),
        excerpt: firstParagraph(body),
      },
    ];
  })
  .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));

export const FAQS: FaqEntry[] = Object.entries(faqFiles).flatMap(([path, raw]): FaqEntry[] => {
  const { data, body } = parseFrontmatter(raw);
  const fm = data as { question?: string; category?: string; tags?: string[]; id?: string };
  if (!fm.question || !fm.category) {
    console.warn(`[faq] frontmatter incompleto em ${path}`);
    return [];
  }
  const id = fm.id ?? path.split("/").pop()!.replace(/\.md$/, "");
  return [
    {
      id,
      question: fm.question,
      answer: body.trim(),
      category: fm.category as FaqEntry["category"],
      tags: fm.tags ?? [],
    },
  ];
});

export function getArticlesByCategory(category: string): DocArticle[] {
  return ARTICLES.filter((a) => a.category === category);
}

export function getArticle(category: string, slug: string): DocArticle | undefined {
  return ARTICLES.find((a) => a.category === category && a.slug === slug);
}

export function getFaqsByCategory(category?: string): FaqEntry[] {
  return category ? FAQS.filter((f) => f.category === category) : FAQS;
}
