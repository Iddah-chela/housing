import express from 'express';
import * as agentController from '../controllers/agentController.js';
import { protect, optionalProtect } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import validateLeadId from '../middleware/validateLeadId.js';
import upload, { singleFile } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Middleware to check agent role
const isAgent = requireRole('agent');

// ===== VACANCY ROUTES =====

// Agent: Upload image/video for vacancy listings
router.post('/upload-media', protect, isAgent, singleFile('file'), agentController.uploadMedia);

// Agent: Create a new vacancy
router.post('/vacancies', protect, isAgent, agentController.postVacancy);

// Agent: Get all their vacancies
router.get('/vacancies', protect, isAgent, agentController.getAgentVacancies);

// Agent: Get one vacancy for management/editing (includes inactive/old)
router.get('/vacancies/:id/manage', protect, isAgent, agentController.getVacancyForAgent);

// Public: Get single vacancy by ID (anyone can view)
router.get('/vacancies/:id', agentController.getVacancyById);
// Public: Get active holds for a vacancy (non-sensitive)
router.get('/vacancies/:id/holds', agentController.getVacancyHolds);

// Agent: Update vacancy
router.put('/vacancies/:id', protect, isAgent, agentController.updateVacancy);

// Agent: Deactivate vacancy
router.delete('/vacancies/:id', protect, isAgent, agentController.deleteVacancy);

// Agent: Re-open a "contacted" vacancy back to "open"
router.put('/vacancies/:id/reopen', protect, isAgent, agentController.reopenVacancy);

// Agent: Mark vacancy as occupied (removes from feed)
router.put('/vacancies/:id/mark-occupied', protect, isAgent, agentController.markVacancyOccupied);

// ===== LEAD ROUTES =====

// Agent: Get all their leads
router.get('/leads', protect, isAgent, agentController.getAgentLeads);

// Agent: Get single lead
router.get('/leads/:id', protect, isAgent, validateLeadId, agentController.getLeadById);

// Agent: Update lead (status, notes, contact method)
router.put('/leads/:id', protect, isAgent, validateLeadId, agentController.updateLead);

// Agent: Mark lead outcome (viewed, booked, not-fit, no-response)
router.put('/leads/:id/outcome', protect, isAgent, validateLeadId, agentController.markLeadOutcome);

// Authenticated user: Express interest in a vacancy (create lead)
router.post('/leads', protect, agentController.createLead);

// Tenant: their own leads (viewing exact location after agent confirms)
router.get('/my-leads', protect, agentController.getMyLeads);

// Cancel provisional hold (tenant or agent)
router.put('/leads/:id/cancel-hold', protect, validateLeadId, agentController.cancelProvisionalHold);

// Reputation / placement confirmation (tenant + agent settings)
router.get('/reputation/settings', protect, isAgent, agentController.getReputationSettings);
router.put('/reputation/settings', protect, isAgent, agentController.updateReputationSettings);
router.get('/placements/pending', protect, agentController.getPendingPlacementConfirmations);
router.get('/placements/:id', protect, validateLeadId, agentController.getPlacementConfirmation);
router.post('/placements/:id/confirm', protect, validateLeadId, agentController.confirmPlacement);
router.post('/placements/:id/rate', protect, validateLeadId, agentController.rateAgentPlacement);

// ===== STATS ROUTES =====

// Public: agent leaderboard (privacy-aware)
router.get('/leaderboard', optionalProtect, agentController.getAgentLeaderboard);

// Agent: Get dashboard stats
router.get('/stats', protect, isAgent, agentController.getAgentStats);

export default router;
