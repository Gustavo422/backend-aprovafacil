import { z } from 'zod';

/**
 * Common validation schemas for API requests
 */
export class ValidationSchemas {
  /**
   * UUID validation schema
   */
  static uuid(message: string = 'Invalid UUID format') {
    return z.string().uuid(message);
  }
  
  /**
   * Email validation schema
   */
  static email(message: string = 'Invalid email address') {
    return z.string().email(message);
  }
  
  /**
   * URL validation schema
   */
  static url(message: string = 'Invalid URL') {
    return z.string().url(message);
  }
  
  /**
   * Date validation schema
   */
  static date(message: string = 'Invalid date format') {
    return z.string().datetime(message);
  }
  
  /**
   * Pagination schema
   */
  static pagination() {
    return z.object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().positive().max(100).default(20),
      sort: z.string().optional(),
      order: z.enum(['asc', 'desc']).default('asc'),
    });
  }
  
  /**
   * ID parameter schema
   */
  static idParam() {
    return z.object({
      id: this.uuid('Invalid ID format'),
    });
  }
  
  /**
   * Search query schema
   */
  static search() {
    return z.object({
      q: z.string().optional(),
      filter: z.string().optional(),
    });
  }
  
  /**
   * Date range schema
   */
  static dateRange() {
    return z.object({
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    }).refine(
      data => !(data.startDate && data.endDate) || new Date(data.startDate) <= new Date(data.endDate),
      {
        message: 'End date must be after start date',
        path: ['endDate'],
      },
    );
  }
  
  /**
   * Boolean coercion schema
   */
  static boolean() {
    return z.union([
      z.boolean(),
      z.string().transform(val => {
        if (val.toLowerCase() === 'true') return true;
        if (val.toLowerCase() === 'false') return false;
        throw new Error('Invalid boolean value');
      }),
      z.number().transform(val => val !== 0),
    ]);
  }
  
  /**
   * Number coercion schema
   */
  static number() {
    return z.coerce.number();
  }
  
  /**
   * Integer coercion schema
   */
  static integer() {
    return z.coerce.number().int();
  }
  
  /**
   * Array schema
   */
  static array<T extends z.ZodTypeAny>(schema: T) {
    return z.array(schema);
  }
  
  /**
   * Optional field with default value
   */
  static optional<T extends z.ZodTypeAny>(schema: T, defaultValue: z.infer<T>) {
    return schema.optional().default(defaultValue);
  }
  
  /**
   * Nullable field
   */
  static nullable<T extends z.ZodTypeAny>(schema: T) {
    return schema.nullable();
  }
}

/**
 * Utility functions for working with validation results
 */
export class ValidationUtils {
  /**
   * Format validation errors for API response
   */
  static formatErrors(error: z.ZodError) {
    return error.errors.map(err => ({
      path: err.path.join('.'),
      message: err.message,
    }));
  }
  
  /**
   * Removidos os métodos required, pick e omit customizados devido à incompatibilidade com a API do Zod v3. Use os métodos nativos do Zod diretamente nas validações.
   */
}