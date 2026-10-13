import mongoose from 'mongoose';
import { BUSINESS_MODELS } from '../utils/validate.js';
import { SCORE_WEIGHTS } from '../config/scoring.config.js';

const { Schema } = mongoose;

/**
 * A searcher's acquisition criteria.
 *
 * Every field is optional: an unset criterion means "no constraint", and the
 * scoring service awards a neutral result rather than penalising the company.
 * That keeps a half-filled Buy Box usable instead of returning zero matches.
 *
 * This MVP has no authentication, so exactly one Buy Box is active at a time
 * (`isActive`). With users, this becomes a per-user collection — the schema
 * does not need to change, only the query scope.
 */
const buyBoxSchema = new Schema(
  {
    name: { type: String, default: 'Untitled Buy Box', trim: true },

    industry: { type: String, default: '', trim: true },
    subIndustry: { type: String, default: '', trim: true },
    country: { type: String, default: '', trim: true },
    state: { type: String, default: '', trim: true },

    employeeMin: { type: Number, default: null, min: 0 },
    employeeMax: { type: Number, default: null, min: 0 },

    revenueMin: { type: Number, default: null, min: 0 },
    revenueMax: { type: Number, default: null, min: 0 },

    businessModel: { type: String, enum: [...BUSINESS_MODELS, ''], default: '' },

    /**
     * Treat industry as a hard filter rather than a scored component.
     *
     * Defaults to true because that is how searchers actually work: someone
     * hunting a B2B SaaS target does not want an HVAC contractor at the top of
     * the list, however well it scores on the other seven components. Turning
     * it off is a deliberate "show me adjacent sectors" mode — the scoring model
     * is unchanged either way, only the candidate set differs.
     */
    industryStrict: { type: Boolean, default: true },

    foundedYearMin: { type: Number, default: null },
    foundedYearMax: { type: Number, default: null },

    /**
     * Per-Buy-Box score weights. Stored so a searcher who cares more about
     * digitization upside than headcount can say so, and the ranking changes
     * without a code deploy.
     */
    weights: {
      type: Map,
      of: Number,
      default: () => new Map(Object.entries(SCORE_WEIGHTS)),
    },

    isActive: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export const BuyBox = mongoose.model('BuyBox', buyBoxSchema, 'buyboxes');
