import { getLogger } from '../lib/logging/logging-service.js';

export const logger = getLogger('utils-logger');

export function logMessage(message: string): void {
  logger.info(message);
} 



