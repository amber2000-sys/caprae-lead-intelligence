import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { useBuyBox } from '../hooks/useBuyBox';
import { PageHeader } from '../components/PageHeader';
import { LoadingState } from '../components/States';
import { formatMoney } from '../utils/format';
import type { FilterOptions } from '../types';

/**
 * Preset searches.
 *
 * A blank filter form is a bad first screen: it asks the user to know the answer
 * before they have seen the data. Each preset is a real sourcing thesis, so a
 * new user gets to a meaningful result set in one click and learns what the
 * filters do by seeing them pre-filled.
 */
const PRESETS = [
  {
    id: 'succession',
    title: 'Succession-stage operators',
    thesis: 'Long-established, founder-led businesses where an ownership transition is plausible.',
    params: { minFitScore: '60', revenueMin: '2000000', employeeMin: '25' },
  },
  {
    id: 'digitization',
    title: 'High digitization upside',
    thesis: 'Companies with a weak digital footprint — the most operational headroom post-acquisition.',
    params: { minFitScore: '65', sortBy: 'fitScore' },
  },
  {
    id: 'clean',
    title: 'Verified, contactable leads',
    thesis: 'Records with a reachable site and a known contact route — actionable without further research.',
    params: { websiteStatus: 'verified', dataQuality: 'high', minFitScore: '55' },
  },
  {
    id: 'review',
    title: 'Needs data review',
    thesis: 'Duplicates and incomplete records. Clean these before they reach your pipeline.',
    params: { dataQuality: 'low', includeDuplicates: 'true' },
  },
] as const;

const WORKFLOW = [
  { step: '1', title: 'Define your Buy Box', body: 'Set industry, geography, size and revenue. Everything downstream is scored against it.', to: '/buy-box' },
  { step: '2', title: 'Discover', body: 'Start from a preset or filter the dataset yourself.', to: null },
  { step: '3', title: 'Review the ranking', body: 'Companies are ordered by acquisition fit, not alphabetically.', to: '/leads' },
  { step: '4', title: 'Understand why', body: 'Open any lead to see every point of its score, and what to be careful of.', to: null },
  { step: '5', title: 'Save or export', body: 'Keep the good ones, or take the whole ranked list to your CRM as CSV.', to: '/saved' },
];

export function Discovery() {
  const navigate = useNavigate();
  const { buyBox } = useBuyBox();
  const options = useAsync<FilterOptions>(() => api.getFilterOptions(), []);

  const runPreset = (params: Record<string, string>) => {
    navigate(`/leads?${new URLSearchParams(params).toString()}`);
  };

  return (
    <>
      <PageHeader
        title="Lead Discovery"
        description="Start from a sourcing thesis, or go straight to the full filterable result set."
        actions={<Link to="/leads" className="btn-primary">Browse all leads</Link>}
      />

      <div className="space-y-5">
        {/* The workflow, stated plainly. The brief's UX target is that a new
            user understands the product in thirty seconds — this is how. */}
        <section className="card p-5">
          <h2 className="text-sm font-semibold text-ink-900 mb-4">How this works</h2>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {WORKFLOW.map((item) => (
              <li key={item.step} className="flex gap-2.5">
                <span className="shrink-0 w-7 h-7 rounded-lg bg-data-300 border border-data-400 text-ink-950 text-xs font-bold flex items-center justify-center" aria-hidden="true">
                  {item.step}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-900 leading-snug">
                    {item.to ? <Link to={item.to} className="hover:text-data-600 underline underline-offset-2">{item.title}</Link> : item.title}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-500 leading-snug">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-ink-900 mb-1">Start from a thesis</h2>
          <p className="text-xs text-ink-500 mb-3">
            Each preset applies a set of filters on top of your active Buy Box
            {buyBox?.industry && <> (<span className="font-medium text-ink-700">{buyBox.industry}</span>)</>}.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => runPreset(preset.params as unknown as Record<string, string>)}
                className="card-interactive relative overflow-hidden p-5 text-left group before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-data-600 before:scale-y-0 before:origin-bottom before:transition-transform before:duration-300 hover:before:scale-y-100"
              >
                <p className="text-base font-semibold text-ink-950 group-hover:text-data-700 transition-colors">{preset.title}</p>
                <p className="mt-1 text-xs text-ink-500 leading-relaxed">{preset.thesis}</p>
                <span className="mt-3 inline-block text-xs font-medium text-ink-600 group-hover:text-data-600 transition-colors">
                  Run this search →
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="card p-5">
          <h2 className="text-sm font-semibold text-ink-900 mb-1">What is in the dataset</h2>
          <p className="text-xs text-ink-500 mb-4">
            A synthetic demo dataset of fictional companies. No real business is named and no real financial claim is made.
          </p>

          {options.loading && <LoadingState label="Loading dataset summary…" rows={2} />}
          {options.data && (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wide text-ink-500 mb-2">
                  Industries ({options.data.industries.length})
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {options.data.industries.map((industry) => (
                    <li key={industry}>
                      <Link to={`/leads?industry=${encodeURIComponent(industry)}`} className="inline-flex items-center h-6 px-2 rounded bg-ink-100 text-xs text-ink-700 hover:bg-ink-200 transition-colors">
                        {industry}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wide text-ink-500 mb-2">
                  States / regions ({options.data.states.filter(Boolean).length})
                </p>
                <p className="text-sm text-ink-700 leading-relaxed">
                  {options.data.states.filter(Boolean).slice(0, 10).join(', ')}
                  {options.data.states.filter(Boolean).length > 10 && '…'}
                </p>
              </div>
              <div>
                <p className="text-2xs font-semibold uppercase tracking-wide text-ink-500 mb-2">Typical size range</p>
                <p className="text-sm text-ink-700 leading-relaxed">
                  10–600 employees · {formatMoney(700_000)} – {formatMoney(180_000_000)} estimated revenue
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
