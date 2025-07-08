import { serveSwaggerUI } from '../../core/documentation/swagger-ui.js';

export async function GET() {
  return serveSwaggerUI();
} 