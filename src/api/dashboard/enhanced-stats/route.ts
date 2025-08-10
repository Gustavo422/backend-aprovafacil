import express from 'express';
import { requireAuth } from '../../../middleware/auth.js';
import { getEnhancedStats } from '../../../modules/guru/controllers/dashboard.controller.js';
import { guruFeatureFlagMiddleware } from '../../../middleware/guru-feature-flag.middleware.js';
import { requestLogger } from '../../../middleware/logger.js';
import { rateLimit } from '../../../middleware/rateLimit.js';

const createRouter = () => express.Router();
const router = createRouter();

// Middlewares consistentes
router.use(requestLogger);
router.use(rateLimit);

// Registrar rotas
router.get('/', guruFeatureFlagMiddleware, requireAuth, getEnhancedStats);

export { router };
