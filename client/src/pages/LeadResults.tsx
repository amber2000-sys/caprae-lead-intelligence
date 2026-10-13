import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAsync } from '../hooks/useAsync';
import { useDebounce } from '../hooks/useDebounce';
import { useBuyBox } from '../hooks/useBuyBox';
import { useToast } from '../hooks/useToast';
import { PageHeader } from '../components/PageHeader';
import { FilterPanel } from '../components/FilterPanel';
import { LeadsTable, type SortField } from '../components/LeadsTable';
import { Pagination } from '../components/Pagination';
import { LoadingState, ErrorState, EmptyState } from '../components/States';
import type { LeadFilters, FilterOptions } from '../types';

/** Filter state lives in the URL so a filtered view is shareable and survives reload. */
const FILTER_KEYS: Array<keyof LeadFilters> = [
  'search', 'industry', 'country', 'state', 'businessModel', 'websiteStatus',
  'employeeMin', 'employeeMax', 'revenueMin', 'revenueMax',
  'minFitScore', 'priority', 'dataQuality',
];

export function LeadResults() {
  const [params, setParams] = useSearchParams();
  const { version, buyBox } = useBuyBox();
  const toast = useToast();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);
  // The results table needs every pixel it can get at laptop widths, so the
  // filter rail collapses. It stays open by default because discovery is the
  // primary task; collapsing is for when the user has settled on a filter set.
  const [filtersOpen, setFiltersOpen] = useState(true);

  const filters = useMemo<LeadFilters>(() => {
    const result: LeadFilters = {};
    for (const key of FILTER_KEYS) {
      const value = params.get(key);
      if (value) (result as Record<string, string>)[key] = value;
    }
    result.includeDuplicates = params.get('includeDuplicates') === 'true';
    return result;
  }, [params]);

  const page = Number(params.get('page')) || 1;
  const limit = Number(params.get('limit')) || 20;
  const sortBy = (params.get('sortBy') as SortField) || 'fitScore';
  const sortOrder = (params.get('sortOrder') as 'asc' | 'desc') || 'desc';

  // Only free text is debounced; dropdowns and sliders apply immediately.
  const debouncedSearch = useDebounce(filters.search ?? '', 350);
  const queryFilters = useMemo(() => ({ ...filters, search: debouncedSearch }), [filters, debouncedSearch]);

  const updateParams = useCallback(
    (patch: Record<string, string | undefined>, resetPage = true) => {
      const next = new URLSearchParams(params);
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === '' || value === 'false') next.delete(key);
        else next.set(key, value);
      }
      if (resetPage) next.delete('page');
      setParams(next, { replace: true });
    },
    [params, setParams]
  );

  const options = useAsync<FilterOptions>(() => api.getFilterOptions(), []);

  const results = useAsync(
    () => api.getLeads(queryFilters, { page, limit, sortBy, sortOrder }),
    [JSON.stringify(queryFilters), page, limit, sortBy, sortOrder, version]
  );

  const handleSort = (field: SortField) => {
    const nextOrder = sortBy === field && sortOrder === 'desc' ? 'asc' : 'desc';
    updateParams({ sortBy: field, sortOrder: nextOrder });
  };

  const toggleSelect = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const leads = results.data?.leads ?? [];
    const allSelected = leads.length > 0 && leads.every((lead) => selected.has(lead._id));
    setSelected((current) => {
      const next = new Set(current);
      for (const lead of leads) {
        if (allSelected) next.delete(lead._id);
        else next.add(lead._id);
      }
      return next;
    });
  };

  const handleExport = async (scope: 'selected' | 'filtered') => {
    setExporting(true);
    try {
      const rows = await api.exportLeads(
        scope === 'selected'
          ? { ids: [...selected] }
          : { filters: queryFilters, sortBy, sortOrder }
      );
      toast.success(`Exported ${rows} ${rows === 1 ? 'lead' : 'leads'} to CSV.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const handleSaveSelected = async () => {
    const ids = [...selected];
    const outcomes = await Promise.allSettled(ids.map((id) => api.saveLead(id)));
    const saved = outcomes.filter((o) => o.status === 'fulfilled').length;
    const failed = outcomes.length - saved;

    if (saved > 0) toast.success(`${saved} ${saved === 1 ? 'lead' : 'leads'} saved to your pipeline.`);
    if (failed > 0) toast.error(`${failed} could not be saved.`);
    setSelected(new Set());
  };

  const summary = results.data?.summary;
  const activeFilterCount = Object.values(filters).filter(
    (value) => value !== '' && value !== undefined && value !== false
  ).length;
  /** True when the Buy Box is silently excluding companies before any filter runs. */
  const industryGateActive = Boolean(buyBox?.industryStrict && buyBox?.industry && !filters.industry);

  return (
    <>
      <PageHeader
        title="Lead Results"
        description="Every company scored against your Buy Box, ranked by acquisition fit. Open any row to see exactly how its score was built."
        actions={
          <>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
            >
              {filtersOpen ? 'Hide filters' : `Show filters${activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}`}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleExport('filtered')}
              disabled={exporting || !results.data || results.data.leads.length === 0}
            >
              {exporting ? 'Exporting…' : 'Export all filtered'}
            </button>
          </>
        }
      />

      <div className={`grid gap-5 items-start ${filtersOpen ? 'xl:grid-cols-[16rem_minmax(0,1fr)]' : 'xl:grid-cols-1'}`}>
        <div className={`xl:sticky xl:top-6 ${filtersOpen ? '' : 'hidden'}`}>
          <FilterPanel
            filters={filters}
            options={options.data}
            onChange={(patch) => {
              const normalised: Record<string, string | undefined> = {};
              for (const [key, value] of Object.entries(patch)) {
                normalised[key] = typeof value === 'boolean' ? (value ? 'true' : undefined) : value;
              }
              updateParams(normalised);
            }}
            onReset={() => setParams(new URLSearchParams(), { replace: true })}
            resultCount={summary?.total}
          />
        </div>

        <div className="min-w-0 space-y-3">
          {summary && !results.loading && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-1 text-xs text-ink-600">
              <span><span className="font-semibold text-ink-900 tabular">{summary.high}</span> high fit</span>
              <span><span className="font-semibold text-ink-900 tabular">{summary.medium}</span> medium</span>
              <span><span className="font-semibold text-ink-900 tabular">{summary.low}</span> low</span>
              <span className="text-ink-300" aria-hidden="true">·</span>
              <span>Avg score <span className="font-semibold text-ink-900 tabular">{summary.averageFitScore}</span></span>
              <span>Avg data quality <span className="font-semibold text-ink-900 tabular">{summary.averageDataQuality}</span></span>
            </div>
          )}

          {/* Bulk action bar, shown only when a selection exists. */}
          {selected.size > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-ink-900 text-white">
              <p className="text-sm">
                <span className="font-semibold tabular">{selected.size}</span> selected
              </p>
              <div className="flex items-center gap-2">
                <button type="button" className="btn h-7 px-2.5 text-xs bg-ink-800 border-ink-700 text-white hover:border-data-300 hover:text-data-300" onClick={() => setSelected(new Set())}>
                  Clear
                </button>
                <button type="button" className="btn h-7 px-2.5 text-xs bg-ink-800 border-ink-700 text-white hover:border-data-300 hover:text-data-300" onClick={handleSaveSelected}>
                  Save selected
                </button>
                <button type="button" className="btn h-7 px-2.5 text-xs bg-data-300 border-data-300 text-ink-950 hover:bg-data-400" onClick={() => handleExport('selected')} disabled={exporting}>
                  Export selected
                </button>
              </div>
            </div>
          )}

          <div className="card overflow-hidden">
            {results.loading && <LoadingState label="Scoring leads…" rows={8} />}
            {results.error && !results.loading && <ErrorState message={results.error} onRetry={results.reload} />}

            {results.data && !results.loading && !results.error && (
              results.data.leads.length === 0 ? (
                /*
                 * An empty result set has two very different causes, and the
                 * user can only act on the one they are told about. When the
                 * Buy Box industry gate is what emptied the list, clearing
                 * filters will not help — so say that, and link to the control
                 * that will.
                 */
                <EmptyState
                  title="No companies match these filters"
                  description={
                    industryGateActive
                      ? `Your Buy Box is restricted to ${buyBox!.industry}, so companies in other sectors are excluded before filtering. Widen a range, or turn off the industry restriction to see adjacent sectors.`
                      : 'Try widening a range, lowering the minimum fit score, or clearing a filter.'
                  }
                  action={
                    <div className="flex items-center gap-2">
                      <button type="button" className="btn-secondary" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
                        Clear all filters
                      </button>
                      {industryGateActive && (
                        <Link to="/buy-box" className="btn-primary">Edit Buy Box</Link>
                      )}
                    </div>
                  }
                />
              ) : (
                <>
                  <LeadsTable
                    leads={results.data.leads}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={handleSort}
                    selectedIds={selected}
                    onToggleSelect={toggleSelect}
                    onToggleSelectAll={toggleSelectAll}
                    onSave={async (lead) => {
                      try {
                        await api.saveLead(lead._id);
                        toast.success(`${lead.companyName} saved to your pipeline.`);
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'Could not save this lead.');
                      }
                    }}
                  />
                  <Pagination
                    pagination={results.data.pagination}
                    onPageChange={(next) => updateParams({ page: String(next) }, false)}
                    onLimitChange={(next) => updateParams({ limit: String(next) })}
                  />
                </>
              )
            )}
          </div>

          <p className="px-1 text-xs text-ink-400">
            All figures come from a synthetic demo dataset.{' '}
            <Link to="/about" className="underline underline-offset-2 hover:text-ink-600">How scoring works →</Link>
          </p>
        </div>
      </div>
    </>
  );
}
