import { Link } from 'react-router-dom';
import { ScoreBadge, PriorityBadge, DataQualityBar, DuplicateBadge } from './Badges';
import { formatMoney, formatNumber, formatLocation } from '../utils/format';
import type { Lead } from '../types';

export type SortField = 'fitScore' | 'revenueEstimate' | 'employeeCount' | 'dataQuality' | 'companyName';

interface LeadsTableProps {
  leads: Lead[];
  sortBy: SortField;
  sortOrder: 'asc' | 'desc';
  onSort: (field: SortField) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleSelectAll?: () => void;
  onSave?: (lead: Lead) => void;
  /** Numbers the rows 1..n — only meaningful for an already-ranked list. */
  showRank?: boolean;
}

const COLUMNS: Array<{ key: string; label: string; width: string; sortable?: SortField; align?: 'right' | 'left' }> = [
  { key: 'companyName', label: 'Company', width: 'w-[14.5rem]', sortable: 'companyName' },
  { key: 'industry', label: 'Industry', width: 'w-[7.5rem]' },
  { key: 'location', label: 'Location', width: 'w-[9.5rem]' },
  { key: 'revenue', label: 'Revenue', width: 'w-24', sortable: 'revenueEstimate', align: 'right' },
  { key: 'employees', label: 'Employees', width: 'w-[5.5rem]', sortable: 'employeeCount', align: 'right' },
  { key: 'fitScore', label: 'Fit Score', width: 'w-[5.5rem]', sortable: 'fitScore', align: 'right' },
  { key: 'priority', label: 'Priority', width: 'w-[5.5rem]' },
  { key: 'dataQuality', label: 'Data Quality', width: 'w-28', sortable: 'dataQuality' },
  { key: 'actions', label: '', width: 'w-8' },
];

function SortIndicator({ active, order }: { active: boolean; order: 'asc' | 'desc' }) {
  return (
    <span className={`ml-1 inline-block transition-colors ${active ? 'text-ink-900' : 'text-ink-300'}`} aria-hidden="true">
      {active ? (order === 'desc' ? '↓' : '↑') : '↕'}
    </span>
  );
}

const AVATAR_COLORS = ['#0a0a0a', '#2a2a2a', '#5c4300', '#8b6500', '#3a3a3a'];

