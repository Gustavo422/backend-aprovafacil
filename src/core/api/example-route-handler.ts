import { NextRequest } from 'next/server';
import { z } from 'zod';
import { RequestContext } from './api-handler';
import { ValidationSchemas } from './validation-utils';
import { URL } from 'url';

/**
 * Example schema for a user
 */
export const UserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: ValidationSchemas.email(),
  role: z.enum(['user', 'admin', 'editor']),
  active: ValidationSchemas.boolean().default(true),
});

/**
 * Example schema for user query parameters
 */
const UserQuerySchema = z.object({
  ...ValidationSchemas.pagination().shape,
  active: ValidationSchemas.boolean().optional(),
  role: z.enum(['user', 'admin', 'editor']).optional(),
  search: z.string().optional(),
});

/**
 * Example route handler for users
 */
export const usersRouteHandler = {
  /**
   * GET handler for retrieving users
   */
  async GET(request: NextRequest, context: RequestContext) {
    const { query, logger } = context;
    
    logger.info('Retrieving users', { query });
    
    // Example implementation
    const users = [
      { id: '1', name: 'John Doe', email: 'john@example.com', role: 'admin', active: true },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'user', active: true },
      { id: '3', name: 'Bob Johnson', email: 'bob@example.com', role: 'editor', active: false },
    ];
    
    // Apply filters if provided
    let filteredUsers = users;
    
    if (query) {
      const typedQuery = query as z.infer<typeof UserQuerySchema>;
      
      if (typedQuery.active !== undefined) {
        filteredUsers = filteredUsers.filter(user => user.active === typedQuery.active);
      }
      
      if (typedQuery.role) {
        filteredUsers = filteredUsers.filter(user => user.role === typedQuery.role);
      }
      
      if (typedQuery.search) {
        const searchLower = typedQuery.search.toLowerCase();
        filteredUsers = filteredUsers.filter(user => 
          user.name.toLowerCase().includes(searchLower) || 
          user.email.toLowerCase().includes(searchLower)
        );
      }
    }
    
    // Return paginated response
    return {
      items: filteredUsers,
      pagination: {
        page: query ? (query as Record<string, unknown>).page || 1 : 1,
        limit: query ? (query as Record<string, unknown>).limit || 10 : 10,
        total: filteredUsers.length,
        totalPages: Math.ceil(filteredUsers.length / Number((query as Record<string, unknown>).limit || 10)),
      },
    };
  },
  
  /**
   * POST handler for creating a user
   */
  async POST(request: NextRequest, context: RequestContext) {
    const { body, logger } = context;
    
    logger.info('Creating user');
    
    // Example implementation
    const userData = body as z.infer<typeof UserSchema>;
    
    // In a real implementation, you would save the user to the database
    const newUser = {
      id: `user_${Date.now()}`,
      name: userData.name,
      email: userData.email,
      role: 'user', // Default role
      active: userData.active,
      createdAt: new Date().toISOString(),
    };
    
    return {
      user: newUser,
      message: 'User created successfully',
    };
  },
  
  /**
   * PUT handler for updating a user
   */
  async PUT(request: NextRequest, context: RequestContext) {
    const { body, logger } = context;
    
    // Get user ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const userId = pathParts[pathParts.length - 1];
    
    logger.info('Updating user', { userId });
    
    // Example implementation
    const userData = body as z.infer<typeof UserSchema>;
    
    // In a real implementation, you would update the user in the database
    const updatedUser = {
      id: userId,
      ...userData,
      updatedAt: new Date().toISOString(),
    };
    
    return {
      user: updatedUser,
      message: 'User updated successfully',
    };
  },
  
  /**
   * DELETE handler for deleting a user
   */
  async DELETE(request: NextRequest, context: RequestContext) {
    const { logger } = context;
    
    // Get user ID from URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const userId = pathParts[pathParts.length - 1];
    
    logger.info('Deleting user', { userId });
    
    // In a real implementation, you would delete the user from the database
    
    return {
      deleted: true,
      message: 'User deleted successfully',
    };
  },
};

/**
 * Create the API handler for users
 */
export const usersHandler = {
  validateQuery: UserQuerySchema,
  validateBody: undefined,
  requireAuth: true,
  allowedRoles: ['admin'],
  rateLimit: {
    requests: 100,
    windowMs: 60000, // 1 minute
  },
  timeout: 5000, // 5 seconds
  routeHandler: usersRouteHandler,
};

/**
 * Export the handler for Next.js App Router
 */
export const GET = usersHandler;
export const POST = usersHandler;
export const PUT = usersHandler;
export const DELETE = usersHandler;