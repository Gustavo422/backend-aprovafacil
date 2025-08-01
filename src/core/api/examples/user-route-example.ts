import { Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../../../config/supabase-unified.js';
import { logger } from '../../../lib/logger.js';

// Define user interface
interface User extends Record<string, unknown> {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  created_at: string;
  updated_at: string;
  profile?: {
    bio?: string;
    avatar_url?: string;
    preferences?: Record<string, unknown>;
  };
}

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  role: z.enum(['admin', 'instructor', 'user']).default('user'),
  active: z.boolean().default(true),
  profile: z.object({
    bio: z.string().max(500).optional(),
    avatar_url: z.string().url().optional(),
    preferences: z.record(z.unknown()).optional(),
  }).optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  role: z.enum(['admin', 'instructor', 'user']).optional(),
  active: z.boolean().optional(),
  profile: z.object({
    bio: z.string().max(500).optional(),
    avatar_url: z.string().url().optional(),
    preferences: z.record(z.unknown()).optional(),
  }).optional(),
});

const querySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
  role: z.string().optional(),
  active: z.string().optional().transform(val => val === 'true'),
});

/**
 * GET /api/users - List users
 */
export const listUsersHandler = async (req: Request, res: Response) => {
  try {
    // Validate query parameters
    const validationResult = querySchema.safeParse(req.query);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: validationResult.error.format(),
      });
    }

    const {
      page = 1,
      limit = 10,
      sort = 'created_at',
      order = 'desc',
      search,
      role,
      active,
    } = validationResult.data;

    // Start building the query
    let usersQuery = supabase
      .from('users')
      .select('*, profiles(*)');

    // Apply filters
    if (search) {
      usersQuery = usersQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (role) {
      usersQuery = usersQuery.eq('role', role);
    }

    if (active !== undefined) {
      usersQuery = usersQuery.eq('active', active);
    }

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      logger.error('Error counting users', {
        error: countError.message,
      });

      return res.status(500).json({
        success: false,
        error: 'Error retrieving users',
      });
    }

    // Apply pagination and sorting
    const { data, error } = await usersQuery
      .order(sort, { ascending: order === 'asc' })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      logger.error('Error fetching users', {
        error: error.message,
      });

      return res.status(500).json({
        success: false,
        error: 'Error retrieving users',
      });
    }

    // Format users
    const users = data.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      active: user.active,
      created_at: user.created_at,
      updated_at: user.updated_at,
      profile: user.profiles,
    }));

    // Calculate pagination info
    const totalPages = Math.ceil((count || 0) / limit);

    return res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
      },
    });
  } catch (error) {
    logger.error('Error handling user list request', {
      error: error instanceof Error ? error.message : String(error),
    });

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
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (userError) {
      if (userError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      logger.error('Error fetching user', {
        usuarioId: id,
        error: userError.message,
      });

      return res.status(500).json({
        success: false,
        error: 'Error retrieving user',
      });
    }

    // Get user profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('usuario_id', id)
      .single();

    // Combine user data with profile
    const user: User = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      active: userData.active,
      created_at: userData.created_at,
      updated_at: userData.updated_at,
      profile: profileData || undefined,
    };

    return res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error('Error handling get user request', {
      usuarioId: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      error: 'Error retrieving user',
    });
  }
};

