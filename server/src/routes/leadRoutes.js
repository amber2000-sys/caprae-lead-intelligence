import { Router } from 'express';
import {
  listLeads, searchLeads, getLeadById, rescoreLead, createLead, getFilterOptions,
} from '../controllers/leadController.js';

const router = Router();

router.get('/filters/options', getFilterOptions);  // before /:id so it is not read as an id
router.get('/', listLeads);
router.post('/search', searchLeads);
router.post('/', createLead);
router.get('/:id', getLeadById);
router.post('/:id/score', rescoreLead);

export default router;
