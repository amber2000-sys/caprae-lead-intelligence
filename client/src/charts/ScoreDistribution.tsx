import { staggerDelay } from '../hooks/useEnterTransition';
import type { ScoreBucket } from '../types';

/**
 * Fit score histogram.
 *
 * A histogram rather than a summary statistic because the shape is the point:
 * a searcher needs to see whether their criteria produced a handful of strong
 * targets or a flat mass of mediocre ones, and an average hides exactly that.
 *
 * Buckets are computed server-side at five-wide, so both priority thresholds
 * land on a bucket boundary — a ten-wide bucket straddling 75 could not be
 * honestly coloured, since it would hold both HIGH and MEDIUM leads.
 *
 * Bars are coloured by priority band from the same three-step ordinal ramp the
 * priority split chart uses, so the two charts cannot tell different stories.
 */

const BAND_COLOR: Record<string, string> = {
  HIGH: '#8b6500',
  MEDIUM: '#d8a719',
  LOW: '#f9d360',
};

const BAND_LABEL: Record<string, string> = {
  HIGH: 'HIGH (75+)',
  MEDIUM: 'MEDIUM (55–74)',
  LOW: 'LOW (under 55)',
};

export function ScoreDistribution({ buckets, height = 180 }: { buckets?: ScoreBucket[]; height?: number }) {
  // A chart must degrade to an empty state, never throw. An older API response
  // or a partial payload should cost the reader this one panel, not the page.
  const safeBuckets = Array.isArray(buckets) ? buckets : [];
  const max = Math.max(...safeBuckets.map((bucket) => bucket.count), 1);
  const total = safeBuckets.reduce((sum, bucket) => sum + bucket.count, 0);

  if (total === 0) {
    return <p className="text-sm text-ink-400 py-8 text-center">No scored leads yet.</p>;
  }

  const bandTotals = (['LOW', 'MEDIUM', 'HIGH'] as const).map((band) => ({
    band,
    count: safeBuckets.filter((bucket) => bucket.band === band).reduce((sum, bucket) => sum + bucket.count, 0),
  }));

  return (
    <div className="panel-nested bg-gradient-to-b from-ink-900 to-ink-950/80 p-4 sm:p-5">
      <div className="flex gap-3">
        {/* Only the extremes are labelled. Four numbers up the side of a
            twenty-bucket histogram is clutter, not precision. */}
        <div
          className="shrink-0 flex flex-col justify-between text-2xs text-ink-400 tabular"
          style={{ height }}
          aria-hidden="true"
        >
          <span>{max}</span>
          <span>0</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="relative" style={{ height }}>
            {[0.25, 0.5, 0.75, 1].map((line) => (
              <div
                key={line}
                className="absolute inset-x-0 border-t"
                // Recessive by design — the grid is a reading aid, not data.
                style={{ bottom: `${line * 100}%`, borderColor: 'var(--hairline-soft)' }}
                aria-hidden="true"
              />
            ))}

            {/* Band boundaries, drawn where they actually fall. */}
            {[55, 75].map((mark) => (
              <div
                key={mark}
                className="absolute inset-y-0 border-l border-dashed border-ink-300 z-10"
                style={{ left: `${mark}%` }}
                aria-hidden="true"
              />
            ))}

            <div className="absolute inset-0 flex items-end gap-px">
              {safeBuckets.map((bucket, index) => {
                const pct = (bucket.count / max) * 100;
                return (
                  <div key={bucket.from} className="flex-1 h-full flex items-end group relative">
                    <div
                      className="animate-bar-y w-full rounded-t-[3px] transition-[opacity,filter] duration-200 group-hover:brightness-110"
                      style={{
                        height: `${Math.max(pct, bucket.count > 0 ? 2 : 0)}%`,
                        background: BAND_COLOR[bucket.band],
                        animationDelay: `${staggerDelay(index, 28)}ms`,
                      }}
                    />
                    {/* Hover readout. Twenty permanent labels would bury the
                        shape the chart exists to show. */}
                    <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <span className="block whitespace-nowrap rounded-md bg-ink-950 border border-data-300/20 text-white text-2xs px-2 py-1.5">
                        {bucket.from}–{bucket.to}: <span className="font-semibold tabular">{bucket.count}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-ink-200 text-2xs text-ink-400 tabular" aria-hidden="true">
            {[0, 25, 50, 75, 100].map((tick) => <span key={tick}>{tick}</span>)}
          </div>
        </div>
      </div>

      <ul className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3 pt-3 border-t border-ink-100 text-2xs text-ink-500">
        {bandTotals.map(({ band, count }) => (
          <li key={band} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: BAND_COLOR[band] }} aria-hidden="true" />
            {BAND_LABEL[band]} — <span className="font-semibold text-ink-900 tabular">{count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
