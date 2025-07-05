import { z, ZodSchema } from 'zod';

// Interface para resposta de validação
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
}

// Classe principal de validação
export class Validator {
  /**
   * Valida dados usando um schema Zod
   */
  static validate<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T> {
    try {
      const validatedData = schema.parse(data);
      return {
        success: true,
        data: validatedData,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          errors: error.errors.map(err => `${err.path.join('.')}: ${err.message}`),
        };
      }
      return {
        success: false,
        errors: ['Erro interno de validação'],
      };
    }
  }

  /**
   * Valida dados de forma segura (não lança exceção)
   */
  static safeValidate<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T> {
    return this.validate(schema, data);
  }

  /**
   * Valida dados e lança exceção se inválido
   */
  static strictValidate<T>(schema: ZodSchema<T>, data: unknown): T {
    return schema.parse(data);
  }

  /**
   * Sanitiza string removendo caracteres perigosos
   */
  static sanitizeString(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove < e >
      .replace(/javascript:/gi, '') // Remove javascript:
      .replace(/on\w+=/gi, '') // Remove event handlers
      .substring(0, 1000); // Limita tamanho
  }

  /**
   * Sanitiza objeto removendo propriedades perigosas
   */
  static sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
    const sanitized = { ...obj };
    
    // Remove propriedades que começam com __ (internas)
    Object.keys(sanitized).forEach(key => {
      if (key.startsWith('__')) {
        delete sanitized[key];
      }
    });

    return sanitized;
  }

  /**
   * Valida e sanitiza dados de entrada
   */
  static validateAndSanitize<T>(
    schema: ZodSchema<T>, 
    data: unknown
  ): ValidationResult<T> {
    const validation = this.validate(schema, data);
    
    if (!validation.success || !validation.data) {
      return validation;
    }

    // Sanitiza strings no objeto validado
    const sanitizedData = this.sanitizeNestedStrings(validation.data) as T;
    
    return {
      success: true,
      data: sanitizedData,
    };
  }

  /**
   * Sanitiza strings em objetos aninhados
   */
  private static sanitizeNestedStrings(obj: unknown): unknown {
    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeNestedStrings(item));
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeNestedStrings(value);
      }
      return sanitized;
    }
    
    return obj;
  }

  /**
   * Valida ID (UUID ou string simples)
   */
  static validateId(id: string): boolean {
    return typeof id === 'string' && id.length > 0 && id.length <= 50;
  }

  /**
   * Valida email
   */
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Valida senha (mínimo 8 caracteres, pelo menos 1 número e 1 letra)
   */
  static validatePassword(password: string): boolean {
    return password.length >= 8 && 
           /\d/.test(password) && 
           /[a-zA-Z]/.test(password);
  }
}

// Middleware para Express/Next.js
export const createValidationMiddleware = <T>(schema: ZodSchema<T>) => {
  return (req: unknown, res: unknown, next: () => void) => {
    const validation = Validator.validate(schema, (req as { body: unknown }).body);
    
    if (!validation.success) {
      return (res as { status: (code: number) => { json: (data: unknown) => void } }).status(400).json({
        success: false,
        message: 'Dados inválidos',
        errors: validation.errors,
      });
    }
    
    (req as { validatedData: unknown }).validatedData = validation.data;
    next();
  };
};

// Decorator para validação (se usar decorators)
export const Validate = <T>(schema: ZodSchema<T>) => {
  return (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;
    
    descriptor.value = function (...args: unknown[]) {
      const validation = Validator.validate(schema, args[0]);
      
      if (!validation.success) {
        throw new Error(`Validação falhou: ${validation.errors?.join(', ')}`);
      }
      
      return originalMethod.apply(this, [validation.data, ...args.slice(1)]);
    };
    
    return descriptor;
  };
}; 