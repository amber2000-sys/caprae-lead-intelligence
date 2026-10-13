import type { ReactNode } from 'react';
import { useCountUp } from '../hooks/useCountUp';

type Tone = 'default' | 'good' | 'warn' | 'risk';

/**
 * `meter` is tracked separately from `value` because they are different jobs.
 * The number is ink — it is text. The meter is a data mark, so on a neutral
 * card it takes the data hue rather than near-black, which would read as a
 * heavy rule across the card rather than as a measurement.
 */
const TONE: Record<Tone, { value: string; meter: string; chipBg: string; chipFg: string }> = {
  default: { value: 'var(--text-primary)', meter: '#d8a719',             chipBg: 'var(--brand-soft)', chipFg: '#8b6500' },
  good:    { value: 'var(--status-good)',  meter: 'var(--status-good)',  chipBg: 'var(--status-good-bg)', chipFg: 'var(--status-good)' },
  warn:    { value: 'var(--status-warn)',  meter: 'var(--status-warn)',  chipBg: 'var(--status-warn-bg)', chipFg: 'var(--status-warn)' },
  risk:    { value: 'var(--status-risk)',  meter: 'var(--status-risk)',  chipBg: 'var(--status-risk-bg)', chipFg: 'var(--status-risk)' },
};

interface StatCardProps {
  label: string;
  /** Pass a number to animate it on mount; pass a node to render it as-is. */
  value: number | ReactNode;
  hint?: string;
  tone?: Tone;
  icon?: ReactNode;
  /** Appends a unit to an animated numeric value, e.g. '%'. */
  suffix?: string;
  /**
   * Renders a track under the value for a bounded 0-100 measure.
   *
   * Only for values that genuinely have a range — a percentage has a position
   * within one, a raw count does not. A meter under "151 companies" would be
   * decoration pretending to be information.
   */
  meter?: number;
  /** Staggers the entrance so a row of cards resolves left to right. */
  delayMs?: number;
}

export function StatCard({
  label, value, hint, tone = 'default', icon, suffix, meter, delayMs = 0,
}: StatCardProps) {
  const palette = TONE[tone];
  const isNumeric = typeof value === 'number';
  const animated = useCountUp(isNumeric ? value : 0);

  return (
    <div
      className={`stat-card stat-card-${tone} card relative overflow-hidden p-4 flex flex-col animate-rise transition-all duration-300 hover:border-data-200 hover:-translate-y-0.5`}
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.625rem] font-bold uppercase tracking-[0.16em] text-ink-500 leading-tight">{label}</p>
        {icon && (
          <span
            className="shrink-0 w-8 h-8 rounded-lg border border-current/10 flex items-center justify-center"
            style={{ background: palette.chipBg, color: palette.chipFg }}
          >
            {icon}
          </span>
        )}
      </div>

      <p className="mt-3 text-[2rem] font-bold tracking-tight tabular leading-none" style={{ color: palette.value }}>
        {isNumeric ? animated : value}
        {suffix && <span className="text-base font-semibold">{suffix}</span>}
      </p>

      {meter !== undefined && (
        <div className="chart-track mt-3 h-1.5 rounded-full overflow-hidden" aria-hidden="true">
          <div
            className="animate-bar-x h-full rounded-full"
            style={{ width: `${Math.max(Math.min(meter, 100), 2)}%`, background: palette.meter }}
          />
        </div>
      )}

      {hint && <p className="mt-1.5 text-xs text-ink-500 leading-snug">{hint}</p>}
    </div>
  );
}
