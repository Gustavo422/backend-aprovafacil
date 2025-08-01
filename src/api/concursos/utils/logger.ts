import { logger } from '../../../lib/logger.js';

export const logConcursoOperation = (operation: string, details: Record<string, unknown>) => {
  logger.info(`Operação de concurso: ${operation}`, details);
};

export const logConcursoError = (operation: string, error: unknown) => {
  logger.error(`Erro na operação de concurso: ${operation}`, { error: error instanceof Error ? error.message : String(error) });
};

export const logConcursoWarning = (operation: string, warning: string) => {
  logger.warn(`Aviso na operação de concurso: ${operation}`, { warning });
};

export const logConcursoDebug = (operation: string, data: Record<string, unknown>) => {
  logger.debug(`Debug da operação de concurso: ${operation}`, data);
};

export const logConcursoSuccess = (operation: string, result: Record<string, unknown>) => {
  logger.info(`Sucesso na operação de concurso: ${operation}`, result);
};



