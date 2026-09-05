import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { PageDocLink } from "@/components/ajuda/PageDocLink";

export type Crumb = { label: string; href?: string };

export type PageHeaderProps = {
  breadcrumbs: Crumb[];
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
};

export function PageHeader({ breadcrumbs, title, subtitle, actions }: PageHeaderProps) {
  return (
    <header>
      {/* Topbar: full-width white bar with breadcrumb + actions */}
      <div className="sticky top-0 z-20 -mx-4 md:-mx-8 -mt-4 md:-mt-8 mb-6 flex h-14 items-center justify-between gap-3 border-b border-[var(--bg-border)] bg-[var(--bg-surface)] px-4 md:px-8 backdrop-blur">
        {breadcrumbs.length > 0 ? (
          <Breadcrumb>
            <BreadcrumbList className="text-[12.5px]">
              {breadcrumbs.map((c, i) => {
                const isLast = i === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={`${c.label}-${i}`}>
                    <BreadcrumbItem>
                      {isLast || !c.href ? (
                        <BreadcrumbPage className="text-[var(--text-primary)] font-medium">
                          {c.label}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link
                            to={c.href}
                            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          >
                            {c.label}
                          </Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {!isLast && <BreadcrumbSeparator className="text-[var(--text-muted)]" />}
                  </React.Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        ) : (
          <span />
        )}
        <div className="flex shrink-0 items-center gap-2">
          <PageDocLink />
          {actions}
        </div>
      </div>

      {/* Title block in content area */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p>}
      </div>
    </header>
  );
}
