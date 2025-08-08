/**
 * Backend Environment Variable Management Utilities
 * Provides utility functions for environment variable handling and validation
 */

import { environmentValidationService } from '../config/environment.js';

export interface EnvironmentVariable {
  key: string;
  value?: string;
  isSet: boolean;
  isValid: boolean;
  category: string;
  description?: string;
  fallbackUsed?: boolean;
}

export interface EnvironmentSummary {
  totalVariables: number;
  setVariables: number;
  validVariables: number;
  invalidVariables: number;
  fallbacksUsed: number;
  byCategory: Record<string, {
    total: number;
    valid: number;
    invalid: number;
  }>;
}

/**
 * Backend Environment Variable Management Class
 */
export class BackendEnvironmentUtils {
  private static instance: BackendEnvironmentUtils;

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): BackendEnvironmentUtils {
    if (!BackendEnvironmentUtils.instance) {
      BackendEnvironmentUtils.instance = new BackendEnvironmentUtils();
    }
    return BackendEnvironmentUtils.instance;
  }

  /**
   * Get environment variable with validation and fallback
   */
  public getVariable(key: string, fallback?: string): string | undefined {
    const value = process.env[key];
    
    if (!value || value.trim() === '') {
      if (fallback !== undefined) {
        if (process.env.NODE_ENV !== 'test') {
          process.stderr.write(`[BACKEND-ENV-UTILS] Using fallback for ${key}: ${fallback}\n`);
        }
        return fallback;
      }
      return undefined;
    }
    
    return value;
  }

  /**
   * Get required environment variable (throws if missing)
   */
  public getRequiredVariable(key: string, description?: string): string {
    const value = this.getVariable(key);
    
    if (!value) {
      const errorMsg = `Required environment variable ${key} is missing${description ? `: ${description}` : ''}`;
      if (process.env.NODE_ENV !== 'test') {
        process.stderr.write(`[BACKEND-ENV-UTILS] ${errorMsg}\n`);
      }
      throw new Error(errorMsg);
    }
    
    return value;
  }

  /**
   * Get boolean environment variable
   */
  public getBooleanVariable(key: string, fallback = false): boolean {
    const value = this.getVariable(key);
    
    if (!value) {
      return fallback;
    }
    
    const lowerValue = value.toLowerCase();
    return lowerValue === 'true' || lowerValue === '1' || lowerValue === 'yes';
  }

  /**
   * Get numeric environment variable
   */
  public getNumericVariable(key: string, fallback?: number): number | undefined {
    const value = this.getVariable(key);
    
    if (!value) {
      return fallback;
    }
    
    const numValue = parseInt(value, 10);
    
    if (isNaN(numValue)) {
      if (process.env.NODE_ENV !== 'test') {
        process.stderr.write(`[BACKEND-ENV-UTILS] Invalid numeric value for ${key}: ${value}, using fallback: ${fallback}\n`);
      }
      return fallback;
    }
    
    return numValue;
  }

  /**
   * Get array environment variable (comma-separated)
   */
  public getArrayVariable(key: string, fallback: string[] = []): string[] {
    const value = this.getVariable(key);
    
    if (!value) {
      return fallback;
    }
    
    return value.split(',').map(item => item.trim()).filter(item => item.length > 0);
  }

  /**
   * Validate URL format
   */
  public validateUrl(url: string): boolean {
    try {
      const validUrl = new URL(url);
      return Boolean(validUrl);
    } catch {
      return false;
    }
  }

  /**
   * Get URL environment variable with validation
   */
  public getUrlVariable(key: string, fallback?: string): string | undefined {
    const value = this.getVariable(key, fallback);
    
    if (!value) {
      return undefined;
    }
    
    if (!this.validateUrl(value)) {
      if (process.env.NODE_ENV !== 'test') {
        process.stderr.write(`[BACKEND-ENV-UTILS] Invalid URL format for ${key}: ${value}\n`);
      }
      return fallback;
    }
    
    return value;
  }

  /**
   * Get environment variables by prefix
   */
  public getVariablesByPrefix(prefix: string): Record<string, string> {
    const variables: Record<string, string> = {};
    
    Object.keys(process.env).forEach(key => {
      if (key.startsWith(prefix)) {
        const value = process.env[key];
        if (value) {
          variables[key] = value;
        }
      }
    });
    
    return variables;
  }

  /**
   * Get all environment variables with metadata
   */
  public getAllVariables(): EnvironmentVariable[] {
    const validationResult = environmentValidationService.getValidationStatus();
    const variables: EnvironmentVariable[] = [];
    
    Object.entries(validationResult.variables).forEach(([key, info]) => {
      variables.push({
        key,
        value: info.set ? process.env[key] : undefined,
        isSet: info.set,
        isValid: info.valid,
        category: info.category,
        fallbackUsed: validationResult.fallbacksUsed.includes(key),
      });
    });
    
    return variables;
  }

  /**
   * Get environment summary statistics
   */
  public getEnvironmentSummary(): EnvironmentSummary {
    const variables = this.getAllVariables();
    const byCategory: Record<string, { total: number; valid: number; invalid: number }> = {};
    
    variables.forEach(variable => {
      byCategory[variable.category] ??= { total: 0, valid: 0, invalid: 0 };
      
      const categoryStats = byCategory[variable.category];
      if (categoryStats) {
        categoryStats.total++;
        if (variable.isValid) {
          categoryStats.valid++;
        } else {
          categoryStats.invalid++;
        }
      }
    });
    
    return {
      totalVariables: variables.length,
      setVariables: variables.filter(v => v.isSet).length,
      validVariables: variables.filter(v => v.isValid).length,
      invalidVariables: variables.filter(v => !v.isValid).length,
      fallbacksUsed: variables.filter(v => v.fallbackUsed).length,
      byCategory,
    };
  }

  /**
   * Generate environment configuration report
   */
  public generateConfigurationReport(): string {
    const summary = this.getEnvironmentSummary();
    const variables = this.getAllVariables();
    
    let report = '=== Backend Environment Configuration Report ===\n\n';
    
    // Summary
    report += 'SUMMARY:\n';
    report += `- Total Variables: ${summary.totalVariables}\n`;
    report += `- Set Variables: ${summary.setVariables}\n`;
    report += `- Valid Variables: ${summary.validVariables}\n`;
    report += `- Invalid Variables: ${summary.invalidVariables}\n`;
    report += `- Fallbacks Used: ${summary.fallbacksUsed}\n\n`;
    
    // By Category
    report += 'BY CATEGORY:\n';
    Object.entries(summary.byCategory).forEach(([category, stats]) => {
      report += `- ${category.toUpperCase()}: ${stats.valid}/${stats.total} valid\n`;
    });
    report += '\n';
    
    // Variable Details
    report += 'VARIABLE DETAILS:\n';
    const categories = [...new Set(variables.map(v => v.category))];
    
    categories.forEach(category => {
      report += `\n${category.toUpperCase()}:\n`;
      const categoryVars = variables.filter(v => v.category === category);
      
      categoryVars.forEach(variable => {
        const status = variable.isSet ? (variable.isValid ? '✓' : '✗') : '○';
        const fallback = variable.fallbackUsed ? ' (fallback)' : '';
        report += `  ${status} ${variable.key}: ${variable.isSet ? 'SET' : 'NOT SET'}${fallback}\n`;
      });
    });
    
    return report;
  }

  /**
   * Validate specific environment variable patterns
   */
  public validatePattern(value: string, pattern: RegExp, description?: string): boolean {
    const isValid = pattern.test(value);
    
    if (!isValid && description) {
      if (process.env.NODE_ENV !== 'test') {
        process.stderr.write(`[BACKEND-ENV-UTILS] Pattern validation failed: ${description}\n`);
      }
    }
    
    return isValid;
  }

  /**
   * Sanitize environment variable for logging (hide sensitive data)
   */
  public sanitizeForLogging(key: string, value: string): string {
    const sensitivePatterns = [
      /secret/i,
      /key/i,
      /password/i,
      /token/i,
      /auth/i,
    ];
    
    const isSensitive = sensitivePatterns.some(pattern => pattern.test(key));
    
    if (isSensitive) {
      if (value.length <= 8) {
        return '***';
      }
      return `${value.substring(0, 4) }***${ value.substring(value.length - 4)}`;
    }
    
    return value;
  }

  /**
   * Export environment configuration for debugging (sanitized)
   */
  public exportConfiguration(): Record<string, string> {
    const variables = this.getAllVariables();
    const config: Record<string, string> = {};
    
    variables.forEach(variable => {
      if (variable.isSet && variable.value) {
        config[variable.key] = this.sanitizeForLogging(variable.key, variable.value);
      }
    });
    
    return config;
  }

  /**
   * Check if running in development mode
   */
  public isDevelopment(): boolean {
    return this.getVariable('NODE_ENV', 'development') === 'development';
  }

  /**
   * Check if running in production mode
   */
  public isProduction(): boolean {
    return this.getVariable('NODE_ENV') === 'production';
  }

  /**
   * Check if running in test mode
   */
  public isTest(): boolean {
    return this.getVariable('NODE_ENV') === 'test';
  }

  /**
   * Get database configuration
   */
  public getDatabaseConfig(): {
    url: string;
    supabaseUrl: string;
    supabaseServiceKey: string;
    supabaseAnonKey: string;
    } {
    return {
      url: this.getRequiredVariable('DATABASE_URL', 'PostgreSQL connection URL'),
      supabaseUrl: this.getRequiredVariable('SUPABASE_URL', 'Supabase project URL'),
      supabaseServiceKey: this.getRequiredVariable('SUPABASE_SERVICE_ROLE_KEY', 'Supabase service role key'),
      supabaseAnonKey: this.getRequiredVariable('SUPABASE_ANON_KEY', 'Supabase anonymous key'),
    };
  }

  /**
   * Get server configuration
   */
  public getServerConfig(): {
    port: number;
    nodeEnv: string;
    frontendUrl: string;
    jwtSecret: string;
    } {
    return {
      port: this.getNumericVariable('PORT', 5000) ?? 5000,
      nodeEnv: this.getVariable('NODE_ENV', 'development') ?? 'development',
      frontendUrl: this.getVariable('FRONTEND_URL', 'http://localhost:3000') ?? 'http://localhost:3000',
      jwtSecret: this.getRequiredVariable('JWT_SECRET', 'JWT signing secret'),
    };
  }

  /**
   * Get application environment info
   */
  public getEnvironmentInfo(): {
    nodeEnv: string;
    isDevelopment: boolean;
    isProduction: boolean;
    isTest: boolean;
    platform: string;
    nodeVersion: string;
    port: number;
    } {
    return {
      nodeEnv: this.getVariable('NODE_ENV', 'development') ?? 'development',
      isDevelopment: this.isDevelopment(),
      isProduction: this.isProduction(),
      isTest: this.isTest(),
      platform: process.platform,
      nodeVersion: process.version,
      port: this.getNumericVariable('PORT', 5000) ?? 5000,
    };
  }

  /**
   * Validate database connection configuration
   */
  public validateDatabaseConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      const config = this.getDatabaseConfig();
      
      // Validate URLs
      if (!this.validateUrl(config.supabaseUrl)) {
        errors.push('SUPABASE_URL is not a valid URL');
      }
      
      if (!config.supabaseUrl.includes('.supabase.co')) {
        errors.push('SUPABASE_URL does not appear to be a valid Supabase URL');
      }
      
      // Validate JWT tokens
      const jwtPattern = /^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
      
      if (!jwtPattern.test(config.supabaseServiceKey)) {
        errors.push('SUPABASE_SERVICE_ROLE_KEY is not a valid JWT token');
      }
      
      if (!jwtPattern.test(config.supabaseAnonKey)) {
        errors.push('SUPABASE_ANON_KEY is not a valid JWT token');
      }
      
      // Validate database URL
      if (!config.url.startsWith('postgresql://')) {
        errors.push('DATABASE_URL must be a PostgreSQL connection string');
      }
      
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown database configuration error');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
export const backendEnvironmentUtils = BackendEnvironmentUtils.getInstance();

