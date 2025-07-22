import dotenv from 'dotenv';
import path from 'path';
import { URL } from 'url';
dotenv.config({ path: path.dirname(new URL(import.meta.url).pathname) + '/../../.env' });
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import AprovaFacilApp from '../../app.js';

const app = new AprovaFacilApp().getApp();

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



