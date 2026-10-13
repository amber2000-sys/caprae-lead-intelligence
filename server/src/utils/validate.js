/**
 * Hand-rolled validation layer.
 *
 * Written rather than imported for two reasons: the rule set is small and
 * domain-specific (acquisition ranges, not generic shapes), and keeping it as
 * plain pure functions means every rule is directly unit-testable and every
 * error message is ours to word.
 *
 * Each validator returns { valid, value, errors } rather than throwing, so a
 * caller can collect every problem with a payload in one pass instead of
 * surfacing them one at a time.
 */

import { cleanString, normalizeDomain, isValidEmailSyntax } from './normalize.js';

const CURRENT_YEAR = new Date().getFullYear();

export const LIMITS = {
  employeeCount: { min: 0, max: 5_000_000 },
  revenue: { min: 0, max: 1_000_000_000_000 },
  foundedYear: { min: 1600, max: CURRENT_YEAR },
  companyNameLength: { min: 2, max: 200 },
  noteLength: { max: 1000 },
};

export const BUSINESS_MODELS = ['B2B', 'B2C', 'B2B2C', 'Marketplace', 'Services', 'D2C'];
export const WEBSITE_STATUSES = ['verified', 'unverified', 'unreachable'];
export const DUPLICATE_STATUSES = ['unique', 'primary', 'probable_duplicate'];

/* ------------------------------------------------------------------ */
/* Field-level validators                                              */
/* ------------------------------------------------------------------ */

export function validateCompanyName(input) {
  const value = cleanString(input);
  const { min, max } = LIMITS.companyNameLength;

  if (!value) return { valid: false, value: '', error: 'Company name is required' };
  if (value.length < min) {
    return { valid: false, value, error: `Company name must be at least ${min} characters` };
  }
  if (value.length > max) {
    return { valid: false, value, error: `Company name must be at most ${max} characters` };
  }
  return { valid: true, value, error: null };
}

export function validateDomain(input) {
  const value = normalizeDomain(input);
  if (!value) {
    return { valid: false, value: '', error: 'Domain must be a valid hostname, e.g. example.com' };
  }
  return { valid: true, value, error: null };
}

/**
 * Integer within a bound. Rejects NaN, Infinity and non-integers explicitly —
 * `Number('')` is 0, which is exactly the kind of silent coercion that puts bad
 * records in a database.
 */
export function validateInteger(input, { field, min, max, required = true }) {
  if (input === undefined || input === null || input === '') {
    if (required) return { valid: false, value: null, error: `${field} is required` };
    return { valid: true, value: null, error: null };
  }

  const value = Number(input);

  if (!Number.isFinite(value)) {
    return { valid: false, value: null, error: `${field} must be a number` };
  }
  if (!Number.isInteger(value)) {
    return { valid: false, value: null, error: `${field} must be a whole number` };
  }
  if (min !== undefined && value < min) {
    return { valid: false, value, error: `${field} must be greater than or equal to ${min}` };
  }
  if (max !== undefined && value > max) {
    return { valid: false, value, error: `${field} must be less than or equal to ${max}` };
  }
  return { valid: true, value, error: null };
}

export function validateEmployeeCount(input, { required = true } = {}) {
  return validateInteger(input, {
    field: 'Employee count',
    min: LIMITS.employeeCount.min,
    max: LIMITS.employeeCount.max,
    required,
  });
}

export function validateRevenue(input, { required = true } = {}) {
  return validateInteger(input, {
    field: 'Revenue estimate',
    min: LIMITS.revenue.min,
    max: LIMITS.revenue.max,
    required,
  });
}

export function validateFoundedYear(input, { required = false } = {}) {
  return validateInteger(input, {
    field: 'Founded year',
    min: LIMITS.foundedYear.min,
    max: LIMITS.foundedYear.max,
    required,
  });
}

export function validateEnum(input, allowed, { field, required = true }) {
  const value = cleanString(input);
  if (!value) {
    if (required) return { valid: false, value: '', error: `${field} is required` };
    return { valid: true, value: '', error: null };
  }
  const match = allowed.find((option) => option.toLowerCase() === value.toLowerCase());
  if (!match) {
    return { valid: false, value, error: `${field} must be one of: ${allowed.join(', ')}` };
  }
  return { valid: true, value: match, error: null };
}

export function validateLocation(input) {
  const errors = [];
  const location = input && typeof input === 'object' ? input : {};

  const city = cleanString(location.city);
  const state = cleanString(location.state);
  const country = cleanString(location.country);

  if (!country) errors.push('Location country is required');

  return { valid: errors.length === 0, value: { city, state, country }, errors };
}

/** A min/max pair where min must not exceed max. */
export function validateRange(minInput, maxInput, { field, min, max }) {
  const errors = [];

  const lower = validateInteger(minInput, { field: `${field} minimum`, min, max, required: false });
  const upper = validateInteger(maxInput, { field: `${field} maximum`, min, max, required: false });

  if (!lower.valid) errors.push(lower.error);
  if (!upper.valid) errors.push(upper.error);

  if (lower.valid && upper.valid && lower.value !== null && upper.value !== null) {
    if (lower.value > upper.value) {
      errors.push(`${field} minimum cannot be greater than ${field.toLowerCase()} maximum`);
    }
  }

  return { valid: errors.length === 0, value: { min: lower.value, max: upper.value }, errors };
}

