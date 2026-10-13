/**
 * Acquisition Fit Score.
 *
 * The one rule this module exists to enforce: the score is never a black box.
 * Every point is attributed to a named component, every component reports why
 * it scored what it did, and the component values always add up to the headline
 * number shown in the UI.
 *
 * Pure functions throughout — `scoreCompany` takes a plain company object and a
 * plain buy box and returns a plain result. No database, no Express, no I/O.
 * That is what makes the business logic directly unit-testable.
 */

import {
  SCORE_WEIGHTS,
  COMPONENT_LABELS,
  COMPONENT_DESCRIPTIONS,
  PRIORITY_THRESHOLDS,
  DIGITIZATION_GAP_SIGNALS,
} from '../config/scoring.config.js';
import { comparisonKey } from '../utils/normalize.js';
import { computeDataQuality } from './dataQualityService.js';

const CURRENT_YEAR = new Date().getFullYear();

/** CMS values treated as legacy for the digitization gap. */
const LEGACY_CMS = new Set(['', 'none', 'static html', 'frontpage', 'dreamweaver', 'joomla 1', 'custom php']);

const clamp01 = (n) => Math.min(1, Math.max(0, n));

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

/**
 * Score a numeric value against an optional [min, max] band.
 *
 * Returns a full result inside the band, a decaying partial result just outside
 * it, and a neutral result when no band was specified. The decay matters: a
 * company with 210 employees against a 20-200 Buy Box is a near miss, not a
 * non-match, and hard-filtering it away is how a searcher loses a good target.
 */
export function bandFit(value, min, max) {
  const hasMin = Number.isFinite(min);
  const hasMax = Number.isFinite(max);

  if (!hasMin && !hasMax) {
    return { ratio: 1, status: 'na', detail: 'No target range set' };
  }
  if (!Number.isFinite(value)) {
    return { ratio: 0, status: 'missing', detail: 'Value not available on this record' };
  }

  const aboveMin = !hasMin || value >= min;
  const belowMax = !hasMax || value <= max;

  if (aboveMin && belowMax) {
    return { ratio: 1, status: 'match', detail: 'Inside the target range' };
  }

  // Tolerance is half the band width, so "how near is near" scales with how
  // wide the searcher's criteria already are.
  const span = hasMin && hasMax ? max - min : Math.abs(hasMax ? max : min);
  const tolerance = Math.max(span * 0.5, 1);
  const distance = !aboveMin ? min - value : value - max;
  const nearness = clamp01(1 - distance / tolerance);

  if (nearness <= 0) {
    return {
      ratio: 0,
      status: 'miss',
      detail: !aboveMin ? 'Below the target range' : 'Above the target range',
    };
  }

  // Capped at 0.75: outside the band is categorically worse than inside it.
  return {
    ratio: nearness * 0.75,
    status: 'partial',
    detail: !aboveMin ? 'Just below the target range' : 'Just above the target range',
  };
}

/* ------------------------------------------------------------------ */
/* Component scorers — each returns { ratio, status, detail }          */
/* ------------------------------------------------------------------ */

export function scoreIndustryFit(company, buyBox) {
  const target = comparisonKey(buyBox.industry);
  const targetSub = comparisonKey(buyBox.subIndustry);

  if (!target && !targetSub) {
    return { ratio: 1, status: 'na', detail: 'No industry criterion set' };
  }

  const industry = comparisonKey(company.industry);
  const subIndustry = comparisonKey(company.subIndustry);

  if (!industry && !subIndustry) {
    return { ratio: 0, status: 'missing', detail: 'Industry not classified on this record' };
  }

  if (target && industry === target) {
    if (targetSub && subIndustry && subIndustry !== targetSub) {
      return { ratio: 0.85, status: 'partial', detail: `Industry matches; sub-industry is ${company.subIndustry}` };
    }
    return { ratio: 1, status: 'match', detail: `Matches target industry "${company.industry}"` };
  }

  if (targetSub && subIndustry === targetSub) {
    return { ratio: 0.9, status: 'partial', detail: `Sub-industry matches "${company.subIndustry}"` };
  }

  // Containment catches "SaaS" against "B2B SaaS" without a taxonomy table.
  if (target && (industry.includes(target) || target.includes(industry))) {
    return { ratio: 0.7, status: 'partial', detail: `Adjacent sector: ${company.industry}` };
  }

  // Shared significant token, e.g. "Industrial Services" vs "Field Services".
  const targetTokens = new Set(target.split(' ').filter((t) => t.length > 3));
  const overlap = industry.split(' ').filter((t) => targetTokens.has(t));
  if (overlap.length > 0) {
    return { ratio: 0.4, status: 'partial', detail: `Partially related sector: ${company.industry}` };
  }

  return { ratio: 0, status: 'miss', detail: `Outside target industry (${company.industry})` };
}

