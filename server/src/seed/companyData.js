/**
 * Demo dataset generator.
 *
 * Every company in this file is fictional. No real business is named, and no
 * financial claim is made about any real company — the brief is explicit that
 * modelled data must not be presented as verified, and inventing revenue
 * figures for real firms would be exactly that.
 *
 * The dataset is generated from a FIXED SEED rather than hand-written, for two
 * reasons: 150 hand-authored records is noise in a repository, and a fixed seed
 * means every evaluator, every CI run and every demo sees a byte-identical
 * database. Reproducibility is the point.
 *
 * The distribution is designed, not random. It deliberately contains:
 *   - clear high-fit, medium-fit and low-fit targets for the default Buy Box
 *   - records with missing fields, so data-quality scoring has something to say
 *   - two duplicate pairs, one matched on domain and one on name
 *   - modern-stack companies and dated-stack companies, so Digitization Upside
 *     visibly separates them
 */

import { normalizeDomain, normalizeCompanyName } from '../utils/normalize.js';
import { computeCompleteness } from '../services/dataQualityService.js';

const CURRENT_YEAR = new Date().getFullYear();

/** Deterministic PRNG (mulberry32) — same seed, same dataset, every time. */
function createRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rng, list) => list[Math.floor(rng() * list.length)];
const between = (rng, min, max) => Math.floor(rng() * (max - min + 1)) + min;
const chance = (rng, probability) => rng() < probability;

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/* ------------------------------------------------------------------ */

const PLACE_WORDS = [
  'Northgate', 'Blue Ridge', 'Cedar Creek', 'Summit', 'Harborview', 'Lakeshore',
  'Ironwood', 'Silverlake', 'Granite', 'Redstone', 'Westbrook', 'Fairmont',
  'Pinehurst', 'Clearwater', 'Brookfield', 'Stonebridge', 'Highland', 'Riverton',
  'Oakmont', 'Ashford', 'Maplewood', 'Fox Hollow', 'Windmere', 'Carrington',
];

const ABSTRACT_WORDS = [
  'Veritas', 'Apex', 'Meridian', 'Vantage', 'Lumen', 'Axiom', 'Cobalt', 'Quanta',
  'Helix', 'Nimbus', 'Vertex', 'Zenith', 'Kestrel', 'Beacon', 'Pioneer', 'Keystone',
  'Anchor', 'Catalyst', 'Sterling', 'Orison', 'Calder', 'Thornton', 'Larkspur', 'Mercer',
];

const SUFFIXES = ['Group', 'Partners', 'Solutions', 'Systems', 'Services', 'Co', 'Holdings', 'Associates', 'Industries', ''];

const STATES = [
  { state: 'Texas', cities: ['Austin', 'Dallas', 'Houston', 'San Antonio'] },
  { state: 'California', cities: ['San Diego', 'Sacramento', 'Fresno', 'Pasadena'] },
  { state: 'Florida', cities: ['Tampa', 'Orlando', 'Jacksonville', 'Sarasota'] },
  { state: 'Ohio', cities: ['Columbus', 'Cleveland', 'Cincinnati', 'Dayton'] },
  { state: 'Georgia', cities: ['Atlanta', 'Savannah', 'Augusta', 'Macon'] },
  { state: 'Illinois', cities: ['Chicago', 'Naperville', 'Peoria', 'Rockford'] },
  { state: 'North Carolina', cities: ['Charlotte', 'Raleigh', 'Durham', 'Greensboro'] },
  { state: 'Pennsylvania', cities: ['Pittsburgh', 'Philadelphia', 'Allentown', 'Erie'] },
  { state: 'Arizona', cities: ['Phoenix', 'Tucson', 'Mesa', 'Scottsdale'] },
  { state: 'Colorado', cities: ['Denver', 'Boulder', 'Colorado Springs', 'Fort Collins'] },
  { state: 'Michigan', cities: ['Detroit', 'Grand Rapids', 'Ann Arbor', 'Lansing'] },
  { state: 'Tennessee', cities: ['Nashville', 'Knoxville', 'Memphis', 'Chattanooga'] },
];

const NON_US = [
  { country: 'Canada', state: 'Ontario', cities: ['Toronto', 'Ottawa', 'Hamilton'] },
  { country: 'United Kingdom', state: 'England', cities: ['Manchester', 'Leeds', 'Bristol'] },
];

