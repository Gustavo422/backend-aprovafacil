import { NextRequest } from 'next/server';
import { z } from 'zod';
import { BaseRouteHandler } from '../../../core/api/base-route-handler';
import { ResponseFormatter } from '../../../core/api/response-formatter';
import { supabase } from '../../../config/supabase';
import { requestLoggingMiddleware, corsMiddleware } from '../../../core/api';

/**
 * User profile API route handler
 * This route allows users to manage their own profile
 */
export class UserProfileRouteHandler extends BaseRouteHandler {
  constructor() {
    super('profile');
    
    // Add middleware
    this.use(requestLoggingMiddleware)
      .use(corsMiddleware)
      .use(requestLoggingMiddleware)
      .use(corsMiddleware); // All authenticated users can access their profile
  }

  /**
   * Get validation schema for profile update
   */
  protected getPUTBodySchema(): z.ZodSchema {
    return z.object({
      name: z.string().min(2).max(100),
      bio: z.string().max(500).optional(),
      avatar_url: z.string().url().optional(),
      preferences: z.record(z.any()).optional(),
    });
  }

  /**
   * Get validation schema for partial profile update
   */
  protected getPATCHBodySchema(): z.ZodSchema {
    return z.object({
      name: z.string().min(2).max(100).optional(),
      bio: z.string().max(500).optional(),
      avatar_url: z.string().url().optional(),
      preferences: z.record(z.any()).optional(),
    });
  }

