import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ConnectionLogService } from '../services/ConnectionLogService';

/**
 * Enhanced Supabase client with connection logging
 */
export class EnhancedSupabaseClient {
  private static instance: EnhancedSupabaseClient;
  private client: SupabaseClient;
  private connectionLogService: ConnectionLogService;
  private connectionStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
  private lastError: Error | null = null;
  private connectionListeners: ((status: string, error?: Error) => void)[] = [];
  
  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      throw new Error('Missing Supabase environment variables');
    }
    
    this.client = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    this.connectionLogService = new ConnectionLogService(this.client);
    this.checkConnection();
  }
  
  /**
   * Get singleton instance
   * @returns EnhancedSupabaseClient instance
   */
  public static getInstance(): EnhancedSupabaseClient {
    if (!EnhancedSupabaseClient.instance) {
      EnhancedSupabaseClient.instance = new EnhancedSupabaseClient();
    }
    
    return EnhancedSupabaseClient.instance;
  }
  
  /**
   * Get Supabase client
   * @returns Supabase client
   */
  public getClient(): SupabaseClient {
    return this.client;
  }
  
  /**
   * Get connection status
   * @returns Connection status
   */
  public getConnectionStatus(): string {
    return this.connectionStatus;
  }
  
  /**
   * Get last error
   * @returns Last error or null
   */
  public getLastError(): Error | null {
    return this.lastError;
  }
  
  /**
   * Add connection listener
   * @param listener Listener function
   */
  public addConnectionListener(listener: (status: string, error?: Error) => void): void {
    this.connectionListeners.push(listener);
  }
  
  /**
   * Remove connection listener
   * @param listener Listener function
   */
  public removeConnectionListener(listener: (status: string, error?: Error) => void): void {
    this.connectionListeners = this.connectionListeners.filter(l => l !== listener);
  }
  
  /**
   * Check connection to Supabase
   */
  public async checkConnection(): Promise<boolean> {
    try {
      const startTime = Date.now();
      const { error } = await this.client.from('usuarios').select('id').limit(1);
      const duration = Date.now() - startTime;
      
      if (error) {
        this.connectionStatus = 'error';
        this.lastError = new Error(error.message);
        this.notifyListeners();
        
        await this.connectionLogService.logFailedConnection(error.message, {
          durationMs: duration
        });
        
        return false;
      }
      
      this.connectionStatus = 'connected';
      this.lastError = null;
      this.notifyListeners();
      
      await this.connectionLogService.logSuccessfulConnection({
        durationMs: duration
      });
      
      return true;
    } catch (error) {
      this.connectionStatus = 'error';
      this.lastError = error instanceof Error ? error : new Error(String(error));
      this.notifyListeners();
      
      await this.connectionLogService.logFailedConnection(
        error instanceof Error ? error.message : String(error)
      );
      
      return false;
    }
  }
  
  /**
   * Reset client
   */
  public async resetClient(): Promise<void> {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      throw new Error('Missing Supabase environment variables');
    }
    
    this.client = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    this.connectionLogService = new ConnectionLogService(this.client);
    await this.checkConnection();
  }
  
  /**
   * Notify connection listeners
   */
  private notifyListeners(): void {
    this.connectionListeners.forEach(listener => {
      listener(this.connectionStatus, this.lastError || undefined);
    });
  }
}

// Export singleton instance
export const supabaseClient = EnhancedSupabaseClient.getInstance();
export const supabase = supabaseClient.getClient();