import * as React from "react";

export function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full h-full flex flex-col bg-[var(--bg-base)] p-4 md:p-8 text-[var(--text-primary)]">
      {children}
    </div>
  );
}
