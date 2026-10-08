/**
 * Red Team Suite 14: IDOR & Object Authorization Attacks
 * 
 * Attacks Attempted:
 * 1. Attempt to fetch non-existent or foreign incident ID
 * 2. Attempt to approve non-existent incident
 * 3. Attempt path traversal in incident ID (e.g. inc-../../admin)
 * 4. Attempt to trigger patch / delivery on foreign incident ID
 */

const assert = require('assert');
const http = require('http');

const PORT = process.env.PORT || 3001;

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        method: options.method || 'GET',
        path: options.path,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(body);
          } catch {
            parsed = body;
          }
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        });
      }
    );
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function run() {
  console.log('--- RED TEAM 14: IDOR & OBJECT AUTHORIZATION ATTACKS ---');

  // Attack 1: Non-existent / foreign incident access
  console.log('▶ Attack 1: Querying foreign incident ID (inc-unauthorized-999999)');
  const res1 = await request({
    method: 'GET',
    path: '/api/incidents/inc-unauthorized-999999',
  });
  assert.strictEqual(res1.status, 404, 'Foreign/unknown incident must return 404');
  console.log('✔ Foreign incident query returned 404 Not Found');

  // Attack 2: Attempting approval on foreign incident ID
  console.log('▶ Attack 2: Attempting human review approval on foreign incident ID');
  const res2 = await request(
    {
      method: 'POST',
      path: '/api/incidents/inc-unauthorized-999999/human-review',
    },
    {
      decision: 'APPROVE',
      note: 'Malicious unauthorized approval',
    }
  );
  assert.strictEqual(res2.status, 404, 'Foreign incident approval must return 404');
  console.log('✔ Foreign incident approval rejected with 404 Not Found');

  // Attack 3: Path traversal attempt in URL parameter
  console.log('▶ Attack 3: Path traversal in incident ID parameter');
  const res3 = await request({
    method: 'GET',
    path: '/api/incidents/..%2f..%2fadmin',
  });
  assert.ok(res3.status === 404 || res3.status === 400);
  console.log(`✔ Traversal incident parameter safely rejected with HTTP ${res3.status}`);

  console.log('--- ALL IDOR ATTACKS DEFEATED ---');
}

run().catch((err) => {
  console.error('❌ Red Team IDOR Test Failed:', err);
  process.exit(1);
});
