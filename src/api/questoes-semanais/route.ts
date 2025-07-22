import express from 'express';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabase } from '../../config/supabase.js';
import { requireAuth } from '../../middleware/auth.js';
import { logger } from '../../utils/logger.js';

const router = express.Router();

// Schemas de validação
const createQuestaoSemanalSchema = z.object({
  titulo: z.string().min(1, 'Título é obrigatório').max(255),
  descricao: z.string().optional(),
  enunciado: z.string().min(1, 'Enunciado é obrigatório'),
  alternativas: z.record(z.unknown()),
  resposta_correta: z.string().min(1, 'Resposta correta é obrigatória'),
  explicacao: z.string().optional(),
  disciplina: z.string().min(1, 'Disciplina é obrigatória').max(100),
  assunto: z.string().optional(),
  dificuldade: z.enum(['facil', 'medio', 'dificil']).default('medio'),
  concurso_id: z.string().uuid().optional(),
  categoria_id: z.string().uuid().optional(),
  ativo: z.boolean().default(true),
  pontos: z.number().min(0).default(10)
});

const updateQuestaoSemanalSchema = z.object({
  titulo: z.string().min(1).max(255).optional(),
  descricao: z.string().optional(),
  enunciado: z.string().min(1).optional(),
  alternativas: z.record(z.unknown()).optional(),
  resposta_correta: z.string().min(1).optional(),
  explicacao: z.string().optional(),
  disciplina: z.string().min(1).max(100).optional(),
  assunto: z.string().optional(),
  dificuldade: z.enum(['facil', 'medio', 'dificil']).optional(),
  concurso_id: z.string().uuid().optional(),
  categoria_id: z.string().uuid().optional(),
  ativo: z.boolean().optional(),
  pontos: z.number().min(0).optional()
});

const createRespostaSchema = z.object({
  user_id: z.string().uuid(),
  questao_semanal_id: z.string().uuid(),
  resposta_escolhida: z.string().min(1, 'Resposta é obrigatória'),
  tempo_gasto_segundos: z.number().min(0).optional(),
  is_correta: z.boolean().optional(),
  pontos_ganhos: z.number().min(0).optional()
});

// Middleware de validação Express local
const createValidationMiddleware = (schema: z.ZodTypeAny, field: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = field === 'body' ? req.body : field === 'query' ? req.query : req.params;
      const result = schema.safeParse(data);
      if (!result.success) {
        const errors = result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));
        res.status(400).json({
          error: 'Dados inválidos',
          details: errors,
          code: 'VALIDATION_ERROR'
        });
        return;
      }
      if (field === 'body') {
        req.body = result.data;
      } else if (field === 'query') {
        req.query = result.data as Record<string, string | string[] | undefined>;
      } else {
        req.params = result.data as Record<string, string>;
      }
      next();
    } catch {
      res.status(500).json({
        error: 'Erro interno do servidor',
        code: 'VALIDATION_ERROR'
      });
    }
  };
};

