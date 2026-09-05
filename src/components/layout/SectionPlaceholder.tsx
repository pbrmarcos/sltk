import { PageContainer } from "./PageContainer";
import { PageHeader, type Crumb } from "./PageHeader";

export function SectionPlaceholder({
  title,
  breadcrumbs,
  subtitle,
}: {
  title: string;
  breadcrumbs?: Crumb[];
  subtitle?: string;
}) {
  const crumbs: Crumb[] = breadcrumbs ?? [{ label: "Home", href: "/" }, { label: title }];
  return (
    <PageContainer>
      <PageHeader breadcrumbs={crumbs} title={title} subtitle={subtitle} />
      <div className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-12 text-center shadow-[var(--shadow-sm)]">
        <p className="text-sm text-[var(--text-muted)]">Em desenvolvimento</p>
      </div>
    </PageContainer>
  );
}
