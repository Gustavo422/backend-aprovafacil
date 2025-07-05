/* global Request */
import { serveSwaggerUI } from '../../core/documentation/swagger-ui';

export async function GET(request: Request) {
  return serveSwaggerUI(request as any);
} 