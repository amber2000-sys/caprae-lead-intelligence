import { Router } from 'express';
import { listSavedLeads, updateSavedLead, deleteSavedLead } from '../controllers/savedLeadController.js';

const router = Router();

router.get('/', listSavedLeads);
router.patch('/:id', updateSavedLead);
router.delete('/:id', deleteSavedLead);

export default router;
