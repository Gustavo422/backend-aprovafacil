import { ErrorCodes } from '../validators/questoes-semanais.validator.js';

/**
 * Classe base para erros de questões semanais
 */
export abstract class QuestoesSemanaisError extends Error {
  public code: string;
  public statusCode: number;
  public isOperational: boolean;
  public details?: unknown;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    details?: unknown,
    isOperational: boolean = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;

    // Manter stack trace para erros operacionais
    if (Error.captureStackTrace && isOperational) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Erro de validação
 */
export class ValidationError extends QuestoesSemanaisError {
  constructor(message: string, details?: unknown) {
    super(message, ErrorCodes.VALIDATION_ERROR, 400, details);
  }
}

/**
 * Erro de recurso não encontrado
 */
export class ResourceNotFoundError extends QuestoesSemanaisError {
  constructor(resource: string, identifier?: string) {
    const message = identifier 
      ? `${resource} com identificador '${identifier}' não encontrado`
      : `${resource} não encontrado`;
    
    super(message, ErrorCodes.RESOURCE_NOT_FOUND, 404, { resource, identifier });
  }
}

/**
 * Erro de semana não encontrada
 */
export class WeekNotFoundError extends ResourceNotFoundError {
  constructor(numeroSemana: number, concursoId?: string) {
    super('Semana', numeroSemana.toString());
    this.code = ErrorCodes.WEEK_NOT_FOUND;
    this.details = { numeroSemana, concursoId };
  }
}

/**
 * Erro de concurso não encontrado
 */
export class ConcursoNotFoundError extends ResourceNotFoundError {
  constructor(concursoId: string) {
    super('Concurso', concursoId);
    this.code = ErrorCodes.CONCURSO_NOT_FOUND;
  }
}

/**
 * Erro de usuário não encontrado
 */
export class UserNotFoundError extends ResourceNotFoundError {
  constructor(userId: string) {
    super('Usuário', userId);
    this.code = ErrorCodes.USER_NOT_FOUND;
  }
}

/**
 * Erro de estado inválido
 */
export class InvalidStateError extends QuestoesSemanaisError {
  constructor(message: string, details?: unknown) {
    super(message, ErrorCodes.INVALID_WEEK_ORDER, 400, details);
  }
}

/**
 * Erro de semana já concluída
 */
export class WeekAlreadyCompletedError extends QuestoesSemanaisError {
  constructor(numeroSemana: number, usuarioId: string) {
    super(`Semana ${numeroSemana} já foi concluída pelo usuário`, ErrorCodes.WEEK_ALREADY_COMPLETED, 409, {
      numeroSemana,
      usuarioId,
    });
  }
}

/**
 * Erro de semana não disponível
 */
export class WeekNotAvailableError extends QuestoesSemanaisError {
  constructor(numeroSemana: number, reason: string) {
    super(`Semana ${numeroSemana} não está disponível: ${reason}`, ErrorCodes.WEEK_NOT_AVAILABLE, 423, {
      numeroSemana,
      reason,
    });
  }
}

/**
 * Erro de modificação concorrente
 */
export class ConcurrentModificationError extends QuestoesSemanaisError {
  constructor(resource: string, identifier: string) {
    super(`Modificação concorrente detectada em ${resource}`, ErrorCodes.CONCURRENT_MODIFICATION, 409, {
      resource,
      identifier,
    });
  }
}

/**
 * Erro de rate limit
 */
export class RateLimitError extends QuestoesSemanaisError {
  constructor(limit: number, windowMs: number, retryAfter?: number) {
    super('Limite de requisições excedido', ErrorCodes.RATE_LIMIT_EXCEEDED, 429, {
      limit,
      windowMs,
      retryAfter,
    });
  }
}

/**
 * Erro de banco de dados
 */
export class DatabaseError extends QuestoesSemanaisError {
  constructor(message: string, originalError?: unknown) {
    super(`Erro de banco de dados: ${message}`, ErrorCodes.DATABASE_ERROR, 500, {
      originalError: originalError instanceof Error ? originalError.message : originalError,
    });
  }
}

/**
 * Erro de configuração inválida
 */
export class ConfigurationError extends QuestoesSemanaisError {
  constructor(message: string, configKey?: string) {
    super(`Erro de configuração: ${message}`, ErrorCodes.INVALID_CONFIGURATION, 500, {
      configKey,
    });
  }
}

/**
 * Erro de serviço indisponível
 */
export class ServiceUnavailableError extends QuestoesSemanaisError {
  constructor(service: string, reason?: string) {
    super(`Serviço ${service} indisponível`, ErrorCodes.SERVICE_UNAVAILABLE, 503, {
      service,
      reason,
    });
  }
}

/**
 * Factory para criar erros baseados em códigos
 */
export class ErrorFactory {
  static createFromCode(
    code: string,
    message: string,
    details?: unknown,
    statusCode?: number,
  ): QuestoesSemanaisError {
    switch (code) {
      case ErrorCodes.VALIDATION_ERROR:
        return new ValidationError(message, details);
      
      case ErrorCodes.RESOURCE_NOT_FOUND:
        return new ResourceNotFoundError(message);
      
      case ErrorCodes.WEEK_NOT_FOUND:
        return new WeekNotFoundError(0); // Será sobrescrito
      
      case ErrorCodes.CONCURSO_NOT_FOUND:
        return new ConcursoNotFoundError(message);
      
      case ErrorCodes.USER_NOT_FOUND:
        return new UserNotFoundError(message);
      
      case ErrorCodes.INVALID_WEEK_ORDER:
        return new InvalidStateError(message, details);
      
      case ErrorCodes.WEEK_ALREADY_COMPLETED:
        return new WeekAlreadyCompletedError(0, ''); // Será sobrescrito
      
      case ErrorCodes.WEEK_NOT_AVAILABLE:
        return new WeekNotAvailableError(0, message);
      
      case ErrorCodes.CONCURRENT_MODIFICATION:
        return new ConcurrentModificationError('recurso', 'identificador');
      
      case ErrorCodes.RATE_LIMIT_EXCEEDED:
        return new RateLimitError(100, 60000);
      
      case ErrorCodes.DATABASE_ERROR:
        return new DatabaseError(message, details);
      
      case ErrorCodes.INVALID_CONFIGURATION:
        return new ConfigurationError(message);
      
      case ErrorCodes.SERVICE_UNAVAILABLE:
        return new ServiceUnavailableError(message);
      
      default:
        return new ValidationError(message, details);
    }
  }

