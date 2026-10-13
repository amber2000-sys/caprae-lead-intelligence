import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { useBuyBox } from '../hooks/useBuyBox';
import { useToast } from '../hooks/useToast';
import { ScoreBadge, PriorityBadge, WebsiteBadge, DuplicateBadge, DemoDataBadge, DataQualityBar } from '../components/Badges';
import { ScoreBreakdown } from '../components/ScoreBreakdown';
import { LoadingState, ErrorState } from '../components/States';
import { formatMoney, formatNumber, formatLocation } from '../utils/format';
import type { LeadDetail as LeadDetailData } from '../types';

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-2xs font-semibold uppercase tracking-wide text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink-900">{value}</dd>
    </div>
  );
}

const SEVERITY_COLOR = {
  high: 'var(--status-risk)',
  medium: 'var(--status-warn)',
  low: 'var(--text-muted)',
} as const;

export function LeadDetail() {
  const { id = '' } = useParams();
  const { version } = useBuyBox();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState('');

  const { data: lead, loading, error, reload } = useAsync<LeadDetailData>(() => api.getLead(id), [id, version]);

  const handleSave = async () => {
    if (!lead) return;
    setSaving(true);
    try {
      await api.saveLead(lead._id, note.trim() || undefined);
      toast.success(`${lead.companyName} saved to your pipeline.`);
      setNote('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save this lead.');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    if (!lead) return;
    try {
      await api.exportLeads({ ids: [lead._id] });
      toast.success('Lead exported to CSV.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed.');
    }
  };

  if (loading) return <div className="card"><LoadingState label="Loading lead…" rows={8} /></div>;
  if (error) return <div className="card"><ErrorState message={error} onRetry={reload} /></div>;
  if (!lead) return null;

  const digitization = lead.scoreBreakdown.find((component) => component.key === 'digitizationUpside');

  return (
    <>
      <nav className="mb-4 text-xs text-ink-500" aria-label="Breadcrumb">
        <Link to="/leads" className="hover:text-ink-900 underline underline-offset-2">Lead Results</Link>
        <span className="mx-1.5 text-ink-300" aria-hidden="true">/</span>
        <span className="text-ink-700">{lead.companyName}</span>
      </nav>

      {/* Header: identity, headline score and the two actions that matter. */}
      <header className="card p-5 mb-5">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <h1 className="text-xl font-bold text-ink-900 tracking-tight">{lead.companyName}</h1>
              <PriorityBadge priority={lead.priority} />
              {lead.duplicateStatus === 'probable_duplicate' && <DuplicateBadge />}
              {lead.isDemoData && <DemoDataBadge />}
            </div>
            <p className="text-sm text-ink-600">
              {lead.industry}
              {lead.subIndustry && <span className="text-ink-400"> · {lead.subIndustry}</span>}
              <span className="text-ink-300 mx-1.5" aria-hidden="true">|</span>
              {formatLocation(lead.location)}
            </p>
            {lead.domain && (
              <p className="mt-1.5 flex items-center gap-2 text-sm">
                <span className="text-ink-500">{lead.domain}</span>
                <WebsiteBadge status={lead.websiteStatus} />
              </p>
            )}
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <p className="text-2xs font-semibold uppercase tracking-wide text-ink-500 mb-1">Acquisition Fit</p>
              <ScoreBadge score={lead.fitScore} priority={lead.priority} size="lg" />
              <p className="mt-1 text-xs text-ink-400">vs {lead.buyBoxName}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] items-start">
        <div className="space-y-5 min-w-0">
          <section className="card p-5">
            <h2 className="text-sm font-semibold text-ink-900 mb-4">Company overview</h2>
            <dl className="grid gap-4 grid-cols-2 sm:grid-cols-3">
              <Detail label="Employees" value={<span className="tabular">{formatNumber(lead.employeeCount)}</span>} />
              <Detail
                label="Revenue estimate"
                value={
                  <span className="tabular">
                    {formatMoney(lead.revenueEstimate)}
                    {lead.revenueIsEstimated && <span className="text-ink-400 text-xs ml-1">est.</span>}
                  </span>
                }
              />
              <Detail label="Founded" value={<span className="tabular">{lead.foundedYear ?? '—'}</span>} />
              <Detail label="Business model" value={lead.businessModel || '—'} />
              <Detail label="Contact" value={lead.contactAvailability ? (lead.contactEmail || 'Available') : <span className="text-ink-400">Not available</span>} />
              <Detail label="Source" value={lead.source} />
            </dl>

            {lead.technologyStack.length > 0 && (
              <div className="mt-4 pt-4 border-t border-ink-200">
                <p className="text-2xs font-semibold uppercase tracking-wide text-ink-500 mb-2">Detected technology</p>
                <ul className="flex flex-wrap gap-1.5">
                  {lead.technologyStack.map((tech) => (
                    <li key={tech} className="px-2 h-6 inline-flex items-center rounded bg-ink-100 text-xs text-ink-700">{tech}</li>
                  ))}
                </ul>
              </div>
            )}

            {lead.growthSignals.length > 0 && (
              <div className="mt-4 pt-4 border-t border-ink-200">
                <p className="text-2xs font-semibold uppercase tracking-wide text-ink-500 mb-2">Growth signals</p>
                <ul className="space-y-1">
                  {lead.growthSignals.map((signal) => (
                    <li key={signal} className="text-sm text-ink-700">· {signal}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* The digitization panel — the differentiating analysis, given its
              own section rather than buried as one bar among eight. */}
          {digitization?.meta && (
            <section className="card p-5">
              <div className="flex items-start justify-between gap-4 mb-1">
                <h2 className="text-sm font-semibold text-ink-900">Digitization upside</h2>
                <span className="text-sm font-bold text-ink-900 tabular shrink-0">
                  {digitization.meta.gapIndex}<span className="text-ink-400 font-normal">/100 gap</span>
                </span>
              </div>
              <p className="text-xs text-ink-500 mb-4 leading-relaxed">
                How much operational headroom a post-acquisition operator would have here. A higher gap means more
                value available from modernisation — it is an opportunity measure, not a quality judgement.
              </p>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--status-warn)' }}>
                    Gaps identified ({digitization.meta.gaps.length})
                  </p>
                  {digitization.meta.gaps.length === 0 ? (
                    <p className="text-sm text-ink-400">None — already well digitised.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {digitization.meta.gaps.map((gap) => (
                        <li key={gap.key} className="flex items-start justify-between gap-2 text-sm text-ink-700">
                          <span className="leading-snug">{gap.label}</span>
                          <span className="text-xs text-ink-400 tabular shrink-0">+{gap.weight}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <p className="text-2xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--status-good)' }}>
                    Already in place ({digitization.meta.strengths.length})
                  </p>
                  {digitization.meta.strengths.length === 0 ? (
                    <p className="text-sm text-ink-400">Nothing detected.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {digitization.meta.strengths.map((strength) => (
                        <li key={strength} className="text-sm text-ink-700 leading-snug">{strength}</li>
                      ))}
                    </ul>
                  )}
                  {digitization.meta.unknown.length > 0 && (
                    <p className="mt-3 text-xs text-ink-400 leading-snug">
                      {digitization.meta.unknown.length} signal{digitization.meta.unknown.length === 1 ? '' : 's'} could not be assessed for this record.
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <section className="card p-5">
              <h2 className="text-sm font-semibold text-ink-900 mb-3">Why this lead</h2>
              {lead.reasons.length === 0 ? (
                <p className="text-sm text-ink-400">This company does not meet any of your criteria strongly.</p>
              ) : (
                <ul className="space-y-2.5">
                  {lead.reasons.map((reason) => (
                    <li key={reason.label} className="flex items-start gap-2">
                      <span className="mt-0.5 text-xs font-bold shrink-0" style={{ color: 'var(--status-good)' }} aria-hidden="true">✓</span>
                      <span className="min-w-0">
                        <span className="block text-sm text-ink-800">{reason.label}</span>
                        <span className="block text-xs text-ink-500 leading-snug">{reason.detail}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Concerns are given equal visual weight to reasons. A tool that
                only argues for a lead is a sales deck, not a diligence aid. */}
            <section className="card p-5">
              <h2 className="text-sm font-semibold text-ink-900 mb-3">Potential concerns</h2>
              {lead.concerns.length === 0 ? (
                <p className="text-sm text-ink-400">No material concerns flagged on this record.</p>
              ) : (
                <ul className="space-y-2.5">
                  {lead.concerns.map((concern) => (
                    <li key={concern.label} className="flex items-start gap-2">
                      <span className="mt-0.5 text-xs font-bold shrink-0" style={{ color: SEVERITY_COLOR[concern.severity] }} aria-hidden="true">!</span>
                      <span className="min-w-0">
                        <span className="block text-sm text-ink-800">{concern.label}</span>
                        <span className="block text-xs text-ink-500 leading-snug">{concern.detail}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {lead.duplicates.length > 0 && (
            <section className="card p-5">
              <h2 className="text-sm font-semibold text-ink-900 mb-1">Related records</h2>
              <p className="text-xs text-ink-500 mb-3 leading-relaxed">
                {lead.duplicateMatchReason || 'These records probably describe the same company.'}{' '}
                Nothing is deleted automatically — the merge decision is yours.
              </p>
              <ul className="divide-y divide-ink-100 border border-ink-200 rounded-md">
                {lead.duplicates.map((duplicate) => (
                  <li key={duplicate._id}>
                    <Link to={`/leads/${duplicate._id}`} className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-ink-50 transition-colors">
                      <span className="min-w-0">
                        <span className="block text-sm text-ink-900 truncate">{duplicate.companyName}</span>
                        <span className="block text-xs text-ink-400 truncate">{duplicate.domain}</span>
                      </span>
                      <span className="text-xs text-ink-500 shrink-0">
                        {duplicate.duplicateStatus === 'primary' ? 'Primary record' : 'Probable duplicate'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-5 xl:sticky xl:top-6">
          <section className="card p-5">
            <h2 className="text-sm font-semibold text-ink-900 mb-1">Score breakdown</h2>
            <p className="text-xs text-ink-500 mb-4">Every point traced to a criterion.</p>
            <ScoreBreakdown components={lead.scoreBreakdown} total={lead.fitScore} />
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-sm font-semibold text-ink-900">Data quality</h2>
              <DataQualityBar score={lead.dataQualityScore} band={lead.dataQualityBand} />
            </div>
            <ul className="space-y-1.5">
              {lead.dataQualityChecks.map((check) => (
                <li key={check.key} className="flex items-start gap-2 text-xs">
                  <span
                    className="mt-0.5 font-bold shrink-0"
                    style={{ color: check.passed ? 'var(--status-good)' : 'var(--status-warn)' }}
                    aria-hidden="true"
                  >
                    {check.passed ? '✓' : '!'}
                  </span>
                  <span className={check.passed ? 'text-ink-600' : 'text-ink-800'}>
                    {check.passed ? check.label : check.hint}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-semibold text-ink-900 mb-3">Add to pipeline</h2>
            <label className="block">
              <span className="sr-only">Note</span>
              <textarea
                className="field h-auto py-2 resize-y min-h-[4.5rem]"
                placeholder="Optional note, e.g. “Review founder ownership before outreach.”"
                value={note}
                maxLength={1000}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
            <div className="flex items-center gap-2 mt-3">
              <button type="button" className="btn-primary flex-1" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save lead'}
              </button>
              <button type="button" className="btn-secondary" onClick={handleExport}>Export</button>
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
