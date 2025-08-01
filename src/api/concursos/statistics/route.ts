import { Request, Response } from 'express';
import { supabase } from '../../../config/supabase-unified.js';
import { logger } from '../../../lib/logger.js';

/**
 * GET /api/concursos/statistics - Get concurso statistics
 */
export const getConcursoStatisticsHandler = async (req: Request, res: Response) => {
  try {
    // Get concurso ID from URL
    const pathParts = req.path.split('/');
    const concursoId = pathParts[pathParts.length - 2]; // Assuming URL pattern is /concursos/{id}/statistics
    
    if (!concursoId) {
      return res.status(400).json({
        success: false,
        error: 'Concurso ID is required',
      });
    }

    // Check if concurso exists
    const { data: concurso, error: concursoError } = await supabase
      .from('concursos')
      .select('id, nome')
      .eq('id', concursoId)
      .single();

    if (concursoError) {
      if (concursoError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Concurso not found',
        });
      }

      logger.error('Error fetching concurso', {
        concursoId,
        error: concursoError.message,
      });

      return res.status(500).json({
        success: false,
        error: 'Error retrieving concurso',
      });
    }

    // Get categories count
    const { count: categoriesCount, error: categoriesError } = await supabase
      .from('concurso_categorias')
      .select('*', { count: 'exact', head: true })
      .eq('concurso_id', concursoId);

    if (categoriesError) {
      logger.error('Error counting categories', {
        concursoId,
        error: categoriesError.message,
      });
    }

    // Get user enrollments count
    const { count: enrollmentsCount, error: enrollmentsError } = await supabase
      .from('user_concurso_enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('concurso_id', concursoId);

    if (enrollmentsError) {
      logger.error('Error counting enrollments', {
        concursoId,
        error: enrollmentsError.message,
      });
    }

    // Get study materials count
    const { count: materialsCount, error: materialsError } = await supabase
      .from('concurso_materiais')
      .select('*', { count: 'exact', head: true })
      .eq('concurso_id', concursoId);

    if (materialsError) {
      logger.error('Error counting materials', {
        concursoId,
        error: materialsError.message,
      });
    }

    // Get user progress statistics
    const { data: progressData, error: progressError } = await supabase
      .from('user_concurso_progress')
      .select('progress_percentage')
      .eq('concurso_id', concursoId);

    if (progressError) {
      logger.error('Error fetching progress data', {
        concursoId,
        error: progressError.message,
      });
    }

    // Calculate average progress
    const progressValues = progressData?.map(p => p.progress_percentage) || [];
    const averageProgress = progressValues.length > 0
      ? progressValues.reduce((sum, val) => sum + val, 0) / progressValues.length
      : 0;

    // Calculate progress distribution
    const progressDistribution = calculateProgressDistribution(progressValues);

    // Return statistics
    return res.json({
      success: true,
      data: {
        concurso: {
          id: concurso.id,
          nome: concurso.nome,
        },
        statistics: {
          categories_count: categoriesCount || 0,
          enrollments_count: enrollmentsCount || 0,
          materials_count: materialsCount || 0,
          average_progress: Math.round(averageProgress * 100) / 100, // Round to 2 decimal places
          progress_distribution: progressDistribution,
        },
      },
    });
  } catch (error) {
    logger.error('Error handling concurso statistics request', {
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      error: 'Error retrieving concurso statistics',
    });
  }
};

/**
 * Calculate progress distribution
 */
function calculateProgressDistribution(progressValues: number[]): Record<string, number> {
  const distribution: Record<string, number> = {
    '0-25': 0,
    '26-50': 0,
    '51-75': 0,
    '76-100': 0,
  };

  progressValues.forEach(progress => {
    if (progress <= 25) {
      distribution['0-25']++;
    } else if (progress <= 50) {
      distribution['26-50']++;
    } else if (progress <= 75) {
      distribution['51-75']++;
    } else {
      distribution['76-100']++;
    }
  });

  return distribution;
}