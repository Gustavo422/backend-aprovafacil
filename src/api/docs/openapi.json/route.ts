/* global Request */
import { serveOpenAPISpec } from '../../../core/documentation/swagger-ui';

export async function GET(request: Request) {
  return serveOpenAPISpec();
} 