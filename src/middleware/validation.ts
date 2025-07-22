import { NextRequest, NextResponse } from 'next/server';
import { ValidationError } from '@/lib/errors';
import { getLogger } from '@/lib/logging';
import { ZodSchema } from 'zod';
import { URL } from 'url';

const logger = getLogger('validation-middleware');

/**
 * Middleware for validating request data
 * @param schema Zod schema to validate against
 * @param target Request target to validate ('body', 'query', 'params', or 'headers')
 * @returns Middleware function
 */
export function validateRequest<T>(
  schema: ZodSchema<T>,
  target: 'body' | 'query' | 'params' | 'headers' = 'body'
) {
  return async (
    request: NextRequest,
    handler: (validatedData: T) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    try {
      // Get data to validate
      let data: unknown;
      
      switch (target) {
        case 'body':
          data = await request.json().catch(() => ({}));
          break;
        case 'query':
          data = Object.fromEntries(new URL(request.url).searchParams);
          break;
        case 'params':
          // Params should be passed to the handler function
          data = {};
          break;
        case 'headers':
          data = Object.fromEntries(request.headers);
          break;
      }
      
      // Validate data
      const result = schema.safeParse(data);
      
      if (!result.success) {
        // Convert Zod errors to validation errors
        const validationErrors: Record<string, string[]> = {};
        
        for (const issue of result.error.issues) {
          const path = issue.path.join('.');
          
          if (!validationErrors[path]) {
            validationErrors[path] = [];
          }
          
          validationErrors[path].push(issue.message);
        }
        
        // Log validation error
        logger.warn('Validation failed', { validationErrors, target });
        
        // Throw validation error
        throw new ValidationError('Validation failed', validationErrors);
      }
      
      // Call handler with validated data
      return await handler(result.data);
    } catch (error) {
      // If it's already a ValidationError, rethrow
      if (error instanceof ValidationError) {
        throw error;
      }
      
      // Otherwise, convert to ValidationError
      logger.error('Validation error', { error });
      throw new ValidationError('Invalid request data');
    }
  };
}
