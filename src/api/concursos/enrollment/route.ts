import { NextRequest } from 'next/server';
import { z } from 'zod';
import { BaseRouteHandler } from '../../../core/api/base-route-handler';
import { ResponseFormatter } from '../../../core/api/response-formatter';
import { supabase } from '../../../config/supabase';
import { requestLoggingMiddleware, corsMiddleware } from '../../../core/api';
import { URL } from 'url';

/**
 * Concurso enrollment API route handler
 */
export class ConcursoEnrollmentRouteHandler extends BaseRouteHandler {
  constructor() {
    super('enrollment');
    
    // Add middleware
    this.use(requestLoggingMiddleware)
      .use(corsMiddleware);
  }

  /**
   * Get validation schema for enrollment
   */
  protected getPOSTBodySchema(): z.ZodSchema {
    return z.object({
      concurso_id: z.string().uuid(),
      categoria_ids: z.array(z.string().uuid()).optional(),
    });
  }

  /**
   * Handle GET request - Get user enrollments
   */
  protected async handleGET(
    request: NextRequest,
    context: { requestId: string }
  ): Promise<unknown> {
    try {
      // Get user from context (added by auth middleware)
      const user = (request as { context?: { user?: { id: string; role?: string } } }).context?.user;
      
      if (!user) {
        return ResponseFormatter.authError('User not authenticated', context.requestId);
      }

      // Get concurso ID from URL if present
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const concursoId = pathParts[pathParts.length - 2]; // Assuming URL pattern is /concursos/{id}/enrollment
      
      // If concurso ID is provided, get specific enrollment
      if (concursoId && concursoId !== 'concursos') {
        return this.getUserConcursoEnrollment(user.id, concursoId, context.requestId);
      }

      // Otherwise, get all user enrollments
      return this.getUserEnrollments(user.id, context.requestId);
    } catch (error) {
      this.logger.error('Error handling get enrollments request', {
        requestId: context.requestId,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error retrieving enrollments', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Handle POST request - Enroll user in concurso
   */
  protected async handlePOST(
    request: NextRequest,
    context: {
      body?: unknown;
      requestId: string;
    }
  ): Promise<unknown> {
    try {
      // Get user from context (added by auth middleware)
      const user = (request as { context?: { user?: { id: string; role?: string } } }).context?.user;
      
      if (!user) {
        return ResponseFormatter.authError('User not authenticated', context.requestId);
      }

      const enrollmentData = context.body as {
        concurso_id: string;
        categoria_ids?: string[];
      };

      // Check if concurso exists
      const { data: concurso, error: concursoError } = await supabase
        .from('concursos')
        .select('id, nome, status')
        .eq('id', enrollmentData.concurso_id)
        .single();

      if (concursoError) {
        if (concursoError.code === 'PGRST116') {
          return ResponseFormatter.notFoundError('Concurso not found', context.requestId);
        }

        this.logger.error('Error fetching concurso', {
          requestId: context.requestId,
          concursoId: enrollmentData.concurso_id,
          error: concursoError.message,
        });

        return ResponseFormatter.error('Error retrieving concurso', {
          status: 500,
          requestId: context.requestId,
        });
      }

      // Check if concurso is active
      if (concurso.status !== 'ativo') {
        return ResponseFormatter.error('Cannot enroll in inactive concurso', {
          status: 400,
          requestId: context.requestId,
        });
      }

      // Check if user is already enrolled
      const { data: existingEnrollment } = await supabase
        .from('user_concurso_enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('concurso_id', enrollmentData.concurso_id)
        .single();

      if (existingEnrollment) {
        return ResponseFormatter.error('User already enrolled in this concurso', {
          status: 409,
          code: 'ALREADY_ENROLLED',
          requestId: context.requestId,
        });
      }

      // Create enrollment
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('user_concurso_enrollments')
        .insert({
          user_id: user.id,
          concurso_id: enrollmentData.concurso_id,
          enrolled_at: new Date().toISOString(),
          status: 'active',
        })
        .select()
        .single();

      if (enrollmentError) {
        this.logger.error('Error creating enrollment', {
          requestId: context.requestId,
          userId: user.id,
          concursoId: enrollmentData.concurso_id,
          error: enrollmentError.message,
        });

        return ResponseFormatter.error('Error creating enrollment', {
          status: 500,
          requestId: context.requestId,
        });
      }

      // If categoria_ids are provided, create categoria enrollments
      if (enrollmentData.categoria_ids && enrollmentData.categoria_ids.length > 0) {
        const categoriaEnrollments = enrollmentData.categoria_ids.map(categoriaId => ({
          user_id: user.id,
          concurso_id: enrollmentData.concurso_id,
          categoria_id: categoriaId,
          enrolled_at: new Date().toISOString(),
          status: 'active',
        }));

        const { error: categoriaError } = await supabase
          .from('user_categoria_enrollments')
          .insert(categoriaEnrollments);

        if (categoriaError) {
          this.logger.error('Error creating categoria enrollments', {
            requestId: context.requestId,
            userId: user.id,
            concursoId: enrollmentData.concurso_id,
            error: categoriaError.message,
          });
        }
      }

      // Create initial progress record
      await supabase
        .from('user_concurso_progress')
        .insert({
          user_id: user.id,
          concurso_id: enrollmentData.concurso_id,
          progress_percentage: 0,
          last_activity_at: new Date().toISOString(),
        });

      return ResponseFormatter.success(
        {
          enrollment_id: enrollment.id,
          user_id: user.id,
          concurso_id: enrollmentData.concurso_id,
          concurso_name: concurso.nome,
          enrolled_at: enrollment.enrolled_at,
          status: enrollment.status,
        },
        {
          status: 201,
          requestId: context.requestId,
          message: 'Enrolled successfully',
        }
      );
    } catch (error) {
      this.logger.error('Error handling enrollment request', {
        requestId: context.requestId,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error processing enrollment', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Handle DELETE request - Cancel enrollment
   */
  protected async handleDELETE(
    request: NextRequest,
    context: { requestId: string }
  ): Promise<unknown> {
    try {
      // Get user from context (added by auth middleware)
      const user = (request as { context?: { user?: { id: string; role?: string } } }).context?.user;
      
      if (!user) {
        return ResponseFormatter.authError('User not authenticated', context.requestId);
      }

      // Get concurso ID from URL
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const concursoId = pathParts[pathParts.length - 2]; // Assuming URL pattern is /concursos/{id}/enrollment
      
      if (!concursoId || concursoId === 'concursos') {
        return ResponseFormatter.error('Concurso ID is required', {
          status: 400,
          requestId: context.requestId,
        });
      }

      // Check if enrollment exists
      const { data: existingEnrollment, error: checkError } = await supabase
        .from('user_concurso_enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('concurso_id', concursoId)
        .single();

      if (checkError || !existingEnrollment) {
        return ResponseFormatter.notFoundError('Enrollment not found', context.requestId);
      }

      // Delete categoria enrollments first
      await supabase
        .from('user_categoria_enrollments')
        .delete()
        .eq('user_id', user.id)
        .eq('concurso_id', concursoId);

      // Delete progress records
      await supabase
        .from('user_concurso_progress')
        .delete()
        .eq('user_id', user.id)
        .eq('concurso_id', concursoId);

      // Delete enrollment
      const { error } = await supabase
        .from('user_concurso_enrollments')
        .delete()
        .eq('user_id', user.id)
        .eq('concurso_id', concursoId);

      if (error) {
        this.logger.error('Error deleting enrollment', {
          requestId: context.requestId,
          userId: user.id,
          concursoId,
          error: error.message,
        });

        return ResponseFormatter.error('Error canceling enrollment', {
          status: 500,
          requestId: context.requestId,
        });
      }

      return ResponseFormatter.success(
        { canceled: true },
        {
          requestId: context.requestId,
          message: 'Enrollment canceled successfully',
        }
      );
    } catch (error) {
      this.logger.error('Error handling cancel enrollment request', {
        requestId: context.requestId,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error canceling enrollment', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Get all enrollments for a user
   */
  private async getUserEnrollments(userId: string, requestId: string): Promise<unknown> {
    // Get user enrollments with concurso details
    const { data, error }: { data: unknown; error: unknown } = await supabase
      .from('user_concurso_enrollments')
      .select(`
        id,
        enrolled_at,
        status,
        concursos:concurso_id (
          id,
          nome,
          organizador,
          data_prova,
          status
        )
      `)
      .eq('user_id', userId);

    if (error) {
      this.logger.error('Error fetching user enrollments', {
        requestId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error retrieving enrollments', {
        status: 500,
        requestId,
      });
    }

    // Format enrollments
    const enrollments = Array.isArray(data) ? data.map((item: unknown) => {
      if (typeof item === 'object' && item !== null && 'id' in item && 'enrolled_at' in item) {
        return {
          id: (item as { id: string }).id,
          enrolled_at: (item as { enrolled_at: string }).enrolled_at,
          // ... outros campos conforme necessário
        };
      }
      return undefined;
    }).filter(Boolean) : [];

    return ResponseFormatter.success(enrollments, { requestId });
  }

  /**
   * Get specific enrollment for a user
   */
  private async getUserConcursoEnrollment(userId: string, concursoId: string, requestId: string): Promise<unknown> {
    // Get enrollment
    const { data: enrollment, error } = await supabase
      .from('user_concurso_enrollments')
      .select(`
        id,
        enrolled_at,
        status,
        concursos:concurso_id (
          id,
          nome,
          organizador,
          data_prova,
          status
        )
      `)
      .eq('user_id', userId)
      .eq('concurso_id', concursoId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return ResponseFormatter.notFoundError('Enrollment not found', requestId);
      }

      this.logger.error('Error fetching enrollment', {
        requestId,
        userId,
        concursoId,
        error: error.message,
      });

      return ResponseFormatter.error('Error retrieving enrollment', {
        status: 500,
        requestId,
      });
    }

    // Get categoria enrollments
    const { data: categoriaEnrollments } = await supabase
      .from('user_categoria_enrollments')
      .select(`
        id,
        enrolled_at,
        status,
        categorias:categoria_id (
          id,
          nome
        )
      `)
      .eq('user_id', userId)
      .eq('concurso_id', concursoId);

    // Get progress
    const { data: progress } = await supabase
      .from('user_concurso_progress')
      .select('progress_percentage, last_activity_at')
      .eq('user_id', userId)
      .eq('concurso_id', concursoId)
      .single();

    // Format response
    const response = {
      id: enrollment.id,
      enrolled_at: enrollment.enrolled_at,
      status: enrollment.status,
      concurso: enrollment.concursos,
      categorias: Array.isArray(categoriaEnrollments) ? categoriaEnrollments.map((item: unknown) => {
        if (typeof item === 'object' && item !== null && 'categorias' in item) {
          return (item as { categorias: unknown }).categorias;
        }
        return undefined;
      }).filter(Boolean) : [],
      progress: progress || { progress_percentage: 0, last_activity_at: enrollment.enrolled_at },
    };

    return ResponseFormatter.success(response, { requestId });
  }
}

// Create route handler
const concursoEnrollmentRouteHandler = new ConcursoEnrollmentRouteHandler();
const routeHandlers = concursoEnrollmentRouteHandler.createRouteHandlers();

// Export route handlers for Next.js App Router
export const GET = routeHandlers.GET;
export const POST = routeHandlers.POST;
export const DELETE = routeHandlers.DELETE;