export function scoreGeographyFit(company, buyBox) {
  const targetCountry = comparisonKey(buyBox.country);
  const targetState = comparisonKey(buyBox.state);

  if (!targetCountry && !targetState) {
    return { ratio: 1, status: 'na', detail: 'No geography criterion set' };
  }

  const country = comparisonKey(company.location?.country);
  const state = comparisonKey(company.location?.state);

  // Split the component between the criteria that were actually set.
  const parts = [];
  if (targetCountry) parts.push({ ok: country === targetCountry, label: 'country', present: Boolean(country) });
  if (targetState) parts.push({ ok: state === targetState, label: 'state', present: Boolean(state) });

  const matched = parts.filter((p) => p.ok).length;
  const ratio = matched / parts.length;

  if (ratio === 1) {
    return { ratio: 1, status: 'match', detail: `In target geography (${[company.location?.state, company.location?.country].filter(Boolean).join(', ')})` };
  }
  if (ratio === 0) {
    const missing = parts.find((p) => !p.present);
    if (missing) {
      return { ratio: 0, status: 'missing', detail: `Location ${missing.label} not recorded` };
    }
    return { ratio: 0, status: 'miss', detail: `Outside target geography (${company.location?.country || 'unknown'})` };
  }
  return { ratio, status: 'partial', detail: 'Country matches but state does not' };
}

export function scoreSizeFit(company, buyBox) {
  const result = bandFit(company.employeeCount, buyBox.employeeMin, buyBox.employeeMax);
  if (result.status === 'match') {
    return { ...result, detail: `${company.employeeCount} employees — inside target range` };
  }
  if (result.status === 'missing') {
    return { ...result, detail: 'Employee count not available' };
  }
  if (result.status === 'na') return result;
  return { ...result, detail: `${company.employeeCount} employees — ${result.detail.toLowerCase()}` };
}

export function scoreRevenueFit(company, buyBox) {
  const result = bandFit(company.revenueEstimate, buyBox.revenueMin, buyBox.revenueMax);
  if (result.status === 'missing') {
    return { ...result, detail: 'Revenue estimate not available' };
  }
  if (result.status === 'na') return result;

  const formatted = formatMoney(company.revenueEstimate);
  if (result.status === 'match') {
    return { ...result, detail: `${formatted} estimated revenue — inside target range` };
  }
  return { ...result, detail: `${formatted} estimated revenue — ${result.detail.toLowerCase()}` };
}

export function scoreBusinessModelFit(company, buyBox) {
  const target = comparisonKey(buyBox.businessModel);
  if (!target) return { ratio: 1, status: 'na', detail: 'No business model criterion set' };

  const model = comparisonKey(company.businessModel);
  if (!model) return { ratio: 0, status: 'missing', detail: 'Business model not recorded' };

  if (model === target) {
    return { ratio: 1, status: 'match', detail: `${company.businessModel} model matches target` };
  }
  if (model.includes(target) || target.includes(model)) {
    return { ratio: 0.7, status: 'partial', detail: `${company.businessModel} is adjacent to target model` };
  }
  return { ratio: 0, status: 'miss', detail: `${company.businessModel} does not match target model` };
}

