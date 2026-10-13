import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { assertValid } from '../middleware/validateRequest.js';
import { validateBuyBoxPayload } from '../utils/validate.js';
import { getActiveBuyBox, saveActiveBuyBox, resetActiveBuyBox } from '../services/buyBoxService.js';
import { SCORE_WEIGHTS, COMPONENT_LABELS, COMPONENT_DESCRIPTIONS, PRIORITY_THRESHOLDS } from '../config/scoring.config.js';

function serialise(buyBox) {
  const plain = buyBox.toObject();
  plain.weights = plain.weights instanceof Map ? Object.fromEntries(plain.weights) : plain.weights;
  return plain;
}

export const getBuyBox = asyncHandler(async (req, res) => {
  const buyBox = await getActiveBuyBox();
  return sendSuccess(res, serialise(buyBox));
});

export const saveBuyBox = asyncHandler(async (req, res) => {
  const payload = assertValid(validateBuyBoxPayload(req.body), 'Buy Box validation failed');
  const buyBox = await saveActiveBuyBox(payload);
  return sendSuccess(res, serialise(buyBox), {
    message: 'Your acquisition criteria are now being used to rank leads.',
  });
});

export const resetBuyBox = asyncHandler(async (req, res) => {
  const buyBox = await resetActiveBuyBox();
  return sendSuccess(res, serialise(buyBox), { message: 'Buy Box reset to defaults.' });
});

/** The scoring model itself, so the UI can explain it without hard-coding it. */
export const getScoringModel = asyncHandler(async (req, res) =>
  sendSuccess(res, {
    weights: SCORE_WEIGHTS,
    labels: COMPONENT_LABELS,
    descriptions: COMPONENT_DESCRIPTIONS,
    thresholds: PRIORITY_THRESHOLDS,
  })
);
