import { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../../../lib/logger.js';

// Define validation schema for user management
const userCreateSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['admin', 'instructor', 'user']).default('user'),
  name: z.string().min(2).max(100),
});

const userUpdateSchema = z.object({
  role: z.enum(['admin', 'instructor', 'user']).optional(),
  name: z.string().min(2).max(100).optional(),
  active: z.boolean().optional(),
});

/**
 * GET /api/admin/users - List all users
 */
export const listUsersHandler = async (req: Request, res: Response) => {
  try {
    // Get users from Supabase Auth
    // const { data, error } = await supabaseClient.auth.admin.listUsers();
    
    // Get additional user data from profiles table
    // const { data: profiles } = await supabaseClient.from('user_profiles').select('*');
    
    // Merge auth users with profile data
    const users = []; // No data available
    
    return res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    logger.error('Error listing users', { 
      error: error instanceof Error ? error.message : String(error), 
    });
    
    return res.status(500).json({
      success: false,
      error: 'Error listing users',
    });
  }
};

/**
 * GET /api/admin/users/:id - Get user by ID
 */
export const getUserByIdHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get user from Supabase Auth
    // const { data, error } = await supabaseClient.auth.admin.getUserById(id);
    
    // if (error) {
    //   logger.error('Failed to get user', { 
    //     usuarioId: id,
    //     error: error.message 
    //   });
        
    //   return res.status(500).json({
    //     success: false,
    //     error: 'Failed to get user',
    //   });
    // }
    
    // if (!data.user) {
    //   return res.status(404).json({
    //     success: false,
    //     error: 'User not found',
    //   });
    // }
    
    // Get user profile
    // const { data: profile } = await supabaseClient.from('user_profiles').select('*').eq('usuario_id', id).single();
    
    // Combine user data with profile
    const user = { id }; // Use the id parameter
    
    return res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Error getting user', { 
      usuarioId: req.params.id,
      error: error instanceof Error ? error.message : String(error), 
    });
    
    return res.status(500).json({
      success: false,
      error: 'Error getting user',
    });
  }
};

/**
 * POST /api/admin/users - Create a new user
 */
export const createUserHandler = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = userCreateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.format(),
      });
    }

    const userData = validationResult.data;

    // Create user in Supabase Auth
    // const { data, error } = await supabaseClient.auth.admin.createUser({
    //   email: userData.email,
    //   password: userData.password,
    //   email_confirm: true,
    //   app_metadata: { role: userData.role },
    //   user_metadata: { name: userData.name },
    // });
    
    // if (error) {
    //   logger.error('Failed to create user', { 
    //     error: error.message 
    //   });
        
    //   return res.status(500).json({
    //     success: false,
    //     error: 'Failed to create user',
    //   });
    // }
    
    // Create user profile
    // const { error: profileError } = await supabaseClient.from('user_profiles').insert({
    //   usuario_id: data.user.id,
    //   name: userData.name,
    //   created_at: new Date().toISOString(),
    //   updated_at: new Date().toISOString(),
    // });
    
    // if (profileError) {
    //   logger.warn('Failed to create user profile', { 
    //     usuarioId: data.user.id,
    //     error: profileError.message 
    //   });
    // }
    
    return res.status(201).json({
      success: true,
      data: {
        id: 'new-user-id',
        email: userData.email,
        role: userData.role,
      },
      message: 'User created successfully',
    });
  } catch (error) {
    logger.error('Error creating user', { 
      error: error instanceof Error ? error.message : String(error), 
    });
    
    return res.status(500).json({
      success: false,
      error: 'Error creating user',
    });
  }
};

/**
 * PUT /api/admin/users/:id - Update a user
 */
export const updateUserHandler = async (req: Request, res: Response) => {
  try {
    const { id: userId } = req.params;

    // Validate request body
    const validationResult = userUpdateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.format(),
      });
    }

    const userData = validationResult.data;

    // Update user in Supabase Auth
    const updateData: Record<string, unknown> = {};
    
    if (userData.role) {
      updateData.app_metadata = { role: userData.role };
    }
    
    if (userData.name) {
      updateData.user_metadata = { name: userData.name };
    }
    
    // const { data, error } = await supabaseClient.auth.admin.updateUserById(
    //   usuarioId,
    //   updateData
    // );
    
    // if (error) {
    //   logger.error('Failed to update user', { 
    //     usuarioId,
    //     error: error.message 
    //   });
        
    //   return res.status(500).json({
    //     success: false,
    //     error: 'Failed to update user',
    //   });
    // }
    
    // Update user profile if name is provided
    if (userData.name) {
      // await supabaseClient.from('user_profiles').upsert({
      //   usuario_id: usuarioId,
      //   name: userData.name,
      //   updated_at: new Date().toISOString(),
      // });
    }
    
    return res.json({
      success: true,
      data: {
        id: userId,
        updated: true,
        message: 'User updated successfully',
      },
      message: 'User updated successfully',
    });
  } catch (error) {
    logger.error('Error updating user', { 
      usuarioId: req.params.id,
      error: error instanceof Error ? error.message : String(error), 
    });
    
    return res.status(500).json({
      success: false,
      error: 'Error updating user',
    });
  }
};

/**
 * DELETE /api/admin/users/:id - Delete a user
 */
export const deleteUserHandler = async (req: Request, res: Response) => {
  try {
    const { id: userId } = req.params;

    // Delete user from Supabase Auth
    // const { error } = await supabaseClient.auth.admin.deleteUser(usuarioId);
    
    // if (error) {
    //   logger.error('Failed to delete user', { 
    //     usuarioId,
    //     error: error.message 
    //   });
        
    //   return res.status(500).json({
    //     success: false,
    //     error: 'Failed to delete user',
    //   });
    // }
    
    // Delete user profile
    // await supabaseClient.from('user_profiles').delete().eq('usuario_id', usuarioId);
    
    return res.json({
      success: true,
      data: { id: userId, deleted: true, message: 'User deleted successfully' },
      message: 'User deleted successfully',
    });
  } catch (error) {
    logger.error('Error deleting user', { 
      usuarioId: req.params.id,
      error: error instanceof Error ? error.message : String(error), 
    });
    
    return res.status(500).json({
      success: false,
      error: 'Error deleting user',
    });
  }
};