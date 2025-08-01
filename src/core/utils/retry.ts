/**
 * Opções para retry
 */
export interface RetryOptions {
  /**
   * Número máximo de tentativas
   */
  maxRetries: number;
  
  /**
   * Delay inicial em milissegundos
   */
  initialDelayMs: number;
  
  /**
   * Delay máximo em milissegundos
   */
  maxDelayMs: number;
  
  /**
   * Fator de backoff
   */
  backoffFactor: number;
  
  /**
   * Códigos de erro que podem ser retentados
   */
  retryableErrors: string[];
  
  /**
   * Função para calcular o delay
   */
  calculateDelay?: (attempt: number, options: RetryOptions) => number;
}

/**
 * Erro retryable
 */
export class RetryableError extends Error {
  /**
   * Causa do erro
   */
  cause?: unknown;
  
  /**
   * Construtor
   * @param message Mensagem de erro
   * @param cause Causa do erro
   */
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'RetryableError';
    this.cause = cause;
  }
}

/**
 * Calcular delay para retry com exponential backoff
 * @param attempt Número da tentativa (começando em 1)
 * @param options Opções de retry
 * @returns Delay em milissegundos
 */
export function calculateExponentialBackoff(attempt: number, options: RetryOptions): number {
  // Fórmula: initialDelay * (backoffFactor ^ (attempt - 1))
  const delay = options.initialDelayMs * Math.pow(options.backoffFactor, attempt - 1);
  
  // Adicionar jitter para evitar thundering herd
  const jitter = Math.random() * 0.3 + 0.85; // 0.85-1.15
  
  // Limitar ao delay máximo
  return Math.min(delay * jitter, options.maxDelayMs);
}

/**
 * Executar uma função com retry
 * @param fn Função a ser executada
 * @param options Opções de retry
 * @returns Resultado da função
 */
export async function executeWithRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  // Definir função de cálculo de delay
  const calculateDelay = options.calculateDelay || calculateExponentialBackoff;
  
  // Tentativas
  let attempt = 1;
  let lastError: unknown;
  
  while (attempt <= options.maxRetries + 1) {
    try {
      // Executar função
      return await fn();
    } catch (error) {
      // Salvar último erro
      lastError = error;
      
      // Verificar se é um erro retryable
      const isRetryable = error instanceof RetryableError;
      
      // Verificar se ainda há tentativas
      if (!isRetryable || attempt > options.maxRetries) {
        break;
      }
      
      // Calcular delay
      const delayMs = calculateDelay(attempt, options);
      
      // Aguardar antes da próxima tentativa
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
      // Incrementar tentativa
      attempt++;
    }
  }
  
  // Se chegou aqui, todas as tentativas falharam
  throw lastError;
}

/**
 * Verificar se um erro é retryable
 * @param error Erro
 * @param retryableErrors Lista de códigos de erro retryable
 * @returns True se for retryable
 */
export function isRetryableError(error: unknown, retryableErrors: string[]): boolean {
  // Verificar se é um RetryableError
  if (error instanceof RetryableError) {
    return true;
  }
  
  // Verificar código de erro
  if (typeof error === 'object' && error !== null) {
    // Verificar código
    if ('code' in error && typeof (error as Record<string, unknown>).code === 'string') {
      return retryableErrors.includes((error as Record<string, unknown>).code as string);
    }
    
    // Verificar status HTTP
    if ('status' in error && typeof (error as Record<string, unknown>).status === 'number') {
      const status = (error as Record<string, unknown>).status as number;
      // 429 (Too Many Requests), 408 (Request Timeout), 5xx (Server Errors)
      if (status === 429 || status === 408 || (status >= 500 && status < 600)) {
        return true;
      }
    }
    
    // Verificar mensagem
    if ('message' in error && typeof (error as Record<string, unknown>).message === 'string') {
      const message = ((error as Record<string, unknown>).message as string).toLowerCase();
      
      // Verificar mensagens comuns de erros de rede
      if (
        message.includes('timeout') ||
        message.includes('connection') ||
        message.includes('network') ||
        message.includes('econnrefused') ||
        message.includes('econnreset') ||
        message.includes('socket hang up')
      ) {
        return true;
      }
    }
  }
  
  return false;
}