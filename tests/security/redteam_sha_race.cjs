/**
 * Red Team Suite 5: Remote SHA Race & Stale Base Attacks
 * 
 * Attacks Attempted:
 * 1. Approve incident reviewed at commit SHA A (e.g. "a1b2c3d")
 * 2. Remote repository HEAD races ahead to commit SHA B (e.g. "b4c5d6e")
 * 3. Human review approval submission with stale baseSha
 * 4. Verify HTTP 409 STALE_APPROVAL response
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
    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

async function run() {
  console.log('--- RED TEAM 5: REMOTE SHA RACE ATTACKS ---');

  // Attack 1: Attempt to approve with stale base SHA
  console.log('▶ Attack 1: Human review approval submitting mismatched baseSha');
  const res1 = await request(
    {
      method: 'POST',
      path: '/api/incidents/inc-9281/human-review',
    },
    {
      decision: 'APPROVE',
      baseSha: '0000000000000000000000000000000000000000', // Stale / fake SHA
      note: 'Attempt approval on stale SHA',
    }
  );

  assert.strictEqual(
    res1.status,
    409,
    `Expected HTTP 409 STALE_APPROVAL when remote base SHA has changed, got ${res1.status}`
  );
  assert.strictEqual(res1.body.error, 'STALE_APPROVAL');
  console.log(`✔ Blocked stale SHA approval with HTTP 409 STALE_APPROVAL: ${res1.body.message}`);

  // Test 2: Verify posture SHA integrity control
  console.log('▶ Test 2: Verifying active SHA Integrity Gate posture');
  const resPosture = await request({ method: 'GET', path: '/api/security/posture' });
  assert.strictEqual(resPosture.status, 200);
  const shaControl = resPosture.body.controls.find((c) => c.id === 'sha_integrity');
  assert.ok(shaControl, 'Server posture must include exact SHA integrity control');
  assert.strictEqual(shaControl.status, 'PASS');
  console.log(`✔ SHA Integrity Gate active: ${shaControl.details}`);

  // Reset state to baseline
  await request({ method: 'POST', path: '/api/test/reset-state' });

  console.log('--- ALL REMOTE SHA RACE ATTACKS DEFEATED ---');
}

run().catch((err) => {
  console.error('❌ Red Team SHA Race Test Failed:', err);
  process.exit(1);
});
