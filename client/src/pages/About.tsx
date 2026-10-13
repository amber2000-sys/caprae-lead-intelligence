import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { PageHeader } from '../components/PageHeader';
import { LoadingState } from '../components/States';
import type { ScoringModel } from '../types';

const HONESTY_PRINCIPLES = [
  { title: 'Synthetic by design', body: 'Every company is fictional and generated from a fixed seed. No financial claim is made about a real business.' },
  { title: 'Estimates stay labelled', body: 'Modelled revenue is marked as estimated in the table, detail view, and CSV export—never presented as a filing.' },
  { title: 'Humans make merge decisions', body: 'Probable duplicates are flagged with their matching reason. Records are never deleted automatically.' },
  { title: 'Unknown is not absent', body: 'When a signal cannot be assessed, the score reports it instead of quietly assuming the worst case.' },
];

const COLLECTION_STANDARDS = [
  'Public business information only—never personal data beyond a business contact route.',
  'robots.txt and crawl-delay honoured.',
  'Rate limiting and an identifying user agent; no distributed evasion.',
  'No bypassing authentication, paywalls, CAPTCHAs, or anti-bot controls.',
  'Provenance and collection date stored per field, so stale estimates remain visible.',
];

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mb-5">
      <p className="text-[0.625rem] font-bold uppercase tracking-[0.2em] text-data-600">{eyebrow}</p>
      <h2 className="mt-1.5 text-xl font-bold tracking-tight text-ink-950">{title}</h2>
      {description && <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-ink-500">{description}</p>}
    </div>
  );
}

export function About() {
  const model = useAsync<ScoringModel>(() => api.getScoringModel(), []);
  const weights = model.data ? Object.entries(model.data.weights).sort(([, a], [, b]) => b - a) : [];
  const maxWeight = Math.max(...weights.map(([, weight]) => weight), 1);

  return (
    <>
      <PageHeader
        title="About &amp; Method"
        description="What this tool measures, how it measures it, and what it deliberately does not claim."
      />

      <div className="space-y-5 sm:space-y-6">
        <section className="relative overflow-hidden rounded-2xl border border-data-300/20 bg-ink-950 px-5 py-6 text-white sm:px-7 sm:py-8">
          <div className="relative grid gap-7 lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-end">
            <div className="max-w-3xl">
              <p className="text-[0.625rem] font-bold uppercase tracking-[0.22em] text-data-300">Why Caprae exists</p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Turn a long company list into a defensible shortlist.</h2>
              <p className="mt-3 text-sm leading-7 text-white/65 sm:text-base">
                Acquisition searchers do not need more names—they need to know which companies deserve attention first.
                Caprae ranks the companies you already have against your own criteria and shows every point behind the result.
              </p>
            </div>

            <dl className="grid grid-cols-3 overflow-hidden rounded-xl border border-data-300/20 bg-ink-900/80 backdrop-blur-sm">
              {[
                ['100', 'Total points'],
                ['8', 'Score signals'],
                ['0', 'Hidden factors'],
              ].map(([value, label], index) => (
                <div key={label} className={`p-3.5 text-center ${index > 0 ? 'border-l border-data-300/20' : ''}`}>
                  <dt className="text-[0.625rem] uppercase tracking-wider text-white/45">{label}</dt>
                  <dd className="mt-1 text-2xl font-bold tabular text-white">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <SectionHeading
            eyebrow="Transparent scoring"
            title="How the acquisition fit score is built"
            description="Eight explicit components sum to exactly 100. Component points always reconcile to the headline score, and automated tests enforce that contract."
          />

          {model.loading && <LoadingState label="Loading scoring model…" rows={4} />}
          {model.error && <p className="rounded-lg bg-ink-50 p-4 text-sm text-ink-500">The scoring model could not be loaded.</p>}
          {model.data && (
            <div className="grid gap-3 md:grid-cols-2">
              {weights.map(([key, weight]) => (
                <article key={key} className="rounded-xl border border-ink-200 bg-gradient-to-br from-ink-900 to-ink-950/80 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-ink-900">{model.data!.labels[key]}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-ink-500">{model.data!.descriptions[key]}</p>
                    </div>
                    <span className="inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg bg-data-50 px-2 text-sm font-bold tabular text-data-700">{weight}</span>
                  </div>
                  <div className="chart-track mt-3 h-1.5 overflow-hidden rounded-full" aria-hidden="true">
                    <div className="chart-bar h-full rounded-full" style={{ width: `${(weight / maxWeight) * 100}%` }} />
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-ink-200 pt-4 text-xs text-ink-600">
            <span className="font-semibold text-ink-800">Priority bands</span>
            <span className="rounded-md bg-data-50 px-2 py-1 font-bold text-data-700">HIGH 75+</span>
            <span className="rounded-md bg-amber-50 px-2 py-1 font-bold text-amber-700">MEDIUM 55–74</span>
            <span className="rounded-md bg-ink-100 px-2 py-1 font-bold text-ink-600">LOW &lt;55</span>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-2">
          <section className="card p-5 sm:p-6">
            <SectionHeading eyebrow="Data principles" title="Honest about what the data can prove" />
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              {HONESTY_PRINCIPLES.map((item) => (
                <li key={item.title} className="panel-nested flex gap-3 p-4">
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: 'rgb(249 211 96 / 0.14)', color: 'var(--brand)' }}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                  <span className="min-w-0">
                    <strong className="block text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {item.title}
                    </strong>
                    <span className="mt-1.5 block text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {item.body}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-5 sm:p-6">
            <SectionHeading
              eyebrow="Collection standard"
              title="Ethical data collection"
              description="This demo performs no scraping. A licensed data provider can replace the synthetic source without changing the scoring layer."
            />
            <ol className="space-y-3">
              {COLLECTION_STANDARDS.map((standard, index) => (
                <li key={standard} className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-ink-950 text-[0.625rem] font-bold text-white tabular" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                  <span className="pt-0.5 text-sm leading-relaxed text-ink-600">{standard}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <section className="overflow-hidden rounded-2xl border border-data-800 bg-gradient-to-r from-data-900/60 via-ink-900 to-ink-950 p-5 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
            <div>
              <p className="text-[0.625rem] font-bold uppercase tracking-[0.2em] text-data-600">The inverted signal</p>
              <h2 className="mt-1.5 text-xl font-bold tracking-tight text-ink-950">Why Digitization Upside rewards a weaker footprint</h2>
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-ink-600">
              <p>Every other component rewards a closer match. Digitization Upside intentionally works differently: a profitable business with a dated site, no analytics, and no self-serve channel may offer more operational headroom after acquisition.</p>
              <p>This is an opportunity measure—not a judgement of company quality. Signals are listed as explicit weighted gaps, so every assumption remains visible and challengeable.</p>
            </div>
          </div>
        </section>

        <section className="card flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[0.625rem] font-bold uppercase tracking-[0.2em] text-data-600">Deliberate boundaries</p>
            <h2 className="mt-1.5 text-lg font-bold text-ink-950">Focused scope, fewer unsupported claims</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">This build includes no scraper, authentication, CRM integration, or AI chat. The nearest next step is a grounded research brief generated from the same visible score components—not an invented narrative.</p>
          </div>
          <div className="flex flex-wrap gap-2 lg:shrink-0">
            <Link to="/buy-box" className="btn-secondary">Set your criteria</Link>
            <Link to="/leads" className="btn-primary">See ranked leads <span aria-hidden="true">→</span></Link>
          </div>
        </section>
      </div>
    </>
  );
}
