import { NextRequest } from 'next/server';
import { BaseRouteHandler } from '../../../core/api/base-route-handler';
import { ResponseFormatter } from '../../../core/api/response-formatter';
import { supabase } from '../../../config/supabase';
import { requestLoggingMiddleware, corsMiddleware } from '../../../core/api';
import { URL } from 'url';

/**
 * Concurso statistics API route handler
 */
export class ConcursoStatisticsRouteHandler extends BaseRouteHandler {
  constructor() {
    super('statistics');
    
    // Add middleware
    this.use(requestLoggingMiddleware)
      .use(corsMiddleware);
  }

  /**
   * Handle GET request - Get concurso statistics
   */
  protected async handleGET(
    request: NextRequest,
    context: { requestId: string }
  ): Promise<unknown> {
    try {
      // Get concurso ID from URL
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const concursoId = pathParts[pathParts.length - 2]; // Assuming URL pattern is /concursos/{id}/statistics
      
      if (!concursoId) {
        return ResponseFormatter.error('Concurso ID is required', {
          status: 400,
          requestId: context.requestId,
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
          return ResponseFormatter.notFoundError('Concurso not found', context.requestId);
        }

        this.logger.error('Error fetching concurso', {
          requestId: context.requestId,
          concursoId,
          error: concursoError.message,
        });

        return ResponseFormatter.error('Error retrieving concurso', {
          status: 500,
          requestId: context.requestId,
        });
      }

      // Get categories count
      const { count: categoriesCount, error: categoriesError } = await supabase
        .from('concurso_categorias')
        .select('*', { count: 'exact', head: true })
        .eq('concurso_id', concursoId);

      if (categoriesError) {
        this.logger.error('Error counting categories', {
          requestId: context.requestId,
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
        this.logger.error('Error counting enrollments', {
          requestId: context.requestId,
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
        this.logger.error('Error counting materials', {
          requestId: context.requestId,
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
        this.logger.error('Error fetching progress data', {
          requestId: context.requestId,
          concursoId,
          error: progressError.message,
        });
      }

      // Calculate average progress
      const progressValues = progressData?.map(p => p.progress_percentage) || [];
      const averageProgress = progressValues.length > 0
        ? progressValues.reduce((sum, val) => sum + val, 0) / progressValues.length
        : 0;

      // Return statistics
      return ResponseFormatter.success({
        concurso: {
          id: concurso.id,
          nome: concurso.nome,
        },
        statistics: {
          categories_count: categoriesCount || 0,
          enrollments_count: enrollmentsCount || 0,
          materials_count: materialsCount || 0,
          average_progress: Math.round(averageProgress * 100) / 100, // Round to 2 decimal places
          progress_distribution: this.calculateProgressDistribution(progressValues),
        },
      }, { requestId: context.requestId });
    } catch (error) {
      this.logger.error('Error handling concurso statistics request', {
        requestId: context.requestId,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error retrieving concurso statistics', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Calculate progress distribution
   */
  private calculateProgressDistribution(progressValues: number[]): Record<string, number> {
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
}

// Create route handler
const concursoStatisticsRouteHandler = new ConcursoStatisticsRouteHandler();
const routeHandlers = concursoStatisticsRouteHandler.createRouteHandlers();

// Export route handlers for Next.js App Router
export const GET = routeHandlers.GET;