import { Router } from 'express';
import mongoose from 'mongoose';
import leadRoutes from './leadRoutes.js';
import buyBoxRoutes from './buyBoxRoutes.js';
import savedLeadRoutes from './savedLeadRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import { exportLeads } from '../controllers/exportController.js';
import { saveLead } from '../controllers/savedLeadController.js';
import { sendSuccess } from '../utils/apiResponse.js';

const router = Router();

/** Liveness + database state, so a failed demo is diagnosable in one request. */
router.get('/health', (req, res) =>
  sendSuccess(res, {
    status: 'ok',
    database: {
      state: mongoose.STATES[mongoose.connection.readyState],
      name: mongoose.connection.name || null,
    },
    timestamp: new Date().toISOString(),
  })
);

router.use('/leads', leadRoutes);
router.use('/buy-box', buyBoxRoutes);
router.use('/saved-leads', savedLeadRoutes);
router.use('/analytics', analyticsRoutes);

// Saving is an action on a lead, so it lives under /leads; the collection of
// saved leads is its own resource at /saved-leads.
router.post('/leads/:id/save', saveLead);
router.get('/export', exportLeads);
router.post('/export', exportLeads);

export default router;
