import { OpenAPIV3 } from 'openapi-types';

export const ErrorSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    message: { type: 'string', example: 'Mensagem de erro' },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'ERROR_CODE' },
        message: { type: 'string', example: 'Mensagem de erro' }
      }
    }
  }
}; 