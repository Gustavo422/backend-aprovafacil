import { Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../../../config/supabase-unified.js';
import { logger } from '../../../lib/logger.js';

// Validation schema for enrollment
const enrollmentSchema = z.object({
  concurso_id: z.string().uuid(),
  categoria_ids: z.array(z.string().uuid()).optional(),
});

// Interface para request com usuário autenticado
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    [key: string]: unknown;
  };
}

/**
 * GET /api/concursos/enrollment - Get user enrollments
 */
export const getEnrollmentHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get user from auth middleware (assuming it's attached to req.user)
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    // Get concurso ID from URL if present
    const pathParts = req.path.split('/');
    const concursoId = pathParts[pathParts.length - 2]; // Assuming URL pattern is /concursos/{id}/enrollment
    
    // If concurso ID is provided, get specific enrollment
    if (concursoId && concursoId !== 'concursos') {
      return await getSpecificEnrollment(user.id, concursoId, res);
    }

    // Otherwise, get all user enrollments
    return await getAllUserEnrollments(user.id, res);
  } catch (error) {
    logger.error('Error handling get enrollments request', {
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      error: 'Error retrieving enrollments',
    });
  }
};

/**
 * POST /api/concursos/enrollment - Enroll user in concurso
 */
export const postEnrollmentHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get user from auth middleware
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    // Validate request body
    const validationResult = enrollmentSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.format(),
      });
    }

    const enrollmentData = validationResult.data;

    // Check if concurso exists
    const { data: concurso, error: concursoError } = await supabase
      .from('concursos')
      .select('id, nome, status')
      .eq('id', enrollmentData.concurso_id)
      .single();

    if (concursoError) {
      if (concursoError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'Concurso not found',
        });
      }

      logger.error('Error fetching concurso', {
        concursoId: enrollmentData.concurso_id,
        error: concursoError.message,
      });

      return res.status(500).json({
        success: false,
        error: 'Error retrieving concurso',
      });
    }

    // Check if concurso is active
    if (concurso.status !== 'ativo') {
      return res.status(400).json({
        success: false,
        error: 'Cannot enroll in inactive concurso',
      });
    }

    // Check if user is already enrolled
    const { data: existingEnrollment } = await supabase
      .from('user_concurso_enrollments')
      .select('id')
      .eq('usuario_id', user.id)
      .eq('concurso_id', enrollmentData.concurso_id)
      .single();

    if (existingEnrollment) {
      return res.status(409).json({
        success: false,
        error: 'User already enrolled in this concurso',
        code: 'ALREADY_ENROLLED',
      });
    }

    // Create enrollment
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('user_concurso_enrollments')
      .insert({
        usuario_id: user.id,
        concurso_id: enrollmentData.concurso_id,
        enrolled_at: new Date().toISOString(),
        status: 'active',
      })
      .select()
      .single();

    if (enrollmentError) {
      logger.error('Error creating enrollment', {
        usuarioId: user.id,
        concursoId: enrollmentData.concurso_id,
        error: enrollmentError.message,
      });

      return res.status(500).json({
        success: false,
        error: 'Error creating enrollment',
      });
    }

    // If categoria_ids are provided, create categoria enrollments
    if (enrollmentData.categoria_ids && enrollmentData.categoria_ids.length > 0) {
      const categoriaEnrollments = enrollmentData.categoria_ids.map(categoriaId => ({
        usuario_id: user.id,
        concurso_id: enrollmentData.concurso_id,
        categoria_id: categoriaId,
        enrolled_at: new Date().toISOString(),
        status: 'active',
      }));

      const { error: categoriaError } = await supabase
        .from('user_categoria_enrollments')
        .insert(categoriaEnrollments);

      if (categoriaError) {
        logger.error('Error creating categoria enrollments', {
          usuarioId: user.id,
          concursoId: enrollmentData.concurso_id,
          error: categoriaError.message,
        });
      }
    }

    // Create initial progress record
    await supabase
      .from('user_concurso_progress')
      .insert({
        usuario_id: user.id,
        concurso_id: enrollmentData.concurso_id,
        progress_percentage: 0,
        last_activity_at: new Date().toISOString(),
      });

    return res.status(201).json({
      success: true,
      data: {
        enrollment_id: enrollment.id,
        usuario_id: user.id,
        concurso_id: enrollmentData.concurso_id,
        concurso_name: concurso.nome,
        enrolled_at: enrollment.enrolled_at,
        status: enrollment.status,
      },
      message: 'Enrolled successfully',
    });
  } catch (error) {
    logger.error('Error handling enrollment request', {
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      error: 'Error processing enrollment',
    });
  }
};

