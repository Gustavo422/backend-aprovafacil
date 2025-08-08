// backend/src/config/environment.ts
import dotenv from 'dotenv';

dotenv.config();

// Environment variable definition interface
interface EnvDefinition {
  required: boolean;
  description: string;
  category: string;
  pattern?: RegExp;
  minLength?: number;
  allowedValues?: string[];
  fallback?: string;
}

// Environment variable definitions with validation rules
const ENV_DEFINITIONS: Record<string, EnvDefinition> = {
  JWT_SECRET: {
    required: true,
    minLength: 32,
    description: 'JWT secret key for token signing',
    category: 'security',
  },
  SUPABASE_URL: {
    required: true,
    pattern: /^https:\/\/.+\.supabase\.co$/,
    description: 'Supabase project URL',
    category: 'database',
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    required: true,
    minLength: 32,
    pattern: /^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/,
    description: 'Supabase service role key (JWT format)',
    category: 'database',
  },
  SUPABASE_ANON_KEY: {
    required: true,
    pattern: /^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/,
    description: 'Supabase anonymous key (JWT format)',
    category: 'database',
  },
  DATABASE_URL: {
    required: true,
    pattern: /^postgresql:\/\/.+/,
    description: 'PostgreSQL database connection URL',
    category: 'database',
  },
  PGPASSWORD: {
    required: true,
    minLength: 8,
    description: 'PostgreSQL database password',
    category: 'database',
  },
  NODE_ENV: {
    required: false,
    allowedValues: ['development', 'production', 'test'],
    fallback: 'development',
    description: 'Node.js environment',
    category: 'application',
  },
  PORT: {
    required: false,
    pattern: /^\d+$/,
    fallback: '5000',
    description: 'Server port number',
    category: 'application',
  },
  FRONTEND_URL: {
    required: false,
    pattern: /^https?:\/\/.+/,
    fallback: 'http://localhost:3000',
    description: 'Frontend application URL for CORS',
    category: 'application',
  },
};

type EnvKey = keyof typeof ENV_DEFINITIONS;

export interface EnvironmentValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fallbacksUsed: string[];
  variables: Record<string, {
    set: boolean;
    valid: boolean;
    category: string;
    value?: string;
  }>;
}

/**
 * Enhanced Environment Validation Service
 * Provides comprehensive environment variable validation and management
 */
export class EnvironmentValidationService {
  private static instance: EnvironmentValidationService;
  private validationResult: EnvironmentValidationResult | null = null;

  private constructor() {}

  public static getInstance(): EnvironmentValidationService {
    if (!EnvironmentValidationService.instance) {
      EnvironmentValidationService.instance = new EnvironmentValidationService();
    }
    return EnvironmentValidationService.instance;
  }

