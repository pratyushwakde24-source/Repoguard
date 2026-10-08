/**
 * Red Team Suite 10: Zero Secret Exposure & Metadata Security Scan
 * 
 * Attacks Attempted:
 * 1. Query /api/health for raw private keys / webhook secrets
 * 2. Query /api/ai/status for raw Nebius API keys
 * 3. Query /api/security/policy & posture for unredacted secrets
 * 4. Query incident endpoints for sensitive credentials
 * 5. Scan regex patterns for token leakage (ghp_, sk_, Bearer, RSA PRIVATE KEY)
 */

const assert = require('assert');
const http = require('http');

const PORT = process.env.PORT || 3001;

function request(path) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        method: 'GET',
        path,
        headers: { Accept: 'application/json' },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          resolve({ status: res.statusCode, raw: body });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  console.log('--- RED TEAM 10: SECRET EXPOSURE & AUDIT ---');

  const sensitivePatterns = [
    /-----BEGIN (?:RSA )?PRIVATE KEY-----/,
    /ghp_[a-zA-Z0-9]{30,}/,
    /github_pat_[a-zA-Z0-9_]{30,}/,
    /sk_live_[a-zA-Z0-9]{20,}/,
    /sk_test_[a-zA-Z0-9]{20,}/,
    /nebius_[a-zA-Z0-9_]{20,}/,
    /eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/,
  ];

  const endpointsToScan = [
    '/api/health',
    '/api/ai/status',
    '/api/security/policy',
    '/api/security/posture',
    '/api/incidents',
    '/api/incidents/inc-9281',
    '/api/incidents/inc-9281/human-review',
    '/api/reliability-memory',
  ];

  for (const endpoint of endpointsToScan) {
    console.log(`▶ Scanning endpoint: ${endpoint}`);
    const res = await request(endpoint);
    assert.ok(res.status >= 200 && res.status < 500, `Endpoint ${endpoint} returned status ${res.status}`);

    for (const pattern of sensitivePatterns) {
      assert.ok(
        !pattern.test(res.raw),
        `CRITICAL SECURITY VIOLATION: Pattern ${pattern} matched in response of ${endpoint}!`
      );
    }
  }

  console.log('✔ All scanned endpoints returned 0 exposed credentials or private keys');
  console.log('--- ALL SECRET EXPOSURE AUDITS PASSED ---');
}

run().catch((err) => {
  console.error('❌ Red Team Secret Exposure Test Failed:', err);
  process.exit(1);
});
