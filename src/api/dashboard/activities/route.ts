import express from 'express';
import { requestLogger } from '../../../middleware/logger.js';
import { rateLimit } from '../../../middleware/rateLimit.js';
import { requireAuth } from '../../../middleware/auth.js';
import { getActivities } from '../../../modules/guru/controllers/dashboard.controller.js';
import { guruFeatureFlagMiddleware } from '../../../middleware/guru-feature-flag.middleware.js';

const router = express.Router();

// Aplicar middlewares globais
router.use(requestLogger);
router.use(rateLimit);

interface Simulado {
    titulo: string;
    dificuldade: string;
}

interface UsuarioSimuladoProgress {
    id: string;
    usuario_id: string;
    concluido_em: string;
    tempo_gasto_minutos: number | null;
    pontuacao: number;
    simulados: Simulado;
    [key: string]: unknown;
}

interface Activity {
    id: string;
    type: string;
    titulo: string;
    descricao: string;
    time: string;
    created_at: string;
    score?: number;
    improvement?: number;
}

// GET - Buscar atividades do usuário
router.get('/', guruFeatureFlagMiddleware, requireAuth, getActivities);

// Registrar rotas
// TODO: Adicionar rotas específicas para cada arquivo

export { router };
