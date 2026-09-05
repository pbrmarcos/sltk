import { useMemo, useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArticleRenderer } from "./ArticleRenderer";
import { CATEGORIES, getCategory } from "@/content/docs/types";
import type { FaqEntry } from "@/content/docs/types";

export function FaqAccordion({ items }: { items: FaqEntry[] }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("all");

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = items.filter((f) => {
      if (cat !== "all" && f.category !== cat) return false;
      if (!q) return true;
      return (
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q) ||
        (f.tags ?? []).some((t) => t.toLowerCase().includes(q))
      );
    });
    const map = new Map<string, FaqEntry[]>();
    for (const f of filtered) {
      const list = map.get(f.category) ?? [];
      list.push(f);
      map.set(f.category, list);
    }
    return CATEGORIES.filter((c) => map.has(c.id)).map((c) => ({ cat: c, items: map.get(c.id)! }));
  }, [items, query, cat]);

  const available = useMemo(() => {
    const ids = new Set(items.map((i) => i.category));
    return CATEGORIES.filter((c) => ids.has(c.id));
  }, [items]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtrar por palavra-chave…"
          className="h-10 flex-1 rounded-md border border-[var(--bg-border)] bg-[var(--bg-surface)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--info)]"
        />
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="h-10 rounded-md border border-[var(--bg-border)] bg-[var(--bg-surface)] px-2 text-sm text-[var(--text-primary)]"
        >
          <option value="all">Todas as categorias</option>
          {available.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {grouped.length === 0 ? (
        <p className="rounded-md border border-dashed border-[var(--bg-border)] p-6 text-center text-sm text-[var(--text-muted)]">
          Nenhuma pergunta encontrada.
        </p>
      ) : (
        <div className="space-y-6">
          {grouped.map(({ cat: c, items: entries }) => (
            <section key={c.id}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
                {getCategory(c.id)?.label}
              </h2>
              <Accordion
                type="multiple"
                className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)]"
              >
                {entries.map((f) => (
                  <AccordionItem
                    key={f.id}
                    value={f.id}
                    id={f.id}
                    className="border-b border-[var(--bg-border)] last:border-b-0 px-4"
                  >
                    <AccordionTrigger className="text-left text-sm font-medium text-[var(--text-primary)]">
                      {f.question}
                    </AccordionTrigger>
                    <AccordionContent>
                      <ArticleRenderer>{f.answer}</ArticleRenderer>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
