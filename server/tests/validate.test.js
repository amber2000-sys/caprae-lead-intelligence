import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateCompanyPayload, validateBuyBoxPayload, validateEmployeeCount,
  validateRevenue, validateRange, validateWeights, validatePagination, validateEnum,
  BUSINESS_MODELS,
} from '../src/utils/validate.js';

test('rejects a negative employee count with the exact message the brief specifies', () => {
  const result = validateEmployeeCount(-1);
  assert.equal(result.valid, false);
  assert.equal(result.error, 'Employee count must be greater than or equal to 0');
});

test('rejects non-numeric and non-integer values rather than coercing them', () => {
  assert.equal(validateEmployeeCount('abc').valid, false);
  assert.equal(validateEmployeeCount(12.5).valid, false);
  assert.equal(validateEmployeeCount(Infinity).valid, false);
  assert.equal(validateEmployeeCount(NaN).valid, false);
});

test('an empty string is not silently read as zero', () => {
  // Number('') === 0, which is how bad records get into a database.
  const result = validateRevenue('', { required: true });
  assert.equal(result.valid, false);
  assert.match(result.error, /required/);
});

test('an optional missing value is valid and resolves to null', () => {
  const result = validateRevenue(undefined, { required: false });
  assert.equal(result.valid, true);
  assert.equal(result.value, null);
});

test('a range with min greater than max is rejected', () => {
  const result = validateRange(500, 20, { field: 'Employee count', min: 0, max: 1e6 });
  assert.equal(result.valid, false);
  assert.match(result.errors[0], /cannot be greater than/);
});

test('an open-ended range is valid', () => {
  assert.equal(validateRange(20, undefined, { field: 'Employee count', min: 0, max: 1e6 }).valid, true);
  assert.equal(validateRange(undefined, undefined, { field: 'Revenue', min: 0, max: 1e12 }).valid, true);
});

test('a company payload collects every error in one pass', () => {
  const result = validateCompanyPayload({
    companyName: '', domain: 'not a domain', industry: '', location: {}, employeeCount: -5,
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.length >= 4, 'all problems should be returned together, not one at a time');
});

test('a valid company payload normalises its domain', () => {
  const result = validateCompanyPayload({
    companyName: 'ABC Software',
    domain: 'https://www.abcsoftware.com/about',
    industry: 'B2B SaaS',
    location: { city: 'Austin', state: 'Texas', country: 'United States' },
    employeeCount: 82, revenueEstimate: 5_200_000, foundedYear: 2016, businessModel: 'B2B',
  });
  assert.equal(result.valid, true, result.errors.join('; '));
  assert.equal(result.value.domain, 'abcsoftware.com');
});

test('a founded year in the future is rejected', () => {
  const result = validateCompanyPayload({
    companyName: 'Future Co', domain: 'future.com', industry: 'B2B SaaS',
    location: { country: 'United States' }, foundedYear: new Date().getFullYear() + 5,
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => /Founded year/.test(e)));
});

test('an unknown business model is rejected and the allowed set is listed', () => {
  const result = validateEnum('B2Z', BUSINESS_MODELS, { field: 'Business model' });
  assert.equal(result.valid, false);
  assert.match(result.error, /must be one of/);
});

test('a business model matches case-insensitively and is normalised', () => {
  const result = validateEnum('b2b', BUSINESS_MODELS, { field: 'Business model' });
  assert.equal(result.valid, true);
  assert.equal(result.value, 'B2B');
});

test('an empty Buy Box is valid — unset criteria mean "no constraint"', () => {
  const result = validateBuyBoxPayload({});
  assert.equal(result.valid, true, result.errors.join('; '));
});

test('score weights must sum to 100', () => {
  assert.equal(validateWeights({ industryFit: 50, revenueFit: 50 }).valid, true);
  assert.equal(validateWeights({ industryFit: 50, revenueFit: 20 }).valid, false);
  assert.equal(validateWeights({ industryFit: -10, revenueFit: 110 }).valid, false);
});

test('pagination is clamped so a client cannot request the whole collection', () => {
  assert.deepEqual(validatePagination({ page: 2, limit: 20 }), { page: 2, limit: 20, skip: 20 });
  assert.equal(validatePagination({ limit: 100000 }).limit, 100);
  assert.equal(validatePagination({ page: -5 }).page, 1);
  assert.equal(validatePagination({ page: 'abc' }).page, 1);
});
