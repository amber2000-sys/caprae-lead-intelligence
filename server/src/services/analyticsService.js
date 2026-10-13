/**
 * Pipeline analytics.
 *
 * Everything here is derived from the same scored lead set the results table
 * uses, so the dashboard and the table can never disagree — a class of bug that
 * destroys trust in an analytics screen faster than a wrong number does.
 */

import { Company } from '../models/Company.js';
import { enrichCompany } from './leadQueryService.js';

const REVENUE_BUCKETS = [
  { label: '< $1M', min: 0, max: 1_000_000 },
  { label: '$1M–$5M', min: 1_000_000, max: 5_000_000 },
  { label: '$5M–$10M', min: 5_000_000, max: 10_000_000 },
  { label: '$10M–$20M', min: 10_000_000, max: 20_000_000 },
  { label: '$20M–$50M', min: 20_000_000, max: 50_000_000 },
  { label: '$50M+', min: 50_000_000, max: Infinity },
];

const QUALITY_BUCKETS = [
  { label: 'High (85-100)', min: 85 },
  { label: 'Medium (60-84)', min: 60 },
  { label: 'Low (0-59)', min: 0 },
];

/**
 * Fit-score histogram.
 *
 * Buckets are five wide, not ten, so that both priority thresholds (55 and 75)
 * land exactly on a bucket boundary. With ten-wide buckets the 75 threshold
 * falls inside the 70-79 bucket, and any colouring of that bar is a lie — it
 * contains both HIGH and MEDIUM leads.
 *
 * Each bucket carries its priority band so the histogram and the priority split
 * chart are coloured from the same source and cannot disagree.
 */
function buildScoreHistogram(leads) {
  const SIZE = 5;
  const buckets = Array.from({ length: 100 / SIZE }, (_, index) => {
    const from = index * SIZE;
    return {
      from,
      to: from + SIZE - 1,
      count: 0,
      band: from >= 75 ? 'HIGH' : from >= 55 ? 'MEDIUM' : 'LOW',
    };
  });

  for (const lead of leads) {
    const index = Math.min(Math.floor(lead.fitScore / SIZE), buckets.length - 1);
    buckets[index].count += 1;
  }

  return buckets;
}

function countBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

export function buildAnalytics(leads) {
  const total = leads.length;

  if (total === 0) {
    return {
      totals: { total: 0, highFit: 0, verified: 0, duplicates: 0, incomplete: 0, averageFitScore: 0, averageDataQuality: 0 },
      byIndustry: [], byState: [], byPriority: [], byRevenueBucket: [], byDataQuality: [], digitizationGap: [],
    };
  }

  const average = (fn) => Math.round(leads.reduce((sum, lead) => sum + fn(lead), 0) / total);

  const digitizationBuckets = [
    { label: 'High upside (50+)', min: 50 },
    { label: 'Moderate (25-49)', min: 25 },
    { label: 'Already digitised (<25)', min: 0 },
  ].map((bucket) => ({ ...bucket, value: 0 }));

  for (const lead of leads) {
    const component = lead.scoreBreakdown?.find((c) => c.key === 'digitizationUpside');
    const gapIndex = component?.meta?.gapIndex ?? 0;
    const bucket = digitizationBuckets.find((b) => gapIndex >= b.min);
    if (bucket) bucket.value += 1;
  }

  return {
    totals: {
      total,
      highFit: leads.filter((l) => l.priority === 'HIGH').length,
      verified: leads.filter((l) => l.websiteStatus === 'verified').length,
      duplicates: leads.filter((l) => l.duplicateStatus === 'probable_duplicate').length,
      incomplete: leads.filter((l) => l.dataQualityScore < 60).length,
      averageFitScore: average((l) => l.fitScore),
      averageDataQuality: average((l) => l.dataQualityScore),
    },
    byIndustry: countBy(leads, (l) => l.industry).slice(0, 8),
    byState: countBy(leads, (l) => l.location?.state).slice(0, 8),
    byPriority: ['HIGH', 'MEDIUM', 'LOW'].map((priority) => ({
      label: priority,
      value: leads.filter((l) => l.priority === priority).length,
    })),
    byRevenueBucket: REVENUE_BUCKETS.map((bucket) => ({
      label: bucket.label,
      value: leads.filter(
        (l) => Number.isFinite(l.revenueEstimate) && l.revenueEstimate >= bucket.min && l.revenueEstimate < bucket.max
      ).length,
    })),
    byDataQuality: QUALITY_BUCKETS.map((bucket, index) => {
      const upper = index === 0 ? Infinity : QUALITY_BUCKETS[index - 1].min;
      return {
        label: bucket.label,
        value: leads.filter((l) => l.dataQualityScore >= bucket.min && l.dataQualityScore < upper).length,
      };
    }),
    digitizationGap: digitizationBuckets.map(({ label, value }) => ({ label, value })),
    scoreHistogram: buildScoreHistogram(leads),
  };
}

/** Score the whole dataset against the active Buy Box, including duplicates. */
export async function getAnalytics(buyBox) {
  const companies = await Company.find({}).lean();
  const leads = companies.map((company) => enrichCompany(company, buyBox));
  return buildAnalytics(leads);
}
