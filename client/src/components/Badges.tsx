import type { Priority, QualityBand, WebsiteStatus, ComponentStatus } from '../types';

/**
 * Status badges.
 *
 * Every badge contains its own word — HIGH, MEDIUM, Verified, Duplicate. That is
 * deliberate and not decoration: colour alone would make priority unreadable for
 * red-green colour blindness, and the text is what makes the colour safe to use.
 */

const PRIORITY_STYLE: Record<Priority, { bg: string; fg: string }> = {
  HIGH: { bg: 'var(--brand-soft)', fg: '#8b6500' },
  MEDIUM: { bg: 'var(--status-warn-bg)', fg: 'var(--status-warn)' },
  LOW: { bg: 'var(--status-idle-bg)', fg: 'var(--status-idle)' },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const style = PRIORITY_STYLE[priority];
  return (
    <span
      className="inline-flex items-center h-5 px-2 rounded-md border border-current/10 text-2xs font-bold tracking-[0.08em]"
      style={{ background: style.bg, color: style.fg }}
    >
      {priority}
    </span>
  );
}

/**
 * The fit score itself.
 *
 * The number is always visible and always the primary signal; the tint is a
 * secondary cue that lets a reader scan a column quickly.
 */
export function ScoreBadge({ score, priority, size = 'md' }: { score: number; priority: Priority; size?: 'sm' | 'md' | 'lg' }) {
  const style = PRIORITY_STYLE[priority];
  const dimensions = {
    sm: 'h-6 min-w-[2.25rem] text-xs',
    md: 'h-7 min-w-[2.6rem] text-sm',
    lg: 'h-12 min-w-[4rem] text-xl',
  }[size];

  return (
    <span
      className={`inline-flex items-center justify-center ${dimensions} px-2 rounded-lg border border-current/10 font-bold tabular`}
      style={{ background: style.bg, color: style.fg }}
      title={`Acquisition Fit Score ${score} out of 100 — ${priority} priority`}
    >
      {score}
    </span>
  );
}

const QUALITY_LABEL: Record<QualityBand, string> = { high: 'High', medium: 'Medium', low: 'Low' };

/**
 * Data quality as a labelled meter.
 *
 * A bar on its own invites the reader to guess; the number removes the guess,
 * and the band word makes it readable without comparing fill widths.
 */
export function DataQualityBar({ score, band, showLabel = true }: { score: number; band: QualityBand; showLabel?: boolean }) {
  const fill = band === 'high' ? 'var(--status-good)' : band === 'medium' ? 'var(--status-warn)' : 'var(--status-risk)';

  return (
    <span className="inline-flex items-center gap-2" title={`Data quality ${score}/100 (${QUALITY_LABEL[band]})`}>
      <span className="relative block w-14 h-1.5 rounded-full overflow-hidden" style={{ background: '#303030' }}>
        <span
          className="animate-bar-x absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${Math.max(score, 2)}%`, background: fill }}
        />
      </span>
      {showLabel && <span className="text-xs text-ink-600 tabular">{score}</span>}
    </span>
  );
}

const WEBSITE_LABEL: Record<WebsiteStatus, string> = {
  verified: 'Verified',
  unverified: 'Unverified',
  unreachable: 'Unreachable',
};

export function WebsiteBadge({ status }: { status: WebsiteStatus }) {
  const tone =
    status === 'verified'
      ? { bg: 'var(--status-good-bg)', fg: 'var(--status-good)' }
      : status === 'unreachable'
        ? { bg: 'var(--status-risk-bg)', fg: 'var(--status-risk)' }
        : { bg: 'var(--status-idle-bg)', fg: 'var(--status-idle)' };

  return (
    <span className="inline-flex items-center h-5 px-1.5 rounded text-2xs font-semibold" style={{ background: tone.bg, color: tone.fg }}>
      {WEBSITE_LABEL[status]}
    </span>
  );
}

export function DuplicateBadge() {
  return (
    <span
      className="inline-flex items-center h-5 px-1.5 rounded text-2xs font-semibold"
      style={{ background: 'var(--status-warn-bg)', color: 'var(--status-warn)' }}
      title="This record probably duplicates another company in the dataset"
    >
      Probable duplicate
    </span>
  );
}

/** Marks demo data as demo data, everywhere it appears. */
export function DemoDataBadge() {
  return (
    <span className="inline-flex items-center h-5 px-1.5 rounded text-2xs font-medium bg-ink-100 text-ink-500" title="This record is synthetic sample data, not verified company information">
      Demo data
    </span>
  );
}

const COMPONENT_STATUS_TONE: Record<ComponentStatus, string> = {
  match: 'var(--status-good)',
  partial: 'var(--status-warn)',
  miss: 'var(--status-risk)',
  missing: 'var(--text-muted)',
  na: 'var(--text-muted)',
};

export function componentStatusColor(status: ComponentStatus): string {
  return COMPONENT_STATUS_TONE[status];
}
