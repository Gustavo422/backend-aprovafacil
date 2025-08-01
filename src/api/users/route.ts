import { Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../../config/supabase-unified.js';
import { logger } from '../../lib/logger.js';

interface User extends Record<string, unknown> {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['user', 'admin']).default('user'),
  active: z.boolean().default(true),
});

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  role: z.enum(['user', 'admin']).optional(),
  active: z.boolean().optional(),
});

/**
 * GET /api/users - List users with pagination and filters
 */
export const getUsersHandler = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 10,
      sort = 'criado_em',
      order = 'desc',
      search,
      role,
      active,
    } = req.query as {
      page?: number;
      limit?: number;
      sort?: string;
      order?: 'asc' | 'desc';
      search?: string;
      role?: string;
      active?: boolean;
    };

    let supabaseQuery = supabase
      .from('usuarios')
      .select('*');

    // Apply filters
    if (search) {
      supabaseQuery = supabaseQuery.or(`nome.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (role) {
      supabaseQuery = supabaseQuery.eq('role', role);
    }

    if (active !== undefined) {
      supabaseQuery = supabaseQuery.eq('ativo', active);
    }

    // Apply sorting
    supabaseQuery = supabaseQuery.order(sort, { ascending: order === 'asc' });

    // Apply pagination
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const offset = (pageNum - 1) * limitNum;
    supabaseQuery = supabaseQuery.range(offset, offset + limitNum - 1);

    const { data: users, error, count } = await supabaseQuery;

    if (error) {
      logger.error('Error retrieving users', { error: error.message });
      return res.status(500).json({
        success: false,
        error: 'Error retrieving users',
      });
    }

    // Transform data to match expected format
    const transformedUsers = users?.map(user => ({
      id: user.id,
      email: user.email,
      name: user.nome,
      role: user.role,
      active: user.ativo,
      created_at: user.criado_em,
      updated_at: user.atualizado_em,
    })) || [];

    return res.json({
      success: true,
      data: {
        data: transformedUsers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: count || transformedUsers.length,
          totalPages: Math.ceil((count || transformedUsers.length) / limitNum),
        },
      },
    });
  } catch (error) {
    logger.error('Error in getUsersHandler', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({
      success: false,
      error: 'Error retrieving users',
    });
  }
};

/**
 * GET /api/users/:id - Get user by ID
 */
export const getUserByIdHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', id)
      .single();

    if (userError || !userData) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Transform data to match expected format
    const user: User = {
      id: userData.id,
      email: userData.email,
      name: userData.nome,
      role: userData.role,
      active: userData.ativo,
      created_at: userData.criado_em,
      updated_at: userData.atualizado_em,
    };

    return res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Error in getUserByIdHandler', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({
      success: false,
      error: 'Error retrieving user',
    });
  }
};

/**
 * POST /api/users - Create new user
 */
export const createUserHandler = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = createUserSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.format(),
      });
    }

    const data = validationResult.data;

    // Check if user with email already exists
    const { data: existingUser } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', data.email)
      .single();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists',
        code: 'USER_EXISTS',
      });
    }

    // Create user in database
    const { data: newUser, error: userError } = await supabase
      .from('usuarios')
      .insert({
        email: data.email,
        nome: data.name,
        role: data.role,
        ativo: data.active !== undefined ? data.active : true,
        senha_hash: '', // Will be set by auth system
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
      })
      .select()
      .single();

    if (userError) {
      logger.error('Error creating user', { error: userError.message });
      return res.status(500).json({
        success: false,
        error: 'Error creating user',
      });
    }

    // Transform data to match expected format
    const user: User = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.nome,
      role: newUser.role,
      active: newUser.ativo,
      created_at: newUser.criado_em,
      updated_at: newUser.atualizado_em,
    };

    return res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Error in createUserHandler', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({
      success: false,
      error: 'Error creating user',
    });
  }
};

/**
 * PUT /api/users/:id - Update user (full update)
 */
export const updateUserHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate request body
    const validationResult = updateUserSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.format(),
      });
    }

    const data = validationResult.data;

    // Check if user exists
    const { data: existingUser, error: userError } = await supabase
      .from('usuarios')
      .select('id')
      .eq('id', id)
      .single();

    if (userError || !existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Update user
    const { data: updatedUser, error: updateError } = await supabase
      .from('usuarios')
      .update({
        email: data.email,
        nome: data.name,
        role: data.role,
        ativo: data.active,
        atualizado_em: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      logger.error('Error updating user', { error: updateError.message });
      return res.status(500).json({
        success: false,
        error: 'Error updating user',
      });
    }

    // Transform data to match expected format
    const user: User = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.nome,
      role: updatedUser.role,
      active: updatedUser.ativo,
      created_at: updatedUser.criado_em,
      updated_at: updatedUser.atualizado_em,
    };

    return res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Error in updateUserHandler', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({
      success: false,
      error: 'Error updating user',
    });
  }
};

/**
 * PATCH /api/users/:id - Update user (partial update)
 */
export const patchUserHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate request body
    const validationResult = updateUserSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.format(),
      });
    }

    const data = validationResult.data;

    // Check if user exists
    const { data: existingUser, error: userError } = await supabase
      .from('usuarios')
      .select('id')
      .eq('id', id)
      .single();

    if (userError || !existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      atualizado_em: new Date().toISOString(),
    };

    if (data.email !== undefined) updateData.email = data.email;
    if (data.name !== undefined) updateData.nome = data.name;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.active !== undefined) updateData.ativo = data.active;

    // Update user
    const { data: updatedUser, error: updateError } = await supabase
      .from('usuarios')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      logger.error('Error updating user', { error: updateError.message });
      return res.status(500).json({
        success: false,
        error: 'Error updating user',
      });
    }

    // Transform data to match expected format
    const user: User = {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.nome,
      role: updatedUser.role,
      active: updatedUser.ativo,
      created_at: updatedUser.criado_em,
      updated_at: updatedUser.atualizado_em,
    };

    return res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Error in patchUserHandler', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({
      success: false,
      error: 'Error updating user',
    });
  }
};

/**
 * DELETE /api/users/:id - Delete user
 */
export const deleteUserHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const { data: existingUser, error: userError } = await supabase
      .from('usuarios')
      .select('id')
      .eq('id', id)
      .single();

    if (userError || !existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Delete user
    const { error: deleteError } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', id);

    if (deleteError) {
      logger.error('Error deleting user', { error: deleteError.message });
      return res.status(500).json({
        success: false,
        error: 'Error deleting user',
      });
    }

    return res.json({
      success: true,
      data: { message: 'User deleted successfully' },
    });
  } catch (error) {
    logger.error('Error in deleteUserHandler', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({
      success: false,
      error: 'Error deleting user',
    });
  }
};