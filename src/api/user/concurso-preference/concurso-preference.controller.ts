import { Response } from 'express';
import { supabase } from '../../../config/supabase-unified.js';
import { logger } from '../../../utils/logger';
import { AuthenticatedRequest } from '../../../middleware/unified-auth.middleware.js';

// GET - Buscar preferência do usuário
export const getPreferences = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const usuarioId = req.user?.id || '';

    const { data: preference, error } = await supabase
      .rpc('get_user_preference', { p_usuario_id: usuarioId });

    if (error) {
      logger.error('Erro ao buscar preferência via RPC', { error, usuarioId });
      return res.status(500).json({ error: 'Erro ao buscar preferência.' });
    }

    res.json(preference);
  } catch (error) {
    logger.error('Erro inesperado ao buscar preferência do usuário.', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

// POST - Criar/Atualizar preferência do usuário
export const createPreference = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const usuarioId = req.user?.id || '';
    const { concurso_id } = req.body;

    if (!concurso_id) {
      return res.status(400).json({ error: 'ID do concurso é obrigatório.' });
    }
    
    const { error } = await supabase
      .rpc('set_user_preference', { p_usuario_id: usuarioId, p_concurso_id: concurso_id });

    if (error) {
      if (error.code === 'P0001') { // Erro customizado da função_
        return res.status(403).json({ error: error.message });
      }
      logger.error('Erro ao definir preferência via RPC', { error, usuarioId, concurso_id });
      return res.status(500).json({ error: 'Erro ao salvar preferência.' });
    }

    res.status(201).json({ message: 'Preferência criada com sucesso' });

  } catch (error) {
    logger.error('Erro inesperado ao criar preferência do usuário.', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
}; 