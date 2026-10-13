import mongoose from 'mongoose';
import { BUSINESS_MODELS, WEBSITE_STATUSES, DUPLICATE_STATUSES } from '../utils/validate.js';

const { Schema } = mongoose;

/**
 * Observable signals about a company's digital footprint.
 *
 * In this MVP these come from the seed dataset. In production they would be
 * populated by a licensed data provider or a polite, robots.txt-respecting
 * crawler — the shape of this sub-document is the integration contract, which
 * is why it is modelled explicitly rather than left as a loose object.
 */
const digitalSignalsSchema = new Schema(
  {
    hasHttps: { type: Boolean, default: null },
    mobileOptimized: { type: Boolean, default: null },
    hasAnalytics: { type: Boolean, default: null },
    hasEcommerceOrBooking: { type: Boolean, default: null },
    hasCrm: { type: Boolean, default: null },
    lastContentUpdateYear: { type: Number, default: null },
    cmsDetected: { type: String, default: '' },
  },
  { _id: false }
);

/** Ownership structure — the inputs to the succession signal. */
const ownershipSchema = new Schema(
  {
    founderLed: { type: Boolean, default: null },
    ownerTenureYears: { type: Number, default: null },
    privateEquityBacked: { type: Boolean, default: null },
    isFranchise: { type: Boolean, default: null },
    locationCount: { type: Number, default: null },
  },
  { _id: false }
);

const locationSchema = new Schema(
  {
    city: { type: String, default: '', trim: true },
    state: { type: String, default: '', trim: true },
    country: { type: String, default: '', trim: true, index: true },
  },
  { _id: false }
);

const companySchema = new Schema(
  {
    companyName: { type: String, required: true, trim: true },

    /**
     * Normalised comparison keys. Stored rather than computed on read because
     * deduplication and lookup both need them indexed — a computed value cannot
     * back an index.
     */
    normalizedCompanyName: { type: String, required: true, index: true },
    domain: { type: String, default: '', trim: true, lowercase: true },
    normalizedDomain: { type: String, default: '', index: true },

    industry: { type: String, required: true, trim: true, index: true },
    subIndustry: { type: String, default: '', trim: true },

    location: { type: locationSchema, default: () => ({}) },

    employeeCount: { type: Number, default: null, min: 0 },
    revenueEstimate: { type: Number, default: null, min: 0 },

    /**
     * Whether the revenue figure is modelled or confirmed. Surfaced in the UI
     * as a concern so the user never mistakes an estimate for a filing.
     */
    revenueIsEstimated: { type: Boolean, default: true },

    businessModel: { type: String, enum: [...BUSINESS_MODELS, ''], default: '' },
    foundedYear: { type: Number, default: null },

    websiteStatus: { type: String, enum: WEBSITE_STATUSES, default: 'unverified' },
    technologyStack: { type: [String], default: [] },
    growthSignals: { type: [String], default: [] },

    digitalSignals: { type: digitalSignalsSchema, default: () => ({}) },
    ownership: { type: ownershipSchema, default: () => ({}) },

    contactAvailability: { type: Boolean, default: false },
    contactEmail: { type: String, default: '' },
    /** Result of syntax validation on contactEmail, computed at ingest. */
    contactEmailValid: { type: Boolean, default: null },

    /**
     * Deduplication result. Records are never deleted by the dedupe pass —
     * the oldest record in a group is marked `primary` and the rest
     * `probable_duplicate`, leaving the merge decision to a human.
     */
    duplicateStatus: { type: String, enum: DUPLICATE_STATUSES, default: 'unique', index: true },
    duplicateGroupId: { type: String, default: null, index: true },
    duplicateMatchReason: { type: String, default: '' },

    /** 0-100 completeness of the required fields, computed at ingest. */
    dataCompleteness: { type: Number, default: 0, min: 0, max: 100 },

    source: { type: String, default: 'Demo Dataset' },
    /** Every record in this MVP is synthetic; the flag makes that explicit in the API and UI. */
    isDemoData: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/**
 * Compound indexes chosen from the actual query shapes in leadQueryService:
 *
 *  - industry + country is the most common Buy Box prefilter.
 *  - employeeCount and revenueEstimate back the range filters, and are the two
 *    fields most likely to be used for a selective scan.
 *  - the text index backs the free-text company/domain search box.
 *
 * Deliberately NOT indexed: businessModel and websiteStatus. Both are
 * low-cardinality (3-6 distinct values), so an index would be read-amplifying
 * rather than selective; Mongo scans them more cheaply than it traverses a
 * near-useless B-tree.
 */
companySchema.index({ industry: 1, 'location.country': 1 });
companySchema.index({ employeeCount: 1 });
companySchema.index({ revenueEstimate: 1 });
companySchema.index({ companyName: 'text', domain: 'text' });

/** Age of the business in years, used by the succession signal and the UI. */
companySchema.virtual('companyAgeYears').get(function companyAgeYears() {
  if (!this.foundedYear) return null;
  return new Date().getFullYear() - this.foundedYear;
});

export const Company = mongoose.model('Company', companySchema);
