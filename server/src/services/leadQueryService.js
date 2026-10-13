/**
 * Lead search, scoring and ranking.
 *
 * The one architectural decision worth defending here: fit scores are computed
 * at request time, not stored.
 *
 * A score is a function of (company, buy box). The moment a searcher widens
 * their revenue band, every stored score is wrong. Persisting scores would mean
 * a write amplification of N companies on every criteria change, plus a
 * staleness bug class that is invisible until someone acts on a bad ranking.
 * Computing on read is correct by construction.
 *
 * The cost is that score-based filters and sorts cannot be pushed into MongoDB,
 * so the candidate set is scored in the application layer. At the dataset sizes
 * this product targets (a searcher's filtered pipeline, not a global index)
 * that is a few milliseconds. The scaling answer is in the README: materialise
 * scores per saved Buy Box in a background job and index them, keeping the pure
 * scoring function as the single source of truth for both paths.
 */

import { Company } from '../models/Company.js';
import { scoreCompany } from './scoringService.js';
import { computeDataQuality, dataQualityBand } from './dataQualityService.js';
import { cleanString } from '../utils/normalize.js';

export const SORT_FIELDS = ['fitScore', 'revenueEstimate', 'employeeCount', 'dataQuality', 'companyName'];

/**
 * Translate user filters into a MongoDB query.
 *
 * Only database-resolvable predicates go here. Score and data-quality filters
 * are applied after scoring, because neither exists as a stored field.
 */
export function buildCompanyFilter(filters = {}) {
  const query = {};

  const industry = cleanString(filters.industry);
  if (industry) query.industry = industry;

  const subIndustry = cleanString(filters.subIndustry);
  if (subIndustry) query.subIndustry = subIndustry;

  const country = cleanString(filters.country);
  if (country) query['location.country'] = country;

  const state = cleanString(filters.state);
  if (state) query['location.state'] = state;

  const businessModel = cleanString(filters.businessModel);
  if (businessModel) query.businessModel = businessModel;

  const websiteStatus = cleanString(filters.websiteStatus);
  if (websiteStatus) query.websiteStatus = websiteStatus;

  const employeeRange = numericRange(filters.employeeMin, filters.employeeMax);
  if (employeeRange) query.employeeCount = employeeRange;

  const revenueRange = numericRange(filters.revenueMin, filters.revenueMax);
  if (revenueRange) query.revenueEstimate = revenueRange;

  // `includeDuplicates` defaults to false so a searcher's working list is clean
  // without them having to know duplicates exist. The Data Health view opts in.
  if (!filters.includeDuplicates) {
    query.duplicateStatus = { $ne: 'probable_duplicate' };
  }

  const search = cleanString(filters.search);
  if (search) {
    const safe = escapeRegex(search);
    query.$or = [
      { companyName: { $regex: safe, $options: 'i' } },
      { domain: { $regex: safe, $options: 'i' } },
      { industry: { $regex: safe, $options: 'i' } },
    ];
  }

  return query;
}

function numericRange(min, max) {
  const lower = Number(min);
  const upper = Number(max);
  const range = {};
  if (Number.isFinite(lower)) range.$gte = lower;
  if (Number.isFinite(upper)) range.$lte = upper;
  return Object.keys(range).length ? range : undefined;
}