function CompanyAvatar({ name }: { name: string }) {
  const seed = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const color = AVATAR_COLORS[seed % AVATAR_COLORS.length];
  return (
    <span
      className="shrink-0 w-7 h-7 rounded-md border border-data-300/30 text-data-300 text-xs font-bold flex items-center justify-center"
      style={{ background: `linear-gradient(135deg, ${color}, #0a0a0a)` }}
      aria-hidden="true"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

/**
 * The results table — the screen a user spends their time on.
 *
 * Decisions worth naming: numeric columns are right-aligned with tabular
 * figures so magnitudes line up and can be compared by eye; the whole row links
 * to the detail view so the click target is the row, not a word in it; and the
 * selection checkbox is a real input rather than a styled div so keyboard and
 * screen-reader users get it for free.
 */
export function LeadsTable({
  leads, sortBy, sortOrder, onSort,
  selectedIds, onToggleSelect, onToggleSelectAll, onSave, showRank = false,
}: LeadsTableProps) {
  const selectable = Boolean(selectedIds && onToggleSelect);
  const allSelected = selectable && leads.length > 0 && leads.every((lead) => selectedIds!.has(lead._id));

  return (
    <div className="max-w-full overflow-x-auto">
      <table className="w-full min-w-[65rem] table-fixed border-collapse">
        <caption className="sr-only">
          Acquisition leads ranked by fit score. Sorted by {sortBy}, {sortOrder === 'desc' ? 'descending' : 'ascending'}.
        </caption>
        <thead>
          <tr>
            {showRank && <th className="th w-8 text-center">#</th>}
            {selectable && (
              <th className="th w-9">
                <input
                  type="checkbox"
                  className="w-3.5 h-3.5 rounded border-ink-300 text-ink-900 focus:ring-data-500/30 cursor-pointer"
                  checked={allSelected}
                  onChange={onToggleSelectAll}
                  aria-label="Select all leads on this page"
                />
              </th>
            )}
            {COLUMNS.map((column) => (
              <th key={column.key} className={`th ${column.width} ${column.align === 'right' ? 'text-right' : ''}`}>
                {column.sortable ? (
                  <button
                    type="button"
                    className="inline-flex items-center hover:text-ink-900 transition-colors uppercase tracking-wide"
                    onClick={() => onSort(column.sortable!)}
                    aria-label={`Sort by ${column.label}`}
                  >
                    {column.label}
                    <SortIndicator active={sortBy === column.sortable} order={sortOrder} />
                  </button>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {leads.map((lead, index) => (
            <tr key={lead._id} className="hover:bg-data-900/30 transition-colors group">
              {showRank && (
                <td className="td text-center">
                  <span className="text-xs font-semibold text-ink-400 tabular">{index + 1}</span>
                </td>
              )}
              {selectable && (
                <td className="td">
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded border-ink-300 text-ink-900 focus:ring-data-500/30 cursor-pointer"
                    checked={selectedIds!.has(lead._id)}
                    onChange={() => onToggleSelect!(lead._id)}
                    aria-label={`Select ${lead.companyName}`}
                  />
                </td>
              )}

              <td className="td overflow-hidden">
                <div className="flex items-center gap-2.5">
                  <CompanyAvatar name={lead.companyName} />
                  <Link to={`/leads/${lead._id}`} className="block min-w-0 group/link">
                    <span className="block font-semibold text-ink-900 truncate group-hover/link:text-data-600 transition-colors">
                      {lead.companyName}
                    </span>
                    <span className="block text-xs text-ink-400 truncate">{lead.domain || '—'}</span>
                  </Link>
                </div>
                {lead.duplicateStatus === 'probable_duplicate' && (
                  <span className="mt-1 inline-block"><DuplicateBadge /></span>
                )}
              </td>

              <td className="td overflow-hidden">
                <span className="block truncate">{lead.industry}</span>
                {lead.subIndustry && <span className="block text-xs text-ink-400 truncate">{lead.subIndustry}</span>}
              </td>

              <td className="td overflow-hidden">
                <span className="block truncate whitespace-nowrap" title={formatLocation(lead.location)}>{formatLocation(lead.location)}</span>
              </td>

              <td className="td text-right tabular whitespace-nowrap">
                {formatMoney(lead.revenueEstimate)}
                {lead.revenueEstimate !== null && lead.revenueIsEstimated && (
                  <span className="text-ink-400 ml-0.5" title="Estimated, not verified">~</span>
                )}
              </td>

              <td className="td text-right tabular">{formatNumber(lead.employeeCount)}</td>

              <td className="td text-right">
                <ScoreBadge score={lead.fitScore} priority={lead.priority} size="sm" />
              </td>

              <td className="td"><PriorityBadge priority={lead.priority} /></td>

              <td className="td"><DataQualityBar score={lead.dataQualityScore} band={lead.dataQualityBand} /></td>

              <td className="td text-right whitespace-nowrap">
                <div className="flex items-center justify-end gap-0.5">
                  {onSave && (
                    <button
                      type="button"
                      className="h-7 w-7 rounded-md text-ink-400 hover:bg-data-50 hover:text-data-700 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all inline-flex items-center justify-center"
                      onClick={() => onSave(lead)}
                      aria-label={`Save ${lead.companyName}`}
                      title="Save lead"
                    >
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M5 2.5h10a1 1 0 0 1 1 1v14l-6-4-6 4v-14a1 1 0 0 1 1-1z" /></svg>
                    </button>
                  )}
                  <Link
                    to={`/leads/${lead._id}`}
                    className="h-7 w-7 rounded-md text-ink-500 hover:bg-data-50 hover:text-data-700 inline-flex items-center justify-center transition-colors"
                    aria-label={`Open ${lead.companyName}`}
                  >
                    <span aria-hidden="true">›</span>
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