/**
 * Digitization Upside — the component that makes this tool Caprae-specific.
 *
 * Read the direction carefully: a WEAK digital footprint scores HIGH. The
 * premise is Caprae's own, that returns come from operational transformation
 * after the acquisition rather than from financial engineering at it. A
 * profitable business still running on a non-mobile site with no analytics and
 * no self-serve channel is not a worse target — it is a target where a known,
 * repeatable playbook has somewhere to be applied.
 *
 * The signals are stated as explicit weighted gaps rather than fed to a model,
 * because the user has to be able to disagree with any one of them.
 */
export function scoreDigitizationUpside(company) {
  const signals = company.digitalSignals || {};
  const stack = Array.isArray(company.technologyStack) ? company.technologyStack : [];

  const gaps = [];
  const strengths = [];
  const unknown = [];

  const record = (key, isGap, strengthLabel) => {
    const signal = DIGITIZATION_GAP_SIGNALS[key];
    if (isGap === null || isGap === undefined) {
      unknown.push(signal.label);
      return;
    }
    if (isGap) gaps.push({ key, label: signal.label, weight: signal.weight });
    else strengths.push(strengthLabel);
  };

  record('noHttps', signals.hasHttps === null || signals.hasHttps === undefined ? null : !signals.hasHttps, 'HTTPS enabled');
  record('notMobileOptimized', signals.mobileOptimized === null || signals.mobileOptimized === undefined ? null : !signals.mobileOptimized, 'Mobile-optimised site');
  record('noAnalytics', signals.hasAnalytics === null || signals.hasAnalytics === undefined ? null : !signals.hasAnalytics, 'Web analytics in place');
  record('noSelfServe', signals.hasEcommerceOrBooking === null || signals.hasEcommerceOrBooking === undefined ? null : !signals.hasEcommerceOrBooking, 'Online purchase or booking available');
  record('noCrm', signals.hasCrm === null || signals.hasCrm === undefined ? null : !signals.hasCrm, 'CRM or marketing automation in use');

  const lastUpdate = signals.lastContentUpdateYear;
  record(
    'staleContent',
    Number.isFinite(lastUpdate) ? CURRENT_YEAR - lastUpdate >= 4 : null,
    'Site content kept current'
  );

  const cms = comparisonKey(signals.cmsDetected);
  const hasStackInfo = stack.length > 0 || Boolean(signals.cmsDetected);
  record(
    'legacyStack',
    hasStackInfo ? LEGACY_CMS.has(cms) : null,
    `Modern stack (${signals.cmsDetected || stack.slice(0, 2).join(', ')})`
  );

  const gapIndex = gaps.reduce((sum, gap) => sum + gap.weight, 0);

  let status;
  if (gaps.length === 0 && unknown.length >= 5) status = 'missing';
  else if (gapIndex >= 50) status = 'match';
  else if (gapIndex >= 25) status = 'partial';
  else status = 'miss';

  const detail =
    status === 'missing'
      ? 'Digital footprint signals unavailable for this record'
      : gaps.length === 0
        ? 'Already well digitised — limited transformation upside'
        : `${gaps.length} digitization ${gaps.length === 1 ? 'gap' : 'gaps'} identified (gap index ${gapIndex}/100)`;

  return {
    ratio: clamp01(gapIndex / 100),
    status,
    detail,
    meta: { gapIndex, gaps, strengths, unknown },
  };
}

/**
 * Succession Signal — likelihood that the business is approaching an ownership
 * transition, which is the core sourcing thesis in entrepreneurship-through-
 * acquisition. Reduced when the company is already institutionally owned or
 * franchised, since neither produces the clean owner-exit deal this targets.
 */
