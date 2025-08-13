'use strict';

// Simple HTTP p95 latency benchmark for local endpoints
// Usage (PowerShell): node backend/scripts/http-benchmark.cjs http://localhost:5000/api/v1/simulados 100

const http = require('http');
const https = require('https');
const { URL } = require('url');

function httpGet(urlStr) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const lib = url.protocol === 'https:' ? https : http;
    const start = Date.now();
    const req = lib.request(
      {
        method: 'GET',
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers: {
          'User-Agent': 'af-bench/1.0',
        },
      },
      (res) => {
        res.on('data', () => {});
        res.on('end', () => {
          resolve({ status: res.statusCode, durationMs: Date.now() - start });
        });
      },
    );
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const target = process.argv[2] || 'http://localhost:5000/api/health';
  const n = parseInt(process.argv[3] || '50', 10);
  const times = [];
  for (let i = 0; i < n; i++) {
    // eslint-disable-next-line no-await-in-loop
    const res = await httpGet(target);
    times.push(res.durationMs);
  }
  times.sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const p95 = times[Math.max(0, Math.floor(times.length * 0.95) - 1)];
  const p99 = times[Math.max(0, Math.floor(times.length * 0.99) - 1)];
  console.log(JSON.stringify({ target, n, avg, p95, p99, samples: times }, null, 2));
  if (p95 > 200) {
    console.error(`p95 acima do limite: ${p95.toFixed(1)}ms (>200ms)`);
    process.exitCode = 2;
  }
}

main().catch((err) => {
  console.error('Benchmark error:', err);
  process.exit(1);
});


