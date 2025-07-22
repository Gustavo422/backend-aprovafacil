import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Session service for managing user sessions
 */
export class SessionService {
  private client: SupabaseClient;
  
  /**
   * Constructor
   * @param client Supabase client
   */
  constructor(client: SupabaseClient) {
    this.client = client;
  }
  
  /**
   * Create a new session
   * @param userId User ID
   * @param refreshToken Refresh token
   * @param userAgent User agent
   * @param ipAddress IP address
   * @param deviceId Device ID
   * @param deviceName Device name
   * @param expiresInDays Expiration in days
   * @returns Session ID
   */
  async createSession(
    userId: string,
    refreshToken: string,
    userAgent: string,
    ipAddress: string,
    deviceId?: string,
    deviceName?: string,
    expiresInDays = 30
  ): Promise<string> {
    try {
      const { data, error } = await this.client.rpc('manage_user_session', {
        p_user_id: userId,
        p_refresh_token: refreshToken,
        p_user_agent: userAgent,
        p_ip_address: ipAddress,
        p_device_id: deviceId,
        p_device_name: deviceName,
        p_expires_in_days: expiresInDays
      });
      
      if (error) {
        throw new Error(`Failed to create session: ${error.message}`);
      }
      
      return data as string;
    } catch (error) {
      console.error('Error creating session:', error);
      
      // Fallback to direct insert if RPC fails
      const sessionId = uuidv4();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);
      
      const { error: insertError } = await this.client
        .from('user_sessions')
        .insert({
          id: sessionId,
          user_id: userId,
          refresh_token: refreshToken,
          user_agent: userAgent,
          ip_address: ipAddress,
          device_id: deviceId,
          device_name: deviceName,
          expires_at: expiresAt.toISOString(),
          is_active: true
        });
      
      if (insertError) {
        throw new Error(`Failed to create session: ${insertError.message}`);
      }
      
      return sessionId;
    }
  }
  
  /**
   * Get session by ID
   * @param sessionId Session ID
   * @returns Session or null
   */
  async getSessionById(sessionId: string) {
    const { data, error } = await this.client
      .from('user_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }
    
    return data;
  }
  
  /**
   * Get session by refresh token
   * @param refreshToken Refresh token
   * @returns Session or null
   */
  async getSessionByRefreshToken(refreshToken: string) {
    const { data, error } = await this.client
      .from('user_sessions')
      .select('*')
      .eq('refresh_token', refreshToken)
      .eq('is_active', true)
      .single();
    
    if (error) {
      console.error('Error getting session by refresh token:', error);
      return null;
    }
    
    return data;
  }
  
  /**
   * Get active sessions for user
   * @param userId User ID
   * @returns Array of sessions
   */
  async getActiveSessionsForUser(userId: string) {
    const { data, error } = await this.client
      .from('user_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('last_active_at', { ascending: false });
    
    if (error) {
      console.error('Error getting active sessions:', error);
      return [];
    }
    
    return data;
  }
  
  /**
   * Update session last active time
   * @param sessionId Session ID
   * @returns Success boolean
   */
  async updateSessionActivity(sessionId: string): Promise<boolean> {
    const { error } = await this.client
      .from('user_sessions')
      .update({
        last_active_at: new Date().toISOString()
      })
      .eq('id', sessionId);
    
    if (error) {
      console.error('Error updating session activity:', error);
      return false;
    }
    
    return true;
  }
  
  /**
   * Invalidate session
   * @param sessionId Session ID
   * @returns Success boolean
   */
  async invalidateSession(sessionId: string): Promise<boolean> {
    const { error } = await this.client
      .from('user_sessions')
      .update({
        is_active: false
      })
      .eq('id', sessionId);
    
    if (error) {
      console.error('Error invalidating session:', error);
      return false;
    }
    
    return true;
  }
  
  /**
   * Invalidate all sessions for user except current
   * @param userId User ID
   * @param currentSessionId Current session ID to exclude
   * @returns Number of invalidated sessions
   */
  async invalidateOtherSessions(userId: string, currentSessionId: string): Promise<number> {
    try {
      const { data, error } = await this.client.rpc('invalidate_user_sessions', {
        p_user_id: userId,
        p_exclude_session_id: currentSessionId
      });
      
      if (error) {
        throw new Error(`Failed to invalidate sessions: ${error.message}`);
      }
      
      return data as number;
    } catch (error) {
      console.error('Error invalidating other sessions:', error);
      
      // Fallback to direct update if RPC fails
      const { error: updateError, count } = await this.client
        .from('user_sessions')
        .update({
          is_active: false
        })
        .eq('user_id', userId)
        .neq('id', currentSessionId)
        .eq('is_active', true);
      
      if (updateError) {
        throw new Error(`Failed to invalidate sessions: ${updateError.message}`);
      }
      
      return count || 0;
    }
  }
  
  /**
   * Clean expired sessions
   * @returns Number of cleaned sessions
   */
  async cleanExpiredSessions(): Promise<number> {
    try {
      const { data, error } = await this.client.rpc('clean_expired_sessions');
      
      if (error) {
        throw new Error(`Failed to clean expired sessions: ${error.message}`);
      }
      
      return data as number;
    } catch (error) {
      console.error('Error cleaning expired sessions:', error);
      
      // Fallback to direct delete if RPC fails
      const { error: deleteError, count } = await this.client
        .from('user_sessions')
        .delete()
        .lt('expires_at', new Date().toISOString());
      
      if (deleteError) {
        throw new Error(`Failed to clean expired sessions: ${deleteError.message}`);
      }
      
      return count || 0;
    }
  }
}