  /**
   * Criar erro de validação com detalhes de campo
   */
  static validationError(fieldErrors: Record<string, string[]>): ValidationError {
    return new ValidationError('Dados de entrada inválidos', { fields: fieldErrors });
  }

  /**
   * Criar erro de semana não encontrada
   */
  static weekNotFound(numeroSemana: number, concursoId?: string): WeekNotFoundError {
    return new WeekNotFoundError(numeroSemana, concursoId);
  }

  /**
   * Criar erro de semana já concluída
   */
  static weekAlreadyCompleted(numeroSemana: number, usuarioId: string): WeekAlreadyCompletedError {
    return new WeekAlreadyCompletedError(numeroSemana, usuarioId);
  }

  /**
   * Criar erro de modificação concorrente
   */
  static concurrentModification(resource: string, identifier: string): ConcurrentModificationError {
    return new ConcurrentModificationError(resource, identifier);
  }

  /**
   * Criar erro de banco de dados
   */
  static databaseError(message: string, originalError?: unknown): DatabaseError {
    return new DatabaseError(message, originalError);
  }
}

/**
 * Função helper para verificar se um erro é operacional
 */
export function isOperationalError(error: unknown): boolean {
  if (error instanceof QuestoesSemanaisError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Função helper para extrair código de erro de qualquer tipo de erro
 */
export function extractErrorCode(error: unknown): string {
  if (error instanceof QuestoesSemanaisError) {
    return error.code;
  }
  if (error instanceof Error && (error as any).code) {
    return (error as any).code;
  }
  return ErrorCodes.INTERNAL_ERROR;
}

/**
 * Função helper para extrair status code de qualquer tipo de erro
 */
export function extractErrorStatusCode(error: unknown): number {
  if (error instanceof QuestoesSemanaisError) {
    return error.statusCode;
  }
  if (error instanceof Error && (error as any).statusCode) {
    return (error as any).statusCode;
  }
  return 500;
}