export function scoreSuccessionSignal(company) {
  const ownership = company.ownership || {};
  const age = Number.isFinite(company.foundedYear) ? CURRENT_YEAR - company.foundedYear : null;

  let points = 0;
  const notes = [];

  if (age === null) {
    notes.push('Founded year unknown');
  } else if (age >= 25) {
    points += 5;
    notes.push(`${age} years in business`);
  } else if (age >= 15) {
    points += 3.5;
    notes.push(`${age} years in business`);
  } else if (age >= 10) {
    points += 2;
    notes.push(`${age} years in business`);
  } else {
    notes.push(`Only ${age} years in business`);
  }

  const tenure = ownership.ownerTenureYears;
  if (Number.isFinite(tenure)) {
    if (tenure >= 15) {
      points += 3;
      notes.push(`Owner tenure ${tenure} years`);
    } else if (tenure >= 10) {
      points += 2;
      notes.push(`Owner tenure ${tenure} years`);
    }
  }

  if (ownership.founderLed === true) {
    points += 2;
    notes.push('Founder-led');
  }

  let ratio = clamp01(points / 10);

  if (ownership.privateEquityBacked === true) {
    ratio *= 0.3;
    notes.push('Already private-equity backed');
  }
  if (ownership.isFranchise === true) {
    ratio *= 0.5;
    notes.push('Franchise structure');
  }

  let status = 'miss';
  if (ratio >= 0.7) status = 'match';
  else if (ratio >= 0.35) status = 'partial';
  if (age === null && !Number.isFinite(tenure) && ownership.founderLed === null) status = 'missing';

  return { ratio, status, detail: notes.join(' · ') || 'No succession indicators available' };
}

export function scoreDataConfidence(company, dataQuality) {
  const score = dataQuality?.score ?? computeDataQuality(company).score;
  const ratio = clamp01(score / 100);
  let status = 'miss';
  if (score >= 85) status = 'match';
  else if (score >= 60) status = 'partial';
  return { ratio, status, detail: `Record is ${score}% complete and validated` };
}

/* ------------------------------------------------------------------ */
/* Orchestration                                                       */
/* ------------------------------------------------------------------ */

const SCORERS = {
  industryFit: (c, b) => scoreIndustryFit(c, b),
  revenueFit: (c, b) => scoreRevenueFit(c, b),
  sizeFit: (c, b) => scoreSizeFit(c, b),
  digitizationUpside: (c) => scoreDigitizationUpside(c),
  geographyFit: (c, b) => scoreGeographyFit(c, b),
  businessModelFit: (c, b) => scoreBusinessModelFit(c, b),
  successionSignal: (c) => scoreSuccessionSignal(c),
  dataConfidence: (c, b, dq) => scoreDataConfidence(c, dq),
};

export function priorityForScore(score) {
  if (score >= PRIORITY_THRESHOLDS.HIGH) return 'HIGH';
  if (score >= PRIORITY_THRESHOLDS.MEDIUM) return 'MEDIUM';
  return 'LOW';
}

/**
 * Score one company against one Buy Box.
 *
 * @param {object} company  Plain company object (a lean Mongoose doc is fine).
 * @param {object} buyBox   Plain buy box object. Unset criteria mean "no constraint".
 * @param {object} [options.weights] Override weights; defaults to the Buy Box's own, then the global default.
 */
export function scoreCompany(company, buyBox = {}, options = {}) {
  const weights = resolveWeights(buyBox, options.weights);
  const dataQuality = options.dataQuality || computeDataQuality(company);

  const components = [];
  let total = 0;

  for (const [key, maxPoints] of Object.entries(weights)) {
    const scorer = SCORERS[key];
    if (!scorer || maxPoints <= 0) continue;

    const result = scorer(company, buyBox, dataQuality);
    // Round per component so the bars shown in the UI add up to the headline
    // number exactly. Nothing erodes trust in a score faster than arithmetic
    // the user can see is wrong.
    const earned = Math.round(result.ratio * maxPoints);
    total += earned;

    components.push({
      key,
      label: COMPONENT_LABELS[key] || key,
      description: COMPONENT_DESCRIPTIONS[key] || '',
      earned,
      max: maxPoints,
      percent: maxPoints > 0 ? Math.round((earned / maxPoints) * 100) : 0,
      status: result.status,
      detail: result.detail,
      ...(result.meta ? { meta: result.meta } : {}),
    });
  }

  const totalScore = Math.min(100, Math.max(0, total));

  return {
    totalScore,
    priority: priorityForScore(totalScore),
    components,
    reasons: buildReasons(components),
    concerns: buildConcerns(company, components, dataQuality),
    dataQuality: { score: dataQuality.score, failedChecks: dataQuality.failed.length },
  };
}

