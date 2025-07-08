import { ZodSchema } from 'zod';
export interface ValidationResult<T> {
    success: boolean;
    data?: T;
    errors?: string[];
}
export declare class Validator {
    /**
     * Valida dados usando um schema Zod
     */
    static validate<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T>;
    /**
     * Valida dados de forma segura (não lança exceção)
     */
    static safeValidate<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T>;
    /**
     * Valida dados e lança exceção se inválido
     */
    static strictValidate<T>(schema: ZodSchema<T>, data: unknown): T;
    /**
     * Sanitiza string removendo caracteres perigosos
     */
    static sanitizeString(input: string): string;
    /**
     * Sanitiza objeto removendo propriedades perigosas
     */
    static sanitizeObject<T extends Record<string, unknown>>(obj: T): T;
    /**
     * Valida e sanitiza dados de entrada
     */
    static validateAndSanitize<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T>;
    /**
     * Sanitiza strings em objetos aninhados
     */
    private static sanitizeNestedStrings;
    /**
     * Valida ID (UUID ou string simples)
     */
    static validateId(id: string): boolean;
    /**
     * Valida email
     */
    static validateEmail(email: string): boolean;
    /**
     * Valida senha (mínimo 8 caracteres, pelo menos 1 número e 1 letra)
     */
    static validatePassword(password: string): boolean;
}
export declare const createValidationMiddleware: <T>(schema: ZodSchema<T>) => (req: unknown, res: unknown, next: () => void) => void;
export declare const Validate: <T>(schema: ZodSchema<T>) => (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
//# sourceMappingURL=validator.d.ts.map