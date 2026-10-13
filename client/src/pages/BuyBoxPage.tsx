import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { useBuyBox } from '../hooks/useBuyBox';
import { useToast } from '../hooks/useToast';
import { PageHeader } from '../components/PageHeader';
import { LoadingState, ErrorState } from '../components/States';
import type { BuyBox, FilterOptions, ScoringModel } from '../types';

type FormState = Record<string, string | boolean>;

const EMPTY_FORM: FormState = {
  name: '', industry: '', subIndustry: '', country: '', state: '',
  employeeMin: '', employeeMax: '', revenueMin: '', revenueMax: '',
  businessModel: '', foundedYearMin: '', foundedYearMax: '', industryStrict: true,
};

function toForm(buyBox: BuyBox): FormState {
  const asText = (value: number | null) => (value === null || value === undefined ? '' : String(value));
  return {
    name: buyBox.name ?? '',
    industry: buyBox.industry ?? '',
    subIndustry: buyBox.subIndustry ?? '',
    country: buyBox.country ?? '',
    state: buyBox.state ?? '',
    employeeMin: asText(buyBox.employeeMin),
    employeeMax: asText(buyBox.employeeMax),
    revenueMin: asText(buyBox.revenueMin),
    revenueMax: asText(buyBox.revenueMax),
    businessModel: buyBox.businessModel ?? '',
    foundedYearMin: asText(buyBox.foundedYearMin),
    foundedYearMax: asText(buyBox.foundedYearMax),
    industryStrict: buyBox.industryStrict !== false,
  };
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="block mt-1 text-xs text-ink-400 leading-snug">{hint}</span>}
    </label>
  );
}

