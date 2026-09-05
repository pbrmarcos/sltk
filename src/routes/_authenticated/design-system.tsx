import { createFileRoute } from "@tanstack/react-router";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, Download, Trash2, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

export const Route = createFileRoute("/_authenticated/design-system")({
  component: DesignSystemPage,
  head: () => ({
    meta: [
      { title: "Design System · SLTK App" },
      { name: "description", content: "Tokens, paleta e tipografia do SLTK App." },
    ],
  }),
});

type Swatch = { name: string; varName: string; hex: string };

const surfaces: Swatch[] = [
  { name: "bg-base", varName: "--color-bg-base", hex: "#0F1117" },
  { name: "bg-surface", varName: "--color-bg-surface", hex: "#16191F" },
  { name: "bg-elevated", varName: "--color-bg-elevated", hex: "#1E2229" },
  { name: "bg-border", varName: "--color-bg-border", hex: "#2A2D35" },
];
const texts: Swatch[] = [
  { name: "text-primary", varName: "--color-text-primary", hex: "#F0F2F5" },
  { name: "text-secondary", varName: "--color-text-secondary", hex: "#8B8F98" },
  { name: "text-muted", varName: "--color-text-muted", hex: "#555A63" },
];
const accents: Swatch[] = [
  { name: "accent", varName: "--color-accent", hex: "#3B82F6" },
  { name: "accent-hover", varName: "--color-accent-hover", hex: "#2563EB" },
  { name: "accent-muted", varName: "--color-accent-muted", hex: "#1E3A5F" },
];
const statuses: Swatch[] = [
  { name: "success", varName: "--color-success", hex: "#22C55E" },
  { name: "warning", varName: "--color-warning", hex: "#F59E0B" },
  { name: "danger", varName: "--color-danger", hex: "#EF4444" },
  { name: "info", varName: "--color-info", hex: "#3B82F6" },
  { name: "neutral", varName: "--color-neutral", hex: "#6B7280" },
];
const probs: Swatch[] = [
  { name: "prob-a (Quente)", varName: "--color-prob-a", hex: "#22C55E" },
  { name: "prob-b (Morno)", varName: "--color-prob-b", hex: "#F59E0B" },
  { name: "prob-c (Frio)", varName: "--color-prob-c", hex: "#EF4444" },
  { name: "prob-frio", varName: "--color-prob-frio", hex: "#6B7280" },
];