/**
 * Industry profiles.
 *
 * `digitalMaturity` drives the digital-signal generation, which is what makes
 * Digitization Upside separate a modern SaaS business from a 30-year-old HVAC
 * contractor instead of scoring noise.
 */
const INDUSTRIES = [
  {
    industry: 'B2B SaaS',
    subIndustries: ['Vertical SaaS', 'DevOps Tooling', 'FinTech SaaS', 'HR Tech', 'MarTech'],
    nouns: ['Software', 'Platform', 'Technologies', 'Labs', 'Analytics', 'Cloud'],
    models: ['B2B', 'B2B2C'],
    digitalMaturity: 'high',
    employees: [15, 320],
    revenuePerHead: [90_000, 220_000],
    founded: [2008, 2021],
    weight: 22,
  },
  {
    industry: 'Healthcare Services',
    subIndustries: ['Dental Practice Group', 'Home Health', 'Medical Billing', 'Physical Therapy'],
    nouns: ['Health', 'Care', 'Medical', 'Clinical', 'Wellness'],
    models: ['B2C', 'B2B'],
    digitalMaturity: 'low',
    employees: [25, 400],
    revenuePerHead: [95_000, 180_000],
    founded: [1984, 2014],
    weight: 12,
  },
  {
    industry: 'Industrial Services',
    subIndustries: ['HVAC', 'Commercial Plumbing', 'Electrical Contracting', 'Facilities Maintenance'],
    nouns: ['Mechanical', 'Services', 'Contracting', 'Industrial', 'Maintenance'],
    models: ['B2B'],
    digitalMaturity: 'very_low',
    employees: [18, 260],
    revenuePerHead: [120_000, 240_000],
    founded: [1972, 2010],
    weight: 16,
  },
  {
    industry: 'Logistics & Distribution',
    subIndustries: ['Last-Mile Delivery', 'Freight Brokerage', 'Warehousing', 'Cold Chain'],
    nouns: ['Logistics', 'Freight', 'Distribution', 'Transport', 'Supply'],
    models: ['B2B'],
    digitalMaturity: 'low',
    employees: [30, 500],
    revenuePerHead: [150_000, 320_000],
    founded: [1979, 2015],
    weight: 12,
  },
  {
    industry: 'Professional Services',
    subIndustries: ['Accounting', 'IT Managed Services', 'Staffing', 'Engineering Consulting'],
    nouns: ['Advisory', 'Consulting', 'Associates', 'Group', 'Partners'],
    models: ['B2B'],
    digitalMaturity: 'medium',
    employees: [12, 220],
    revenuePerHead: [130_000, 260_000],
    founded: [1988, 2017],
    weight: 14,
  },
  {
    industry: 'Manufacturing',
    subIndustries: ['Precision Machining', 'Packaging', 'Specialty Components', 'Metal Fabrication'],
    nouns: ['Manufacturing', 'Fabrication', 'Precision', 'Components', 'Works'],
    models: ['B2B'],
    digitalMaturity: 'very_low',
    employees: [35, 600],
    revenuePerHead: [140_000, 300_000],
    founded: [1965, 2008],
    weight: 12,
  },
  {
    industry: 'Consumer Services',
    subIndustries: ['Pest Control', 'Landscaping', 'Auto Repair', 'Home Cleaning'],
    nouns: ['Services', 'Care', 'Home', 'Pro', 'Crew'],
    models: ['B2C', 'D2C'],
    digitalMaturity: 'very_low',
    employees: [10, 180],
    revenuePerHead: [70_000, 140_000],
    founded: [1981, 2016],
    weight: 10,
  },
  {
    industry: 'Insurance Services',
    subIndustries: ['Commercial Brokerage', 'Benefits Administration', 'Claims Processing'],
    nouns: ['Insurance', 'Risk', 'Benefits', 'Assurance'],
    models: ['B2B', 'B2C'],
    digitalMaturity: 'low',
    employees: [20, 300],
    revenuePerHead: [160_000, 280_000],
    founded: [1976, 2012],
    weight: 12,
  },
];

const TECH_BY_MATURITY = {
  high: ['React', 'Node.js', 'AWS', 'Segment', 'HubSpot', 'Stripe', 'Snowflake', 'Datadog'],
  medium: ['WordPress', 'Google Analytics', 'Mailchimp', 'Zoho CRM', 'Cloudflare'],
  low: ['WordPress', 'Google Analytics', 'Contact Form 7'],
  very_low: ['Static HTML', 'jQuery'],
};