export function BuyBoxPage() {
  const { buyBox, loading, error, save, reset, refresh } = useBuyBox();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<string[]>([]);

  const options = useAsync<FilterOptions>(() => api.getFilterOptions(), []);
  const model = useAsync<ScoringModel>(() => api.getScoringModel(), []);

  useEffect(() => {
    if (buyBox) setForm(toForm(buyBox));
  }, [buyBox]);

  const set = (key: string, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFieldErrors([]);
    try {
      const message = await save(form as unknown as Partial<BuyBox>);
      toast.success(message);
      navigate('/leads');
    } catch (err) {
      const details = (err as { details?: string[] }).details;
      if (details?.length) setFieldErrors(details);
      toast.error(err instanceof Error ? err.message : 'Could not save your Buy Box.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      await reset();
      toast.info('Buy Box reset to defaults.');
    } catch {
      toast.error('Could not reset the Buy Box.');
    }
  };

  if (loading) return <div className="card"><LoadingState label="Loading Buy Box…" /></div>;
  if (error) return <div className="card"><ErrorState message={error} onRetry={() => void refresh()} /></div>;

  return (
    <>
      <PageHeader
        title="Buy Box"
        description="Your acquisition criteria. Everything in the product is scored and ranked against what you set here — change it and the whole pipeline re-ranks."
      />

      <form onSubmit={handleSubmit} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem] items-start">
        <div className="space-y-5 min-w-0">
          {fieldErrors.length > 0 && (
            <div
              className="card p-3.5 border-l-[3px]"
              style={{ borderLeftColor: 'var(--status-risk)' }}
              role="alert"
            >
              <p className="text-sm font-semibold text-ink-900 mb-1.5">Please fix the following:</p>
              <ul className="space-y-0.5">
                {fieldErrors.map((message) => (
                  <li key={message} className="text-sm text-ink-600">• {message}</li>
                ))}
              </ul>
            </div>
          )}

          <section className="card p-4">
            <h2 className="text-sm font-semibold text-ink-900 mb-4">Target profile</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Buy Box name">
                <input className="field" value={String(form.name)} onChange={(e) => set('name', e.target.value)} placeholder="e.g. US B2B SaaS, lower mid-market" />
              </Field>
              <Field label="Business model">
                <select className="field" value={String(form.businessModel)} onChange={(e) => set('businessModel', e.target.value)}>
                  <option value="">Any model</option>
                  {(options.data?.businessModels ?? ['B2B', 'B2C', 'B2B2C', 'Marketplace', 'Services', 'D2C']).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </Field>
              <Field label="Industry">
                <select className="field" value={String(form.industry)} onChange={(e) => set('industry', e.target.value)}>
                  <option value="">Any industry</option>
                  {(options.data?.industries ?? []).map((industry) => (
                    <option key={industry} value={industry}>{industry}</option>
                  ))}
                </select>
              </Field>
              <Field label="Sub-industry" hint="Optional. Narrows within the selected industry.">
                <input className="field" value={String(form.subIndustry)} onChange={(e) => set('subIndustry', e.target.value)} placeholder="e.g. Vertical SaaS" />
              </Field>
            </div>

            {/* The industry gate. Explained inline rather than hidden in a
                tooltip, because it changes which companies appear at all. */}
            <label className="flex items-start gap-2.5 mt-4 pt-4 border-t border-ink-200 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 w-4 h-4 rounded border-ink-300 text-ink-900 focus:ring-data-500/30"
                checked={Boolean(form.industryStrict)}
                onChange={(e) => set('industryStrict', e.target.checked)}
              />
              <span className="text-sm text-ink-800 leading-snug">
                Only show companies in this industry
                <span className="block text-xs text-ink-500 mt-0.5">
                  On by default. Turn it off to let strong companies from adjacent sectors into the results —
                  they will still be scored down on industry fit, so you can see exactly what you are trading away.
                </span>
              </span>
            </label>
          </section>

          <section className="card p-4">
            <h2 className="text-sm font-semibold text-ink-900 mb-4">Geography</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Country">
                <select className="field" value={String(form.country)} onChange={(e) => set('country', e.target.value)}>
                  <option value="">Any country</option>
                  {(options.data?.countries ?? []).map((country) => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </Field>
              <Field label="State / Region" hint="Leave blank to search the whole country.">
                <select className="field" value={String(form.state)} onChange={(e) => set('state', e.target.value)}>
                  <option value="">Any state</option>
                  {(options.data?.states ?? []).map((state) => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </Field>
            </div>
          </section>

          <section className="card p-4">
            <h2 className="text-sm font-semibold text-ink-900 mb-4">Size &amp; age</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Employees" hint="Companies just outside this range still appear, scored down proportionally.">
                <div className="flex items-center gap-1.5">
                  <input type="number" min={0} className="field" placeholder="Min" value={String(form.employeeMin)} onChange={(e) => set('employeeMin', e.target.value)} aria-label="Minimum employees" />
                  <span className="text-ink-400 text-xs">to</span>
                  <input type="number" min={0} className="field" placeholder="Max" value={String(form.employeeMax)} onChange={(e) => set('employeeMax', e.target.value)} aria-label="Maximum employees" />
                </div>
              </Field>
              <Field label="Revenue estimate (USD)" hint="Dataset revenue figures are modelled, never verified filings.">
                <div className="flex items-center gap-1.5">
                  <input type="number" min={0} step={100000} className="field" placeholder="1000000" value={String(form.revenueMin)} onChange={(e) => set('revenueMin', e.target.value)} aria-label="Minimum revenue" />
                  <span className="text-ink-400 text-xs">to</span>
                  <input type="number" min={0} step={100000} className="field" placeholder="20000000" value={String(form.revenueMax)} onChange={(e) => set('revenueMax', e.target.value)} aria-label="Maximum revenue" />
                </div>
              </Field>
              <Field label="Founded between" hint="An older business is more likely to be approaching succession.">
                <div className="flex items-center gap-1.5">
                  <input type="number" className="field" placeholder="1980" value={String(form.foundedYearMin)} onChange={(e) => set('foundedYearMin', e.target.value)} aria-label="Earliest founded year" />
                  <span className="text-ink-400 text-xs">to</span>
                  <input type="number" className="field" placeholder={String(new Date().getFullYear())} value={String(form.foundedYearMax)} onChange={(e) => set('foundedYearMax', e.target.value)} aria-label="Latest founded year" />
                </div>
              </Field>
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-2">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save Buy Box'}
            </button>
            <button type="button" className="btn-secondary" onClick={handleReset} disabled={saving}>
              Reset to defaults
            </button>
          </div>
        </div>

        {/* The scoring model, visible while criteria are being set. A user
            tuning a Buy Box should be able to see what each criterion is worth. */}
        <aside className="card p-4 xl:sticky xl:top-6">
          <h2 className="text-sm font-semibold text-ink-900">How leads are scored</h2>
          <p className="text-xs text-ink-500 mt-1 mb-4">
            Each company earns points across eight components. They sum to 100.
          </p>

          {model.loading && <LoadingState label="Loading scoring model…" rows={4} />}
          {model.data && (
            <ul className="space-y-2.5">
              {Object.entries(model.data.weights)
                .sort(([, a], [, b]) => b - a)
                .map(([key, weight]) => (
                  <li key={key}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-medium text-ink-800">{model.data!.labels[key] ?? key}</span>
                      <span className="text-xs font-semibold text-ink-900 tabular shrink-0">{weight}</span>
                    </div>
                    <div className="mt-1 h-1 rounded-full bg-ink-100 overflow-hidden">
                      <div className="h-full rounded-full bg-data-500" style={{ width: `${weight}%` }} />
                    </div>
                  </li>
                ))}
            </ul>
          )}

          {model.data && (
            <p className="mt-4 pt-3 border-t border-ink-200 text-xs text-ink-500 leading-relaxed">
              <span className="font-semibold text-ink-700">Digitization Upside is inverted on purpose.</span>{' '}
              A dated digital footprint scores higher, because it marks headroom a post-acquisition operator can act on.
            </p>
          )}
        </aside>
      </form>
    </>
  );
}