/**
 * POST /api/users - Create user
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
      .from('users')
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

    // Create user in auth system
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      email_confirm: true,
      app_metadata: { role: data.role },
      user_metadata: { name: data.name },
    });

    if (authError) {
      logger.error('Error creating user in auth system', {
        error: authError.message,
      });

      return res.status(500).json({
        success: false,
        error: 'Error creating user',
      });
    }

    // Create user in database
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        email: data.email,
        name: data.name,
        role: data.role,
        active: data.active !== undefined ? data.active : true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (userError) {
      logger.error('Error creating user in database', {
        error: userError.message,
      });

      // Try to clean up auth user
      await supabase.auth.admin.deleteUser(authUser.user.id);

      return res.status(500).json({
        success: false,
        error: 'Error creating user',
      });
    }

    // Create user profile if provided
    if (data.profile) {
      await supabase
        .from('profiles')
        .insert({
          usuario_id: newUser.id,
          bio: data.profile.bio,
          avatar_url: data.profile.avatar_url,
          preferences: data.profile.preferences,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
    }

    return res.status(201).json({
      success: true,
      data: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        active: newUser.active,
        created_at: newUser.created_at,
        updated_at: newUser.updated_at,
        profile: data.profile,
      },
      message: 'User created successfully',
    });
  } catch (error) {
    logger.error('Error handling create user request', {
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      error: 'Error creating user',
    });
  }
};

/**
 * PUT /api/users/:id - Update user
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
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Update user in database
    const { data: updatedUser, error: userError } = await supabase
      .from('users')
      .update({
        name: data.name,
        role: data.role,
        active: data.active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (userError) {
      logger.error('Error updating user', {
        usuarioId: id,
        error: userError.message,
      });

      return res.status(500).json({
        success: false,
        error: 'Error updating user',
      });
    }

    // Update user in auth system
    await supabase.auth.admin.updateUserById(id, {
      app_metadata: { role: data.role },
      user_metadata: { name: data.name },
    });

    // Update user profile if provided
    if (data.profile) {
      await supabase
        .from('profiles')
        .upsert({
          usuario_id: id,
          bio: data.profile.bio,
          avatar_url: data.profile.avatar_url,
          preferences: data.profile.preferences,
          updated_at: new Date().toISOString(),
        });
    }

    return res.json({
      success: true,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        active: updatedUser.active,
        created_at: updatedUser.created_at,
        updated_at: updatedUser.updated_at,
        profile: data.profile,
      },
      message: 'User updated successfully',
    });
  } catch (error) {
    logger.error('Error handling update user request', {
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
 * PATCH /api/users/:id - Partial update user
 */
export const partialUpdateUserHandler = async (req: Request, res: Response) => {
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
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // Add fields to update
    if (data.name !== undefined) updateData.name = data.name;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.active !== undefined) updateData.active = data.active;

    // Update user in database
    const { data: updatedUser, error: userError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (userError) {
      logger.error('Error updating user', {
        usuarioId: id,
        error: userError.message,
      });

      return res.status(500).json({
        success: false,
        error: 'Error updating user',
      });
    }

    // Update user in auth system if role or name changed
    if (data.role !== undefined || data.name !== undefined) {
      const authUpdateData: Record<string, unknown> = {};
      
      if (data.role !== undefined) {
        authUpdateData.app_metadata = { role: data.role };
      }
      
      if (data.name !== undefined) {
        authUpdateData.user_metadata = { name: data.name };
      }
      
      await supabase.auth.admin.updateUserById(id, authUpdateData);
    }

    // Update user profile if provided
    if (data.profile) {
      await supabase
        .from('profiles')
        .upsert({
          usuario_id: id,
          ...(data.profile.bio !== undefined && { bio: data.profile.bio }),
          ...(data.profile.avatar_url !== undefined && { avatar_url: data.profile.avatar_url }),
          ...(data.profile.preferences !== undefined && { preferences: data.profile.preferences }),
          updated_at: new Date().toISOString(),
        });
    }

    // Get updated profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('usuario_id', id)
      .single();

    return res.json({
      success: true,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        active: updatedUser.active,
        created_at: updatedUser.created_at,
        updated_at: updatedUser.updated_at,
        profile: profileData || undefined,
      },
      message: 'User updated successfully',
    });
  } catch (error) {
    logger.error('Error handling partial update user request', {
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
 * DELETE /api/users/:id - Delete user
 */
export const deleteUserHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Delete user from database
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (deleteError) {
      logger.error('Error deleting user from database', {
        usuarioId: id,
        error: deleteError.message,
      });

      return res.status(500).json({
        success: false,
        error: 'Error deleting user',
      });
    }

    // Delete user from auth system
    const { error: authError } = await supabase.auth.admin.deleteUser(id);

    if (authError) {
      logger.error('Error deleting user from auth system', {
        usuarioId: id,
        error: authError.message,
      });

      return res.status(500).json({
        success: false,
        error: 'Error deleting user from authentication system',
      });
    }

    return res.json({
      success: true,
      data: { deleted: true },
      message: 'User deleted successfully',
    });
  } catch (error) {
    logger.error('Error handling delete user request', {
      usuarioId: req.params.id,
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      error: 'Error deleting user',
    });
  }
};