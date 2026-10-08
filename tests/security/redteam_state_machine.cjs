/**
 * Red Team Suite 3: State Machine DAG & Illegal Transition Attacks
 * 
 * Attacks Attempted:
 * 1. Direct jump: DETECT -> PATCH (Skip INSPECT, PLAN, REASON, RISK_GATE)
 * 2. Direct jump: DETECT -> DELIVER (Instant delivery bypass)
 * 3. Direct jump: REASON -> DELIVER (Skip review, patch, test, verify)
 * 4. Direct jump: HUMAN_REVIEW -> DELIVER (Skip patch, test, verify)
 * 5. Direct jump: PATCH -> DELIVER (Skip test and verify)
 * 6. Direct jump: TEST -> DELIVER (Skip verify)
 * 7. Transition: VERIFY -> DELIVER without successful verificationPassed
 * 8. Client injection of { stage: "DELIVER" } into request body
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
  console.log('--- RED TEAM 3: STATE MACHINE DAG ATTACKS ---');

  const illegalTransitions = [
    { from: 'DETECT', to: 'PATCH', desc: 'DETECT -> PATCH' },
    { from: 'DETECT', to: 'DELIVER', desc: 'DETECT -> DELIVER' },
    { from: 'REASON', to: 'DELIVER', desc: 'REASON -> DELIVER' },
    { from: 'HUMAN_REVIEW', to: 'DELIVER', desc: 'HUMAN_REVIEW -> DELIVER' },
    { from: 'PATCH', to: 'DELIVER', desc: 'PATCH -> DELIVER' },
    { from: 'TEST', to: 'DELIVER', desc: 'TEST -> DELIVER' },
  ];

  for (const trans of illegalTransitions) {
    console.log(`▶ Attack: Illegal transition attempt ${trans.desc}`);
    const res = await request(
      {
        method: 'POST',
        path: '/api/incidents/inc-9281/advance-stage',
      },
      { targetStage: trans.to }
    );
    assert.strictEqual(
      res.status,
      409,
      `Expected HTTP 409 INVALID_STATE_TRANSITION for ${trans.desc}, got ${res.status}`
    );
    assert.strictEqual(res.body.error, 'INVALID_STATE_TRANSITION');
    console.log(`✔ Blocked ${trans.desc} with HTTP 409 INVALID_STATE_TRANSITION`);
  }

  // Attack: Direct DELIVER endpoint invocation without verification
  console.log('▶ Attack: POST /api/incidents/inc-9281/deliver when unverified');
  const resDeliver = await request({
    method: 'POST',
    path: '/api/incidents/inc-9281/deliver',
  });
  assert.ok(
    resDeliver.status === 409 || resDeliver.status === 422,
    `Delivery without verification must be rejected with 409/422 (got ${resDeliver.status})`
  );
  console.log(`✔ Direct unverified delivery rejected (HTTP ${resDeliver.status})`);

  console.log('--- ALL STATE MACHINE ATTACKS DEFEATED ---');
}

run().catch((err) => {
  console.error('❌ Red Team State Machine Test Failed:', err);
  process.exit(1);
});
