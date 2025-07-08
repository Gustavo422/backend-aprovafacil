import dotenv from 'dotenv';
dotenv.config({ path: __dirname + '/../../.env' });
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from '../../index.js';

describe('Concursos API (integração)', () => {
  it('deve listar concursos (GET /api/concursos)', async () => {
    const res = await request(app)
      .get('/api/concursos')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
  });
}); 