import express from 'express';
import { requestLogger } from '../../../middleware/logger.js';
import { rateLimit } from '../../../middleware/rateLimit.js';
import { requireAuth } from '../../../middleware/auth.js';
import { 
  getSimuladoActivities, 
  getFlashcardActivities, 
  getApostilaActivities 
} from '../../../modules/guru/controllers/dashboard.controller.js';

const router = express.Router();

router.use(requestLogger);
router.use(rateLimit);
router.use(requireAuth);

router.get('/simulados', (req, res) => { void getSimuladoActivities(req, res); });
router.get('/flashcards', (req, res) => { void getFlashcardActivities(req, res); });
router.get('/apostilas', (req, res) => { void getApostilaActivities(req, res); });

export { router };


