import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { Company } from '../models/Company.js';
import { queryLeads, enrichCompany } from '../services/leadQueryService.js';
import { getActiveBuyBoxLean } from '../services/buyBoxService.js';
import { buildLeadsCsv, exportFilename } from '../services/exportService.js';

const MAX_EXPORT_ROWS = 5000;

/**
 * Export either an explicit selection of ids or the current filtered set.
 *
 * Selection wins when present, because "Export Selected" has to mean exactly
 * what it says — silently re-running a filter would be a data-integrity
 * surprise in a file someone then works from.
 */
export const exportLeads = asyncHandler(async (req, res) => {
  const buyBox = await getActiveBuyBoxLean();
  const source = { ...req.query, ...req.body };
  const ids = Array.isArray(source.ids) ? source.ids : [];

  let leads;

  if (ids.length > 0) {
    if (ids.length > MAX_EXPORT_ROWS) {
      throw ApiError.badRequest(`Cannot export more than ${MAX_EXPORT_ROWS} leads at once`);
    }
    const companies = await Company.find({ _id: { $in: ids } }).lean();
    if (companies.length === 0) throw ApiError.notFound('No matching leads to export');

    // Preserve the order the user selected in.
    const order = new Map(ids.map((id, index) => [String(id), index]));
    leads = companies
      .map((company) => enrichCompany(company, buyBox))
      .sort((a, b) => (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0));
  } else {
    const result = await queryLeads({
      filters: source,
      buyBox,
      sortBy: source.sortBy || 'fitScore',
      sortOrder: source.sortOrder || 'desc',
      paginate: false,
    });
    if (result.leads.length === 0) throw ApiError.notFound('No leads match the current filters');
    leads = result.leads.slice(0, MAX_EXPORT_ROWS);
  }

  const csv = buildLeadsCsv(leads);
  const filename = exportFilename();

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('X-Export-Row-Count', String(leads.length));
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-Export-Row-Count');
  return res.status(200).send(csv);
});
