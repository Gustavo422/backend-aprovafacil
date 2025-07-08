import express from 'express';
// import { supabase } from '../../config/supabase.js';
// import { requireAuth } from '../../middleware/auth.js';

const router = express.Router();

// TODO: Implementar rotas de flashcards
router.get('/', (req, res) => {
  res.json({ message: 'Flashcards endpoint - em desenvolvimento' });
});

export default router;
