import { Router } from 'express';
import { getAnalyticsOverview, getDashboard } from '../controllers/analyticsController.js';

const router = Router();

router.get('/', getAnalyticsOverview);
router.get('/dashboard', getDashboard);

export default router;