/**
 * DELETE /api/concursos/enrollment - Cancel enrollment
 */
export const deleteEnrollmentHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get user from auth middleware
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    // Get concurso ID from URL
    const pathParts = req.path.split('/');
    const concursoId = pathParts[pathParts.length - 2]; // Assuming URL pattern is /concursos/{id}/enrollment
    
    if (!concursoId || concursoId === 'concursos') {
      return res.status(400).json({
        success: false,
        error: 'Concurso ID is required',
      });
    }

    // Check if enrollment exists
    const { data: existingEnrollment, error: checkError } = await supabase
      .from('user_concurso_enrollments')
      .select('id')
      .eq('usuario_id', user.id)
      .eq('concurso_id', concursoId)
      .single();

    if (checkError || !existingEnrollment) {
      return res.status(404).json({
        success: false,
        error: 'Enrollment not found',
      });
    }

    // Delete categoria enrollments first
    await supabase
      .from('user_categoria_enrollments')
      .delete()
      .eq('usuario_id', user.id)
      .eq('concurso_id', concursoId);

    // Delete progress records
    await supabase
      .from('user_concurso_progress')
      .delete()
      .eq('usuario_id', user.id)
      .eq('concurso_id', concursoId);

    // Delete enrollment
    const { error } = await supabase
      .from('user_concurso_enrollments')
      .delete()
      .eq('usuario_id', user.id)
      .eq('concurso_id', concursoId);

    if (error) {
      logger.error('Error deleting enrollment', {
        usuarioId: user.id,
        concursoId,
        error: error.message,
      });

      return res.status(500).json({
        success: false,
        error: 'Error canceling enrollment',
      });
    }

    return res.json({
      success: true,
      data: { canceled: true },
      message: 'Enrollment canceled successfully',
    });
  } catch (error) {
    logger.error('Error handling cancel enrollment request', {
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      error: 'Error canceling enrollment',
    });
  }
};

// Helper functions
async function getAllUserEnrollments(usuarioId: string, res: Response) {
  const { data, error } = await supabase
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
    .eq('usuario_id', usuarioId);

  if (error) {
    logger.error('Error fetching user enrollments', {
      usuarioId,
      error: error.message,
    });

    return res.status(500).json({
      success: false,
      error: 'Error retrieving enrollments',
    });
  }

  return res.json({
    success: true,
    data: data || [],
  });
}

async function getSpecificEnrollment(usuarioId: string, concursoId: string, res: Response) {
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
    .eq('usuario_id', usuarioId)
    .eq('concurso_id', concursoId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Enrollment not found',
      });
    }

    logger.error('Error fetching enrollment', {
      usuarioId,
      concursoId,
      error: error.message,
    });

    return res.status(500).json({
      success: false,
      error: 'Error retrieving enrollment',
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
    .eq('usuario_id', usuarioId)
    .eq('concurso_id', concursoId);

  // Get progress
  const { data: progress } = await supabase
    .from('user_concurso_progress')
    .select('progress_percentage, last_activity_at')
    .eq('usuario_id', usuarioId)
    .eq('concurso_id', concursoId)
    .single();

  const response = {
    id: enrollment.id,
    enrolled_at: enrollment.enrolled_at,
    status: enrollment.status,
    concurso: enrollment.concursos,
    categorias: categoriaEnrollments || [],
    progress: progress || { progress_percentage: 0, last_activity_at: enrollment.enrolled_at },
  };

  return res.json({
    success: true,
    data: response,
  });
}