import type { ReactNode } from 'react';

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end justify-between gap-4 sm:gap-5 mb-6 sm:mb-7">
      <div className="min-w-0">
        <p className="mb-2 text-[0.625rem] font-bold uppercase tracking-[0.24em] text-data-600">Caprae Lead Intelligence</p>
        <h1 className="text-[2rem] sm:text-[2.35rem] font-bold text-ink-950 tracking-[-0.025em] leading-none">{title}</h1>
        {description && <p className="mt-2.5 text-sm text-ink-500 max-w-2xl leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:shrink-0">{actions}</div>}
    </header>
  );
}