const CMS_BY_MATURITY = {
  high: ['Next.js', 'Webflow', 'Contentful'],
  medium: ['WordPress', 'Drupal'],
  low: ['WordPress', 'Squarespace'],
  very_low: ['', 'Static HTML', 'Joomla 1'],
};

const GROWTH_SIGNALS = [
  'Hiring across 3+ roles', 'New location opened in last 12 months', 'Recently expanded service lines',
  'Mentioned in regional trade press', 'Equipment investment announced', 'Added a second shift',
];

/* ------------------------------------------------------------------ */
/* Generation                                                          */
/* ------------------------------------------------------------------ */

function buildName(rng, profile) {
  const style = rng();
  const noun = pick(rng, profile.nouns);
  const suffix = pick(rng, SUFFIXES);

  let base;
  if (style < 0.45) base = `${pick(rng, PLACE_WORDS)} ${noun}`;
  else if (style < 0.85) base = `${pick(rng, ABSTRACT_WORDS)} ${noun}`;
  else base = `${pick(rng, ABSTRACT_WORDS)}${pick(rng, ['ly', 'ix', 'io', 'era'])}`;

  return suffix ? `${base} ${suffix}` : base;
}

function buildDomain(rng, name) {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((word) => !['group', 'partners', 'co', 'holdings', 'associates'].includes(word))
    .slice(0, 2)
    .join('');
  const tld = pick(rng, ['.com', '.com', '.com', '.co', '.io', '.net']);
  return `${slug}${tld}`;
}

/**
 * Digital signals correlated with industry maturity.
 *
 * This correlation is the whole point of the dataset: a reviewer should be able
 * to set a Buy Box, sort by fit, and see that the tool surfaces exactly the kind
 * of unmodernised, owner-operated business an ETA searcher is looking for.
 */
function buildDigitalSignals(rng, maturity) {
  const profiles = {
    high:     { https: 0.99, mobile: 0.97, analytics: 0.95, selfServe: 0.90, crm: 0.88, freshness: [0, 1] },
    medium:   { https: 0.92, mobile: 0.80, analytics: 0.75, selfServe: 0.45, crm: 0.50, freshness: [0, 3] },
    low:      { https: 0.80, mobile: 0.55, analytics: 0.45, selfServe: 0.25, crm: 0.25, freshness: [1, 6] },
    very_low: { https: 0.55, mobile: 0.25, analytics: 0.20, selfServe: 0.08, crm: 0.10, freshness: [2, 11] },
  };
  const p = profiles[maturity];

  return {
    hasHttps: chance(rng, p.https),
    mobileOptimized: chance(rng, p.mobile),
    hasAnalytics: chance(rng, p.analytics),
    hasEcommerceOrBooking: chance(rng, p.selfServe),
    hasCrm: chance(rng, p.crm),
    lastContentUpdateYear: CURRENT_YEAR - between(rng, p.freshness[0], p.freshness[1]),
    cmsDetected: pick(rng, CMS_BY_MATURITY[maturity]),
  };
}

