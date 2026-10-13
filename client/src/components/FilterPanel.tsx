import type { FilterOptions, LeadFilters } from '../types';

interface FilterPanelProps {
  filters: LeadFilters;
  options: FilterOptions | null;
  onChange: (patch: Partial<LeadFilters>) => void;
  onReset: () => void;
  resultCount?: number;
}

function Select({
  label, value, onChange, options, placeholder,
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <select className="field" value={value ?? ''} onChange={(event) => onChange(event.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function NumberRange({
  label, minValue, maxValue, onMin, onMax, placeholderMin, placeholderMax,
}: {
  label: string;
  minValue?: string; maxValue?: string;
  onMin: (value: string) => void; onMax: (value: string) => void;
  placeholderMin: string; placeholderMax: string;
}) {
  return (
    <div>
      <span className="field-label">{label}</span>
      <div className="flex items-center gap-1.5">
        <input type="number" min={0} className="field" placeholder={placeholderMin} value={minValue ?? ''} onChange={(e) => onMin(e.target.value)} aria-label={`${label} minimum`} />
        <span className="text-ink-400 text-xs shrink-0">to</span>
        <input type="number" min={0} className="field" placeholder={placeholderMax} value={maxValue ?? ''} onChange={(e) => onMax(e.target.value)} aria-label={`${label} maximum`} />
      </div>
    </div>
  );
}

/**
 * Search and filter controls.
 *
 * Filters apply as the user changes them rather than behind an Apply button —
 * with a result count updating in place, exploration is a conversation rather
 * than a form submission. The only debounced input is free text.
 */
export function FilterPanel({ filters, options, onChange, onReset, resultCount }: FilterPanelProps) {
  const activeCount = Object.entries(filters).filter(
    ([key, value]) => key !== 'search' && value !== '' && value !== undefined && value !== false
  ).length;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-semibold text-ink-900">Filters</h2>
          {activeCount > 0 && (
            <span className="text-2xs font-semibold px-1.5 h-5 inline-flex items-center rounded bg-ink-900 text-white">
              {activeCount} active
            </span>
          )}
        </div>
        <button type="button" className="btn-ghost h-7 px-2 text-xs" onClick={onReset} disabled={activeCount === 0 && !filters.search}>
          Reset
        </button>
      </div>

      <div className="grid gap-3.5 md:grid-cols-2 xl:block xl:space-y-3.5">
        <label className="block">
          <span className="field-label">Search</span>
          <input
            type="search"
            className="field"
            placeholder="Company, domain or industry"
            value={filters.search ?? ''}
            onChange={(event) => onChange({ search: event.target.value })}
          />
        </label>

        <Select label="Industry" value={filters.industry} onChange={(value) => onChange({ industry: value })} options={options?.industries ?? []} placeholder="Any industry" />
        <Select label="Country" value={filters.country} onChange={(value) => onChange({ country: value })} options={options?.countries ?? []} placeholder="Any country" />
        <Select label="State / Region" value={filters.state} onChange={(value) => onChange({ state: value })} options={options?.states ?? []} placeholder="Any state" />
        <Select label="Business model" value={filters.businessModel} onChange={(value) => onChange({ businessModel: value })} options={options?.businessModels ?? []} placeholder="Any model" />

        <NumberRange
          label="Employees"
          minValue={filters.employeeMin} maxValue={filters.employeeMax}
          onMin={(value) => onChange({ employeeMin: value })} onMax={(value) => onChange({ employeeMax: value })}
          placeholderMin="Min" placeholderMax="Max"
        />
        <NumberRange
          label="Revenue (USD)"
          minValue={filters.revenueMin} maxValue={filters.revenueMax}
          onMin={(value) => onChange({ revenueMin: value })} onMax={(value) => onChange({ revenueMax: value })}
          placeholderMin="1000000" placeholderMax="20000000"
        />

        <div className="pt-3.5 border-t border-ink-200 space-y-3.5 md:col-span-2 xl:col-span-1">
          <label className="block">
            <span className="field-label">
              Minimum fit score
              <span className="float-right font-bold text-ink-900 tabular">{filters.minFitScore || 0}</span>
            </span>
            <input
              type="range" min={0} max={100} step={5}
              className="w-full accent-ink-900 cursor-pointer"
              value={filters.minFitScore || 0}
              onChange={(event) => onChange({ minFitScore: event.target.value === '0' ? '' : event.target.value })}
            />
          </label>

          <Select label="Priority" value={filters.priority} onChange={(value) => onChange({ priority: value })} options={['HIGH', 'MEDIUM', 'LOW']} placeholder="Any priority" />
          <Select label="Data quality" value={filters.dataQuality} onChange={(value) => onChange({ dataQuality: value })} options={['high', 'medium', 'low']} placeholder="Any quality" />
          <Select label="Website status" value={filters.websiteStatus} onChange={(value) => onChange({ websiteStatus: value })} options={['verified', 'unverified', 'unreachable']} placeholder="Any status" />

          <label className="flex items-start gap-2 cursor-pointer pt-0.5">
            <input
              type="checkbox"
              className="mt-0.5 w-3.5 h-3.5 rounded border-ink-300 text-ink-900 focus:ring-data-500/30"
              checked={Boolean(filters.includeDuplicates)}
              onChange={(event) => onChange({ includeDuplicates: event.target.checked })}
            />
            <span className="text-xs text-ink-700 leading-snug">
              Include probable duplicates
              <span className="block text-ink-400">Hidden by default to keep the working list clean.</span>
            </span>
          </label>
        </div>
      </div>

      {resultCount !== undefined && (
        <p className="mt-4 pt-3 border-t border-ink-200 text-xs text-ink-600">
          <span className="font-semibold text-ink-900 tabular">{resultCount}</span> matching {resultCount === 1 ? 'company' : 'companies'}
        </p>
      )}
    </div>
  );
}
