/** Shared API types. Mirrors the server's response envelope exactly. */

export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
export type QualityBand = 'high' | 'medium' | 'low';
export type ComponentStatus = 'match' | 'partial' | 'miss' | 'missing' | 'na';
export type WebsiteStatus = 'verified' | 'unverified' | 'unreachable';
export type DuplicateStatus = 'unique' | 'primary' | 'probable_duplicate';

export interface Location {
  city: string;
  state: string;
  country: string;
}

export interface DigitizationGap {
  key: string;
  label: string;
  weight: number;
}

export interface ScoreComponent {
  key: string;
  label: string;
  description: string;
  earned: number;
  max: number;
  percent: number;
  status: ComponentStatus;
  detail: string;
  meta?: {
    gapIndex: number;
    gaps: DigitizationGap[];
    strengths: string[];
    unknown: string[];
  };
}

export interface Reason {
  label: string;
  detail: string;
  points: string;
}

export interface Concern {
  label: string;
  detail: string;
  severity: 'high' | 'medium' | 'low';
}

export interface QualityCheck {
  key: string;
  label: string;
  weight: number;
  passed: boolean;
  hint: string | null;
}

export interface Lead {
  _id: string;
  companyName: string;
  domain: string;
  industry: string;
  subIndustry: string;
  location: Location;
  employeeCount: number | null;
  revenueEstimate: number | null;
  revenueIsEstimated: boolean;
  businessModel: string;
  foundedYear: number | null;
  websiteStatus: WebsiteStatus;
  technologyStack: string[];
  growthSignals: string[];
  contactAvailability: boolean;
  contactEmail: string;
  duplicateStatus: DuplicateStatus;
  duplicateGroupId: string | null;
  duplicateMatchReason: string;
  dataCompleteness: number;
  source: string;
  isDemoData: boolean;

  // Derived at request time by the scoring service.
  fitScore: number;
  priority: Priority;
  scoreBreakdown: ScoreComponent[];
  reasons: Reason[];
  concerns: Concern[];
  dataQualityScore: number;
  dataQualityBand: QualityBand;
  dataQualityChecks: QualityCheck[];
}

export interface LeadDetail extends Lead {
  duplicates: Array<Pick<Lead, '_id' | 'companyName' | 'domain' | 'duplicateStatus' | 'industry' | 'location'>>;
  buyBoxName: string;
}

export interface BuyBox {
  _id?: string;
  name: string;
  industry: string;
  subIndustry: string;
  country: string;
  state: string;
  employeeMin: number | null;
  employeeMax: number | null;
  revenueMin: number | null;
  revenueMax: number | null;
  businessModel: string;
  industryStrict: boolean;
  foundedYearMin: number | null;
  foundedYearMax: number | null;
  weights?: Record<string, number>;
}

export interface LeadFilters {
  search?: string;
  industry?: string;
  country?: string;
  state?: string;
  businessModel?: string;
  websiteStatus?: string;
  employeeMin?: string;
  employeeMax?: string;
  revenueMin?: string;
  revenueMax?: string;
  minFitScore?: string;
  priority?: string;
  dataQuality?: string;
  includeDuplicates?: boolean;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface LeadSummary {
  total: number;
  high: number;
  medium: number;
  low: number;
  averageFitScore: number;
  averageDataQuality: number;
}

export interface FilterOptions {
  industries: string[];
  countries: string[];
  states: string[];
  businessModels: string[];
}

export interface Distribution {
  label: string;
  value: number;
}

export interface AnalyticsTotals {
  total: number;
  highFit: number;
  verified: number;
  duplicates: number;
  incomplete: number;
  averageFitScore: number;
  averageDataQuality: number;
}

/** Dashboard totals additionally carry the Buy Box-filtered working set. */
export interface DashboardTotals extends AnalyticsTotals {
  matching: number;
  matchingHighFit: number;
  matchingAverageFitScore: number;
}

export interface ScoreBucket {
  from: number;
  to: number;
  count: number;
  band: Priority;
}

export interface Analytics {
  totals: AnalyticsTotals;
  byIndustry: Distribution[];
  byState: Distribution[];
  byPriority: Distribution[];
  byRevenueBucket: Distribution[];
  byDataQuality: Distribution[];
  digitizationGap: Distribution[];
  scoreHistogram: ScoreBucket[];
  buyBoxName: string;
}

export interface Dashboard {
  totals: DashboardTotals;
  byPriority: Distribution[];
  digitizationGap: Distribution[];
  topOpportunities: Lead[];
  buyBox: { name: string; industry: string; country: string };
}

export interface SavedLead {
  _id: string;
  savedAt: string;
  note: string;
  status: 'to_review' | 'researching' | 'contacted' | 'passed';
  scoreAtSave: number | null;
  priorityAtSave: Priority | '';
  buyBoxNameAtSave: string;
  scoreHasChanged: boolean;
  lead: Lead;
}

export interface ScoringModel {
  weights: Record<string, number>;
  labels: Record<string, string>;
  descriptions: Record<string, string>;
  thresholds: { HIGH: number; MEDIUM: number };
}
