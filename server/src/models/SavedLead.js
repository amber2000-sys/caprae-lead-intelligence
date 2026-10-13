import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * A company a searcher has pulled into their working pipeline.
 *
 * The fit score and priority are snapshotted at save time. That is deliberate:
 * the live score moves whenever the Buy Box changes, but a user who saved a
 * lead at 91/100 wants to see what they decided on. The UI shows both the saved
 * score and the current one when they differ.
 */
const savedLeadSchema = new Schema(
  {
    company: { type: Schema.Types.ObjectId, ref: 'Company', required: true },

    scoreAtSave: { type: Number, default: null, min: 0, max: 100 },
    priorityAtSave: { type: String, enum: ['HIGH', 'MEDIUM', 'LOW', ''], default: '' },
    buyBoxNameAtSave: { type: String, default: '' },

    note: { type: String, default: '', trim: true, maxlength: 1000 },
    status: {
      type: String,
      enum: ['to_review', 'researching', 'contacted', 'passed'],
      default: 'to_review',
    },
  },
  { timestamps: true }
);

/** One saved entry per company — saving twice updates the existing row. */
savedLeadSchema.index({ company: 1 }, { unique: true });

export const SavedLead = mongoose.model('SavedLead', savedLeadSchema, 'savedleads');
