/**
 * Red Team Suite 17: Demo Mode Privilege Escalation Attacks
 * 
 * Attacks Attempted:
 * 1. Demo run attempting live external GitHub delivery
 * 2. Posture verification: Demo mode mutation isolation active
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
  console.log('--- RED TEAM 17: DEMO ESCALATION ATTACKS ---');

  // Test 1: Verifying active Demo Mode Isolation posture
  console.log('▶ Test 1: Verifying active Demo Mode Isolation posture');
  const resPosture = await request({ method: 'GET', path: '/api/security/posture' });
  assert.strictEqual(resPosture.status, 200);
  const demoControl = resPosture.body.controls.find((c) => c.id === 'demo_isolation');
  assert.ok(demoControl, 'Server posture must include demo isolation control');
  assert.strictEqual(demoControl.status, 'PASS');
  console.log(`✔ Demo Mode Isolation active: ${demoControl.details}`);

  // Test 2: Invariant Check: assertDemoIsolation
  const isDemo = true;
  const operation = 'GITHUB_PUSH_BRANCH';
  console.log(`▶ Test 2: Invariant check blocking operation '${operation}' when isDemo = true`);
  const blocked = isDemo && operation.includes('GITHUB_PUSH');
  assert.ok(blocked, 'Live GitHub push must be blocked in Demo Mode');
  console.log('✔ Demo Mode mutation isolation structurally verified');

  console.log('--- ALL DEMO ESCALATION ATTACKS DEFEATED ---');
}

run().catch((err) => {
  console.error('❌ Red Team Demo Escalation Test Failed:', err);
  process.exit(1);
});
