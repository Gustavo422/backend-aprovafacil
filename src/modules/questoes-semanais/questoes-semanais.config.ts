import dotenv from 'dotenv';

dotenv.config();

/**
 * Configuração para o módulo de Questões Semanais
 */
export interface QuestoesSemanaisConfig {
  unlockPolicy: 'strict' | 'accelerated';
  weekDurationDays: number;
  maxConcurrentAdvances: number;
  advanceCheckIntervalMs: number;
}

/**
 * Valida e retorna a configuração de questões semanais
 */
export function getQuestoesSemanaisConfig(): QuestoesSemanaisConfig {
  const unlockPolicy = (process.env.QS_UNLOCK_POLICY as 'strict' | 'accelerated') ?? 'strict';
  const weekDurationDays = parseInt(process.env.QS_WEEK_DURATION_DAYS ?? '7', 10);
  const maxConcurrentAdvances = parseInt(process.env.QS_MAX_CONCURRENT_ADVANCES ?? '10', 10);
  const advanceCheckIntervalMs = parseInt(process.env.QS_ADVANCE_CHECK_INTERVAL_MS ?? '60000', 10); // 1 minuto

  // Validações
  if (!['strict', 'accelerated'].includes(unlockPolicy)) {
    throw new Error(`QS_UNLOCK_POLICY deve ser 'strict' ou 'accelerated', recebido: ${unlockPolicy}`);
  }

  if (weekDurationDays < 1 || weekDurationDays > 365) {
    throw new Error(`QS_WEEK_DURATION_DAYS deve estar entre 1 e 365, recebido: ${weekDurationDays}`);
  }

  if (maxConcurrentAdvances < 1 || maxConcurrentAdvances > 100) {
    throw new Error(`QS_MAX_CONCURRENT_ADVANCES deve estar entre 1 e 100, recebido: ${maxConcurrentAdvances}`);
  }

  if (advanceCheckIntervalMs < 1000 || advanceCheckIntervalMs > 300000) {
    throw new Error(`QS_ADVANCE_CHECK_INTERVAL_MS deve estar entre 1000 e 300000, recebido: ${advanceCheckIntervalMs}`);
  }

  return {
    unlockPolicy,
    weekDurationDays,
    maxConcurrentAdvances,
    advanceCheckIntervalMs,
  };
}

/**
 * Singleton da configuração
 */
let configInstance: QuestoesSemanaisConfig | null = null;

export function getConfig(): QuestoesSemanaisConfig {
  if (!configInstance) {
    configInstance = getQuestoesSemanaisConfig();
  }
  return configInstance;
}

/**
 * Reseta a configuração (útil para testes)
 */
export function resetConfig(): void {
  configInstance = null;
}
