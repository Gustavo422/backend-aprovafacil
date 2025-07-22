# API Handler Documentation

This document provides an overview of the enhanced API handler implementation for the AprovaFácil application.

## Overview

The API handler provides a standardized way to handle API requests with built-in support for:

- Error handling
- Request validation
- Response formatting
- Authentication and authorization
- Rate limiting
- Request timeout
- Logging

## Usage

### Basic Usage

```typescript
import { createApiHandler } from '../core/api';

// Define your handler functions
const handlers = {
  async GET(request, context) {
    // Handle GET request
    return { message: 'Hello, world!' };
  },
  
  async POST(request, context) {
    // Handle POST request with validated body
    const { body } = context;
    return { message: 'Created', data: body };
  }
};

// Create the API handler
export const handler = createApiHandler('example', handlers, {
  validateBody: MyBodySchema, // Zod schema for request body
  requireAuth: true, // Require authentication
});

// Export for Next.js App Router
export const GET = handler;
export const POST = handler;
```

### With Validation

```typescript
import { createApiHandler, ValidationSchemas } from '../core/api';
import { z } from 'zod';

// Define your schemas
const UserSchema = z.object({
  name: z.string().min(2),
  email: ValidationSchemas.email(),
  role: z.enum(['user', 'admin']),
});

// Define your handler functions
const handlers = {
  async GET(request, context) {
    const { query } = context;
    // query is already validated
    return { users: [] };
  },
  
  async POST(request, context) {
    const { body } = context;
    // body is already validated
    return { user: body };
  }
};

// Create the API handler
export const handler = createApiHandler('users', handlers, {
  validateQuery: ValidationSchemas.pagination(),
  validateBody: UserSchema,
  requireAuth: true,
});

// Export for Next.js App Router
export const GET = handler;
export const POST = handler;
```

### Dynamic Validation

```typescript
import { createApiHandler } from '../core/api';

// Create the API handler with dynamic validation
export const handler = createApiHandler('users', handlers, {
  validateBody: (request) => {
    // Choose schema based on request method
    if (request.method === 'POST') {
      return CreateUserSchema;
    }
    
    if (request.method === 'PUT') {
      return UpdateUserSchema;
    }
    
    return undefined;
  },
});
```

## API Reference

### `createApiHandler(name, handlers, options)`

Creates an API handler for Next.js App Router.

#### Parameters

- `name` (string): Name of the handler for logging purposes
- `handlers` (object): Object containing handler functions for HTTP methods
- `options` (object): Configuration options

#### Options

- `requireAuth` (boolean): Whether authentication is required
- `allowedRoles` (string[]): Allowed roles for the endpoint
- `validateBody` (ZodSchema | function): Schema for validating request body
- `validateQuery` (ZodSchema): Schema for validating query parameters
- `validateParams` (ZodSchema): Schema for validating path parameters
- `rateLimit` (object): Rate limiting configuration
  - `requests` (number): Number of requests allowed
  - `windowMs` (number): Time window in milliseconds
- `timeout` (number): Request timeout in milliseconds
- `cors` (object): CORS configuration

### Request Context

The context object passed to handler functions contains:

- `requestId` (string): Unique request ID
- `user` (object): Authenticated user (if available)
- `clientIp` (string): Client IP address
- `userAgent` (string): User agent string
- `timestamp` (Date): Request timestamp
- `logger` (Logger): Logger instance with request context
- `body` (unknown): Validated request body
- `query` (unknown): Validated query parameters
- `params` (unknown): Validated path parameters

## Validation Utilities

The `ValidationSchemas` class provides common validation schemas:

- `ValidationSchemas.uuid()`: UUID validation
- `ValidationSchemas.email()`: Email validation
- `ValidationSchemas.url()`: URL validation
- `ValidationSchemas.date()`: Date validation
- `ValidationSchemas.pagination()`: Pagination parameters
- `ValidationSchemas.idParam()`: ID parameter
- `ValidationSchemas.search()`: Search query
- `ValidationSchemas.dateRange()`: Date range
- `ValidationSchemas.boolean()`: Boolean coercion
- `ValidationSchemas.number()`: Number coercion
- `ValidationSchemas.integer()`: Integer coercion

## Response Utilities

The `ResponseUtils` class provides methods for formatting responses:

- `ResponseUtils.formatSuccess()`: Format successful response
- `ResponseUtils.formatError()`: Format error response
- `ResponseUtils.formatPaginated()`: Format paginated response
- `ResponseUtils.formatCreated()`: Format created response (201)
- `ResponseUtils.formatNoContent()`: Format no content response (204)
- `ResponseUtils.formatValidationError()`: Format validation error (400)
- `ResponseUtils.formatAuthError()`: Format authentication error (401)
- `ResponseUtils.formatForbiddenError()`: Format forbidden error (403)
- `ResponseUtils.formatNotFoundError()`: Format not found error (404)
- `ResponseUtils.formatConflictError()`: Format conflict error (409)
- `ResponseUtils.formatRateLimitError()`: Format rate limit error (429)

## Error Handling

The API handler automatically handles different types of errors:

- `ValidationError`: Returns 400 Bad Request
- `AuthError`: Returns 401 Unauthorized
- `NotFoundError`: Returns 404 Not Found
- `DatabaseError`: Returns 500 Internal Server Error
- Other errors: Returns 500 Internal Server Error

## Best Practices

1. Always validate request input using Zod schemas
2. Use appropriate HTTP methods for CRUD operations
3. Return consistent response structures
4. Use proper status codes for different scenarios
5. Include meaningful error messages
6. Log important events and errors
7. Use rate limiting for public endpoints
8. Set appropriate timeouts for long-running operations