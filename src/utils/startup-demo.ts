/**
 * Backend Startup Validation Demo
 * Demonstrates how to use the backend environment validation services
 */

import { validateEnvironmentOnStartup, environmentValidationService } from '../config/environment.js';
import { backendEnvironmentUtils, generateBackendEnvReport } from './environment-utils.js';

// Demo logging functions to avoid ESLint warnings
const demoLog = (message: string) => {
  if (process.env.NODE_ENV !== 'test') {
    process.stdout.write(`${message }\n`);
  }
};

const demoError = (message: string) => {
  if (process.env.NODE_ENV !== 'test') {
    process.stderr.write(`${message }\n`);
  }
};

const demoWarn = (message: string) => {
  if (process.env.NODE_ENV !== 'test') {
    process.stderr.write(`${message }\n`);
  }
};

/**
 * Demo function to show backend startup validation in action
 */
export function runBackendStartupValidationDemo(): void {
  // Skip demo output in test environment
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  process.stdout.write('=== Backend Startup Validation Demo ===\n\n');

  try {
    // 1. Show environment info
    demoLog('1. Environment Information:');
    const envInfo = backendEnvironmentUtils.getEnvironmentInfo();
    demoLog(`   - Node Environment: ${envInfo.nodeEnv}`);
    demoLog(`   - Is Development: ${envInfo.isDevelopment}`);
    demoLog(`   - Is Production: ${envInfo.isProduction}`);
    demoLog(`   - Platform: ${envInfo.platform}`);
    demoLog(`   - Node Version: ${envInfo.nodeVersion}`);
    demoLog(`   - Server Port: ${envInfo.port}\n`);

    // 2. Run startup validation
    demoLog('2. Running Startup Validation...');
    const validationResult = validateEnvironmentOnStartup();

    demoLog(`   - Overall Status: ${validationResult.isValid ? '✅ VALID' : '❌ INVALID'}`);
    demoLog(`   - Total Errors: ${validationResult.errors.length}`);
    demoLog(`   - Total Warnings: ${validationResult.warnings.length}`);
    demoLog(`   - Fallbacks Used: ${validationResult.fallbacksUsed.length}\n`);

    // 3. Show configuration details
    demoLog('3. Configuration Details:');
    const serverConfig = backendEnvironmentUtils.getServerConfig();
    demoLog(`   - Server Port: ${serverConfig.port}`);
    demoLog(`   - Frontend URL: ${serverConfig.frontendUrl}`);
    demoLog(`   - JWT Secret: ${backendEnvironmentUtils.sanitizeForLogging('JWT_SECRET', serverConfig.jwtSecret)}`);
    demoLog('');

    // 4. Database configuration
    demoLog('4. Database Configuration:');
    try {
      const dbConfig = backendEnvironmentUtils.getDatabaseConfig();
      demoLog(`   - Database URL: ${backendEnvironmentUtils.sanitizeForLogging('DATABASE_URL', dbConfig.url)}`);
      demoLog(`   - Supabase URL: ${dbConfig.supabaseUrl}`);
      demoLog(`   - Service Key: ${backendEnvironmentUtils.sanitizeForLogging('SUPABASE_SERVICE_ROLE_KEY', dbConfig.supabaseServiceKey)}`);
      demoLog(`   - Anon Key: ${backendEnvironmentUtils.sanitizeForLogging('SUPABASE_ANON_KEY', dbConfig.supabaseAnonKey)}`);

      const dbValidation = backendEnvironmentUtils.validateDatabaseConfig();
      demoLog(`   - Database Config Valid: ${dbValidation.isValid ? '✅' : '❌'}`);

      if (!dbValidation.isValid) {
        demoLog('   - Database Config Errors:');
        dbValidation.errors.forEach(error => {
          demoLog(`     - ${error}`);
        });
      }
    } catch (error) {
      demoError(`   - Database Config Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    demoLog('');

    // 5. Environment summary
    demoLog('5. Environment Summary:');
    const summary = backendEnvironmentUtils.getEnvironmentSummary();
    demoLog(`   - Total Variables: ${summary.totalVariables}`);
    demoLog(`   - Set Variables: ${summary.setVariables}`);
    demoLog(`   - Valid Variables: ${summary.validVariables}`);
    demoLog(`   - Invalid Variables: ${summary.invalidVariables}`);
    demoLog(`   - Fallbacks Used: ${summary.fallbacksUsed}`);
    demoLog('');

    // 6. By category breakdown
    demoLog('6. Variables by Category:');
    Object.entries(summary.byCategory).forEach(([category, stats]) => {
      demoLog(`   - ${category.toUpperCase()}: ${stats.valid}/${stats.total} valid`);
    });
    demoLog('');

    // 7. Generate full report
    demoLog('7. Full Environment Report:');
    const report = generateBackendEnvReport();
    demoLog(report);

    demoLog('=== Backend Demo Complete ===');

  } catch (error) {
    demoError(`Backend demo failed: ${ error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Quick validation check for use in backend startup
 */
export function quickBackendStartupCheck(): boolean {
  try {
    const result = environmentValidationService.validate();

    if (!result.isValid) {
      demoError('❌ Backend startup validation failed!');
      demoError('Issues found:');

      result.errors.forEach(error => {
        demoError(`   - ${error}`);
      });

      demoError('\nPlease fix these issues before starting the server.');
      return false;
    }

    demoLog('✅ Backend startup validation passed');

    if (result.warnings.length > 0) {
      demoWarn('⚠️  Configuration warnings:');
      result.warnings.forEach(warning => {
        demoWarn(`   - ${warning}`);
      });
    }

    if (result.fallbacksUsed.length > 0) {
      demoWarn('⚠️  Using fallback values for:');
      result.fallbacksUsed.forEach(fallback => {
        demoWarn(`   - ${fallback}`);
      });
    }

    return true;
  } catch (error) {
    demoError(`❌ Backend startup validation error: ${ error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

/**
 * Comprehensive health check including environment validation
 */
export function performBackendHealthCheck(): {
  status: 'healthy' | 'degraded' | 'unhealthy';
  details: {
    environment: Record<string, unknown>;
    database: Record<string, unknown>;
    server: Record<string, unknown>;
    timestamp: string;
  };
  } {
  const timestamp = new Date().toISOString();

  try {
    // Environment validation
    const envValidation = environmentValidationService.getValidationStatus();

    // Database validation
    const dbValidation = backendEnvironmentUtils.validateDatabaseConfig();

    // Server configuration
    const serverConfig = backendEnvironmentUtils.getServerConfig();

    let status: 'healthy' | 'degraded' | 'unhealthy';

    if (envValidation.isValid && dbValidation.isValid) {
      status = 'healthy';
    } else if (envValidation.isValid || dbValidation.isValid) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      details: {
        environment: {
          isValid: envValidation.isValid,
          errors: envValidation.errors,
          warnings: envValidation.warnings,
          fallbacksUsed: envValidation.fallbacksUsed,
        },
        database: {
          isValid: dbValidation.isValid,
          errors: dbValidation.errors,
        },
        server: {
          port: serverConfig.port,
          nodeEnv: serverConfig.nodeEnv,
          frontendUrl: serverConfig.frontendUrl,
        },
        timestamp,
      },
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      details: {
        environment: { error: error instanceof Error ? error.message : 'Unknown error' },
        database: { error: 'Could not validate database configuration' },
        server: { error: 'Could not get server configuration' },
        timestamp,
      },
    };
  }
}

// Export for use in backend applications
export default {
  runDemo: runBackendStartupValidationDemo,
  quickCheck: quickBackendStartupCheck,
  healthCheck: performBackendHealthCheck,
};