/** User input reaches a $regex, so metacharacters must be neutralised. */
export function escapeRegex(input) {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Attach a fit score and a data-quality result to a plain company object.
 * Exported separately so a single lead detail request reuses identical logic.
 */
export function enrichCompany(company, buyBox) {
  const dataQuality = computeDataQuality(company);
  const fit = scoreCompany(company, buyBox, { dataQuality });

  return {
    ...company,
    fitScore: fit.totalScore,
    priority: fit.priority,
    scoreBreakdown: fit.components,
    reasons: fit.reasons,
    concerns: fit.concerns,
    dataQualityScore: dataQuality.score,
    dataQualityBand: dataQualityBand(dataQuality.score),
    dataQualityChecks: dataQuality.checks,
  };
}

/** Post-scoring filters — these predicates cannot be expressed in the DB query. */
export function applyDerivedFilters(leads, filters = {}) {
  let result = leads;

  const minFitScore = Number(filters.minFitScore);
  if (Number.isFinite(minFitScore)) {
    result = result.filter((lead) => lead.fitScore >= minFitScore);
  }

  const priority = cleanString(filters.priority).toUpperCase();
  if (priority && ['HIGH', 'MEDIUM', 'LOW'].includes(priority)) {
    result = result.filter((lead) => lead.priority === priority);
  }

  const band = cleanString(filters.dataQuality).toLowerCase();
  if (['high', 'medium', 'low'].includes(band)) {
    result = result.filter((lead) => lead.dataQualityBand === band);
  }

  return result;
}

export function sortLeads(leads, sortBy = 'fitScore', sortOrder = 'desc') {
  const field = SORT_FIELDS.includes(sortBy) ? sortBy : 'fitScore';
  const direction = sortOrder === 'asc' ? 1 : -1;

  const valueOf = (lead) => {
    switch (field) {
      case 'fitScore': return lead.fitScore;
      case 'dataQuality': return lead.dataQualityScore;
      case 'companyName': return lead.companyName;
      default: return lead[field];
    }
  };

  return [...leads].sort((a, b) => {
    const left = valueOf(a);
    const right = valueOf(b);

    // Records missing the sort field always sink, in either direction — a null
    // revenue is not "the cheapest company".
    const leftMissing = left === null || left === undefined;
    const rightMissing = right === null || right === undefined;
    if (leftMissing && rightMissing) return 0;
    if (leftMissing) return 1;
    if (rightMissing) return -1;

    if (typeof left === 'string') return left.localeCompare(right) * direction;
    if (left === right) return b.fitScore - a.fitScore; // stable, useful tiebreak
    return (left < right ? -1 : 1) * direction;
  });
}

/** Headline counts for the result set, computed before pagination. */
export function summariseLeads(leads) {
  if (leads.length === 0) {
    return { total: 0, high: 0, medium: 0, low: 0, averageFitScore: 0, averageDataQuality: 0 };
  }
  const sum = (fn) => leads.reduce((acc, lead) => acc + fn(lead), 0);
  return {
    total: leads.length,
    high: leads.filter((l) => l.priority === 'HIGH').length,
    medium: leads.filter((l) => l.priority === 'MEDIUM').length,
    low: leads.filter((l) => l.priority === 'LOW').length,
    averageFitScore: Math.round(sum((l) => l.fitScore) / leads.length),
    averageDataQuality: Math.round(sum((l) => l.dataQualityScore) / leads.length),
  };
}

/**
 * Full search pipeline: filter in MongoDB → score in the app → derived filters
 * → sort → paginate.
 *
 * @returns {Promise<{ leads, summary, pagination }>}
 */
export async function queryLeads({
  filters = {},
  buyBox = {},
  sortBy = 'fitScore',
  sortOrder = 'desc',
  page = 1,
  limit = 20,
  paginate = true,
} = {}) {
  const query = buildCompanyFilter(filters);

  // Buy Box industry gate. An explicit industry filter from the search screen
  // always wins, so the user's most recent, most specific instruction is the
  // one that takes effect.
  if (buyBox.industryStrict && buyBox.industry && !cleanString(filters.industry)) {
    query.industry = buyBox.industry;
  }

  // `.lean()` returns plain objects: the scoring layer never needs Mongoose
  // documents, and skipping hydration is the single cheapest win available here.
  const candidates = await Company.find(query).lean();

  const scored = candidates.map((company) => enrichCompany(company, buyBox));
  const filtered = applyDerivedFilters(scored, filters);
  const sorted = sortLeads(filtered, sortBy, sortOrder);
  const summary = summariseLeads(sorted);

  if (!paginate) {
    return { leads: sorted, summary, pagination: { page: 1, limit: sorted.length, total: sorted.length } };
  }

  const start = (page - 1) * limit;
  return {
    leads: sorted.slice(start, start + limit),
    summary,
    pagination: { page, limit, total: sorted.length },
  };
}