// GET /api/questoes-semanais - Listar questões semanais
router.get('/', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10, ativo, disciplina, dificuldade, concurso_id, categoria_id } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    let query = supabase
      .from('questoes_semanais')
      .select(`
        *,
        concursos (
          id,
          nome,
          descricao,
          ano,
          banca
        ),
        disciplinas_categoria (
          id,
          nome,
          descricao,
          cor_primaria,
          cor_secundaria
        )
      `, { count: 'exact' });

    // Aplicar filtros
    if (ativo !== undefined) {
      query = query.eq('ativo', ativo);
    }
    if (disciplina) {
      query = query.ilike('disciplina', `%${disciplina}%`);
    }
    if (dificuldade) {
      query = query.eq('dificuldade', dificuldade);
    }
    if (concurso_id) {
      query = query.eq('concurso_id', concurso_id);
    }
    if (categoria_id) {
      query = query.eq('categoria_id', categoria_id);
    }

    const { data: questoes, error, count } = await query
      .order('criado_em', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) {
      logger.error('Erro ao buscar questões semanais:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    const totalPages = Math.ceil((count || 0) / Number(limit));

    res.json({
      success: true,
      data: questoes,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages
      }
    });
  } catch {
    logger.error('Erro na rota GET /questoes-semanais:', undefined, { error: 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/questoes-semanais/:id - Buscar questão específica
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: questao, error } = await supabase
      .from('questoes_semanais')
      .select(`
        *,
        concursos (
          id,
          nome,
          descricao,
          ano,
          banca
        ),
        disciplinas_categoria (
          id,
          nome,
          descricao,
          cor_primaria,
          cor_secundaria
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Questão não encontrada' });
        return;
      }
      logger.error('Erro ao buscar questão semanal:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    res.json({ success: true, data: questao });
  } catch {
    logger.error('Erro na rota GET /questoes-semanais/:id:', undefined, { error: 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/questoes-semanais - Criar nova questão
router.post('/', requireAuth, createValidationMiddleware(createQuestaoSemanalSchema, 'body'), async (req, res) => {
  try {
    const questaoData = req.body;

    const { data: questao, error } = await supabase
      .from('questoes_semanais')
      .insert([questaoData])
      .select()
      .single();

    if (error) {
      logger.error('Erro ao criar questão semanal:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    res.status(201).json({ success: true, data: questao });
  } catch {
    logger.error('Erro na rota POST /questoes-semanais:', undefined, { error: 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// PUT /api/questoes-semanais/:id - Atualizar questão
router.put('/:id', requireAuth, createValidationMiddleware(updateQuestaoSemanalSchema, 'body'), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const { data: questao, error } = await supabase
      .from('questoes_semanais')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        res.status(404).json({ error: 'Questão não encontrada' });
        return;
      }
      logger.error('Erro ao atualizar questão semanal:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    res.json({ success: true, data: questao });
  } catch {
    logger.error('Erro na rota PUT /questoes-semanais/:id:', undefined, { error: 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// DELETE /api/questoes-semanais/:id - Deletar questão
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('questoes_semanais')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Erro ao deletar questão semanal:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    res.json({ success: true });
  } catch {
    logger.error('Erro na rota DELETE /questoes-semanais/:id:', undefined, { error: 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// POST /api/questoes-semanais/:id/respostas - Criar resposta para questão
router.post('/:id/respostas', requireAuth, createValidationMiddleware(createRespostaSchema, 'body'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const respostaData = { ...req.body, user_id: userId };

    if (!userId) {
      res.status(401).json({ error: 'Usuário não autenticado' });
      return;
    }

    // Verificar se a questão existe
    const { data: questao, error: questaoError } = await supabase
      .from('questoes_semanais')
      .select('id, resposta_correta, pontos')
      .eq('id', id)
      .single();

    if (questaoError || !questao) {
      res.status(404).json({ error: 'Questão não encontrada' });
      return;
    }

    // Calcular se a resposta está correta e pontos ganhos
    const isCorreta = respostaData.resposta_escolhida === questao.resposta_correta;
    const pontosGanhos = isCorreta ? questao.pontos : 0;

    const respostaFinal = {
      ...respostaData,
      questao_semanal_id: id,
      is_correta: isCorreta,
      pontos_ganhos: pontosGanhos
    };

    const { data: resposta, error } = await supabase
      .from('respostas_questoes_semanais')
      .insert([respostaFinal])
      .select()
      .single();

    if (error) {
      logger.error('Erro ao criar resposta:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    res.status(201).json({ 
      success: true, 
      data: resposta,
      is_correta: isCorreta,
      pontos_ganhos: pontosGanhos
    });
  } catch {
    logger.error('Erro na rota POST /questoes-semanais/:id/respostas:', undefined, { error: 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/questoes-semanais/:id/respostas - Listar respostas de uma questão
router.get('/:id/respostas', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    const { data: respostas, error, count } = await supabase
      .from('respostas_questoes_semanais')
      .select(`
        *,
        usuarios (
          id,
          nome,
          email
        )
      `, { count: 'exact' })
      .eq('questao_semanal_id', id)
      .order('criado_em', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) {
      logger.error('Erro ao buscar respostas:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    const totalPages = Math.ceil((count || 0) / Number(limit));

    res.json({
      success: true,
      data: respostas,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages
      }
    });
  } catch {
    logger.error('Erro na rota GET /questoes-semanais/:id/respostas:', undefined, { error: 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// GET /api/questoes-semanais/stats/ranking - Ranking de usuários
router.get('/stats/ranking', requireAuth, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const { data: ranking, error } = await supabase
      .from('respostas_questoes_semanais')
      .select(`
        user_id,
        usuarios (
          id,
          nome,
          email
        )
      `)
      .eq('is_correta', true)
      .order('criado_em', { ascending: false })
      .limit(Number(limit));

    if (error) {
      logger.error('Erro ao buscar ranking:', undefined, { error: error.message });
      res.status(500).json({ error: 'Erro interno do servidor' });
      return;
    }

    // Agrupar por usuário e contar pontos
    const rankingMap = new Map();
    ranking?.forEach(resposta => {
      const userId = resposta.user_id;
      const user = resposta.usuarios;
      
      if (!rankingMap.has(userId)) {
        rankingMap.set(userId, {
          user_id: userId,
          user: user,
          total_pontos: 0,
          total_respostas_corretas: 0
        });
      }
      
      const userRanking = rankingMap.get(userId);
      userRanking.total_respostas_corretas += 1;
    });

    const rankingFinal = Array.from(rankingMap.values())
      .sort((a, b) => b.total_respostas_corretas - a.total_respostas_corretas)
      .slice(0, Number(limit));

    res.json({
      success: true,
      data: rankingFinal
    });
  } catch {
    logger.error('Erro na rota GET /questoes-semanais/stats/ranking:', undefined, { error: 'Erro desconhecido' });
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;