import { BuyBox } from '../models/BuyBox.js';
import { DEFAULT_BUY_BOX } from '../config/scoring.config.js';

/**
 * Resolve the Buy Box every scoring call runs against.
 *
 * There is no authentication in this MVP, so "the active Buy Box" is a single
 * document. Creating the default on first read rather than requiring a setup
 * step means the app is usable the moment it is seeded — an evaluator should
 * see scored leads on their first page load, not an empty state.
 */
export async function getActiveBuyBox() {
  let buyBox = await BuyBox.findOne({ isActive: true });
  if (!buyBox) {
    buyBox = await BuyBox.create({ ...DEFAULT_BUY_BOX, isActive: true });
  }
  return buyBox;
}

/** Plain object form, safe to hand to the pure scoring functions. */
export async function getActiveBuyBoxLean() {
  const buyBox = await getActiveBuyBox();
  const plain = buyBox.toObject();
  plain.weights = plain.weights instanceof Map ? Object.fromEntries(plain.weights) : plain.weights;
  return plain;
}

export async function saveActiveBuyBox(payload) {
  const buyBox = await getActiveBuyBox();
  Object.assign(buyBox, payload, { isActive: true });
  await buyBox.save();
  return buyBox;
}

export async function resetActiveBuyBox() {
  const buyBox = await getActiveBuyBox();
  Object.assign(buyBox, DEFAULT_BUY_BOX, { isActive: true });
  await buyBox.save();
  return buyBox;
}
