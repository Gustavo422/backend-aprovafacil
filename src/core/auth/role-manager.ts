import { SupabaseClient } from '@supabase/supabase-js';
import { getLogger } from '../../lib/logging';
// import { AuthError } from '../../lib/errors';

export enum UserRole {
  ADMIN = 'admin',
  INSTRUCTOR = 'instructor',
  USER = 'user',
  GUEST = 'guest',
}

export interface RolePermission {
  role: UserRole | string;
  resource: string;
  action: string;
  conditions?: Record<string, unknown>;
}

/**
 * Role manager for handling role-based access control
 */
export class RoleManager {
  private logger: ReturnType<typeof getLogger>;
  private permissions: RolePermission[] = [];
  private roleHierarchy: Map<string, string[]> = new Map();
  
  constructor(private supabaseClient: SupabaseClient) {
    this.logger = getLogger('RoleManager');
    
    // Initialize default role hierarchy
    this.roleHierarchy.set(UserRole.ADMIN, [UserRole.INSTRUCTOR, UserRole.USER, UserRole.GUEST]);
    this.roleHierarchy.set(UserRole.INSTRUCTOR, [UserRole.USER, UserRole.GUEST]);
    this.roleHierarchy.set(UserRole.USER, [UserRole.GUEST]);
    this.roleHierarchy.set(UserRole.GUEST, []);
    
    // Initialize default permissions
    this.addPermission({
      role: UserRole.ADMIN,
      resource: '*',
      action: '*',
    });
    
    this.addPermission({
      role: UserRole.INSTRUCTOR,
      resource: 'courses',
      action: '*',
    });
    
    this.addPermission({
      role: UserRole.USER,
      resource: 'courses',
      action: 'read',
    });
    
    this.addPermission({
      role: UserRole.GUEST,
      resource: 'public',
      action: 'read',
    });
  }
  
  /**
   * Add a permission
   */
  public addPermission(permission: RolePermission): void {
    this.permissions.push(permission);
    this.logger.debug('Permission added', { permission });
  }
  
  /**
   * Remove a permission
   */
  public removePermission(role: string, resource: string, action: string): void {
    this.permissions = this.permissions.filter(
      p => !(p.role === role && p.resource === resource && p.action === action)
    );
    this.logger.debug('Permission removed', { role, resource, action });
  }
  
  /**
   * Check if a role has a permission
   */
  public hasPermission(
    role: string,
    resource: string,
    action: string,
    context: Record<string, unknown> = {}
  ): boolean {
    // Get all roles including inherited ones
    const roles = this.getAllRoles(role);
    
    // Check if any role has the permission
    return this.permissions.some(p => {
      // Check if role matches
      if (!roles.includes(p.role)) {
        return false;
      }
      
      // Check if resource matches (wildcard or exact)
      if (p.resource !== '*' && p.resource !== resource) {
        return false;
      }
      
      // Check if action matches (wildcard or exact)
      if (p.action !== '*' && p.action !== action) {
        return false;
      }
      
      // Check conditions if any
      if (p.conditions) {
        return this.evaluateConditions(p.conditions, context);
      }
      
      return true;
    });
  }
  
  /**
   * Get all roles including inherited ones
   */
  private getAllRoles(role: string): string[] {
    const result = [role];
    const inherited = this.roleHierarchy.get(role) || [];
    
    for (const r of inherited) {
      result.push(r);
      result.push(...this.getAllRoles(r));
    }
    
    return [...new Set(result)]; // Remove duplicates
  }
  
  /**
   * Evaluate permission conditions
   */
  private evaluateConditions(
    conditions: Record<string, unknown>,
    context: Record<string, unknown>
  ): boolean {
    for (const [key, value] of Object.entries(conditions)) {
      if (typeof value === 'function') {
        if (!value(context[key], context)) {
          return false;
        }
      } else if (Array.isArray(value)) {
        if (!value.includes(context[key])) {
          return false;
        }
      } else if (value !== context[key]) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Get user role from Supabase
   */
  public async getUserRole(userId: string): Promise<string> {
    try {
      // First check in app_metadata
      const { data: userData, error: userError } = await this.supabaseClient
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (!userError && userData?.role) {
        return userData.role;
      }
      
      // If not found, check in auth.users
      const { data: authData, error: authError } = await this.supabaseClient.auth.admin.getUserById(userId);
      
      if (authError) {
        this.logger.error('Failed to get user role', { error: authError.message });
        return UserRole.GUEST;
      }
      
      return authData.user?.app_metadata?.role || 
             authData.user?.user_metadata?.role || 
             UserRole.USER;
    } catch (error) {
      this.logger.error('Error getting user role', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return UserRole.GUEST;
    }
  }
  
  /**
   * Set user role in Supabase
   */
  public async setUserRole(userId: string, role: string): Promise<boolean> {
    try {
      // Update in app_metadata
      const { error } = await this.supabaseClient.auth.admin.updateUserById(
        userId,
        { app_metadata: { role } }
      );
      
      if (error) {
        this.logger.error('Failed to set user role', { error: error.message });
        return false;
      }
      
      // Also update in users table if it exists
      try {
        await this.supabaseClient
          .from('users')
          .update({ role })
          .eq('id', userId);
      } catch (tableError) {
        // Ignore errors if table doesn't exist
        this.logger.warn('Could not update role in users table', { 
          error: tableError instanceof Error ? tableError.message : String(tableError) 
        });
      }
      
      this.logger.info('User role updated', { userId, role });
      return true;
    } catch (error) {
      this.logger.error('Error setting user role', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }
}