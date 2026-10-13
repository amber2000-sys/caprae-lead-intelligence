import { Router } from 'express';
import { getBuyBox, saveBuyBox, resetBuyBox, getScoringModel } from '../controllers/buyBoxController.js';

const router = Router();

router.get('/model', getScoringModel);
router.get('/', getBuyBox);
router.post('/', saveBuyBox);
router.post('/reset', resetBuyBox);

export default router;
