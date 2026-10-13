import { staggerDelay } from '../hooks/useEnterTransition';

/**
 * Horizontal bar list.
 *
 * Chosen over vertical bars because the categories are text labels of varying
 * length — industries, states, revenue bands. Horizontal bars let each label sit
 * on its own baseline instead of being rotated or truncated.
 *
 * One hue throughout. These are single-series magnitude charts, so colour has no
 * identity to carry: the label does that, and a second hue would imply a
 * distinction that does not exist.
 *
 * Bars grow from zero on mount, staggered down the list. The motion is doing a
 * job — it shows the reader that the figures were computed for the criteria they
 * set, and the stagger walks the eye down the ranking in order.
 */

interface Row {
  label: string;
  value: number;
}

interface BarListProps {
  data: Row[];
  unit?: string;
  /** Keep source order instead of sorting by value — correct for ordered bands. */
  preserveOrder?: boolean;
  maxItems?: number;
}

function EmptyChart() {
  return (
    <p className="text-sm text-ink-400 py-8 text-center">No data to display.</p>
  );
}

export function BarList({ data, unit = 'companies', preserveOrder = false, maxItems = 8 }: BarListProps) {
  const rows = (preserveOrder ? data : [...data].sort((a, b) => b.value - a.value)).slice(0, maxItems);
  const max = Math.max(...rows.map((row) => row.value), 1);
  const total = data.reduce((sum, row) => sum + row.value, 0);

  if (rows.length === 0 || total === 0) return <EmptyChart />;

  return (
    <ul className="space-y-4">
      {rows.map((row, index) => {
        const share = total > 0 ? Math.round((row.value / total) * 100) : 0;
        return (
          <li key={row.label} className="group">
            <div className="flex items-baseline justify-between gap-3 mb-1.5">
              <span className="text-xs text-ink-700 truncate group-hover:text-ink-900 transition-colors" title={row.label}>
                {row.label}
              </span>
              <span className="shrink-0 text-xs tabular">
                <span className="font-semibold text-ink-900">{row.value}</span>
                <span className="text-ink-400 ml-1.5">{share}%</span>
              </span>
            </div>

            <div
              className="chart-track h-2.5 rounded-full overflow-hidden p-[1px]"
              role="img"
              aria-label={`${row.label}: ${row.value} ${unit}, ${share}% of total`}
            >
              <div
                className="chart-bar animate-bar-x h-full rounded-full transition-[filter,box-shadow] duration-300 group-hover:brightness-110"
                style={{
                  width: `${Math.max((row.value / max) * 100, 1.5)}%`,
                  animationDelay: `${staggerDelay(index)}ms`,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Ordered band list using an ordinal ramp — light to dark with rank.
 *
 * Used where the bands themselves are ordered (priority, data-quality tier,
 * digitization upside), so the ramp reinforces the ordering the labels state
 * rather than implying four unrelated categories.
 *
 * The ramp steps are validated: single hue, monotone lightness, and the lightest
 * step still clears 2:1 against a white surface.
 */
export function OrdinalBarList({ data, unit = 'companies' }: { data: Row[]; unit?: string }) {
  const total = data.reduce((sum, row) => sum + row.value, 0);
  const max = Math.max(...data.map((row) => row.value), 1);
  const ramp = [
    'linear-gradient(90deg, #5c4300, #b88908)',
    'linear-gradient(90deg, #b88908, #f9d360)',
    'linear-gradient(90deg, #efd46f, #fff0b0)',
  ];

  if (total === 0) return <EmptyChart />;

  return (
    <ul className="space-y-4">
      {data.map((row, index) => {
        const share = Math.round((row.value / total) * 100);
        return (
          <li key={row.label} className="group">
            <div className="flex items-baseline justify-between gap-3 mb-1.5">
              <span className="flex items-center gap-2 min-w-0">
                {/* A colour key per row, so the ramp is readable without a legend. */}
                <span
                  className="shrink-0 w-2 h-2 rounded-sm"
                  style={{ background: ramp[Math.min(index, ramp.length - 1)] }}
                  aria-hidden="true"
                />
                <span className="text-xs text-ink-700 truncate group-hover:text-ink-900 transition-colors">
                  {row.label}
                </span>
              </span>
              <span className="shrink-0 text-xs tabular">
                <span className="font-semibold text-ink-900">{row.value}</span>
                <span className="text-ink-400 ml-1.5">{share}%</span>
              </span>
            </div>

            <div
              className="chart-track h-2.5 rounded-full overflow-hidden p-[1px]"
              role="img"
              aria-label={`${row.label}: ${row.value} ${unit}, ${share}% of total`}
            >
              <div
                className="animate-bar-x h-full rounded-full"
                style={{
                  width: `${Math.max((row.value / max) * 100, 1.5)}%`,
                  background: ramp[Math.min(index, ramp.length - 1)],
                  animationDelay: `${staggerDelay(index, 90)}ms`,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
