/**
 * CSV export.
 *
 * The column set is chosen for the downstream workflow, not for completeness:
 * these are the fields a searcher pastes into a CRM or a deal tracker. Score,
 * priority and data quality travel with the row so the prioritisation survives
 * the export instead of being lost the moment the data leaves the product.
 */

import { toCsv } from '../utils/csv.js';
import { formatMoney } from './scoringService.js';

export const EXPORT_COLUMNS = [
  { key: 'companyName', header: 'Company' },
  { key: 'domain', header: 'Domain' },
  { key: 'industry', header: 'Industry' },
  { key: 'subIndustry', header: 'Sub-Industry' },
  { key: 'location', header: 'Location', format: (row) => [row.location?.city, row.location?.state, row.location?.country].filter(Boolean).join(', ') },
  { key: 'employeeCount', header: 'Employees' },
  { key: 'revenueEstimate', header: 'Revenue Estimate (USD)' },
  { key: 'revenueDisplay', header: 'Revenue (Display)', format: (row) => formatMoney(row.revenueEstimate) },
  { key: 'revenueIsEstimated', header: 'Revenue Verified', format: (row) => (row.revenueIsEstimated === false ? 'Verified' : 'Estimated') },
  { key: 'businessModel', header: 'Business Model' },
  { key: 'foundedYear', header: 'Founded' },
  { key: 'fitScore', header: 'Acquisition Fit Score' },
  { key: 'priority', header: 'Priority' },
  { key: 'dataQualityScore', header: 'Data Quality' },
  { key: 'websiteStatus', header: 'Website Status' },
  { key: 'duplicateStatus', header: 'Duplicate Status' },
  { key: 'digitizationGap', header: 'Digitization Gap Index', format: (row) => row.scoreBreakdown?.find((c) => c.key === 'digitizationUpside')?.meta?.gapIndex ?? '' },
  { key: 'topReasons', header: 'Top Fit Reasons', format: (row) => (row.reasons || []).slice(0, 3).map((r) => r.label).join(' | ') },
  { key: 'topConcerns', header: 'Top Concerns', format: (row) => (row.concerns || []).slice(0, 3).map((c) => c.label).join(' | ') },
  { key: 'source', header: 'Source' },
];

export function buildLeadsCsv(leads) {
  return toCsv(EXPORT_COLUMNS, leads);
}

export function exportFilename(prefix = 'caprae-leads') {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${prefix}-${stamp}.csv`;
}
