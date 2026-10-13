/**
 * Acquisition Fit Score configuration.
 *
 * Every weight lives here rather than being scattered through the scoring
 * service, so the model can be re-tuned without touching logic — and so an
 * interviewer can see the whole model on one screen.
 *
 * Weights sum to 100. The API validates this on load.
 */

export const SCORE_WEIGHTS = {
  industryFit: 20,
  revenueFit: 15,
  sizeFit: 15,
  digitizationUpside: 15,
  geographyFit: 10,
  businessModelFit: 10,
  successionSignal: 10,
  dataConfidence: 5,
};

export const COMPONENT_LABELS = {
  industryFit: 'Industry Fit',
  revenueFit: 'Revenue Fit',
  sizeFit: 'Size Fit',
  digitizationUpside: 'Digitization Upside',
  geographyFit: 'Geography Fit',
  businessModelFit: 'Business Model Fit',
  successionSignal: 'Succession Signal',
  dataConfidence: 'Data Confidence',
};

/**
 * Short explanations surfaced in the UI next to each component. These exist so
 * the score never has to be taken on trust — particularly Digitization Upside,
 * which is deliberately inverted relative to intuition.
 */
export const COMPONENT_DESCRIPTIONS = {
  industryFit: 'How closely the company sector matches the Buy Box industry.',
  revenueFit: 'Whether estimated revenue falls inside the target range.',
  sizeFit: 'Whether headcount falls inside the target range.',
  digitizationUpside:
    'How much operational upside digitization would unlock. A dated digital footprint scores HIGHER — it signals value a post-acquisition operator can create.',
  geographyFit: 'Country and state alignment with the Buy Box.',
  businessModelFit: 'Alignment of revenue model (B2B, B2C, marketplace, services).',
  successionSignal:
    'Likelihood of an ownership transition — business age, owner tenure and founder-led status.',
  dataConfidence: 'How complete and verified the underlying record is.',
};

/** Priority bands applied to the final 0-100 score. */
export const PRIORITY_THRESHOLDS = {
  HIGH: 75,
  MEDIUM: 55,
};

/**
 * Digitization gap signals and their contribution to a 0-100 gap index, which
 * is then scaled into the digitizationUpside component.
 *
 * The weights are judgement calls, not measurements — they are stated plainly
 * here so they can be argued with rather than hidden behind an "AI score".
 */
export const DIGITIZATION_GAP_SIGNALS = {
  noHttps: { weight: 15, label: 'No HTTPS on the primary domain' },
  notMobileOptimized: { weight: 15, label: 'Site is not mobile-optimised' },
  noAnalytics: { weight: 10, label: 'No web analytics tag detected' },
  staleContent: { weight: 20, label: 'Site content not refreshed in 4+ years' },
  legacyStack: { weight: 15, label: 'Legacy or undetectable CMS / tech stack' },
  noSelfServe: { weight: 15, label: 'No e-commerce or online booking path' },
  noCrm: { weight: 10, label: 'No CRM or marketing automation in the stack' },
};

export const DEFAULT_BUY_BOX = {
  name: 'Default Buy Box',
  industry: 'B2B SaaS',
  subIndustry: '',
  country: 'United States',
  state: '',
  employeeMin: 20,
  employeeMax: 200,
  revenueMin: 1_000_000,
  revenueMax: 20_000_000,
  businessModel: 'B2B',
  industryStrict: true,
  foundedYearMin: 1980,
  foundedYearMax: new Date().getFullYear(),
  weights: { ...SCORE_WEIGHTS },
  isActive: true,
};

/** Fails fast at import time if someone re-tunes weights and breaks the 100-point scale. */
const weightTotal = Object.values(SCORE_WEIGHTS).reduce((sum, w) => sum + w, 0);
if (weightTotal !== 100) {
  throw new Error(`SCORE_WEIGHTS must sum to 100, got ${weightTotal}.`);
}
