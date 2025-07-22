import { OpenAPIV3 } from 'openapi-types';

export const UserSchema: OpenAPIV3.SchemaObject = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'user-123' },
    email: { type: 'string', format: 'email', example: 'usuario@exemplo.com' },
    nome: { type: 'string', example: 'João Silva' },
    role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
    createdAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00Z' },
    updatedAt: { type: 'string', format: 'date-time', example: '2024-01-01T00:00:00Z' }
  }
}; 