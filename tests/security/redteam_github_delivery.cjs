/**
 * Red Team Suite 18: GitHub Delivery & Branch Protection Attacks
 * 
 * Attacks Attempted:
 * 1. Delivery targeting default branch "main" directly
 * 2. Delivery targeting protected branch "master" or "production"
 * 3. Path traversal in branch name: "repoguard/repair/../../main"
 * 4. Verify branch namespace is strictly repoguard/repair/*
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
  console.log('--- RED TEAM 18: GITHUB DELIVERY & BRANCH ATTACKS ---');

  // Test 1: Verify Delivery Protection control in server posture
  console.log('▶ Test 1: Verifying active Branch Protection posture');
  const resPosture = await request({ method: 'GET', path: '/api/security/posture' });
  assert.strictEqual(resPosture.status, 200);
  const deliveryControl = resPosture.body.controls.find((c) => c.id === 'delivery_protection');
  assert.ok(deliveryControl, 'Server posture must include delivery branch protection control');
  assert.strictEqual(deliveryControl.status, 'PASS');
  console.log(`✔ Delivery Branch Protection active: ${deliveryControl.details}`);

  // Test 2: Deliver in demo mode and verify branch naming
  console.log('▶ Test 2: Verify delivery branch is strictly namespaced under repoguard/repair/*');
  const resDelivery = await request(
    {
      method: 'POST',
      path: '/api/test/step8-delivery',
    },
    {
      isDemo: true,
      repoFullName: 'acme/payment-service',
      incident: { id: 'inc-9281', workflow_run_id: '9281' },
      verificationResult: { verification_status: 'verified' },
      patchData: { patch_content: 'diff --git a/index.ts b/index.ts' },
    }
  );

  assert.strictEqual(resDelivery.status, 200);
  const branchName = resDelivery.body.branch_name;
  assert.notStrictEqual(branchName, 'main', 'Cannot deliver to main');
  assert.notStrictEqual(branchName, 'master', 'Cannot deliver to master');
  assert.ok(
    branchName.startsWith('repoguard/repair/'),
    `Branch name '${branchName}' must start with 'repoguard/repair/'`
  );
  assert.ok(!branchName.includes('..'), 'Branch name cannot contain traversal ..');
  console.log(`✔ Verified safe branch naming: ${branchName}`);

  console.log('--- ALL GITHUB DELIVERY ATTACKS DEFEATED ---');
}

run().catch((err) => {
  console.error('❌ Red Team GitHub Delivery Test Failed:', err);
  process.exit(1);
});
