import { SavedLead } from '../models/SavedLead.js';
import { Company } from '../models/Company.js';
import { ApiError } from '../utils/ApiError.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { enrichCompany } from '../services/leadQueryService.js';
import { getActiveBuyBoxLean } from '../services/buyBoxService.js';
import { cleanString } from '../utils/normalize.js';
import { LIMITS } from '../utils/validate.js';

export const saveLead = asyncHandler(async (req, res) => {
  const company = await Company.findById(req.params.id).lean();
  if (!company) throw ApiError.notFound('Lead not found');

  const note = cleanString(req.body?.note);
  if (note.length > LIMITS.noteLength.max) {
    throw ApiError.badRequest(`Note must be at most ${LIMITS.noteLength.max} characters`);
  }

  const buyBox = await getActiveBuyBoxLean();
  const lead = enrichCompany(company, buyBox);

  // Upsert: saving an already-saved lead updates the snapshot rather than
  // failing on the unique index.
  const saved = await SavedLead.findOneAndUpdate(
    { company: company._id },
    {
      company: company._id,
      scoreAtSave: lead.fitScore,
      priorityAtSave: lead.priority,
      buyBoxNameAtSave: buyBox.name,
      ...(note ? { note } : {}),
      ...(req.body?.status ? { status: req.body.status } : {}),
    },
    { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
  );

  return sendSuccess(res, saved, { message: `${company.companyName} saved to your pipeline.` }, 201);
});

export const listSavedLeads = asyncHandler(async (req, res) => {
  const buyBox = await getActiveBuyBoxLean();
  const saved = await SavedLead.find().sort({ createdAt: -1 }).populate('company').lean();

  const data = saved
    .filter((entry) => entry.company) // a company deleted underneath a save
    .map((entry) => {
      const lead = enrichCompany(entry.company, buyBox);
      return {
        _id: entry._id,
        savedAt: entry.createdAt,
        note: entry.note,
        status: entry.status,
        scoreAtSave: entry.scoreAtSave,
        priorityAtSave: entry.priorityAtSave,
        buyBoxNameAtSave: entry.buyBoxNameAtSave,
        /** True when the Buy Box moved since this lead was saved. */
        scoreHasChanged: entry.scoreAtSave !== null && entry.scoreAtSave !== lead.fitScore,
        lead,
      };
    });

  return sendSuccess(res, data, { total: data.length });
});

export const updateSavedLead = asyncHandler(async (req, res) => {
  const update = {};
  if (req.body?.note !== undefined) {
    const note = cleanString(req.body.note);
    if (note.length > LIMITS.noteLength.max) {
      throw ApiError.badRequest(`Note must be at most ${LIMITS.noteLength.max} characters`);
    }
    update.note = note;
  }
  if (req.body?.status !== undefined) update.status = req.body.status;

  const saved = await SavedLead.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  });
  if (!saved) throw ApiError.notFound('Saved lead not found');

  return sendSuccess(res, saved, { message: 'Saved lead updated.' });
});

export const deleteSavedLead = asyncHandler(async (req, res) => {
  const saved = await SavedLead.findByIdAndDelete(req.params.id);
  if (!saved) throw ApiError.notFound('Saved lead not found');
  return sendSuccess(res, { _id: saved._id }, { message: 'Removed from your pipeline.' });
});
