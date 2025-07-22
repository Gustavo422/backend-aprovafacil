import * as fs from 'fs';
import * as path from 'path';
import { LogEntry, LogLevel, LogTransport } from './logging-service';

/**
 * File log transport
 */
export class FileLogTransport implements LogTransport {
  /**
   * Log file stream
   */
  private stream: fs.WriteStream | null = null;
  
  /**
   * Create a new file log transport
   * @param options Transport options
   */
  constructor(
    private readonly options: {
      /**
       * Log file path
       */
      filePath: string;
      
      /**
       * Minimum log level
       */
      minLevel?: LogLevel;
      
      /**
       * Format function for log messages
       */
      format?: (entry: LogEntry) => string;
      
      /**
       * Maximum file size in bytes
       */
      maxFileSize?: number;
      
      /**
       * Maximum number of rotated files
       */
      maxFiles?: number;
      
      /**
       * Whether to append to existing file
       */
      append?: boolean;
    }
  ) {
    // Set default options
    this.options = {
      minLevel: LogLevel.INFO,
      format: this.defaultFormat,
      maxFileSize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 5,
      append: true,
      ...options
    };
    
    // Create directory if it doesn't exist
    const dir = path.dirname(this.options.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Open log file
    this.openStream();
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
    
    // Format log message
    const message = this.options.format!(entry);
    
    // Write to file
    this.write(message);
  }
  
  /**
   * Write a message to the log file
   * @param message Message to write
   */
  private write(message: string): void {
    // Check if stream is open
    if (!this.stream) {
      this.openStream();
    }
    
    // Write message
    this.stream!.write(message + '\n');
    
    // Check file size
    this.checkFileSize();
  }
  
  /**
   * Open log file stream
   */
  private openStream(): void {
    // Close existing stream
    if (this.stream) {
      this.stream.end();
      this.stream = null;
    }
    
    // Open new stream
    this.stream = fs.createWriteStream(this.options.filePath, {
      flags: this.options.append ? 'a' : 'w',
      encoding: 'utf8'
    });
    
    // Handle errors
    this.stream.on('error', (error) => {
      console.error('Error writing to log file:', error);
    });
  }
  
  /**
   * Check file size and rotate if needed
   */
  private checkFileSize(): void {
    try {
      // Get file stats
      const stats = fs.statSync(this.options.filePath);
      
      // Check if file is too large
      if (stats.size >= this.options.maxFileSize!) {
        this.rotateFiles();
      }
    } catch (error) {
      console.error('Error checking log file size:', error);
    }
  }
  
  /**
   * Rotate log files
   */
  private rotateFiles(): void {
    // Close current stream
    if (this.stream) {
      this.stream.end();
      this.stream = null;
    }
    
    // Rotate files
    for (let i = this.options.maxFiles! - 1; i >= 0; i--) {
      const source = i === 0
        ? this.options.filePath
        : `${this.options.filePath}.${i}`;
      
      const target = `${this.options.filePath}.${i + 1}`;
      
      try {
        // Check if source exists
        if (fs.existsSync(source)) {
          // Remove target if it exists
          if (fs.existsSync(target)) {
            fs.unlinkSync(target);
          }
          
          // Rename source to target
          fs.renameSync(source, target);
        }
      } catch (error) {
        console.error(`Error rotating log file ${source} to ${target}:`, error);
      }
    }
    
    // Open new stream
    this.openStream();
  }
  
  /**
   * Close the transport
   */
  close(): void {
    if (this.stream) {
      this.stream.end();
      this.stream = null;
    }
  }
  
  /**
   * Check if a log level is enabled
   * @param level Log level to check
   * @returns True if the log level is enabled
   */
  private isLevelEnabled(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.SILENT];
    const minLevelIndex = levels.indexOf(this.options.minLevel!);
    const levelIndex = levels.indexOf(level);
    
    return levelIndex >= minLevelIndex;
  }
  
  /**
   * Default format function
   * @param entry Log entry
   * @returns Formatted log message
   */
  private defaultFormat(entry: LogEntry): string {
    // Format timestamp
    const timestamp = entry.timestamp.toISOString();
    
    // Format level
    const level = entry.level.toUpperCase().padEnd(5);
    
    // Format message
    let message = `${timestamp} ${level} [${entry.name}] ${entry.message}`;
    
    // Add metadata
    if (entry.meta && Object.keys(entry.meta).length > 0) {
      message += ` ${JSON.stringify(entry.meta)}`;
    }
    
    return message;
  }
}