function buildCompany(rng, profile) {
  const companyName = buildName(rng, profile);
  const domain = buildDomain(rng, companyName);

  const useNonUs = chance(rng, 0.08);
  const location = useNonUs
    ? (() => {
        const region = pick(rng, NON_US);
        return { city: pick(rng, region.cities), state: region.state, country: region.country };
      })()
    : (() => {
        const region = pick(rng, STATES);
        return { city: pick(rng, region.cities), state: region.state, country: 'United States' };
      })();

  const employeeCount = between(rng, profile.employees[0], profile.employees[1]);
  const perHead = between(rng, profile.revenuePerHead[0], profile.revenuePerHead[1]);
  // Round to a readable figure — nothing signals fake data like $5,283,117.
  const revenueEstimate = Math.round((employeeCount * perHead) / 100_000) * 100_000;

  const foundedYear = between(rng, profile.founded[0], profile.founded[1]);
  const age = CURRENT_YEAR - foundedYear;

  const digitalSignals = buildDigitalSignals(rng, profile.digitalMaturity);

  // Older, less digitised businesses are likelier to be founder-led with a long
  // owner tenure; recently founded SaaS is likelier to have taken institutional money.
  const founderLed = chance(rng, age > 20 ? 0.72 : 0.45);
  const privateEquityBacked = chance(rng, profile.digitalMaturity === 'high' ? 0.28 : 0.10);

  const websiteRoll = rng();
  const websiteStatus = websiteRoll < 0.78 ? 'verified' : websiteRoll < 0.94 ? 'unverified' : 'unreachable';

  return {
    companyName,
    domain,
    industry: profile.industry,
    subIndustry: pick(rng, profile.subIndustries),
    location,
    employeeCount,
    revenueEstimate,
    revenueIsEstimated: true,
    businessModel: pick(rng, profile.models),
    foundedYear,
    websiteStatus,
    technologyStack: TECH_BY_MATURITY[profile.digitalMaturity].slice(0, between(rng, 1, 4)),
    growthSignals: chance(rng, 0.4) ? [pick(rng, GROWTH_SIGNALS)] : [],
    digitalSignals,
    ownership: {
      founderLed,
      ownerTenureYears: founderLed ? Math.min(age, between(rng, 6, 32)) : between(rng, 2, 12),
      privateEquityBacked,
      isFranchise: chance(rng, 0.06),
      locationCount: chance(rng, 0.7) ? 1 : between(rng, 2, 9),
    },
    contactAvailability: chance(rng, 0.7),
    contactEmail: chance(rng, 0.55) ? `info@${domain}` : '',
    source: 'Demo Dataset',
    isDemoData: true,
  };
}

/** Weighted industry selection so the mix reflects a realistic ETA pipeline. */
function weightedIndustry(rng) {
  const total = INDUSTRIES.reduce((sum, profile) => sum + profile.weight, 0);
  let roll = rng() * total;
  for (const profile of INDUSTRIES) {
    roll -= profile.weight;
    if (roll <= 0) return profile;
  }
  return INDUSTRIES[0];
}

/**
 * Records that exist to prove specific behaviour in the demo. Hand-authored so
 * the duplicate pair, the incomplete record and the already-PE-owned company
 * are guaranteed to be present rather than left to chance.
 */