/** Buy Box weights win over the global default; an explicit override wins over both. */
function resolveWeights(buyBox, override) {
  if (override && Object.keys(override).length) return override;

  const raw = buyBox?.weights;
  if (!raw) return { ...SCORE_WEIGHTS };

  // Mongoose stores this as a Map; a plain object arrives from `.lean()` or tests.
  const asObject = raw instanceof Map ? Object.fromEntries(raw) : raw;
  const entries = Object.entries(asObject).filter(([, v]) => Number.isFinite(Number(v)));
  if (entries.length === 0) return { ...SCORE_WEIGHTS };

  return Object.fromEntries(entries.map(([k, v]) => [k, Number(v)]));
}

/** Positive, human-readable findings — the "✓ Why this lead" list. */
function buildReasons(components) {
  return components
    .filter((c) => c.status === 'match' || (c.status === 'partial' && c.percent >= 70))
    .sort((a, b) => b.earned - a.earned)
    .map((c) => ({ label: c.label, detail: c.detail, points: `${c.earned}/${c.max}` }));
}

/**
 * Honest caveats — the "⚠ Potential concerns" list.
 *
 * This list is as important as the score. It is what stops the product
 * presenting a modelled revenue figure as a verified one.
 */
function buildConcerns(company, components, dataQuality) {
  const concerns = [];

  for (const component of components) {
    if (component.status === 'missing') {
      concerns.push({
        label: `${component.label} could not be assessed`,
        detail: component.detail,
        severity: 'medium',
      });
    } else if (component.status === 'miss' && component.key !== 'digitizationUpside') {
      concerns.push({
        label: `${component.label} is outside the Buy Box`,
        detail: component.detail,
        severity: 'high',
      });
    }
  }

  if (company.revenueIsEstimated !== false && Number.isFinite(company.revenueEstimate)) {
    concerns.push({
      label: 'Revenue is modelled, not verified',
      detail: 'Figure is an estimate from the dataset, not a filing or a confirmed statement.',
      severity: 'medium',
    });
  }

  if (!company.contactAvailability) {
    concerns.push({
      label: 'No verified contact route',
      detail: 'Outreach would require manual sourcing before this lead is actionable.',
      severity: 'medium',
    });
  }

  if (company.duplicateStatus === 'probable_duplicate') {
    concerns.push({
      label: 'Probable duplicate record',
      detail: company.duplicateMatchReason || 'Matches another company already in the dataset.',
      severity: 'high',
    });
  }

  if (company.websiteStatus === 'unreachable') {
    concerns.push({
      label: 'Website unreachable',
      detail: 'Digital signals could not be confirmed, so digitization upside is low-confidence.',
      severity: 'high',
    });
  }

  const digitization = components.find((c) => c.key === 'digitizationUpside');
  if (digitization?.meta?.unknown?.length >= 3) {
    concerns.push({
      label: 'Incomplete digital footprint data',
      detail: `${digitization.meta.unknown.length} digitization signals unavailable for this record.`,
      severity: 'low',
    });
  }

  if (dataQuality.score < 60) {
    concerns.push({
      label: 'Low data quality',
      detail: `Record scores ${dataQuality.score}/100 on data health; verify before acting on it.`,
      severity: 'high',
    });
  }

  return concerns;
}

/** Compact currency formatting used inside score explanations. */
export function formatMoney(value) {
  if (!Number.isFinite(value)) return 'Unknown';
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${value}`;
}
