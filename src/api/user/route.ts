import express from 'express';
import { z } from 'zod';
import { supabase } from '../../config/supabase.js';
import { requireAuth } from '../../middleware/auth.js';
import { validateRequest } from '../../middleware/validation.js';
import { logger } from '../../utils/logger.js';

const router = express.Router();

// Schemas de validação
const updateUserSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório').max(255).optional(),
  email: z.string().email('Email inválido').optional(),
  telefone: z.string().optional(),
  data_nascimento: z.string().datetime().optional(),
  genero: z.enum(['masculino', 'feminino', 'outro']).optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().url().optional(),
  is_active: z.boolean().optional()
});

const updatePreferencesSchema = z.object({
  tema: z.enum(['claro', 'escuro', 'auto']).optional(),
  notificacoes_email: z.boolean().optional(),
  notificacoes_push: z.boolean().optional(),
  notificacoes_questoes_semanais: z.boolean().optional(),
  notificacoes_simulados: z.boolean().optional(),
  notificacoes_flashcards: z.boolean().optional(),
  idioma: z.enum(['pt-BR', 'en']).optional(),
  fuso_horario: z.string().optional()
});

// GET /api/user/profile - Buscar perfil do usuário autenticado
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id,
        nome,
        email,
        telefone,
        data_nascimento,
        genero,
        cidade,
        estado,
        bio,
        avatar_url,
        is_active,
        created_at,
        updated_at,
        user_preferences (
          tema,
          notificacoes_email,
          notificacoes_push,
          notificacoes_questoes_semanais,
          notificacoes_simulados,
          notificacoes_flashcards,
          idioma,
          fuso_horario
        )
      `)
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }
      logger.error('Erro ao buscar perfil do usuário:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    res.json({ success: true, data: user });
  } catch (error) {
    logger.error('Erro na rota GET /user/profile:', undefined, { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/user/profile - Atualizar perfil do usuário
router.put('/profile', requireAuth, validateRequest(updateUserSchema), async (req, res) => {
  try {
    const userId = req.user?.id;
    const updateData = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    // Verificar se o email já está em uso por outro usuário
    if (updateData.email) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', updateData.email)
        .neq('id', userId)
        .single();

      if (existingUser) {
        res.status(400).json({ error: 'Email já está em uso' });
        return;
      }
    }

    const { data: user, error } = await supabase
      .from('users')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      logger.error('Erro ao atualizar perfil do usuário:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    res.json({ success: true, data: user });
  } catch (error) {
    logger.error('Erro na rota PUT /user/profile:', undefined, { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/user/preferences - Buscar preferências do usuário
router.get('/preferences', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    const { data: preferences, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Erro ao buscar preferências do usuário:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    res.json({ success: true, data: preferences || {} });
  } catch (error) {
    logger.error('Erro na rota GET /user/preferences:', undefined, { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/user/preferences - Atualizar preferências do usuário
router.put('/preferences', requireAuth, validateRequest(updatePreferencesSchema), async (req, res) => {
  try {
    const userId = req.user?.id;
    const updateData = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    // Verificar se já existem preferências
    const { data: existingPreferences } = await supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', userId)
      .single();

    let preferences;
    let error;

    if (existingPreferences) {
      // Atualizar preferências existentes
      const result = await supabase
        .from('user_preferences')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();
      
      preferences = result.data;
      error = result.error;
    } else {
      // Criar novas preferências
      const result = await supabase
        .from('user_preferences')
        .insert([{
          user_id: userId,
          ...updateData
        }])
        .select()
        .single();
      
      preferences = result.data;
      error = result.error;
    }

    if (error) {
      logger.error('Erro ao atualizar preferências do usuário:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    res.json({ success: true, data: preferences });
  } catch (error) {
    logger.error('Erro na rota PUT /user/preferences:', undefined, { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/user/stats - Buscar estatísticas do usuário
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    // Buscar estatísticas de simulados
    const { data: simuladosStats, error: simuladosError } = await supabase
      .from('user_simulado_progress')
      .select('*')
      .eq('user_id', userId);

    if (simuladosError) {
      logger.error('Erro ao buscar estatísticas de simulados:', undefined, { error: simuladosError.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    // Buscar estatísticas de questões semanais
    const { data: questoesStats, error: questoesError } = await supabase
      .from('respostas_questoes_semanais')
      .select('*')
      .eq('user_id', userId);

    if (questoesError) {
      logger.error('Erro ao buscar estatísticas de questões semanais:', undefined, { error: questoesError.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    // Calcular estatísticas
    const totalSimulados = simuladosStats?.length || 0;
    const simuladosCompletados = simuladosStats?.filter(s => s.data_fim)?.length || 0;
    const totalQuestoes = questoesStats?.length || 0;
    const questoesCorretas = questoesStats?.filter(q => q.is_correta)?.length || 0;
    const totalPontos = questoesStats?.reduce((sum, q) => sum + (q.pontos_ganhos || 0), 0);

    const stats = {
      simulados: {
        total: totalSimulados,
        completados: simuladosCompletados,
        em_andamento: totalSimulados - simuladosCompletados
      },
      questoes_semanais: {
        total: totalQuestoes,
        corretas: questoesCorretas,
        taxa_acerto: totalQuestoes > 0 ? (questoesCorretas / totalQuestoes * 100).toFixed(2) : 0
      },
      pontos: {
        total: totalPontos
      }
    };

    res.json({ success: true, data: stats });
  } catch (error) {
    logger.error('Erro na rota GET /user/stats:', undefined, { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/user/account - Deletar conta do usuário
router.delete('/account', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    // Deletar dados relacionados primeiro
    const tablesToDelete = [
      'user_preferences',
      'user_simulado_progress',
      'respostas_questoes_semanais',
      'user_flashcard_progress',
      'user_plano_estudos_progress'
    ];

    for (const table of tablesToDelete) {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('user_id', userId);

      if (error) {
        logger.error(`Erro ao deletar dados da tabela ${table}:`, undefined, { error: error.message });
      }
    }

    // Deletar o usuário
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      logger.error('Erro ao deletar conta do usuário:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    res.json({ success: true, message: 'Conta deletada com sucesso' });
  } catch (error) {
    logger.error('Erro na rota DELETE /user/account:', undefined, { error: error instanceof Error ? error.message : 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router; 