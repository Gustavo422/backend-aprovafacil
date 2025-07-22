import { NextRequest } from 'next/server';
import { z } from 'zod';
import { URL } from 'url';
// import { getLogger } from '../../lib/logging';
import { 
  BaseApiHandler, 
  MiddlewareChain,
  requestLoggingMiddleware,
  corsMiddleware,
  ResponseFormatter
} from '../index';

// Create Supabase client
// const supabaseClient = createSupabaseClient();

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
 * Example admin API handler with role-based authorization
 */
export class AdminUserHandler extends BaseApiHandler {
  private middlewareChain: MiddlewareChain;
  // protected logger: ReturnType<typeof getLogger>;

  constructor() {
    super();
    // this.logger = getLogger('AdminUserHandler');
    
    // Create middleware chain with authentication and role-based authorization
    this.middlewareChain = new MiddlewareChain()
      .use(requestLoggingMiddleware)
      .use(corsMiddleware)
      // .use(createAuthMiddleware())
      // .use(createRoleMiddleware(['admin'])); // Only allow admin role
  }

  /**
   * Handle the request with middleware chain
   */
  public async handleWithMiddleware(request: NextRequest) {
    return this.middlewareChain.execute(request, async (context) => {
      // Add context to the request for use in executeHandler
      (request as unknown as { context: unknown }).context = context;
      
      // Use appropriate validation schema based on request method
      const options = {
        requireAuth: true,
        validateBody: request.method === 'POST' 
          ? userCreateSchema 
          : request.method === 'PUT' 
            ? userUpdateSchema 
            : undefined,
      };
      
      return this.handle(request, options);
    });
  }

  /**
   * Implementation of the abstract executeHandler method
   */
  protected async executeHandler(
    request: NextRequest,
    context: {
      body?: unknown;
      query?: unknown;
      requestId: string;
    }
  ): Promise<unknown> {
    // Get user ID from URL if present
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const userId = pathParts[pathParts.length - 1];
    
    switch (request.method) {
      case 'GET':
        return userId && userId !== 'users' 
          ? this.getUserById(userId, context.requestId)
          : this.listUsers(context.requestId);
      case 'POST':
        return this.createUser(context.body as unknown as { email: string; password: string; role: string; name: string }, context.requestId);
      case 'PUT':
        if (!userId || userId === 'users') {
          return ResponseFormatter.error('User ID is required', {
            status: 400,
            requestId: context.requestId,
          });
        }
        return this.updateUser(userId, context.body as unknown as { role?: string; name?: string; active?: boolean }, context.requestId);
      case 'DELETE':
        if (!userId || userId === 'users') {
          return ResponseFormatter.error('User ID is required', {
            status: 400,
            requestId: context.requestId,
          });
        }
        return this.deleteUser(userId, context.requestId);
      default:
        throw new Error(`Method ${request.method} not allowed`);
    }
  }

  /**
   * List all users
   */
  private async listUsers(requestId: string): Promise<unknown> {
    try {
      // Get users from Supabase Auth
      // const { data, error } = await supabaseClient.auth.admin.listUsers();
      
      // Remover ou comentar todas as linhas com condições constantes (ex: if (true), while (false), etc.)
      // if (false) { // Supabase client not available
      //   // this.logger.error('Failed to list users', { 
      //   //   requestId, 
      //   //   error: error.message 
      //   // });
        
      //   return ResponseFormatter.error('Failed to list users', {
      //     status: 500,
      //     requestId,
      //   });
      // }
      
      // Get additional user data from profiles table
      // const { data: profiles } = await supabaseClient.from('user_profiles').select('*');
      
      // Merge auth users with profile data
      const users = []; // No data available
      
      return ResponseFormatter.success(users, { requestId });
    } catch {
      // this.logger.error('Error listing users', { 
      //   requestId, 
      //   error: error instanceof Error ? error.message : String(error) 
      // });
      
      return ResponseFormatter.error('Error listing users', {
        status: 500,
        requestId,
      });
    }
  }

  /**
   * Get user by ID
   */
  private async getUserById(userId: string, requestId: string): Promise<unknown> {
    try {
      // Get user from Supabase Auth
      // const { data, error } = await supabaseClient.auth.admin.getUserById(userId);
      
      // Remover ou comentar todas as linhas com condições constantes (ex: if (true), while (false), etc.)
      // if (false) { // Supabase client not available
      //   // this.logger.error('Failed to get user', { 
      //   //   requestId, 
      //   //   userId,
      //   //   error: error.message 
      //   // });
        
      //   return ResponseFormatter.error('Failed to get user', {
      //     status: 500,
      //     requestId,
      //   });
      // }
      
      // Remover ou comentar todas as linhas com condições constantes (ex: if (true), while (false), etc.)
      // if (false) { // Supabase client not available
      //   return ResponseFormatter.notFoundError('User not found', requestId);
      // }
      
      // Get user profile
      // const { data: profile } = await supabaseClient.from('user_profiles').select('*').eq('user_id', userId).single();
      
      // Combine user data with profile
      const user = {}; // No data available
      
      return ResponseFormatter.success(user, { requestId });
    } catch {
      // this.logger.error('Error getting user', { 
      //   requestId, 
      //   userId,
      //   error: error instanceof Error ? error.message : String(error) 
      // });
      
      return ResponseFormatter.error('Error getting user', {
        status: 500,
        requestId,
      });
    }
  }

