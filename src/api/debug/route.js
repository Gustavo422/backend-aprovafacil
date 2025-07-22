import express from 'express';
import authDebugRoutes from './auth.js';

const router = express.Router();

// Registrar rotas de debug
router.use('/auth', authDebugRoutes);

export default router;