function edgeCaseCompanies() {
  const base = {
    source: 'Demo Dataset',
    isDemoData: true,
    revenueIsEstimated: true,
  };

  return [
    // --- Duplicate pair 1: same company, different domain formatting ---
    {
      ...base,
      companyName: 'Harborview Dental Partners',
      domain: 'harborviewdental.com',
      industry: 'Healthcare Services',
      subIndustry: 'Dental Practice Group',
      location: { city: 'Tampa', state: 'Florida', country: 'United States' },
      employeeCount: 68, revenueEstimate: 9_400_000, businessModel: 'B2C', foundedYear: 1996,
      websiteStatus: 'verified',
      technologyStack: ['WordPress', 'Google Analytics'],
      growthSignals: ['New location opened in last 12 months'],
      digitalSignals: { hasHttps: true, mobileOptimized: false, hasAnalytics: true, hasEcommerceOrBooking: false, hasCrm: false, lastContentUpdateYear: CURRENT_YEAR - 5, cmsDetected: 'WordPress' },
      ownership: { founderLed: true, ownerTenureYears: 28, privateEquityBacked: false, isFranchise: false, locationCount: 4 },
      contactAvailability: true, contactEmail: 'info@harborviewdental.com',
    },
    {
      ...base,
      companyName: 'Harborview Dental Partners, Inc.',
      domain: 'https://www.harborviewdental.com/',
      industry: 'Healthcare Services',
      subIndustry: 'Dental Practice Group',
      location: { city: 'Tampa', state: 'Florida', country: 'United States' },
      employeeCount: 70, revenueEstimate: 9_600_000, businessModel: 'B2C', foundedYear: 1996,
      websiteStatus: 'verified',
      technologyStack: ['WordPress'],
      growthSignals: [],
      digitalSignals: { hasHttps: true, mobileOptimized: false, hasAnalytics: null, hasEcommerceOrBooking: false, hasCrm: null, lastContentUpdateYear: CURRENT_YEAR - 5, cmsDetected: 'WordPress' },
      ownership: { founderLed: true, ownerTenureYears: 28, privateEquityBacked: false, isFranchise: false, locationCount: 4 },
      contactAvailability: false, contactEmail: '',
    },

    // --- Duplicate pair 2: matched on normalised NAME, different domains ---
    {
      ...base,
      companyName: 'Ironwood Mechanical Services',
      domain: 'ironwoodmech.com',
      industry: 'Industrial Services', subIndustry: 'HVAC',
      location: { city: 'Columbus', state: 'Ohio', country: 'United States' },
      employeeCount: 94, revenueEstimate: 16_800_000, businessModel: 'B2B', foundedYear: 1988,
      websiteStatus: 'verified',
      technologyStack: ['Static HTML'],
      growthSignals: ['Hiring across 3+ roles'],
      digitalSignals: { hasHttps: false, mobileOptimized: false, hasAnalytics: false, hasEcommerceOrBooking: false, hasCrm: false, lastContentUpdateYear: CURRENT_YEAR - 7, cmsDetected: '' },
      ownership: { founderLed: true, ownerTenureYears: 31, privateEquityBacked: false, isFranchise: false, locationCount: 2 },
      contactAvailability: true, contactEmail: 'office@ironwoodmech.com',
    },
    {
      ...base,
      companyName: 'Ironwood Mechanical Services LLC',
      domain: 'ironwood-mechanical.net',
      industry: 'Industrial Services', subIndustry: 'HVAC',
      location: { city: 'Columbus', state: 'Ohio', country: 'United States' },
      employeeCount: 94, revenueEstimate: 16_500_000, businessModel: 'B2B', foundedYear: 1988,
      websiteStatus: 'unverified',
      technologyStack: [],
      growthSignals: [],
      digitalSignals: { hasHttps: false, mobileOptimized: false, hasAnalytics: false, hasEcommerceOrBooking: false, hasCrm: false, lastContentUpdateYear: CURRENT_YEAR - 7, cmsDetected: '' },
      ownership: { founderLed: true, ownerTenureYears: 31, privateEquityBacked: false, isFranchise: false, locationCount: 2 },
      contactAvailability: false, contactEmail: '',
    },

    // --- The archetypal high-upside target: profitable, invisible online ---
    {
      ...base,
      companyName: 'Cedar Creek Precision Works',
      domain: 'cedarcreekprecision.com',
      industry: 'Manufacturing', subIndustry: 'Precision Machining',
      location: { city: 'Grand Rapids', state: 'Michigan', country: 'United States' },
      employeeCount: 112, revenueEstimate: 18_200_000, businessModel: 'B2B', foundedYear: 1974,
      websiteStatus: 'verified',
      technologyStack: ['Static HTML'],
      growthSignals: ['Equipment investment announced', 'Added a second shift'],
      digitalSignals: { hasHttps: false, mobileOptimized: false, hasAnalytics: false, hasEcommerceOrBooking: false, hasCrm: false, lastContentUpdateYear: CURRENT_YEAR - 9, cmsDetected: 'Static HTML' },
      ownership: { founderLed: true, ownerTenureYears: 34, privateEquityBacked: false, isFranchise: false, locationCount: 1 },
      contactAvailability: true, contactEmail: 'sales@cedarcreekprecision.com',
    },

    // --- Already institutionally owned: fits on paper, fails on succession ---
    {
      ...base,
      companyName: 'Vantage Cloud Technologies',
      domain: 'vantagecloud.io',
      industry: 'B2B SaaS', subIndustry: 'DevOps Tooling',
      location: { city: 'Austin', state: 'Texas', country: 'United States' },
      employeeCount: 140, revenueEstimate: 19_000_000, businessModel: 'B2B', foundedYear: 2017,
      websiteStatus: 'verified',
      technologyStack: ['React', 'AWS', 'Segment', 'HubSpot'],
      growthSignals: ['Hiring across 3+ roles'],
      digitalSignals: { hasHttps: true, mobileOptimized: true, hasAnalytics: true, hasEcommerceOrBooking: true, hasCrm: true, lastContentUpdateYear: CURRENT_YEAR, cmsDetected: 'Next.js' },
      ownership: { founderLed: false, ownerTenureYears: 4, privateEquityBacked: true, isFranchise: false, locationCount: 1 },
      contactAvailability: true, contactEmail: 'hello@vantagecloud.io',
    },

    // --- Badly incomplete record: exercises the data-quality path ---
    {
      ...base,
      companyName: 'Redstone Facility Group',
      domain: 'redstonefacility.com',
      industry: 'Industrial Services', subIndustry: 'Facilities Maintenance',
      location: { city: '', state: '', country: 'United States' },
      employeeCount: null, revenueEstimate: null, businessModel: '', foundedYear: null,
      websiteStatus: 'unreachable',
      technologyStack: [], growthSignals: [],
      digitalSignals: { hasHttps: null, mobileOptimized: null, hasAnalytics: null, hasEcommerceOrBooking: null, hasCrm: null, lastContentUpdateYear: null, cmsDetected: '' },
      ownership: { founderLed: null, ownerTenureYears: null, privateEquityBacked: null, isFranchise: null, locationCount: null },
      contactAvailability: false, contactEmail: '',
    },

    // --- Shared website-builder host: must NOT be deduplicated by domain ---
    {
      ...base,
      companyName: 'Larkspur Home Crew',
      domain: 'larkspurhome.wixsite.com',
      industry: 'Consumer Services', subIndustry: 'Home Cleaning',
      location: { city: 'Boise', state: 'Idaho', country: 'United States' },
      employeeCount: 22, revenueEstimate: 1_800_000, businessModel: 'B2C', foundedYear: 2011,
      websiteStatus: 'verified',
      technologyStack: ['Wix'],
      growthSignals: [],
      digitalSignals: { hasHttps: true, mobileOptimized: true, hasAnalytics: false, hasEcommerceOrBooking: false, hasCrm: false, lastContentUpdateYear: CURRENT_YEAR - 3, cmsDetected: 'Wix' },
      ownership: { founderLed: true, ownerTenureYears: 15, privateEquityBacked: false, isFranchise: false, locationCount: 1 },
      contactAvailability: true, contactEmail: 'bookings@larkspurhome.wixsite.com',
    },
    {
      ...base,
      companyName: 'Thornton Pest Pro',
      domain: 'thorntonpest.wixsite.com',
      industry: 'Consumer Services', subIndustry: 'Pest Control',
      location: { city: 'Mesa', state: 'Arizona', country: 'United States' },
      employeeCount: 31, revenueEstimate: 2_600_000, businessModel: 'B2C', foundedYear: 2007,
      websiteStatus: 'verified',
      technologyStack: ['Wix'],
      growthSignals: [],
      digitalSignals: { hasHttps: true, mobileOptimized: true, hasAnalytics: false, hasEcommerceOrBooking: false, hasCrm: false, lastContentUpdateYear: CURRENT_YEAR - 2, cmsDetected: 'Wix' },
      ownership: { founderLed: true, ownerTenureYears: 19, privateEquityBacked: false, isFranchise: true, locationCount: 3 },
      contactAvailability: true, contactEmail: '',
    },
  ];
}

