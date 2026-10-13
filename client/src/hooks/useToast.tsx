import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type ToastTone = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONE_STYLES: Record<ToastTone, string> = {
  success: 'border-l-[3px] border-l-[var(--status-good)]',
  error: 'border-l-[3px] border-l-[var(--status-risk)]',
  info: 'border-l-[3px] border-l-[var(--text-secondary)]',
};

const TONE_ICONS: Record<ToastTone, string> = { success: '✓', error: '!', info: 'i' };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, tone: ToastTone) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4500);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push(message, 'success'),
      error: (message) => push(message, 'error'),
      info: (message) => push(message, 'info'),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* aria-live so the confirmation is announced, not just shown. */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 w-[min(22rem,calc(100vw-2.5rem))]" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-2.5 bg-ink-900 border border-ink-700 rounded-md px-3.5 py-3 ${TONE_STYLES[toast.tone]}`}
          >
            <span className="mt-0.5 text-xs font-bold text-ink-500" aria-hidden="true">{TONE_ICONS[toast.tone]}</span>
            <p className="text-sm text-ink-800 leading-snug flex-1">{toast.message}</p>
            <button
              type="button"
              onClick={() => setToasts((current) => current.filter((t) => t.id !== toast.id))}
              className="text-ink-400 hover:text-ink-700 text-sm leading-none"
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside a ToastProvider');
  return context;
}
