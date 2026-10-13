import test from 'node:test';
import assert from 'node:assert/strict';
import { computeDataQuality, computeCompleteness, dataQualityBand, QUALITY_CHECKS } from '../src/services/dataQualityService.js';

const COMPLETE = {
  companyName: 'ABC Software', domain: 'https://www.abcsoftware.com/',
  industry: 'B2B SaaS',
  location: { city: 'Austin', state: 'Texas', country: 'United States' },
  employeeCount: 82, revenueEstimate: 5_200_000, foundedYear: 2016,
  websiteStatus: 'verified', contactAvailability: true, contactEmail: 'info@abcsoftware.com',
  duplicateStatus: 'unique', businessModel: 'B2B',
};

test('a complete, valid record scores 100', () => {
  const result = computeDataQuality(COMPLETE);
  assert.equal(result.score, 100);
  assert.equal(result.failed.length, 0);
});

test('every failed check explains itself', () => {
  const result = computeDataQuality({ ...COMPLETE, contactAvailability: false, websiteStatus: 'unreachable' });
  assert.ok(result.score < 100);
  for (const check of result.failed) {
    assert.ok(check.hint, `check "${check.key}" must say what is wrong`);
  }
});

test('an empty record scores zero without throwing', () => {
  const result = computeDataQuality({});
  assert.equal(result.score, 0);
  assert.equal(result.passed.length, 0);
});

test('a record that was never deduplicated does not get credit for being clean', () => {
  const { duplicateStatus, ...notDeduped } = COMPLETE;
  const result = computeDataQuality(notDeduped);
  assert.equal(result.checks.find((c) => c.key === 'notDuplicate').passed, false);
  assert.ok(result.score < 100);
});

test('a probable duplicate loses the duplicate check', () => {
  const clean = computeDataQuality(COMPLETE).score;
  const flagged = computeDataQuality({ ...COMPLETE, duplicateStatus: 'probable_duplicate' }).score;
  assert.ok(flagged < clean);
});

test('a shared website-builder host loses the owned-domain check but keeps domain validity', () => {
  const result = computeDataQuality({ ...COMPLETE, domain: 'acme.wixsite.com' });
  assert.equal(result.checks.find((c) => c.key === 'domainValid').passed, true);
  assert.equal(result.checks.find((c) => c.key === 'ownedDomain').passed, false);
});

test('an invalid contact email fails the contact check', () => {
  const result = computeDataQuality({ ...COMPLETE, contactEmail: 'not-an-email' });
  assert.equal(result.checks.find((c) => c.key === 'contact').passed, false);
});

test('check weights sum to 100 so the score is a true percentage', () => {
  assert.equal(QUALITY_CHECKS.reduce((sum, c) => sum + c.weight, 0), 100);
});

test('completeness counts present fields independently of validity', () => {
  assert.equal(computeCompleteness(COMPLETE), 100);
  assert.ok(computeCompleteness({ companyName: 'X' }) < 20);
});

test('bands map to the thresholds used by the UI filter', () => {
  assert.equal(dataQualityBand(100), 'high');
  assert.equal(dataQualityBand(85), 'high');
  assert.equal(dataQualityBand(84), 'medium');
  assert.equal(dataQualityBand(60), 'medium');
  assert.equal(dataQualityBand(59), 'low');
});
