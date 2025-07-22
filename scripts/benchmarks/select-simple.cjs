'use strict';
// Script de benchmark: SELECT simples
// Uso: node select-simple.js

const { Client } = require('pg');
const { performance } = require('perf_hooks');

// Configurações do banco (ajuste para seu ambiente)
const config = {
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
  database: process.env.PGDATABASE || 'postgres',
  ssl: process.env.PGSSLMODE === 'require' ? { rejectUnauthorized: false } : false,
};

const N = parseInt(process.env.BENCH_N || '50', 10); // Número de execuções
const QUERY = process.env.BENCH_QUERY || 'SELECT 1'; // Query simples
const BENCH_API_URL = process.env.BENCH_API_URL;
const BENCH_API_TOKEN = process.env.BENCH_API_TOKEN;

async function sendResult(result) {
  if (!BENCH_API_URL) return;
  try {
    await fetch(BENCH_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(BENCH_API_TOKEN ? { 'Authorization': `Bearer ${BENCH_API_TOKEN}` } : {})
      },
      body: JSON.stringify(result)
    });
    console.log('Resultado enviado para o painel admin.');
  } catch (err) {
    console.error('Falha ao enviar resultado para o painel admin:', err);
  }
}

async function main() {
  const client = new Client(config);
  await client.connect();
  const times = [];
  for (let i = 0; i < N; i++) {
    const t0 = performance.now();
    await client.query(QUERY);
    const t1 = performance.now();
    times.push(t1 - t0);
  }
  await client.end();
  // Estatísticas
  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const p95 = times[Math.floor(times.length * 0.95) - 1];
  const p99 = times[Math.floor(times.length * 0.99) - 1];
  const std = Math.sqrt(times.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / times.length);
  const result = {
    type: 'select-simple',
    query: QUERY,
    n: N,
    avg,
    p95,
    p99,
    std,
    samples: times,
    timestamp: new Date().toISOString(),
  };
  console.log('--- SELECT simples benchmark ---');
  console.log(`Query: ${QUERY}`);
  console.log(`Execuções: ${N}`);
  console.log(`Média: ${avg.toFixed(2)} ms`);
  console.log(`p95: ${p95.toFixed(2)} ms`);
  console.log(`p99: ${p99.toFixed(2)} ms`);
  console.log(`Desvio padrão: ${std.toFixed(2)} ms`);
  console.log('Amostras:', times.map(t => t.toFixed(2)).join(', '));
  await sendResult(result);
}

main().catch(err => {
  console.error('Erro no benchmark:', err);
  process.exit(1);
}); 