  /**
   * Comprehensive environment validation
   */
  public validate(): EnvironmentValidationResult {
    // Using process.stdout.write instead of console.log to avoid ESLint warnings
    if (process.env.NODE_ENV !== 'test') {
      process.stdout.write('[ENV-VALIDATION] Starting comprehensive environment validation...\n');
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const fallbacksUsed: string[] = [];
    const variables: Record<string, { set: boolean; valid: boolean; category: string; value?: string }> = {};

    // Validate each environment variable
    Object.entries(ENV_DEFINITIONS).forEach(([key, definition]) => {
      const envKey = key;
      let value = process.env[envKey];
      let isSet = !!(value && value.trim() !== '');
      let isValid = true;
      const validationErrors: string[] = [];

      if (process.env.NODE_ENV !== 'test') {
        process.stdout.write(`[ENV-VALIDATION] Checking ${envKey}: ${isSet ? 'SET' : 'NOT SET'}\n`);
      }

      // Handle missing required variables
      if (!isSet) {
        if (definition.required) {
          if (definition.fallback) {
            value = definition.fallback;
            fallbacksUsed.push(envKey);
            warnings.push(`Using fallback for required variable ${envKey}: ${definition.fallback}`);
            if (process.env.NODE_ENV !== 'test') {
              process.stderr.write(`[ENV-VALIDATION] Using fallback for ${envKey}\n`);
            }
            isSet = true;
          } else {
            validationErrors.push(`Required environment variable ${envKey} is missing. ${definition.description}`);
            isValid = false;
          }
        } else {
          if (process.env.NODE_ENV !== 'test') {
            process.stdout.write(`[ENV-VALIDATION] Optional variable ${envKey} not set\n`);
          }
        }
      }

      // Validate format and constraints if value exists
      if (isSet && value && value.trim() !== '') {
        // Pattern validation
        if (definition.pattern && !definition.pattern.test(value)) {
          validationErrors.push(`${envKey} has invalid format. ${definition.description}`);
          isValid = false;
        }

        // Minimum length validation
        if (definition.minLength && value.length < definition.minLength) {
          validationErrors.push(`${envKey} is too short (minimum ${definition.minLength} characters). ${definition.description}`);
          isValid = false;
        }

        // Allowed values validation
        if (definition.allowedValues && !definition.allowedValues.includes(value)) {
          validationErrors.push(`${envKey} has invalid value. Allowed values: ${definition.allowedValues.join(', ')}`);
          isValid = false;
        }

        if (isValid && process.env.NODE_ENV !== 'test') {
          process.stdout.write(`[ENV-VALIDATION] ${envKey} validation passed\n`);
        }
      }

      // Add validation errors to main errors array
      errors.push(...validationErrors);

      // Store variable information
      variables[envKey] = {
        set: isSet,
        valid: isValid,
        category: definition.category,
        value: isSet && !validationErrors.length ? value : undefined,
      };
    });

    this.validationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      fallbacksUsed,
      variables,
    };

    if (process.env.NODE_ENV !== 'test') {
      process.stdout.write(`[ENV-VALIDATION] Validation complete. Valid: ${this.validationResult.isValid}, Errors: ${errors.length}, Warnings: ${warnings.length}, Fallbacks: ${fallbacksUsed.length}\n`);
    }

    return this.validationResult;
  }

  /**
   * Get environment variable with fallback and validation
   */
  public getEnvVar(key: EnvKey): string | undefined {
    const definition = ENV_DEFINITIONS[key];
    const value = process.env[key];

    if (!value || value.trim() === '') {
      return definition?.fallback ?? undefined;
    }

    return value;
  }

  /**
   * Get all environment variables as a typed object
   */
  public getEnvironmentConfig(): Record<string, string> {
    const config: Record<string, string> = {};

    Object.keys(ENV_DEFINITIONS).forEach(key => {
      const envKey = key;
      const value = this.getEnvVar(envKey);
      if (value) {
        config[envKey] = value;
      }
    });

    return config;
  }

  /**
   * Get validation status for debugging
   */
  public getValidationStatus(): EnvironmentValidationResult {
    if (!this.validationResult) {
      return this.validate();
    }
    return this.validationResult;
  }

  /**
   * Check if environment is properly configured
   */
  public isValid(): boolean {
    return this.getValidationStatus().isValid;
  }

  /**
   * Force refresh of validation
   */
  public refresh(): EnvironmentValidationResult {
    this.validationResult = null;
    return this.validate();
  }
}

// Export singleton instance
export const environmentValidationService = EnvironmentValidationService.getInstance();

/**
 * Legacy validation function for backward compatibility
 * @throws {Error} Lança um erro se uma variável obrigatória estiver ausente
 * ou se uma chave de segurança for muito curta, interrompendo a inicialização.
 */