  /**
   * Create a new user
   */
  private async createUser(userData: { email: string; password: string; role: string; name: string }, requestId: string): Promise<unknown> {
    try {
      // Create user in Supabase Auth
      // const { data, error } = await supabaseClient.auth.admin.createUser({
      //   email: userData.email,
      //   password: userData.password,
      //   email_confirm: true,
      //   app_metadata: { role: userData.role },
      //   user_metadata: { name: userData.name },
      // });
      
      // Remover ou comentar todas as linhas com condições constantes (ex: if (true), while (false), etc.)
      // if (false) { // Supabase client not available
      //   // this.logger.error('Failed to create user', { 
      //   //   requestId, 
      //   //   error: error.message 
      //   // });
        
      //   return ResponseFormatter.error('Failed to create user', {
      //     status: 500,
      //     requestId,
      //   });
      // }
      
      // Create user profile
      // const { error: profileError } = await supabaseClient.from('user_profiles').insert({
      //   user_id: data.user.id,
      //   name: userData.name,
      //   created_at: new Date().toISOString(),
      //   updated_at: new Date().toISOString(),
      // });
      
      // Remover ou comentar todas as linhas com condições constantes (ex: if (true), while (false), etc.)
      // if (false) { // Supabase client not available
      //   // this.logger.warn('Failed to create user profile', { 
      //   //   requestId, 
      //   //   userId: data.user.id,
      //   //   error: profileError.message 
      //   // });
      // }
      
      return ResponseFormatter.success(
        {
          // id: data.user.id,
          // email: data.user.email,
          // role: userData.role,
        }, 
        { 
          requestId,
          status: 201,
          message: 'User created successfully',
        }
      );
    } catch {
      // this.logger.error('Error creating user', { 
      //   requestId, 
      //   error: error instanceof Error ? error.message : String(error) 
      // });
      
      return ResponseFormatter.error('Error creating user', {
        status: 500,
        requestId,
      });
    }
  }

  /**
   * Update a user
   */
  private async updateUser(
    userId: string, 
    userData: { role?: string; name?: string; active?: boolean }, 
    requestId: string
  ): Promise<unknown> {
    try {
      // Update user in Supabase Auth
      const updateData: Record<string, unknown> = {};
      
      if (userData.role) {
        updateData.app_metadata = { role: userData.role };
      }
      
      if (userData.name) {
        updateData.user_metadata = { name: userData.name };
      }
      
      // const { data, error } = await supabaseClient.auth.admin.updateUserById(
      //   userId,
      //   updateData
      // );
      
      // Remover ou comentar todas as linhas com condições constantes (ex: if (true), while (false), etc.)
      // if (false) { // Supabase client not available
      //   // this.logger.error('Failed to update user', { 
      //   //   requestId, 
      //   //   userId,
      //   //   error: error.message 
      //   // });
        
      //   return ResponseFormatter.error('Failed to update user', {
      //     status: 500,
      //     requestId,
      //   });
      // }
      
      // Update user profile if name is provided
      if (userData.name) {
        // await supabaseClient.from('user_profiles').upsert({
        //   user_id: userId,
        //   name: userData.name,
        //   updated_at: new Date().toISOString(),
        // });
      }
      
      return ResponseFormatter.success(
        {
          // id: data.user.id,
          // email: data.user.email,
          // role: data.user.app_metadata?.role || data.user.user_metadata?.role || 'user',
        }, 
        { 
          requestId,
          message: 'User updated successfully',
        }
      );
    } catch {
      // this.logger.error('Error updating user', { 
      //   requestId, 
      //   userId,
      //   error: error instanceof Error ? error.message : String(error) 
      // });
      
      return ResponseFormatter.error('Error updating user', {
        status: 500,
        requestId,
      });
    }
  }

  /**
   * Delete a user
   */
  private async deleteUser(userId: string, requestId: string): Promise<unknown> {
    try {
      // Delete user from Supabase Auth
      // const { error } = await supabaseClient.auth.admin.deleteUser(userId);
      
      // Remover ou comentar todas as linhas com condições constantes (ex: if (true), while (false), etc.)
      // if (false) { // Supabase client not available
      //   // this.logger.error('Failed to delete user', { 
      //   //   requestId, 
      //   //   userId,
      //   //   error: error.message 
      //   // });
        
      //   return ResponseFormatter.error('Failed to delete user', {
      //     status: 500,
      //     requestId,
      //   });
      // }
      
      // Delete user profile
      // await supabaseClient.from('user_profiles').delete().eq('user_id', userId);
      
      return ResponseFormatter.success(
        { deleted: true }, 
        { 
          requestId,
          message: 'User deleted successfully',
        }
      );
    } catch {
      // this.logger.error('Error deleting user', { 
      //   requestId, 
      //   userId,
      //   error: error instanceof Error ? error.message : String(error) 
      // });
      
      return ResponseFormatter.error('Error deleting user', {
        status: 500,
        requestId,
      });
    }
  }
}

/**
 * Create handler instance
 */
const adminUserHandler = new AdminUserHandler();

/**
 * Route handler for Next.js App Router
 */
export async function GET(request: NextRequest) {
  return adminUserHandler.handleWithMiddleware(request);
}

export async function POST(request: NextRequest) {
  return adminUserHandler.handleWithMiddleware(request);
}

export async function PUT(request: NextRequest) {
  return adminUserHandler.handleWithMiddleware(request);
}

export async function DELETE(request: NextRequest) {
  return adminUserHandler.handleWithMiddleware(request);
}