/* ------------------------------------------------------------------ */
/* Payload-level validators                                            */
/* ------------------------------------------------------------------ */

/** Validate a company create/update payload. Collects every error at once. */
export function validateCompanyPayload(payload = {}) {
  const errors = [];
  const value = {};

  const name = validateCompanyName(payload.companyName);
  if (!name.valid) errors.push(name.error);
  value.companyName = name.value;

  const domain = validateDomain(payload.domain);
  if (!domain.valid) errors.push(domain.error);
  value.domain = domain.value;

  const industry = cleanString(payload.industry);
  if (!industry) errors.push('Industry is required');
  value.industry = industry;
  value.subIndustry = cleanString(payload.subIndustry);

  const location = validateLocation(payload.location);
  errors.push(...location.errors);
  value.location = location.value;

  const employees = validateEmployeeCount(payload.employeeCount, { required: false });
  if (!employees.valid) errors.push(employees.error);
  value.employeeCount = employees.value;

  const revenue = validateRevenue(payload.revenueEstimate, { required: false });
  if (!revenue.valid) errors.push(revenue.error);
  value.revenueEstimate = revenue.value;

  const model = validateEnum(payload.businessModel, BUSINESS_MODELS, {
    field: 'Business model',
    required: false,
  });
  if (!model.valid) errors.push(model.error);
  value.businessModel = model.value;

  const founded = validateFoundedYear(payload.foundedYear);
  if (!founded.valid) errors.push(founded.error);
  value.foundedYear = founded.value;

  const websiteStatus = validateEnum(payload.websiteStatus, WEBSITE_STATUSES, {
    field: 'Website status',
    required: false,
  });
  if (!websiteStatus.valid) errors.push(websiteStatus.error);
  value.websiteStatus = websiteStatus.value || 'unverified';

  if (payload.contactEmail && !isValidEmailSyntax(payload.contactEmail)) {
    errors.push('Contact email is not a valid email address');
  } else if (payload.contactEmail) {
    value.contactEmail = cleanString(payload.contactEmail);
  }

  return { valid: errors.length === 0, value, errors };
}

/** Validate a Buy Box payload. All criteria are optional — an empty Buy Box is valid and means "no constraint". */
export function validateBuyBoxPayload(payload = {}) {
  const errors = [];
  const value = {};

  value.name = cleanString(payload.name) || 'Untitled Buy Box';
  value.industry = cleanString(payload.industry);
  value.subIndustry = cleanString(payload.subIndustry);
  value.country = cleanString(payload.country);
  value.state = cleanString(payload.state);

  const employees = validateRange(payload.employeeMin, payload.employeeMax, {
    field: 'Employee count',
    min: LIMITS.employeeCount.min,
    max: LIMITS.employeeCount.max,
  });
  errors.push(...employees.errors);
  value.employeeMin = employees.value.min;
  value.employeeMax = employees.value.max;

  const revenue = validateRange(payload.revenueMin, payload.revenueMax, {
    field: 'Revenue',
    min: LIMITS.revenue.min,
    max: LIMITS.revenue.max,
  });
  errors.push(...revenue.errors);
  value.revenueMin = revenue.value.min;
  value.revenueMax = revenue.value.max;

  const founded = validateRange(payload.foundedYearMin, payload.foundedYearMax, {
    field: 'Founded year',
    min: LIMITS.foundedYear.min,
    max: LIMITS.foundedYear.max,
  });
  errors.push(...founded.errors);
  value.foundedYearMin = founded.value.min;
  value.foundedYearMax = founded.value.max;

  const model = validateEnum(payload.businessModel, BUSINESS_MODELS, {
    field: 'Business model',
    required: false,
  });
  if (!model.valid) errors.push(model.error);
  value.businessModel = model.value;

  // Absent means "leave as-is"; only an explicit boolean changes it.
  if (payload.industryStrict !== undefined) {
    value.industryStrict = payload.industryStrict === true || payload.industryStrict === 'true';
  }

  if (payload.weights !== undefined) {
    const weights = validateWeights(payload.weights);
    errors.push(...weights.errors);
    if (weights.valid) value.weights = weights.value;
  }

  return { valid: errors.length === 0, value, errors };
}

/** Score weights must be non-negative numbers summing to 100. */
export function validateWeights(input) {
  const errors = [];
  if (!input || typeof input !== 'object') {
    return { valid: false, value: null, errors: ['Weights must be an object'] };
  }

  const value = {};
  let total = 0;

  for (const [key, raw] of Object.entries(input)) {
    const num = Number(raw);
    if (!Number.isFinite(num) || num < 0) {
      errors.push(`Weight "${key}" must be a non-negative number`);
      continue;
    }
    value[key] = num;
    total += num;
  }

  if (errors.length === 0 && Math.round(total) !== 100) {
    errors.push(`Weights must sum to 100 (received ${Math.round(total)})`);
  }

  return { valid: errors.length === 0, value, errors };
}

/** Clamp pagination inputs so a client cannot ask for the entire collection. */
export function validatePagination(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const rawLimit = Number.parseInt(query.limit, 10) || 20;
  const limit = Math.min(100, Math.max(1, rawLimit));
  return { page, limit, skip: (page - 1) * limit };
}
