import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scoreCompany, bandFit, scoreIndustryFit, scoreDigitizationUpside,
  scoreSuccessionSignal, priorityForScore,
} from '../src/services/scoringService.js';
import { SCORE_WEIGHTS } from '../src/config/scoring.config.js';

const CURRENT_YEAR = new Date().getFullYear();

const BUY_BOX = {
  industry: 'B2B SaaS',
  country: 'United States',
  employeeMin: 20,
  employeeMax: 200,
  revenueMin: 1_000_000,
  revenueMax: 20_000_000,
  businessModel: 'B2B',
};

const PERFECT_FIT = {
  companyName: 'Northgate Software',
  domain: 'northgatesoftware.com',
  industry: 'B2B SaaS',
  subIndustry: 'Vertical SaaS',
  location: { city: 'Austin', state: 'Texas', country: 'United States' },
  employeeCount: 82,
  revenueEstimate: 5_200_000,
  businessModel: 'B2B',
  foundedYear: 1995,
  websiteStatus: 'verified',
  contactAvailability: true,
  duplicateStatus: 'unique',
  technologyStack: ['Static HTML'],
  digitalSignals: {
    hasHttps: false, mobileOptimized: false, hasAnalytics: false,
    hasEcommerceOrBooking: false, hasCrm: false,
    lastContentUpdateYear: CURRENT_YEAR - 8, cmsDetected: '',
  },
  ownership: { founderLed: true, ownerTenureYears: 28, privateEquityBacked: false, isFranchise: false },
};

/* ---------------------------------------------------------------- */
/* bandFit                                                           */
/* ---------------------------------------------------------------- */

test('bandFit: inside the range scores full marks', () => {
  assert.equal(bandFit(100, 20, 200).ratio, 1);
  assert.equal(bandFit(20, 20, 200).status, 'match');   // inclusive lower bound
  assert.equal(bandFit(200, 20, 200).status, 'match');  // inclusive upper bound
});

test('bandFit: an unset range is neutral, not a failure', () => {
  const result = bandFit(5, null, null);
  assert.equal(result.ratio, 1);
  assert.equal(result.status, 'na');
});

test('bandFit: a missing value scores zero and is reported as missing', () => {
  const result = bandFit(null, 20, 200);
  assert.equal(result.ratio, 0);
  assert.equal(result.status, 'missing');
});

test('bandFit: just outside the range decays rather than hard-failing', () => {
  const near = bandFit(210, 20, 200);   // 10 over a 180-wide band
  assert.equal(near.status, 'partial');
  assert.ok(near.ratio > 0 && near.ratio < 1);

  const far = bandFit(900, 20, 200);    // well beyond tolerance
  assert.equal(far.status, 'miss');
  assert.equal(far.ratio, 0);
});

test('bandFit: the nearer the band, the higher the score', () => {
  assert.ok(bandFit(205, 20, 200).ratio > bandFit(260, 20, 200).ratio);
});

/* ---------------------------------------------------------------- */
/* Component scorers                                                 */
/* ---------------------------------------------------------------- */

test('industry fit: exact match scores full, unrelated scores zero', () => {
  assert.equal(scoreIndustryFit({ industry: 'B2B SaaS' }, BUY_BOX).ratio, 1);
  assert.equal(scoreIndustryFit({ industry: 'Manufacturing' }, BUY_BOX).ratio, 0);
});

test('industry fit: an adjacent sector scores partially, not zero', () => {
  const result = scoreIndustryFit({ industry: 'SaaS' }, BUY_BOX);
  assert.equal(result.status, 'partial');
  assert.ok(result.ratio > 0 && result.ratio < 1);
});

test('industry fit: no criterion set is neutral', () => {
  assert.equal(scoreIndustryFit({ industry: 'Anything' }, {}).status, 'na');
});

test('digitization upside is INVERTED — a dated footprint scores higher', () => {
  const dated = scoreDigitizationUpside({
    digitalSignals: {
      hasHttps: false, mobileOptimized: false, hasAnalytics: false,
      hasEcommerceOrBooking: false, hasCrm: false,
      lastContentUpdateYear: CURRENT_YEAR - 9, cmsDetected: '',
    },
    technologyStack: ['Static HTML'],
  });
  const modern = scoreDigitizationUpside({
    digitalSignals: {
      hasHttps: true, mobileOptimized: true, hasAnalytics: true,
      hasEcommerceOrBooking: true, hasCrm: true,
      lastContentUpdateYear: CURRENT_YEAR, cmsDetected: 'Next.js',
    },
    technologyStack: ['React', 'AWS'],
  });

  assert.ok(dated.ratio > modern.ratio, 'a dated site must score higher upside than a modern one');
  assert.equal(dated.meta.gapIndex, 100);
  assert.equal(modern.meta.gapIndex, 0);
  assert.equal(modern.meta.strengths.length, 7);
});

test('digitization upside reports unknown signals instead of assuming', () => {
  const result = scoreDigitizationUpside({ digitalSignals: {}, technologyStack: [] });
  assert.equal(result.status, 'missing');
  assert.equal(result.meta.gaps.length, 0);
  assert.ok(result.meta.unknown.length >= 5);
});

