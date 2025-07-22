import { SupabaseClient, Session } from '@supabase/supabase-js';
import { getLogger } from '../../lib/logging';
// import { AuthError } from '../../lib/errors';

export interface SessionOptions {
  /**
   * Time in milliseconds before token expiry to trigger refresh
   * Default: 5 minutes
   */
  refreshThreshold?: number;
  
  /**
   * Whether to automatically refresh tokens
   * Default: true
   */
  autoRefresh?: boolean;
  
  /**
   * Whether to persist session in local storage
   * Default: true
   */
  persistSession?: boolean;
}

/**
 * Session manager for handling authentication sessions
 */
export class SessionManager {
  private logger: ReturnType<typeof getLogger>;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private currentSession: Session | null = null;
  
  constructor(
    private supabaseClient: SupabaseClient,
    private options: SessionOptions = {}
  ) {
    this.logger = getLogger('SessionManager');
    
    // Set default options
    this.options = {
      refreshThreshold: options.refreshThreshold || 5 * 60 * 1000, // 5 minutes
      autoRefresh: options.autoRefresh !== false,
      persistSession: options.persistSession !== false,
    };
    
    // Initialize session
    this.initialize();
  }
  
  /**
   * Initialize session manager
   */
  private async initialize(): Promise<void> {
    try {
      // Get current session
      const { data, error } = await this.supabaseClient.auth.getSession();
      
      if (error) {
        this.logger.error('Failed to get session', { error: error.message });
        return;
      }
      
      if (data.session) {
        this.currentSession = data.session;
        
        if (this.options.autoRefresh) {
          this.setupRefreshTimer();
        }
        
        this.logger.info('Session initialized');
      }
    } catch (error) {
      this.logger.error('Error initializing session', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }
  
  /**
   * Set up timer for token refresh
   */
  private setupRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    
    if (!this.currentSession) {
      return;
    }
    
    const expiresAt = new Date(this.currentSession.expires_at || '').getTime();
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;
    const refreshTime = Math.max(0, timeUntilExpiry - this.options.refreshThreshold!);
    
    this.logger.debug('Setting up refresh timer', { 
      expiresAt: new Date(expiresAt).toISOString(),
      refreshIn: Math.floor(refreshTime / 1000) + ' seconds'
    });
    
    this.refreshTimer = setTimeout(() => this.refreshToken(), refreshTime);
  }
  
  /**
   * Refresh the authentication token
   */
  public async refreshToken(): Promise<boolean> {
    try {
      if (!this.currentSession) {
        this.logger.warn('No session to refresh');
        return false;
      }
      
      this.logger.info('Refreshing token');
      
      const { data, error } = await this.supabaseClient.auth.refreshSession();
      
      if (error) {
        this.logger.error('Failed to refresh token', { error: error.message });
        return false;
      }
      
      if (data.session) {
        this.currentSession = data.session;
        
        if (this.options.autoRefresh) {
          this.setupRefreshTimer();
        }
        
        this.logger.info('Token refreshed successfully');
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error('Error refreshing token', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }
  
  /**
   * Get the current session
   */
  public getSession(): Session | null {
    return this.currentSession;
  }
  
  /**
   * Get the current access token
   */
  public getAccessToken(): string | null {
    return this.currentSession?.access_token || null;
  }
  
  /**
   * Check if the session is valid
   */
  public isSessionValid(): boolean {
    if (!this.currentSession) {
      return false;
    }
    
    const expiresAt = new Date(this.currentSession.expires_at || '').getTime();
    return Date.now() < expiresAt;
  }
  
  /**
   * Set a new session
   */
  public async setSession(accessToken: string, refreshToken: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabaseClient.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      
      if (error) {
        this.logger.error('Failed to set session', { error: error.message });
        return false;
      }
      
      if (data.session) {
        this.currentSession = data.session;
        
        if (this.options.autoRefresh) {
          this.setupRefreshTimer();
        }
        
        this.logger.info('Session set successfully');
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error('Error setting session', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }
  
  /**
   * Sign out the current user
   */
  public async signOut(): Promise<boolean> {
    try {
      const { error } = await this.supabaseClient.auth.signOut();
      
      if (error) {
        this.logger.error('Failed to sign out', { error: error.message });
        return false;
      }
      
      this.currentSession = null;
      
      if (this.refreshTimer) {
        clearTimeout(this.refreshTimer);
        this.refreshTimer = null;
      }
      
      this.logger.info('Signed out successfully');
      return true;
    } catch (error) {
      this.logger.error('Error signing out', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }
  
  /**
   * Validate a token
   */
  public async validateToken(token: string): Promise<{
    valid: boolean;
    user?: Record<string, unknown>;
    error?: string;
  }> {
    try {
      const { data, error } = await this.supabaseClient.auth.getUser(token);
      
      if (error) {
        return {
          valid: false,
          error: error.message,
        };
      }
      
      if (!data.user) {
        return {
          valid: false,
          error: 'User not found',
        };
      }
      
      return {
        valid: true,
        user: data.user as unknown as Record<string, unknown>,
      };
    } catch (error) {
      this.logger.error('Error validating token', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  
  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }
}