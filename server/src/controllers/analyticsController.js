import { sendSuccess } from '../utils/apiResponse.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getAnalytics } from '../services/analyticsService.js';
import { getActiveBuyBoxLean } from '../services/buyBoxService.js';
import { queryLeads } from '../services/leadQueryService.js';

export const getAnalyticsOverview = asyncHandler(async (req, res) => {
  const buyBox = await getActiveBuyBoxLean();
  const analytics = await getAnalytics(buyBox);
  return sendSuccess(res, { ...analytics, buyBoxName: buyBox.name });
});

/** Dashboard payload: headline counts plus the top opportunities table. */
export const getDashboard = asyncHandler(async (req, res) => {
  const buyBox = await getActiveBuyBoxLean();
  const [analytics, top] = await Promise.all([
    getAnalytics(buyBox),
    queryLeads({ buyBox, sortBy: 'fitScore', sortOrder: 'desc', page: 1, limit: 8 }),
  ]);

  return sendSuccess(res, {
    totals: {
      ...analytics.totals,
      /**
       * How many companies survive the Buy Box, as opposed to how many exist.
       * This is the number a searcher actually acts on — "151 in the dataset"
       * is context, "31 match your criteria" is the working set.
       */
      matching: top.pagination.total,
      matchingHighFit: top.summary.high,
      matchingAverageFitScore: top.summary.averageFitScore,
    },
    byPriority: analytics.byPriority,
    digitizationGap: analytics.digitizationGap,
    topOpportunities: top.leads,
    buyBox: { name: buyBox.name, industry: buyBox.industry, country: buyBox.country },
  });
});