// Export convenience functions
export const getEnvVariable = (key: string, fallback?: string) => backendEnvironmentUtils.getVariable(key, fallback);
export const getRequiredEnvVariable = (key: string, description?: string) => backendEnvironmentUtils.getRequiredVariable(key, description);
export const getBooleanEnvVariable = (key: string, fallback?: boolean) => backendEnvironmentUtils.getBooleanVariable(key, fallback);
export const getNumericEnvVariable = (key: string, fallback?: number) => backendEnvironmentUtils.getNumericVariable(key, fallback);
export const getArrayEnvVariable = (key: string, fallback?: string[]) => backendEnvironmentUtils.getArrayVariable(key, fallback);
export const getUrlEnvVariable = (key: string, fallback?: string) => backendEnvironmentUtils.getUrlVariable(key, fallback);
export const getEnvVariablesByPrefix = (prefix: string) => backendEnvironmentUtils.getVariablesByPrefix(prefix);
export const generateBackendEnvReport = () => backendEnvironmentUtils.generateConfigurationReport();
export const isDevelopmentMode = () => backendEnvironmentUtils.isDevelopment();
export const isProductionMode = () => backendEnvironmentUtils.isProduction();
export const isTestMode = () => backendEnvironmentUtils.isTest();
export const getDatabaseConfiguration = () => backendEnvironmentUtils.getDatabaseConfig();
export const getServerConfiguration = () => backendEnvironmentUtils.getServerConfig();