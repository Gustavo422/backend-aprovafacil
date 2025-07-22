import { NextRequest } from 'next/server';
import { z } from 'zod';
import { BaseRouteHandler } from '../../../core/api/base-route-handler';
import { ResponseFormatter } from '../../../core/api/response-formatter';
import { supabase } from '../../../config/supabase';
import { requestLoggingMiddleware, corsMiddleware } from '../../../core/api';
import { URL } from 'url';

/**
 * User preferences API route handler
 * This route allows users to manage their preferences
 */
export class UserPreferencesRouteHandler extends BaseRouteHandler {
  constructor() {
    super('preferences');
    
    // Add middleware
    this.use(requestLoggingMiddleware)
      .use(corsMiddleware)
      .use(requestLoggingMiddleware)
      .use(corsMiddleware); // All authenticated users can access their preferences
  }

  /**
   * Get validation schema for preferences update
   */
  protected getPUTBodySchema(): z.ZodSchema {
    return z.record(z.unknown());
  }

  /**
   * Get validation schema for partial preferences update
   */
  protected getPATCHBodySchema(): z.ZodSchema {
    return z.record(z.unknown());
  }

  /**
   * Handle GET request - Get current user preferences
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

      // Get user profile with preferences
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        this.logger.error('Error fetching user preferences', {
          requestId: context.requestId,
          userId: user.id,
          error: profileError.message,
        });

        return ResponseFormatter.error('Error retrieving user preferences', {
          status: 500,
          requestId: context.requestId,
        });
      }

      // Return preferences or empty object if not found
      const preferences = profileData?.preferences || {};

      return ResponseFormatter.success(preferences, { requestId: context.requestId });
    } catch (error) {
      this.logger.error('Error handling get preferences request', {
        requestId: context.requestId,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error retrieving user preferences', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Handle PUT request - Replace all user preferences
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

      const preferences = context.body as Record<string, unknown>;

      // Update or create profile with new preferences
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          preferences,
          updated_at: new Date().toISOString(),
        })
        .select('preferences')
        .single();

      if (error) {
        this.logger.error('Error updating user preferences', {
          requestId: context.requestId,
          userId: user.id,
          error: error.message,
        });

        return ResponseFormatter.error('Error updating user preferences', {
          status: 500,
          requestId: context.requestId,
        });
      }

      return ResponseFormatter.success(data.preferences, {
        requestId: context.requestId,
        message: 'Preferences updated successfully',
      });
    } catch (error) {
      this.logger.error('Error handling update preferences request', {
        requestId: context.requestId,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error updating user preferences', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Handle PATCH request - Update specific user preferences
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

      const newPreferences = context.body as Record<string, unknown>;

      // Get current preferences
      const { data: currentData } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('user_id', user.id)
        .single();

      // Merge current preferences with new ones
      const mergedPreferences = {
        ...(currentData?.preferences || {}),
        ...newPreferences,
      };

      // Update or create profile with merged preferences
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          preferences: mergedPreferences,
          updated_at: new Date().toISOString(),
        })
        .select('preferences')
        .single();

      if (error) {
        this.logger.error('Error updating user preferences', {
          requestId: context.requestId,
          userId: user.id,
          error: error.message,
        });

        return ResponseFormatter.error('Error updating user preferences', {
          status: 500,
          requestId: context.requestId,
        });
      }

      return ResponseFormatter.success(data.preferences, {
        requestId: context.requestId,
        message: 'Preferences updated successfully',
      });
    } catch (error) {
      this.logger.error('Error handling partial update preferences request', {
        requestId: context.requestId,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error updating user preferences', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }

  /**
   * Handle DELETE request - Delete specific user preference
   */
  protected async handleDELETE(
    request: NextRequest,
    context: { requestId: string }
  ): Promise<unknown> {
    try {
      // Get user from context (added by auth middleware)
      const user = (request as unknown as { context: { user: { id: string } } }).context.user;
      
      if (!user) {
        return ResponseFormatter.authError('User not authenticated', context.requestId);
      }

      // Get preference key from URL
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      const preferenceKey = pathParts[pathParts.length - 1];
      
      if (!preferenceKey || preferenceKey === 'preferences') {
        return ResponseFormatter.error('Preference key is required', {
          status: 400,
          requestId: context.requestId,
        });
      }

      // Get current preferences
      const { data: currentData } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('user_id', user.id)
        .single();

      const currentPreferences = currentData?.preferences || {};
      
      // Check if preference exists
      if (!(preferenceKey in currentPreferences)) {
        return ResponseFormatter.notFoundError('Preference not found', context.requestId);
      }

      // Remove the preference
      const updatedPreferences = {
        ...currentPreferences,
        [preferenceKey]: undefined, // Explicitly remove the key
      };

      // Update profile with updated preferences
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          preferences: updatedPreferences,
          updated_at: new Date().toISOString(),
        })
        .select('preferences')
        .single();

      if (error) {
        this.logger.error('Error deleting user preference', {
          requestId: context.requestId,
          userId: user.id,
          preferenceKey,
          error: error.message,
        });

        return ResponseFormatter.error('Error deleting user preference', {
          status: 500,
          requestId: context.requestId,
        });
      }

      return ResponseFormatter.success(
        { deleted: preferenceKey, preferences: data.preferences },
        {
          requestId: context.requestId,
          message: 'Preference deleted successfully',
        }
      );
    } catch (error) {
      this.logger.error('Error handling delete preference request', {
        requestId: context.requestId,
        error: error instanceof Error ? error.message : String(error),
      });

      return ResponseFormatter.error('Error deleting user preference', {
        status: 500,
        requestId: context.requestId,
      });
    }
  }
}

// Create route handler
const userPreferencesRouteHandler = new UserPreferencesRouteHandler();
const routeHandlers = userPreferencesRouteHandler.createRouteHandlers();

// Export route handlers for Next.js App Router
export const GET = routeHandlers.GET;
export const PUT = routeHandlers.PUT;
export const PATCH = routeHandlers.PATCH;
export const DELETE = routeHandlers.DELETE;