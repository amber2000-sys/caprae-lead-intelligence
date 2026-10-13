import { componentStatusColor } from './Badges';
import { staggerDelay } from '../hooks/useEnterTransition';
import type { ScoreComponent } from '../types';

const STATUS_LABEL: Record<string, string> = {
  match: 'Match',
  partial: 'Partial',
  miss: 'No match',
  missing: 'No data',
  na: 'Not set',
};

/**
 * The "why this score" panel.
 *
 * This is the product's central claim: a searcher should never have to take the
 * number on trust. Each row shows the points earned, the points available, a
 * proportional bar, and a sentence explaining the result — and the rows add up
 * to the headline score exactly, which the scoring service has a test for.
 */
export function ScoreBreakdown({ components, total }: { components: ScoreComponent[]; total: number }) {
  return (
    <div>
      <ul className="space-y-3">
        {components.map((component, index) => {
          const color = componentStatusColor(component.status);
          return (
            <li key={component.key}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-ink-800">{component.label}</span>
                <span className="text-xs font-semibold tabular shrink-0" style={{ color }}>
                  {component.earned}<span className="text-ink-400 font-normal">/{component.max}</span>
                </span>
              </div>

              <div className="mt-1.5 h-1.5 rounded-full bg-ink-100 overflow-hidden">
                <div
                  className="animate-bar-x h-full rounded-full"
                  style={{
                    width: `${Math.max(component.percent, component.earned > 0 ? 3 : 0)}%`,
                    background: color,
                    animationDelay: `${staggerDelay(index, 50)}ms`,
                  }}
                />
              </div>

              <p className="mt-1.5 text-xs text-ink-500 leading-snug">
                <span className="font-medium text-ink-600">{STATUS_LABEL[component.status] ?? component.status}</span>
                {' · '}
                {component.detail}
              </p>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-ink-200">
        <span className="text-sm font-semibold text-ink-900">Acquisition Fit Score</span>
        <span className="text-sm font-bold text-ink-900 tabular">{total}<span className="text-ink-400 font-normal">/100</span></span>
      </div>
    </div>
  );
}