test('succession signal: an old founder-led business beats a young PE-backed one', () => {
  const founderLed = scoreSuccessionSignal({
    foundedYear: 1985,
    ownership: { founderLed: true, ownerTenureYears: 30, privateEquityBacked: false },
  });
  const peBacked = scoreSuccessionSignal({
    foundedYear: 2019,
    ownership: { founderLed: false, ownerTenureYears: 3, privateEquityBacked: true },
  });
  assert.ok(founderLed.ratio > peBacked.ratio);
  assert.equal(founderLed.status, 'match');
});

test('succession signal: PE backing applies a penalty even to an old business', () => {
  const independent = scoreSuccessionSignal({
    foundedYear: 1985, ownership: { founderLed: true, ownerTenureYears: 30, privateEquityBacked: false },
  });
  const owned = scoreSuccessionSignal({
    foundedYear: 1985, ownership: { founderLed: true, ownerTenureYears: 30, privateEquityBacked: true },
  });
  assert.ok(owned.ratio < independent.ratio);
});

/* ---------------------------------------------------------------- */
/* scoreCompany                                                      */
/* ---------------------------------------------------------------- */

test('component points always add up to the headline score', () => {
  const result = scoreCompany(PERFECT_FIT, BUY_BOX);
  const summed = result.components.reduce((total, c) => total + c.earned, 0);
  assert.equal(summed, result.totalScore, 'the bars shown in the UI must equal the number shown in the UI');
});

test('the score is bounded to 0-100', () => {
  const result = scoreCompany(PERFECT_FIT, BUY_BOX);
  assert.ok(result.totalScore >= 0 && result.totalScore <= 100);
});

test('every component is explained — no silent points', () => {
  const result = scoreCompany(PERFECT_FIT, BUY_BOX);
  assert.equal(result.components.length, Object.keys(SCORE_WEIGHTS).length);
  for (const component of result.components) {
    assert.ok(component.label, 'component must have a label');
    assert.ok(component.detail, `component ${component.key} must explain itself`);
    assert.ok(component.max > 0);
    assert.ok(component.earned <= component.max, `${component.key} cannot exceed its weight`);
  }
});

test('an ideal ETA target outranks a company that misses the Buy Box', () => {
  const poorFit = {
    ...PERFECT_FIT,
    industry: 'Manufacturing',
    employeeCount: 4000,
    revenueEstimate: 900_000_000,
    location: { country: 'Germany', state: 'Bavaria' },
    businessModel: 'B2C',
  };
  assert.ok(scoreCompany(PERFECT_FIT, BUY_BOX).totalScore > scoreCompany(poorFit, BUY_BOX).totalScore);
});

test('an estimated revenue always produces an explicit concern', () => {
  const result = scoreCompany({ ...PERFECT_FIT, revenueIsEstimated: true }, BUY_BOX);
  assert.ok(result.concerns.some((c) => /modelled, not verified/i.test(c.label)));
});

test('a probable duplicate is surfaced as a high-severity concern', () => {
  const result = scoreCompany({ ...PERFECT_FIT, duplicateStatus: 'probable_duplicate' }, BUY_BOX);
  const concern = result.concerns.find((c) => /duplicate/i.test(c.label));
  assert.ok(concern);
  assert.equal(concern.severity, 'high');
});

test('an empty Buy Box does not crash and does not zero every company', () => {
  const result = scoreCompany(PERFECT_FIT, {});
  assert.ok(result.totalScore > 0);
  assert.equal(result.priority, priorityForScore(result.totalScore));
});

test('custom Buy Box weights change the ranking', () => {
  const digitizationHeavy = {
    ...BUY_BOX,
    weights: { digitizationUpside: 60, industryFit: 20, revenueFit: 10, sizeFit: 10 },
  };
  const modern = { ...PERFECT_FIT, digitalSignals: {
    hasHttps: true, mobileOptimized: true, hasAnalytics: true,
    hasEcommerceOrBooking: true, hasCrm: true, lastContentUpdateYear: CURRENT_YEAR, cmsDetected: 'Next.js',
  } };

  const datedScore = scoreCompany(PERFECT_FIT, digitizationHeavy).totalScore;
  const modernScore = scoreCompany(modern, digitizationHeavy).totalScore;
  assert.ok(datedScore > modernScore, 'weighting digitization heavily must favour the higher-gap company');
});

test('priority bands map correctly', () => {
  assert.equal(priorityForScore(90), 'HIGH');
  assert.equal(priorityForScore(75), 'HIGH');
  assert.equal(priorityForScore(74), 'MEDIUM');
  assert.equal(priorityForScore(55), 'MEDIUM');
  assert.equal(priorityForScore(54), 'LOW');
  assert.equal(priorityForScore(0), 'LOW');
});

test('a record with nothing on it scores without throwing', () => {
  const result = scoreCompany({}, BUY_BOX);
  assert.equal(typeof result.totalScore, 'number');
  assert.ok(result.concerns.length > 0, 'an empty record should raise concerns');
});
