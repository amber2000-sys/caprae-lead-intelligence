import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCompanyFilter, applyDerivedFilters, sortLeads, summariseLeads, escapeRegex, enrichCompany,
} from '../src/services/leadQueryService.js';

const leads = [
  { companyName: 'Alpha', fitScore: 90, priority: 'HIGH', dataQualityScore: 95, dataQualityBand: 'high', revenueEstimate: 5_000_000, employeeCount: 50 },
  { companyName: 'Bravo', fitScore: 60, priority: 'MEDIUM', dataQualityScore: 70, dataQualityBand: 'medium', revenueEstimate: 12_000_000, employeeCount: 180 },
  { companyName: 'Charlie', fitScore: 30, priority: 'LOW', dataQualityScore: 40, dataQualityBand: 'low', revenueEstimate: null, employeeCount: 10 },
];

test('builds a MongoDB filter only from database-resolvable fields', () => {
  const filter = buildCompanyFilter({
    industry: 'B2B SaaS', country: 'United States',
    employeeMin: 20, employeeMax: 200, revenueMin: 1_000_000,
    minFitScore: 70,   // derived — must NOT appear in the DB query
  });

  assert.equal(filter.industry, 'B2B SaaS');
  assert.equal(filter['location.country'], 'United States');
  assert.deepEqual(filter.employeeCount, { $gte: 20, $lte: 200 });
  assert.deepEqual(filter.revenueEstimate, { $gte: 1_000_000 });
  assert.equal(filter.minFitScore, undefined);
  assert.equal(filter.fitScore, undefined);
});

test('probable duplicates are excluded by default and included on request', () => {
  assert.deepEqual(buildCompanyFilter({}).duplicateStatus, { $ne: 'probable_duplicate' });
  assert.equal(buildCompanyFilter({ includeDuplicates: true }).duplicateStatus, undefined);
});

test('empty filters produce no field predicates', () => {
  const filter = buildCompanyFilter({ industry: '   ', country: '', employeeMin: 'abc' });
  assert.equal(filter.industry, undefined);
  assert.equal(filter['location.country'], undefined);
  assert.equal(filter.employeeCount, undefined);
});

test('free-text search is escaped before it reaches a regex', () => {
  const filter = buildCompanyFilter({ search: 'a.b*c(' });
  assert.match(filter.$or[0].companyName.$regex, /a\\\.b\\\*c\\\(/);
});

test('escapeRegex neutralises every metacharacter', () => {
  assert.equal(escapeRegex('.*+?^${}()|[]\\'), '\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
});

test('derived filters apply min score, priority and data-quality band', () => {
  assert.equal(applyDerivedFilters(leads, { minFitScore: 70 }).length, 1);
  assert.equal(applyDerivedFilters(leads, { priority: 'MEDIUM' })[0].companyName, 'Bravo');
  assert.equal(applyDerivedFilters(leads, { dataQuality: 'low' })[0].companyName, 'Charlie');
});

test('derived filters compose', () => {
  assert.equal(applyDerivedFilters(leads, { minFitScore: 50, priority: 'HIGH' }).length, 1);
  assert.equal(applyDerivedFilters(leads, { minFitScore: 95 }).length, 0);
});

test('sorting defaults to fit score, descending', () => {
  assert.deepEqual(sortLeads(leads).map((l) => l.companyName), ['Alpha', 'Bravo', 'Charlie']);
  assert.deepEqual(sortLeads(leads, 'fitScore', 'asc').map((l) => l.companyName), ['Charlie', 'Bravo', 'Alpha']);
});

test('records missing the sort field sink in BOTH directions', () => {
  // A null revenue is not "the cheapest company" — it is unknown.
  assert.equal(sortLeads(leads, 'revenueEstimate', 'asc').at(-1).companyName, 'Charlie');
  assert.equal(sortLeads(leads, 'revenueEstimate', 'desc').at(-1).companyName, 'Charlie');
});

test('an unknown sort field falls back to fit score instead of returning garbage', () => {
  assert.deepEqual(sortLeads(leads, 'definitelyNotAField').map((l) => l.companyName), ['Alpha', 'Bravo', 'Charlie']);
});

test('sorting does not mutate the input array', () => {
  const original = [...leads];
  sortLeads(leads, 'companyName', 'desc');
  assert.deepEqual(leads, original);
});

test('the summary counts priorities and averages scores', () => {
  const summary = summariseLeads(leads);
  assert.deepEqual(
    { total: summary.total, high: summary.high, medium: summary.medium, low: summary.low },
    { total: 3, high: 1, medium: 1, low: 1 }
  );
  assert.equal(summary.averageFitScore, 60);
});

test('an empty result set summarises to zeroes rather than NaN', () => {
  assert.deepEqual(summariseLeads([]), {
    total: 0, high: 0, medium: 0, low: 0, averageFitScore: 0, averageDataQuality: 0,
  });
});

test('enrichCompany attaches score, priority, explanation and data quality', () => {
  const lead = enrichCompany(
    {
      companyName: 'Northgate Software', domain: 'northgate.com', industry: 'B2B SaaS',
      location: { city: 'Austin', state: 'Texas', country: 'United States' },
      employeeCount: 82, revenueEstimate: 5_200_000, businessModel: 'B2B', foundedYear: 2010,
      websiteStatus: 'verified', contactAvailability: true, duplicateStatus: 'unique',
      digitalSignals: {}, ownership: {},
    },
    { industry: 'B2B SaaS', country: 'United States', employeeMin: 20, employeeMax: 200 }
  );

  assert.equal(typeof lead.fitScore, 'number');
  assert.ok(['HIGH', 'MEDIUM', 'LOW'].includes(lead.priority));
  assert.ok(Array.isArray(lead.scoreBreakdown) && lead.scoreBreakdown.length > 0);
  assert.ok(Array.isArray(lead.reasons));
  assert.ok(Array.isArray(lead.concerns));
  assert.ok(['high', 'medium', 'low'].includes(lead.dataQualityBand));
});