function SwatchGrid({ items }: { items: Swatch[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((s) => (
        <div
          key={s.name}
          className="rounded-lg border p-3"
          style={{ background: "var(--color-bg-surface)", borderColor: "var(--color-bg-border)" }}
        >
          <div
            className="h-16 w-full rounded-md border"
            style={{ background: s.hex, borderColor: "var(--color-bg-border)" }}
          />
          <div className="mt-2 text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
            {s.name}
          </div>
          <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            {s.hex.toUpperCase()}
          </div>
          <code className="mt-1 block text-[10px]" style={{ color: "var(--color-text-muted)" }}>
            {s.varName}
          </code>
        </div>
      ))}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold" style={{ color: "var(--color-text-primary)" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function DesignSystemPage() {
  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Administração" },
          { label: "Design System" },
        ]}
        title="Design System"
        subtitle="Fundação visual — tokens, paleta e tipografia."
      />
      <div className="space-y-10">
        <Section title="Superfícies">
          <SwatchGrid items={surfaces} />
        </Section>
        <Section title="Texto">
          <SwatchGrid items={texts} />
        </Section>
        <Section title="Accent">
          <SwatchGrid items={accents} />
        </Section>
        <Section title="Status">
          <SwatchGrid items={statuses} />
        </Section>
        <Section title="Probabilidade comercial">
          <SwatchGrid items={probs} />
        </Section>

        <Section title="Badges / Tags">
          <div
            className="space-y-4 rounded-lg border p-6"
            style={{ background: "var(--color-bg-surface)", borderColor: "var(--color-bg-border)" }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone="success">FEATURE</StatusBadge>
              <StatusBadge tone="danger">FIX</StatusBadge>
              <StatusBadge tone="info">DESIGN</StatusBadge>
              <StatusBadge tone="warning">INFRA</StatusBadge>
              <StatusBadge tone="neutral">DEFAULT</StatusBadge>
            </div>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Fundo tonalizado + texto escuro do mesmo matiz garante contraste ≥ 4.5:1 (WCAG AA)
              sobre superfícies claras. Tokens: <code>--badge-{`{tone}`}-bg / -fg / -border</code>.
              Use <code>{`<StatusBadge tone="…" />`}</code> de{" "}
              <code>@/components/ui/status-badge</code>.
            </p>
          </div>
        </Section>

        <Section title="Botões">
          <div
            className="space-y-6 rounded-lg border p-6"
            style={{ background: "var(--color-bg-surface)", borderColor: "var(--color-bg-border)" }}
          >
            <div>
              <div
                className="mb-2 text-xs font-medium uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                Variantes
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="link">Link</Button>
              </div>
            </div>

            <div>
              <div
                className="mb-2 text-xs font-medium uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                Tamanhos
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon" aria-label="Adicionar">
                  <Plus />
                </Button>
              </div>
            </div>

            <div>
              <div
                className="mb-2 text-xs font-medium uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                Com ícone
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button>
                  <Plus />
                  Novo processo
                </Button>
                <Button variant="outline">
                  <Download />
                  Exportar CSV
                </Button>
                <Button variant="destructive">
                  <Trash2 />
                  Excluir
                </Button>
              </div>
            </div>

            <div>
              <div
                className="mb-2 text-xs font-medium uppercase tracking-wider"
                style={{ color: "var(--color-text-muted)" }}
              >
                Estados
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button disabled>Disabled</Button>
                <Button variant="outline" disabled>
                  <Loader2 className="animate-spin" />
                  Carregando…
                </Button>
              </div>
            </div>

            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              Uso: <code>{`<Button variant="…" size="…">`}</code> de
              <code> @/components/ui/button</code>. Para barras de tabela, use
              <code> ToolbarButton</code> de <code>@/components/data/Toolbar</code>.
            </p>
          </div>
        </Section>

        <Section title="Tipografia — Geist">
          <div
            className="space-y-3 rounded-lg border p-6"
            style={{ background: "var(--color-bg-surface)", borderColor: "var(--color-bg-border)" }}
          >
            <p className="text-4xl font-bold">Aa — Display 36/Bold</p>
            <p className="text-2xl font-semibold">Aa — Heading 24/Semibold</p>
            <p className="text-base">
              Aa — Body 16/Regular — O sistema centraliza vendas, engenharia, produção e qualidade.
            </p>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Aa — Caption 14 — texto secundário para metadados e legendas.
            </p>
            <p className="font-mono text-sm" style={{ color: "var(--color-text-muted)" }}>
              Aa — Mono 14 — código, IDs, números técnicos. 0123456789
            </p>
          </div>
        </Section>

        <Section title="Border radius">
          <div className="flex flex-wrap gap-4">
            {[
              ["sm", "0.25rem", "var(--radius-sm)"],
              ["base", "0.5rem", "var(--radius)"],
              ["lg", "0.75rem", "var(--radius-lg)"],
              ["xl", "1rem", "var(--radius-xl)"],
              ["full", "9999px", "var(--radius-full)"],
            ].map(([name, val, token]) => (
              <div key={name} className="text-center">
                <div
                  className="h-20 w-20 border"
                  style={{
                    background: "var(--color-bg-elevated)",
                    borderRadius: token,
                    borderColor: "var(--color-bg-border)",
                  }}
                />
                <div className="mt-2 text-xs" style={{ color: "var(--color-text-primary)" }}>
                  {name}
                </div>
                <div className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                  {val}
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Sombras">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              ["shadow-sm", "0 1px 2px rgba(0,0,0,0.4)"],
              ["shadow", "0 4px 12px rgba(0,0,0,0.5)"],
              ["shadow-lg", "0 8px 24px rgba(0,0,0,0.6)"],
            ].map(([name, val]) => (
              <div
                key={name}
                className="rounded-lg p-6"
                style={{ background: "var(--color-bg-surface)", boxShadow: val }}
              >
                <div className="text-sm font-medium">{name}</div>
                <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {val}
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </PageContainer>
  );
}
