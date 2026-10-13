import { api } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { useBuyBox } from '../hooks/useBuyBox';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { LoadingState, ErrorState } from '../components/States';
import { BarList, OrdinalBarList } from '../charts/BarList';
import { ScoreDistribution } from '../charts/ScoreDistribution';
import {
  IconDatabase, IconTarget, IconShieldCheck, IconIncomplete,
  IconGauge, IconUpside, IconRanking, IconFilter,
} from '../components/Icons';
import type { Analytics as AnalyticsData } from '../types';

/**
 * A labelled group of panels.
 *
 * Six visually identical bar charts in one grid read as noise — nothing tells
 * the reader which question each answers or how they relate. Grouping them
 * under a stated question gives the page a reading order.
 */
function Group({ title, question, children }: { title: string; question: string; children: React.ReactNode }) {
  return (
    <section className="animate-fade">
      <div className="mb-3">
        <h2 className="text-[0.625rem] font-bold uppercase tracking-[0.22em] text-data-600">{title}</h2>
        <p className="text-lg font-semibold text-ink-900 mt-1">{question}</p>
        <div className="luxury-rule mt-2.5 w-24" />
      </div>
      {children}
    </section>
  );
}

function Panel({
  title, description, icon, children, delayMs = 0, className = '',
}: {
  title: string; description: string; icon: React.ReactNode;
  children: React.ReactNode; delayMs?: number; className?: string;
}) {
  return (
    <div className={`card p-4 flex flex-col animate-rise ${className}`} style={{ animationDelay: `${delayMs}ms` }}>
      <div className="flex items-start gap-2.5 mb-4">
        <span className="shrink-0 w-8 h-8 rounded-lg bg-data-50 border border-data-100 text-data-700 flex items-center justify-center">
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-ink-950 leading-tight">{title}</h3>
          <p className="text-xs text-ink-500 mt-0.5 leading-snug">{description}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export function Analytics() {
  const { version } = useBuyBox();
  // One request. The histogram used to come from a second, paginated lead
  // query, which covered only the leads surviving the Buy Box while the stat
  // cards above it counted the whole dataset — two populations on one screen.
  const analytics = useAsync<AnalyticsData>(() => api.getAnalytics(), [version]);

  return (
    <>
      <PageHeader
        title="Analytics"
        description="The shape of the dataset and of your pipeline, scored against the active Buy Box."
      />

      {analytics.loading && <div className="card"><LoadingState label="Loading analytics…" rows={6} /></div>}
      {analytics.error && !analytics.loading && (
        <div className="card"><ErrorState message={analytics.error} onRetry={analytics.reload} /></div>
      )}

      {analytics.data && !analytics.loading && !analytics.error && (
        <div className="space-y-7">
          <section aria-label="Dataset summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Companies" value={analytics.data.totals.total} delayMs={0}
              icon={<IconDatabase size={15} />} hint="In the demo dataset"
            />
            <StatCard
              label="High fit" value={analytics.data.totals.highFit} tone="good" delayMs={40}
              icon={<IconTarget size={15} />} hint="Scoring 75 or above"
            />
            <StatCard
              label="Avg data quality" value={analytics.data.totals.averageDataQuality} suffix="%" delayMs={80}
              icon={<IconShieldCheck size={15} />} meter={analytics.data.totals.averageDataQuality}
              hint="Across all records"
            />
            <StatCard
              label="Needs review"
              value={analytics.data.totals.duplicates + analytics.data.totals.incomplete}
              tone="warn" delayMs={120} icon={<IconIncomplete size={15} />}
              hint={`${analytics.data.totals.duplicates} duplicates · ${analytics.data.totals.incomplete} incomplete`}
            />
          </section>

          <Group title="Pipeline shape" question="Did my criteria produce a usable shortlist, or a flat mass?">
            <Panel
              title="Fit score distribution"
              description="The shape matters more than the average — a few strong targets is a usable pipeline, an even spread is not."
              icon={<IconGauge size={15} />}
              delayMs={160}
            >
              <ScoreDistribution buckets={analytics.data.scoreHistogram} />
            </Panel>
          </Group>

          {/* The differentiating analysis gets its own group and the full width,
              rather than sitting as one tile among six. */}
          <Group title="Operational upside" question="Where is there the most headroom for a new operator?">
            <Panel
              title="Digitization upside"
              description="How much value modernisation would unlock across the dataset. Inverted on purpose — a weaker digital footprint scores higher."
              icon={<IconUpside size={15} />}
              delayMs={200}
            >
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem] items-start">
                <OrdinalBarList data={analytics.data.digitizationGap} />
                <div className="rounded-xl bg-ink-950 text-white border border-data-300/20 p-4">
                  <p className="text-xs text-white/70 leading-relaxed">
                    The gap index sums seven weighted signals — no HTTPS, no mobile layout, stale content,
                    legacy stack, no self-serve channel, no analytics, no CRM.
                  </p>
                  <p className="text-xs text-white/70 leading-relaxed mt-2">
                    A high-upside company is not a worse business. It is one where a known playbook has
                    somewhere to be applied.
                  </p>
                </div>
              </div>
            </Panel>
          </Group>

          <Group title="Where the opportunities are" question="How is the dataset distributed?">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Panel title="By industry" description="Where the dataset concentrates." icon={<IconFilter size={15} />} delayMs={240}>
                <BarList data={analytics.data.byIndustry} />
              </Panel>
              <Panel title="By state" description="Top regions by company count." icon={<IconFilter size={15} />} delayMs={270}>
                <BarList data={analytics.data.byState} />
              </Panel>
              <Panel title="By revenue band" description="Estimated revenue across the dataset." icon={<IconRanking size={15} />} delayMs={300}>
                <BarList data={analytics.data.byRevenueBucket} preserveOrder />
              </Panel>
            </div>
          </Group>

          <Group title="Fit and data health" question="How does it score, and can I trust the records?">
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Priority split" description="How the dataset scores against your current criteria." icon={<IconRanking size={15} />} delayMs={330}>
                <OrdinalBarList data={analytics.data.byPriority} />
              </Panel>
              <Panel title="Data quality" description="Record completeness and validity, independent of fit." icon={<IconShieldCheck size={15} />} delayMs={360}>
                <OrdinalBarList data={analytics.data.byDataQuality} />
              </Panel>
            </div>
          </Group>

          <p className="text-xs text-ink-400 px-1">
            Scored against <span className="font-medium text-ink-600">{analytics.data.buyBoxName}</span>.
            All figures derive from synthetic demo data.
          </p>
        </div>
      )}
    </>
  );
}
