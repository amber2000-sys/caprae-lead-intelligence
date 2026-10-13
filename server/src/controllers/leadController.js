import { Company } from '../models/Company.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess, sendPaginated } from '../utils/apiResponse.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { assertValid } from '../middleware/validateRequest.js';
import { queryLeads, enrichCompany } from '../services/leadQueryService.js';
import { getActiveBuyBoxLean } from '../services/buyBoxService.js';
import { scoreCompany } from '../services/scoringService.js';
import { computeDataQuality, computeCompleteness } from '../services/dataQualityService.js';
import { validateCompanyPayload, validatePagination } from '../utils/validate.js';
import { normalizeDomain, normalizeCompanyName } from '../utils/normalize.js';

/**
 * Accept filters from either the query string (GET /api/leads) or the body
 * (POST /api/leads/search). Same shape, same handler, so the two endpoints can
 * never drift apart.
 */
function readFilters(source = {}) {
  return {
    search: source.search,
    industry: source.industry,
    subIndustry: source.subIndustry,
    country: source.country,
    state: source.state,
    businessModel: source.businessModel,
    websiteStatus: source.websiteStatus,
    employeeMin: source.employeeMin,
    employeeMax: source.employeeMax,
    revenueMin: source.revenueMin,
    revenueMax: source.revenueMax,
    minFitScore: source.minFitScore,
    priority: source.priority,
    dataQuality: source.dataQuality,
    includeDuplicates: source.includeDuplicates === true || source.includeDuplicates === 'true',
  };
}

async function runSearch(source) {
  const buyBox = await getActiveBuyBoxLean();
  const { page, limit } = validatePagination(source);

  const result = await queryLeads({
    filters: readFilters(source),
    buyBox,
    sortBy: source.sortBy,
    sortOrder: source.sortOrder,
    page,
    limit,
  });

  return { ...result, buyBox };
}

export const listLeads = asyncHandler(async (req, res) => {
  const { leads, summary, pagination, buyBox } = await runSearch(req.query);
  return sendPaginated(res, leads, pagination, { summary, buyBox: { name: buyBox.name } });
});

export const searchLeads = asyncHandler(async (req, res) => {
  const { leads, summary, pagination, buyBox } = await runSearch({ ...req.body, ...req.query });
  return sendPaginated(res, leads, pagination, { summary, buyBox: { name: buyBox.name } });
});

export const getLeadById = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id).lean();
  if (!company) throw ApiError.notFound('Lead not found');

  const buyBox = await getActiveBuyBoxLean();
  const lead = enrichCompany(company, buyBox);

  // Surface the other records in this company's duplicate group so the user can
  // compare them rather than just being told a duplicate exists.
  let duplicates = [];
  if (company.duplicateGroupId) {
    duplicates = await Company.find({
      duplicateGroupId: company.duplicateGroupId,
      _id: { $ne: company._id },
    })
      .select('companyName domain duplicateStatus location industry')
      .lean();
  }

  return sendSuccess(res, { ...lead, duplicates, buyBoxName: buyBox.name });
});

/** Re-score a single lead — used after the Buy Box changes without a full reload. */
export const rescoreLead = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id).lean();
  if (!company) throw ApiError.notFound('Lead not found');

  const buyBox = await getActiveBuyBoxLean();
  const dataQuality = computeDataQuality(company);
  const fit = scoreCompany(company, buyBox, { dataQuality });

  return sendSuccess(res, {
    id: company._id,
    companyName: company.companyName,
    ...fit,
  });
});

export const createLead = asyncHandler(async (req, res) => {
  const payload = assertValid(validateCompanyPayload(req.body), 'Company validation failed');

  const normalizedDomain = normalizeDomain(payload.domain);
  const existing = await Company.findOne({ normalizedDomain }).select('companyName').lean();
  if (existing) {
    throw ApiError.conflict(`A company with domain ${normalizedDomain} already exists: ${existing.companyName}`);
  }

  const company = await Company.create({
    ...payload,
    normalizedDomain,
    normalizedCompanyName: normalizeCompanyName(payload.companyName),
    dataCompleteness: computeCompleteness(payload),
    source: 'Manual Entry',
    isDemoData: false,
  });

  const buyBox = await getActiveBuyBoxLean();
  return sendSuccess(res, enrichCompany(company.toObject(), buyBox), {}, 201);
});

/** Distinct values powering the filter dropdowns, so the UI never guesses. */
export const getFilterOptions = asyncHandler(async (req, res) => {
  const [industries, countries, states, businessModels] = await Promise.all([
    Company.distinct('industry'),
    Company.distinct('location.country'),
    Company.distinct('location.state'),
    Company.distinct('businessModel'),
  ]);

  return sendSuccess(res, {
    industries: industries.filter(Boolean).sort(),
    countries: countries.filter(Boolean).sort(),
    states: states.filter(Boolean).sort(),
    businessModels: businessModels.filter(Boolean).sort(),
  });
});
