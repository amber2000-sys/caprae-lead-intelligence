import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { useBuyBox } from '../hooks/useBuyBox';
import { useToast } from '../hooks/useToast';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { LeadsTable } from '../components/LeadsTable';
import { LoadingState, ErrorState, EmptyState } from '../components/States';
import { OrdinalBarList } from '../charts/BarList';
import {
  IconTarget, IconGauge, IconShieldCheck, IconFilter,
  IconUpside, IconRanking, IconArrowRight,
} from '../components/Icons';
import { formatMoney } from '../utils/format';
import type { Dashboard as DashboardData, BuyBox } from '../types';

/**
 * The active criteria, restated as chips.
 *
 * Every number on this page is conditional on these, and a dashboard that does
 * not say what it is filtered by invites the reader to misread it.
 */
function CriteriaStrip({ buyBox }: { buyBox: BuyBox }) {
  const chips = [
    buyBox.industry || 'Any industry',
    [buyBox.state, buyBox.country].filter(Boolean).join(', ') || 'Any geography',
    buyBox.employeeMin || buyBox.employeeMax
      ? `${buyBox.employeeMin ?? 0}–${buyBox.employeeMax ?? '∞'} employees`
      : 'Any size',
    buyBox.revenueMin || buyBox.revenueMax
      ? `${formatMoney(buyBox.revenueMin)}–${formatMoney(buyBox.revenueMax)}`
      : 'Any revenue',
    buyBox.businessModel || 'Any model',
  ];

  return (
    <div className="card px-4 py-3 mb-4 animate-fade flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide text-ink-500 shrink-0">
        <IconFilter size={13} />
        Scoring against
      </span>
      <ul className="flex flex-wrap items-center gap-1.5 min-w-0">
        {chips.map((chip) => (
          <li key={chip} className="inline-flex items-center h-7 px-2.5 rounded-lg bg-data-50 border border-data-100 text-xs font-medium text-data-800 whitespace-nowrap">
            {chip}
          </li>
        ))}
      </ul>
      <Link to="/buy-box" className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-ink-600 hover:text-data-700 shrink-0">
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3 5h14M6 10h8M8 15h4" strokeLinecap="round"/><circle cx="7" cy="5" r="1.5" fill="white"/><circle cx="13" cy="10" r="1.5" fill="white"/><circle cx="10" cy="15" r="1.5" fill="white"/></svg>
        Edit criteria
      </Link>
    </div>
  );
}

