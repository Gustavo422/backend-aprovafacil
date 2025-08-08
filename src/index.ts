import 'dotenv/config';
import AprovaFacilApp from './app.js';
import { validateEnvironmentOnStartup } from './config/environment.js';
import { backendEnvironmentUtils } from './utils/environment-utils.js';

// Enhanced startup validation
if (process.env.NODE_ENV !== 'test') {
  process.stdout.write('[BACKEND-STARTUP] Starting AprovaFácil Backend...\n');
  process.stdout.write(`[BACKEND-STARTUP] Node.js version: ${process.version}\n`);
  process.stdout.write(`[BACKEND-STARTUP] Platform: ${process.platform}\n`);
  process.stdout.write(`[BACKEND-STARTUP] Environment: ${process.env.NODE_ENV ?? 'development'}\n`);
}

// Validate environment variables with detailed reporting
validateEnvironmentOnStartup();

// Log environment summary
const envSummary = backendEnvironmentUtils.getEnvironmentSummary();
if (process.env.NODE_ENV !== 'test') {
  process.stdout.write('[BACKEND-STARTUP] Environment Summary:\n');
  process.stdout.write(`[BACKEND-STARTUP] - Total Variables: ${envSummary.totalVariables}\n`);
  process.stdout.write(`[BACKEND-STARTUP] - Valid Variables: ${envSummary.validVariables}/${envSummary.totalVariables}\n`);
  process.stdout.write(`[BACKEND-STARTUP] - Fallbacks Used: ${envSummary.fallbacksUsed}\n`);
}

// Validate database configuration
const dbValidation = backendEnvironmentUtils.validateDatabaseConfig();
if (!dbValidation.isValid && process.env.NODE_ENV !== 'test') {
  process.stderr.write('[BACKEND-STARTUP] Database configuration issues:\n');
  dbValidation.errors.forEach(error => {
    process.stderr.write(`[BACKEND-STARTUP] - ${error}\n`);
  });
}

// Start the application
const app = new AprovaFacilApp();
const port = backendEnvironmentUtils.getNumericVariable('PORT', 5000) ?? 5000;

if (process.env.NODE_ENV !== 'test') {
  process.stdout.write(`[BACKEND-STARTUP] Starting server on port ${port}...\n`);
}
app.start(port).catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});




