import { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '../../lib/logger.js';

/**
 * Example schema for a user
 */
export const UserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  role: z.enum(['user', 'admin', 'editor']),
  active: z.boolean().default(true),
});

/**
 * Example schema for user query parameters
 */
const UserQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
  active: z.string().optional().transform(val => val === 'true'),
  role: z.enum(['user', 'admin', 'editor']).optional(),
  search: z.string().optional(),
});

/**
 * GET /api/users - Retrieve users
 */
export const getUsersHandler = async (req: Request, res: Response) => {
  try {
    // Validate query parameters
    const validationResult = UserQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid query parameters',
        details: validationResult.error.format(),
      });
    }

    const query = validationResult.data;
    
    logger.info('Retrieving users', { query });
    
    // Example implementation
    const users = [
      { id: '1', name: 'John Doe', email: 'john@example.com', role: 'admin', active: true },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'user', active: true },
      { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'editor', active: false },
    ];
    
    // Apply filters if provided
    let filteredUsers = users;
    
    if (query.active !== undefined) {
      filteredUsers = filteredUsers.filter(user => user.active === query.active);
    }
    
    if (query.role) {
      filteredUsers = filteredUsers.filter(user => user.role === query.role);
    }
    
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      filteredUsers = filteredUsers.filter(user => 
        user.name.toLowerCase().includes(searchLower) || 
        user.email.toLowerCase().includes(searchLower),
      );
    }
    
    // Return paginated response
    return res.json({
      success: true,
      data: {
        items: filteredUsers,
        pagination: {
          page: query.page || 1,
          limit: query.limit || 10,
          total: filteredUsers.length,
          totalPages: Math.ceil(filteredUsers.length / (query.limit || 10)),
        },
      },
    });
  } catch (error) {
    logger.error('Error retrieving users', {
      error: error instanceof Error ? error.message : String(error),
    });

    return res.status(500).json({
      success: false,
      error: 'Error retrieving users',
    });
  }
};

/**
 * POST /api/users - Create a user
 */
export const createUserHandler = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = UserSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.format(),
      });
    }

    const userData = validationResult.data;
    
    logger.info('Creating user');
    
    // Example implementation
    // In a real implementation, you would save the user to the database
    const newUser = {
      id: `user_${Date.now()}`,
      name: userData.name,
      email: userData.email,
      role: 'user', // Default role
      active: userData.active,
      createdAt: new Date().toISOString(),
    };
    
    return res.status(201).json({
      success: true,
      data: {
        user: newUser,
        message: 'User created successfully',
      },
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
 * PUT /api/users/:id - Update a user
 */
export const updateUserHandler = async (req: Request, res: Response) => {
  try {
    const { id: usuarioId } = req.params;

    // Validate request body
    const validationResult = UserSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: validationResult.error.format(),
      });
    }

    const userData = validationResult.data;
    
    logger.info('Updating user', { usuarioId });
    
    // Example implementation
    // In a real implementation, you would update the user in the database
    const updatedUser = {
      id: usuarioId,
      ...userData,
      updatedAt: new Date().toISOString(),
    };
    
    return res.json({
      success: true,
      data: {
        user: updatedUser,
        message: 'User updated successfully',
      },
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
 * DELETE /api/users/:id - Delete a user
 */
export const deleteUserHandler = async (req: Request, res: Response) => {
  try {
    const { id: usuarioId } = req.params;
    
    logger.info('Deleting user', { usuarioId });
    
    // In a real implementation, you would delete the user from the database
    
    return res.json({
      success: true,
      data: {
        deleted: true,
        message: 'User deleted successfully',
      },
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