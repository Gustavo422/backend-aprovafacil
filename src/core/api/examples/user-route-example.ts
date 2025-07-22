import { z } from 'zod';
import { CrudRouteHandler } from '../crud-route-handler';
import { ResponseFormatter } from '../response-formatter';
import { supabase } from '../../../config/supabase';
import { requestLoggingMiddleware, corsMiddleware } from '../index';

// Create Supabase client
const supabaseClient = supabase;

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

/**
 * User API route handler
 */
export class UserRouteHandler extends CrudRouteHandler<User> {
  constructor() {
    super('users');
    
    // Add middleware
    this.use(requestLoggingMiddleware)
      .use(corsMiddleware);
  }

  /**
   * Get validation schema for user creation
   */
  protected getCreateSchema(): z.ZodSchema {
    return z.object({
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
  }

  /**
   * Get validation schema for user update
   */
  protected getUpdateSchema(): z.ZodSchema {
    return z.object({
      name: z.string().min(2).max(100).optional(),
      role: z.enum(['admin', 'instructor', 'user']).optional(),
      active: z.boolean().optional(),
      profile: z.object({
        bio: z.string().max(500).optional(),
        avatar_url: z.string().url().optional(),
        preferences: z.record(z.unknown()).optional(),
      }).optional(),
    });
  }

  /**
   * Handle getting a list of users
   */
  protected async handleGetList(
    query: {
      page?: number;
      limit?: number;
      sort?: string;
      order?: 'asc' | 'desc';
      search?: string;
      role?: string;
      active?: boolean;
    },
    context: { requestId: string }
  ): Promise<unknown> {
    try {
      const {
        page = 1,
        limit = 10,
        sort = 'created_at',
        order = 'desc',
        search,
        role,
        active,
      } = query;

      // Start building the query
      let usersQuery = supabaseClient
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
      const { count, error: countError } = await supabaseClient
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        this.logger.error('Error counting users', {
          requestId: context.requestId,
          error: countError.message,
        });

        return ResponseFormatter.error('Error retrieving users', {
          status: 500,
          requestId: context.requestId,
        });
      }

      // Apply pagination and sorting
      const { data, error } = await usersQuery
        .order(sort, { ascending: order === 'asc' })
        .range((page - 1) * limit, page * limit - 1);

      if (error) {
        this.logger.error('Error fetching users', {
          requestId: context.requestId,
          error: error.message,
        });

        return ResponseFormatter.error('Error retrieving users', {
          status: 500,
          requestId: context.requestId,
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

      return ResponseFormatter.paginated(users, {
        page,
        limit,
        total: count || 0,
        totalPages,
      }, context.requestId);
    } catch (error) {
      this.logger.error('Error handling user list request', {
        requestId: context.requestId,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error retrieving users', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Handle getting a single user
   */
  protected async handleGetOne(
    id: string,
    context: { requestId: string }
  ): Promise<unknown> {
    try {
      // Get user data
      const { data: userData, error: userError } = await supabaseClient
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (userError) {
        if (userError.code === 'PGRST116') {
          return ResponseFormatter.notFoundError('User not found', context.requestId);
        }

        this.logger.error('Error fetching user', {
          requestId: context.requestId,
          userId: id,
          error: userError.message,
        });

        return ResponseFormatter.error('Error retrieving user', {
          status: 500,
          requestId: context.requestId,
        });
      }

      // Get user profile
      const { data: profileData } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('user_id', id)
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

      return ResponseFormatter.success(user, { requestId: context.requestId });
    } catch (error) {
      this.logger.error('Error handling get user request', {
        requestId: context.requestId,
        userId: id,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error retrieving user', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Handle creating a user
   */
  protected async handleCreate(
    data: User,
    context: { requestId: string }
  ): Promise<unknown> {
    try {
      // Check if user with email already exists
      const { data: existingUser } = await supabaseClient
        .from('users')
        .select('id')
        .eq('email', data.email)
        .single();

      if (existingUser) {
        return ResponseFormatter.error('User with this email already exists', {
          status: 409,
          code: 'USER_EXISTS',
          requestId: context.requestId,
        });
      }

      // Create user in auth system
      const { data: authUser, error: authError } = await supabaseClient.auth.admin.createUser({
        email: data.email,
        email_confirm: true,
        app_metadata: { role: data.role },
        user_metadata: { name: data.name },
      });

      if (authError) {
        this.logger.error('Error creating user in auth system', {
          requestId: context.requestId,
          error: authError.message,
        });

        return ResponseFormatter.error('Error creating user', {
          status: 500,
          requestId: context.requestId,
        });
      }

      // Create user in database
      const { data: newUser, error: userError } = await supabaseClient
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
        this.logger.error('Error creating user in database', {
          requestId: context.requestId,
          error: userError.message,
        });

        // Try to clean up auth user
        await supabaseClient.auth.admin.deleteUser(authUser.user.id);

        return ResponseFormatter.error('Error creating user', {
          status: 500,
          requestId: context.requestId,
        });
      }

      // Create user profile if provided
      if (data.profile) {
        await supabaseClient
          .from('profiles')
          .insert({
            user_id: newUser.id,
            bio: data.profile.bio,
            avatar_url: data.profile.avatar_url,
            preferences: data.profile.preferences,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
      }

      return ResponseFormatter.success(
        {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          active: newUser.active,
          created_at: newUser.created_at,
          updated_at: newUser.updated_at,
          profile: data.profile,
        },
        {
          status: 201,
          requestId: context.requestId,
          message: 'User created successfully',
        }
      );
    } catch (error) {
      this.logger.error('Error handling create user request', {
        requestId: context.requestId,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error creating user', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Handle updating a user
   */
  protected async handleUpdate(
    id: string,
    data: User,
    context: { requestId: string }
  ): Promise<unknown> {
    try {
      // Check if user exists
      const { data: existingUser, error: checkError } = await supabaseClient
        .from('users')
        .select('id')
        .eq('id', id)
        .single();

      if (checkError || !existingUser) {
        return ResponseFormatter.notFoundError('User not found', context.requestId);
      }

      // Update user in database
      const { data: updatedUser, error: userError } = await supabaseClient
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
        this.logger.error('Error updating user', {
          requestId: context.requestId,
          userId: id,
          error: userError.message,
        });

        return ResponseFormatter.error('Error updating user', {
          status: 500,
          requestId: context.requestId,
        });
      }

      // Update user in auth system
      await supabaseClient.auth.admin.updateUserById(id, {
        app_metadata: { role: data.role },
        user_metadata: { name: data.name },
      });

      // Update user profile if provided
      if (data.profile) {
        await supabaseClient
          .from('profiles')
          .upsert({
            user_id: id,
            bio: data.profile.bio,
            avatar_url: data.profile.avatar_url,
            preferences: data.profile.preferences,
            updated_at: new Date().toISOString(),
          });
      }

      return ResponseFormatter.success(
        {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          active: updatedUser.active,
          created_at: updatedUser.created_at,
          updated_at: updatedUser.updated_at,
          profile: data.profile,
        },
        {
          requestId: context.requestId,
          message: 'User updated successfully',
        }
      );
    } catch (error) {
      this.logger.error('Error handling update user request', {
        requestId: context.requestId,
        userId: id,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error updating user', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Handle partial update of a user
   */
  protected async handlePartialUpdate(
    id: string,
    data: Partial<User>,
    context: { requestId: string }
  ): Promise<unknown> {
    try {
      // Check if user exists
      const { data: existingUser, error: checkError } = await supabaseClient
        .from('users')
        .select('id')
        .eq('id', id)
        .single();

      if (checkError || !existingUser) {
        return ResponseFormatter.notFoundError('User not found', context.requestId);
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
      const { data: updatedUser, error: userError } = await supabaseClient
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (userError) {
        this.logger.error('Error updating user', {
          requestId: context.requestId,
          userId: id,
          error: userError.message,
        });

        return ResponseFormatter.error('Error updating user', {
          status: 500,
          requestId: context.requestId,
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
        
        await supabaseClient.auth.admin.updateUserById(id, authUpdateData);
      }

      // Update user profile if provided
      if (data.profile) {
        await supabaseClient
          .from('profiles')
          .upsert({
            user_id: id,
            ...(data.profile.bio !== undefined && { bio: data.profile.bio }),
            ...(data.profile.avatar_url !== undefined && { avatar_url: data.profile.avatar_url }),
            ...(data.profile.preferences !== undefined && { preferences: data.profile.preferences }),
            updated_at: new Date().toISOString(),
          });
      }

      // Get updated profile
      const { data: profileData } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('user_id', id)
        .single();

      return ResponseFormatter.success(
        {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          role: updatedUser.role,
          active: updatedUser.active,
          created_at: updatedUser.created_at,
          updated_at: updatedUser.updated_at,
          profile: profileData || undefined,
        },
        {
          requestId: context.requestId,
          message: 'User updated successfully',
        }
      );
    } catch (error) {
      this.logger.error('Error handling partial update user request', {
        requestId: context.requestId,
        userId: id,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error updating user', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Handle removing a user
   */
  protected async handleRemove(
    id: string,
    context: { requestId: string }
  ): Promise<unknown> {
    try {
      // Check if user exists
      const { data: existingUser, error: checkError } = await supabaseClient
        .from('users')
        .select('id')
        .eq('id', id)
        .single();

      if (checkError || !existingUser) {
        return ResponseFormatter.notFoundError('User not found', context.requestId);
      }

      // Delete user from database
      const { error: deleteError } = await supabaseClient
        .from('users')
        .delete()
        .eq('id', id);

      if (deleteError) {
        this.logger.error('Error deleting user from database', {
          requestId: context.requestId,
          userId: id,
          error: deleteError.message,
        });

        return ResponseFormatter.error('Error deleting user', {
          status: 500,
          requestId: context.requestId,
        });
      }

      // Delete user from auth system
      const { error: authError } = await supabaseClient.auth.admin.deleteUser(id);

      if (authError) {
        this.logger.error('Error deleting user from auth system', {
          requestId: context.requestId,
          userId: id,
          error: authError.message,
        });

        return ResponseFormatter.error('Error deleting user from authentication system', {
          status: 500,
          requestId: context.requestId,
        });
      }

      return ResponseFormatter.success(
        { deleted: true },
        {
          requestId: context.requestId,
          message: 'User deleted successfully',
        }
      );
    } catch (error) {
      this.logger.error('Error handling delete user request', {
        requestId: context.requestId,
        userId: id,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error deleting user', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }
}

// Create route handler
const userRouteHandler = new UserRouteHandler();
const routeHandlers = userRouteHandler.createRouteHandlers();

// Export route handlers for Next.js App Router
export const GET = routeHandlers.GET;
export const POST = routeHandlers.POST;
export const PUT = routeHandlers.PUT;
export const PATCH = routeHandlers.PATCH;
export const DELETE = routeHandlers.DELETE;