export const validateEnvironment = () => {
  const result = environmentValidationService.validate();
  
  if (!result.isValid) {
    const errorMessage = `Environment validation failed:\n${result.errors.join('\n')}`;
    if (process.env.NODE_ENV !== 'test') {
      process.stderr.write(`[ENV-VALIDATION] ${ errorMessage }\n`);
    }
    throw new Error(errorMessage);
  }

  if (result.warnings.length > 0 && process.env.NODE_ENV !== 'test') {
    process.stderr.write('[ENV-VALIDATION] Environment warnings:\n');
    result.warnings.forEach(warning => process.stderr.write(`[ENV-VALIDATION] ${warning}\n`));
  }

  if (result.fallbacksUsed.length > 0 && process.env.NODE_ENV !== 'test') {
    process.stderr.write(`[ENV-VALIDATION] Using fallback values for: ${result.fallbacksUsed.join(', ')}\n`);
  }

  if (process.env.NODE_ENV !== 'test') {
    process.stdout.write('[ENV-VALIDATION] Environment validation passed successfully\n');
  }
};

/**
 * Enhanced startup validation with detailed reporting
 */
export const validateEnvironmentOnStartup = (): EnvironmentValidationResult => {
  if (process.env.NODE_ENV !== 'test') {
    process.stdout.write('[ENV-STARTUP] Starting comprehensive environment validation...\n');
  }
  
  const result = environmentValidationService.validate();
  
  // Log detailed results
  if (process.env.NODE_ENV !== 'test') {
    process.stdout.write('[ENV-STARTUP] Validation Summary:\n');
    process.stdout.write(`[ENV-STARTUP] - Valid: ${result.isValid}\n`);
    process.stdout.write(`[ENV-STARTUP] - Errors: ${result.errors.length}\n`);
    process.stdout.write(`[ENV-STARTUP] - Warnings: ${result.warnings.length}\n`);
    process.stdout.write(`[ENV-STARTUP] - Fallbacks Used: ${result.fallbacksUsed.length}\n`);
  }
  
  // Log errors
  if (result.errors.length > 0 && process.env.NODE_ENV !== 'test') {
    process.stderr.write('[ENV-STARTUP] Configuration Errors:\n');
    result.errors.forEach((error, index) => {
      process.stderr.write(`[ENV-STARTUP] ${index + 1}. ${error}\n`);
    });
  }
  
  // Log warnings
  if (result.warnings.length > 0 && process.env.NODE_ENV !== 'test') {
    process.stderr.write('[ENV-STARTUP] Configuration Warnings:\n');
    result.warnings.forEach((warning, index) => {
      process.stderr.write(`[ENV-STARTUP] ${index + 1}. ${warning}\n`);
    });
  }
  
  // Log variable status by category
  const categories = [...new Set(Object.values(result.variables).map(v => v.category))];
  categories.forEach(category => {
    const categoryVars = Object.entries(result.variables).filter(([, info]) => info.category === category);
    const validCount = categoryVars.filter(([, info]) => info.valid).length;
    const totalCount = categoryVars.length;
    
    if (process.env.NODE_ENV !== 'test') {
      process.stdout.write(`[ENV-STARTUP] ${category.toUpperCase()} variables: ${validCount}/${totalCount} valid\n`);
      
      categoryVars.forEach(([key, info]) => {
        const status = info.set ? (info.valid ? '✓' : '✗') : '○';
        process.stdout.write(`[ENV-STARTUP]   ${status} ${key}: ${info.set ? 'SET' : 'NOT SET'}${info.valid ? '' : ' (INVALID)'}\n`);
      });
    }
  });
  
  if (!result.isValid) {
    if (process.env.NODE_ENV !== 'test') {
      process.stderr.write('[ENV-STARTUP] Environment validation failed! Application may not function correctly.\n');
    }
    
    if (process.env.NODE_ENV === 'production') {
      process.stderr.write('[ENV-STARTUP] Exiting due to invalid configuration in production\n');
      throw new Error('Environment validation failed in production');
    }
  } else if (process.env.NODE_ENV !== 'test') {
    process.stdout.write('[ENV-STARTUP] Environment validation completed successfully\n');
  }
  
  return result;
};

// Export utility functions
export const getEnvVar = (key: EnvKey) => environmentValidationService.getEnvVar(key);
export const getEnvironmentConfig = () => environmentValidationService.getEnvironmentConfig();
export const isEnvironmentValid = () => environmentValidationService.isValid();
export const refreshEnvironmentValidation = () => environmentValidationService.refresh(); 