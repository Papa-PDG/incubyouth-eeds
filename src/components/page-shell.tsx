import type { ReactNode } from "react";

export function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-foreground sm:text-4xl">{title}</h1>
      {subtitle && (
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">{subtitle}</p>
      )}
      <div className="mt-10 rounded-2xl border border-border bg-card p-6">
        {children ?? (
          <p className="text-sm text-muted-foreground">
            Cette page sera générée à l'étape suivante.
          </p>
        )}
      </div>
    </main>
  );
}