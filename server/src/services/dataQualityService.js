/**
 * Data health scoring.
 *
 * A fit score is only as trustworthy as the record underneath it, so every
 * company carries an independent 0-100 data-quality score built from explicit,
 * named checks. The checks are returned alongside the number — a bare "92%" is
 * not actionable, "92%, contact information unavailable" is.
 *
 * Pure functions: no database access, no framework. Unit-tested directly.
 */

import { normalizeDomain, isValidEmailSyntax, isSharedHost } from '../utils/normalize.js';
import { LIMITS } from '../utils/validate.js';

const CURRENT_YEAR = new Date().getFullYear();

/**
 * The check list. Weights sum to 100.
 *
 * Weighting is by decision impact, not by field count: a reachable website and
 * a revenue figure change whether a searcher opens the lead, whereas a missing
 * sub-industry does not.
 */
export const QUALITY_CHECKS = [
  {
    key: 'companyName',
    label: 'Company name present',
    weight: 8,
    test: (c) => Boolean(c.companyName && c.companyName.trim().length >= 2),
  },
  {
    key: 'domainValid',
    label: 'Domain is a valid hostname',
    weight: 12,
    test: (c) => Boolean(normalizeDomain(c.domain)),
  },
  {
    key: 'ownedDomain',
    label: 'Company owns its domain',
    weight: 5,
    test: (c) => Boolean(normalizeDomain(c.domain)) && !isSharedHost(c.domain),
    hint: 'Site is hosted on a shared website-builder domain',
  },
  {
    key: 'websiteReachable',
    label: 'Website reachable',
    weight: 12,
    test: (c) => c.websiteStatus === 'verified',
    hint: 'Website could not be verified',
  },
  {
    key: 'industry',
    label: 'Industry classified',
    weight: 10,
    test: (c) => Boolean(c.industry && c.industry.trim()),
  },
  {
    key: 'location',
    label: 'Location complete',
    weight: 10,
    test: (c) => Boolean(c.location?.country && c.location?.state),
    hint: 'Location is missing city or state detail',
  },
  {
    key: 'employeeCount',
    label: 'Employee estimate present',
    weight: 10,
    test: (c) =>
      Number.isFinite(c.employeeCount) &&
      c.employeeCount >= 0 &&
      c.employeeCount <= LIMITS.employeeCount.max,
  },
  {
    key: 'revenueEstimate',
    label: 'Revenue estimate present',
    weight: 10,
    test: (c) => Number.isFinite(c.revenueEstimate) && c.revenueEstimate >= 0,
  },
  {
    key: 'foundedYear',
    label: 'Founded year plausible',
    weight: 5,
    test: (c) =>
      Number.isFinite(c.foundedYear) &&
      c.foundedYear >= LIMITS.foundedYear.min &&
      c.foundedYear <= CURRENT_YEAR,
  },
  {
    key: 'contact',
    label: 'Contact information available',
    weight: 10,
    test: (c) => Boolean(c.contactAvailability) && (!c.contactEmail || isValidEmailSyntax(c.contactEmail)),
    hint: 'No verified contact route for this company',
  },
  {
    key: 'notDuplicate',
    label: 'No probable duplicate detected',
    weight: 8,
    // Asserts that deduplication has RUN and came back clean, rather than that
    // no flag happens to be set. An un-deduplicated record has not been checked,
    // and "not checked" is not the same claim as "not a duplicate".
    test: (c) => c.duplicateStatus === 'unique' || c.duplicateStatus === 'primary',
    hint: 'Record looks like a duplicate of another company, or has not been deduplicated',
  },
];

const TOTAL_WEIGHT = QUALITY_CHECKS.reduce((sum, check) => sum + check.weight, 0);
if (TOTAL_WEIGHT !== 100) {
  throw new Error(`QUALITY_CHECKS weights must sum to 100, got ${TOTAL_WEIGHT}.`);
}

/**
 * Score one company record.
 *
 * @returns {{ score: number, passed: object[], failed: object[], checks: object[] }}
 */
export function computeDataQuality(company = {}) {
  const checks = QUALITY_CHECKS.map((check) => {
    let passed = false;
    try {
      passed = Boolean(check.test(company));
    } catch {
      // A throwing check means malformed data, which is itself a failure.
      passed = false;
    }
    return {
      key: check.key,
      label: check.label,
      weight: check.weight,
      passed,
      hint: passed ? null : check.hint || `${check.label} — missing or invalid`,
    };
  });

  const earned = checks.reduce((sum, check) => (check.passed ? sum + check.weight : sum), 0);

  return {
    score: Math.round(earned),
    checks,
    passed: checks.filter((c) => c.passed),
    failed: checks.filter((c) => !c.passed),
  };
}

/**
 * Completeness of the fields a searcher needs, independent of validity.
 * Stored on the record at ingest so it can be filtered on without recomputation.
 */
export function computeCompleteness(company = {}) {
  const fields = [
    company.companyName,
    company.domain,
    company.industry,
    company.location?.country,
    company.location?.state,
    company.employeeCount,
    company.revenueEstimate,
    company.businessModel,
    company.foundedYear,
    company.contactAvailability ? 'yes' : '',
  ];
  const present = fields.filter(
    (value) => value !== null && value !== undefined && value !== '' && value !== false
  ).length;
  return Math.round((present / fields.length) * 100);
}

/** Coarse band used for filtering and the analytics distribution. */
export function dataQualityBand(score) {
  if (score >= 85) return 'high';
  if (score >= 60) return 'medium';
  return 'low';
}