  /**
   * Handle GET request - Get current user profile
   */
  protected async handleGET(
    request: NextRequest,
    context: { requestId: string }
  ): Promise<unknown> {
    try {
      // Get user from context (added by auth middleware)
      const user = (request as unknown as { context: { user: { id: string } } }).context.user;
      
      if (!user) {
        return ResponseFormatter.authError('User not authenticated', context.requestId);
      }

      // Get user data
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userError) {
        this.logger.error('Error fetching user data', {
          requestId: context.requestId,
          userId: user.id,
          error: userError.message,
        });

        return ResponseFormatter.error('Error retrieving user profile', {
          status: 500,
          requestId: context.requestId,
        });
      }

      // Get user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Combine user data with profile
      const userProfile = {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        created_at: userData.created_at,
        updated_at: userData.updated_at,
        bio: profileData?.bio,
        avatar_url: profileData?.avatar_url,
        preferences: profileData?.preferences || {},
      };

      return ResponseFormatter.success(userProfile, { requestId: context.requestId });
    } catch (error) {
      this.logger.error('Error handling get profile request', {
        requestId: context.requestId,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error retrieving user profile', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Handle PUT request - Update current user profile
   */
  protected async handlePUT(
    request: NextRequest,
    context: {
      body?: unknown;
      requestId: string;
    }
  ): Promise<unknown> {
    try {
      // Get user from context (added by auth middleware)
      const user = (request as unknown as { context: { user: { id: string } } }).context.user;
      
      if (!user) {
        return ResponseFormatter.authError('User not authenticated', context.requestId);
      }

      const profileData = context.body as {
        name: string;
        bio?: string;
        avatar_url?: string;
        preferences?: Record<string, unknown>;
      };

      // Update user name in users table
      const { error: userError } = await supabase
        .from('users')
        .update({
          name: profileData.name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (userError) {
        this.logger.error('Error updating user name', {
          requestId: context.requestId,
          userId: user.id,
          error: userError.message,
        });

        return ResponseFormatter.error('Error updating user profile', {
          status: 500,
          requestId: context.requestId,
        });
      }

      // Update user metadata in auth
      await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: { name: profileData.name },
      });

      // Update or create profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          bio: profileData.bio,
          avatar_url: profileData.avatar_url,
          preferences: profileData.preferences || {},
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (profileError) {
        this.logger.error('Error updating user profile', {
          requestId: context.requestId,
          userId: user.id,
          error: profileError.message,
        });

        return ResponseFormatter.error('Error updating user profile', {
          status: 500,
          requestId: context.requestId,
        });
      }

      // Get updated user data
      const { data: updatedUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      // Combine user data with profile
      const updatedProfile = {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        created_at: updatedUser.created_at,
        updated_at: updatedUser.updated_at,
        bio: profile?.bio,
        avatar_url: profile?.avatar_url,
        preferences: profile?.preferences || {},
      };

      return ResponseFormatter.success(updatedProfile, {
        requestId: context.requestId,
        message: 'Profile updated successfully',
      });
    } catch (error) {
      this.logger.error('Error handling update profile request', {
        requestId: context.requestId,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error updating user profile', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Handle PATCH request - Partially update current user profile
   */
  protected async handlePATCH(
    request: NextRequest,
    context: {
      body?: unknown;
      requestId: string;
    }
  ): Promise<unknown> {
    try {
      // Get user from context (added by auth middleware)
      const user = (request as unknown as { context: { user: { id: string } } }).context.user;
      
      if (!user) {
        return ResponseFormatter.authError('User not authenticated', context.requestId);
      }

      const profileData = context.body as {
        name?: string;
        bio?: string;
        avatar_url?: string;
        preferences?: Record<string, unknown>;
      };

      // Update user name in users table if provided
      if (profileData.name) {
        const { error: userError } = await supabase
          .from('users')
          .update({
            name: profileData.name,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (userError) {
          this.logger.error('Error updating user name', {
            requestId: context.requestId,
            userId: user.id,
            error: userError.message,
          });

          return ResponseFormatter.error('Error updating user profile', {
            status: 500,
            requestId: context.requestId,
          });
        }

        // Update user metadata in auth
        await supabase.auth.admin.updateUserById(user.id, {
          user_metadata: { name: profileData.name },
        });
      }

      // Get current profile to merge with updates
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Prepare profile update data
      const profileUpdateData: Record<string, unknown> = {
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };

      // Add fields to update, preserving existing values if not provided
      if (profileData.bio !== undefined) {
        profileUpdateData.bio = profileData.bio;
      } else if (currentProfile?.bio) {
        profileUpdateData.bio = currentProfile.bio;
      }

      if (profileData.avatar_url !== undefined) {
        profileUpdateData.avatar_url = profileData.avatar_url;
      } else if (currentProfile?.avatar_url) {
        profileUpdateData.avatar_url = currentProfile.avatar_url;
      }

      if (profileData.preferences !== undefined) {
        profileUpdateData.preferences = profileData.preferences;
      } else if (currentProfile?.preferences) {
        profileUpdateData.preferences = currentProfile.preferences;
      } else {
        profileUpdateData.preferences = {};
      }

      // Update or create profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .upsert(profileUpdateData)
        .select()
        .single();

      if (profileError) {
        this.logger.error('Error updating user profile', {
          requestId: context.requestId,
          userId: user.id,
          error: profileError.message,
        });

        return ResponseFormatter.error('Error updating user profile', {
          status: 500,
          requestId: context.requestId,
        });
      }

      // Get updated user data
      const { data: updatedUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      // Combine user data with profile
      const updatedProfile = {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        created_at: updatedUser.created_at,
        updated_at: updatedUser.updated_at,
        bio: profile?.bio,
        avatar_url: profile?.avatar_url,
        preferences: profile?.preferences || {},
      };

      return ResponseFormatter.success(updatedProfile, {
        requestId: context.requestId,
        message: 'Profile updated successfully',
      });
    } catch (error) {
      this.logger.error('Error handling partial update profile request', {
        requestId: context.requestId,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error updating user profile', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }
}

// Create route handler
const userProfileRouteHandler = new UserProfileRouteHandler();
const routeHandlers = userProfileRouteHandler.createRouteHandlers();

// Export route handlers for Next.js App Router
export const GET = routeHandlers.GET;
export const PUT = routeHandlers.PUT;
export const PATCH = routeHandlers.PATCH;