function PanelHeader({
  title, description, icon, to, linkLabel,
}: {
  title: string; description: string; icon: React.ReactNode; to?: string; linkLabel?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4">
      <div className="flex items-start gap-2.5 min-w-0">
        <span className="shrink-0 w-8 h-8 rounded-lg bg-data-50 border border-data-100 text-data-700 flex items-center justify-center">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink-950 leading-tight">{title}</h2>
          <p className="text-xs text-ink-500 mt-0.5 leading-snug">{description}</p>
        </div>
      </div>
      {to && (
        <Link to={to} className="group shrink-0 inline-flex items-center gap-1 text-xs font-medium text-ink-600 hover:text-ink-900 transition-colors">
          {linkLabel}
          <IconArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

export function Dashboard() {
  const { version, buyBox } = useBuyBox();
  const toast = useToast();
  const { data, loading, error, reload } = useAsync<DashboardData>(() => api.getDashboard(), [version]);

  const handleSave = async (id: string, name: string) => {
    try {
      await api.saveLead(id);
      toast.success(`${name} saved to your pipeline.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save this lead.');
    }
  };

  const totals = data?.totals;
  const excluded = totals ? totals.total - totals.matching : 0;

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="What your current criteria surface, and which companies to open first."
        actions={
          <>
            <Link to="/buy-box" className="btn-secondary">
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m4 14 1.5-4.5L13.5 1.5l5 5-8 8L6 16zM12 3l5 5"/><path d="m4 14-1 3 3-1"/></svg>
              Edit Buy Box
            </Link>
            <Link to="/leads" className="btn-primary">View all leads <span aria-hidden="true">→</span></Link>
          </>
        }
      />

      {buyBox && !loading && !error && <CriteriaStrip buyBox={buyBox} />}

      {loading && <div className="card"><LoadingState label="Loading dashboard…" rows={6} /></div>}
      {error && !loading && <div className="card"><ErrorState message={error} onRetry={reload} /></div>}

      {data && totals && !loading && !error && (
        <div className="space-y-4">
          {/*
           * Four cards, not six.
           *
           * The previous version gave equal weight to pipeline metrics and data-
           * health metrics, which flattened the hierarchy — six numbers with no
           * reading order. These four answer the four questions a searcher opens
           * the page with, in order: what survived my criteria, what is worth
           * opening, how strong is the set, can I trust it. The data-health
           * detail moved into the hint line of the card it belongs to.
           */}
          <section aria-label="Pipeline summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Matching your Buy Box" value={totals.matching} delayMs={0}
              icon={<IconFilter size={15} />}
              hint={`${excluded} of ${totals.total} excluded by your criteria`}
            />
            <StatCard
              label="High fit" value={totals.matchingHighFit} tone="good" delayMs={40}
              icon={<IconTarget size={15} />}
              hint="Scoring 75+ — open these first"
            />
            <StatCard
              label="Avg fit score" value={totals.matchingAverageFitScore} suffix="%" delayMs={80}
              icon={<IconGauge size={15} />} meter={totals.matchingAverageFitScore}
              hint="Across matching companies"
            />
            <StatCard
              label="Data health" value={totals.averageDataQuality} suffix="%" delayMs={120}
              icon={<IconShieldCheck size={15} />} meter={totals.averageDataQuality}
              tone={totals.duplicates + totals.incomplete > 0 ? 'warn' : 'good'}
              hint={`${totals.verified} verified · ${totals.duplicates} duplicates · ${totals.incomplete} incomplete`}
            />
          </section>

          {/*
           * The table runs full width.
           *
           * At two-thirds it lost its Fit Score, Priority and Data Quality
           * columns off the right edge — the three columns the page exists to
           * show. Moving the analysis panels below it also removes the unequal
           * column heights that left dead space under the sidebar.
           */}
          <section className="card overflow-hidden animate-rise" style={{ animationDelay: '160ms' }}>
            <div className="px-4 pt-4">
              <PanelHeader
                title="Top acquisition opportunities"
                description={`The ${Math.min(8, totals.matching)} highest-scoring companies against ${data.buyBox.name}`}
                icon={<IconTarget size={15} />}
                to="/leads"
                linkLabel="See all"
              />
            </div>

            {data.topOpportunities.length === 0 ? (
              <EmptyState
                title="No companies match your Buy Box"
                description="Your criteria may be too narrow. Widen the ranges, or turn off the industry restriction to include adjacent sectors."
                action={<Link to="/buy-box" className="btn-primary">Adjust Buy Box</Link>}
              />
            ) : (
              <LeadsTable
                leads={data.topOpportunities}
                sortBy="fitScore"
                sortOrder="desc"
                onSort={() => undefined}
                showRank
                onSave={(lead) => handleSave(lead._id, lead.companyName)}
              />
            )}
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card p-4 animate-rise" style={{ animationDelay: '200ms' }}>
              <PanelHeader
                title="Priority split"
                description="How the whole dataset scores against your criteria."
                icon={<IconRanking size={15} />}
              />
              <OrdinalBarList data={data.byPriority} />
            </section>

            {/* The differentiating signal, kept on the landing screen because it
                is the reason this tool exists rather than a generic lead list. */}
            <section className="card p-4 flex flex-col animate-rise" style={{ animationDelay: '240ms' }}>
              <PanelHeader
                title="Digitization upside"
                description="Operational headroom a post-acquisition operator would have."
                icon={<IconUpside size={15} />}
                to="/analytics"
                linkLabel="Detail"
              />
              <OrdinalBarList data={data.digitizationGap} />
              <p className="mt-auto pt-3.5 text-xs text-ink-500 leading-relaxed">
                Inverted on purpose — a dated digital footprint scores{' '}
                <span className="font-medium text-ink-700">higher</span>, because it marks value a new
                operator can create.
              </p>
            </section>
          </div>
        </div>
      )}
    </>
  );
}
