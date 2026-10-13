import type { ReactNode } from 'react';

/**
 * Loading, error and empty states.
 *
 * Every async surface in this app renders all three. They live together in one
 * file so it is obvious when a screen has skipped one.
 */

export function LoadingState({ label = 'Loading…', rows = 5 }: { label?: string; rows?: number }) {
  return (
    <div className="p-4" role="status" aria-busy="true" aria-label={label}>
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, index) => (
          <div
            key={index}
            className="h-10 rounded bg-ink-100 animate-pulse"
            style={{ opacity: 1 - index * 0.12 }}
          />
        ))}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-14">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-base font-bold mb-3"
        style={{ background: 'var(--status-risk-bg)', color: 'var(--status-risk)' }}
        aria-hidden="true"
      >
        !
      </div>
      <p className="text-sm font-semibold text-ink-900 mb-1">Something went wrong</p>
      <p className="text-sm text-ink-500 max-w-sm mb-4">{message}</p>
      {onRetry && (
        <button type="button" className="btn-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-14">
      <div className="w-9 h-9 rounded-full bg-ink-100 flex items-center justify-center mb-3" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-ink-400">
          <circle cx="9" cy="9" r="6" />
          <path d="M13.5 13.5 17 17" strokeLinecap="round" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-ink-900 mb-1">{title}</p>
      <p className="text-sm text-ink-500 max-w-sm mb-4">{description}</p>
      {action}
    </div>
  );
}