/**
 * Build the full dataset.
 * @param {number} count Number of generated companies (edge cases are added on top).
 * @param {number} seed  PRNG seed. Changing it changes the dataset.
 */
export function buildDemoCompanies({ count = 142, seed = 20261008 } = {}) {
  const rng = createRandom(seed);
  const generated = [];
  const usedDomains = new Set();

  let guard = 0;
  while (generated.length < count && guard < count * 20) {
    guard += 1;
    const profile = weightedIndustry(rng);
    const company = buildCompany(rng, profile);

    // Generated names must not collide — the duplicate records in this dataset
    // are the hand-authored ones, so the dedupe demo stays predictable.
    const key = normalizeDomain(company.domain);
    if (!key || usedDomains.has(key)) continue;
    usedDomains.add(key);

    // Inject sparse records so data-quality scoring is exercised across the set.
    const defect = rng();
    if (defect < 0.05) company.revenueEstimate = null;
    else if (defect < 0.09) company.employeeCount = null;
    else if (defect < 0.13) company.location = { ...company.location, state: '' };
    else if (defect < 0.16) company.foundedYear = null;

    generated.push(company);
  }

  const all = [...generated, ...edgeCaseCompanies()];

  // Attach the stored normalisation keys and completeness score. These are
  // persisted rather than computed on read because both back indexed queries.
  return all.map((company) => ({
    ...company,
    normalizedDomain: normalizeDomain(company.domain),
    normalizedCompanyName: normalizeCompanyName(company.companyName),
    dataCompleteness: computeCompleteness(company),
  }));
}
