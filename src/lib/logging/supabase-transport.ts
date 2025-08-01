import { supabase } from '../../config/supabase-unified.js';
import { LogEntry, LogLevel, LogTransport } from './logging-service.js';
// import type { Writable } from 'stream';

/**
 * Supabase log transport
 */
export class SupabaseLogTransport implements LogTransport {
  /**
   * Supabase client
   */
  private readonly supabase;
  
  /**
   * Buffer for log entries
   */
  private buffer: LogEntry[] = [];
  
  /**
   * Flush interval
   */
  private flushInterval: ReturnType<typeof setTimeout> | null = null;
  
  /**
   * Create a new Supabase log transport
   * @param options Transport options
   */
  constructor(
    private readonly options: {
      /**
       * Supabase URL
       */
      supabaseUrl: string;
      
      /**
       * Supabase API key
       */
      supabaseKey: string;
      
      /**
       * Table name
       */
      tableName?: string;
      
      /**
       * Minimum log level
       */
      minLevel?: LogLevel;
      
      /**
       * Maximum buffer size
       */
      maxBufferSize?: number;
      
      /**
       * Flush interval in milliseconds
       */
      flushIntervalMs?: number;
    },
  ) {
    // Set default options
    this.options = {
      tableName: 'logs',
      minLevel: LogLevel.INFO,
      maxBufferSize: 100,
      flushIntervalMs: 10000,
      ...options,
    };
    
    // Use unified Supabase client
    this.supabase = supabase;
    
    // Start flush interval
    this.startFlushInterval();
  }
  
  /**
   * Log a message
   * @param entry Log entry
   */
  log(entry: LogEntry): void {
    // Check if log level is enabled
    if (!this.isLevelEnabled(entry.level)) {
      return;
    }
    
    // Add entry to buffer
    this.buffer.push(entry);
    
    // Flush if buffer is full
    const maxBufferSize = this.options.maxBufferSize || 100;
    if (this.buffer.length >= maxBufferSize) {
      this.flush().catch(error => {
        // eslint-disable-next-line no-console
        console.error('Error flushing logs to Supabase:', error);
      });
    }
  }
  
  /**
   * Start the flush interval
   */
  private startFlushInterval(): void {
    // Clear any existing interval
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    
    // Start new interval
    this.flushInterval = setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush().catch(error => {
          // eslint-disable-next-line no-console
          console.error('Error flushing logs to Supabase:', error);
        });
      }
    }, this.options.flushIntervalMs);
  }
  
  /**
   * Flush logs to Supabase
   */
  async flush(): Promise<void> {
    // Check if buffer is empty
    if (this.buffer.length === 0) {
      return;
    }
    
    // Copy buffer and clear
    const entries = [...this.buffer];
    this.buffer = [];
    
    try {
      // Convert entries to Supabase format
      const logs = entries.map(entry => ({
        level: entry.level,
        message: entry.message,
        logger_name: entry.name,
        timestamp: entry.timestamp.toISOString(),
        metadata: entry.meta || {},
      }));
      
      // Insert logs into Supabase
      const tableName = this.options.tableName || 'logs';
      const { error } = await this.supabase
        .from(tableName)
        .insert(logs);
      
      if (error) {
        // eslint-disable-next-line no-console
        console.error('Error inserting logs into Supabase:', error);
        
        // Put logs back in buffer
        this.buffer = [...entries, ...this.buffer];
        
        // Limit buffer size
        const maxBufferSize = this.options.maxBufferSize || 100;
        if (this.buffer.length > maxBufferSize * 2) {
          this.buffer = this.buffer.slice(-maxBufferSize);
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error flushing logs to Supabase:', error);
      
      // Put logs back in buffer
      this.buffer = [...entries, ...this.buffer];
      
      // Limit buffer size
      const maxBufferSize = this.options.maxBufferSize || 100;
      if (this.buffer.length > maxBufferSize * 2) {
        this.buffer = this.buffer.slice(-maxBufferSize);
      }
    }
  }
  
  /**
   * Stop the transport
   */
  async stop(): Promise<void> {
    // Clear flush interval
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    // Flush any remaining logs
    await this.flush();
  }
  
  /**
   * Check if a log level is enabled
   * @param level Log level to check
   * @returns True if the log level is enabled
   */
  private isLevelEnabled(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.SILENT];
    const minLevel = this.options.minLevel || LogLevel.DEBUG;
    const minLevelIndex = levels.indexOf(minLevel);
    const levelIndex = levels.indexOf(level);
    
    return levelIndex >= minLevelIndex;
  }
}
