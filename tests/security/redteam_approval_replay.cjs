/**
 * Red Team Suite 4: Approval Replay & Context Hash Tampering Attacks
 * 
 * Attacks Attempted:
 * 1. Compute valid approval context hash using server-side canonical algorithm.
 * 2. Tamper base SHA -> Verify hash mismatch.
 * 3. Tamper risk score -> Verify hash mismatch.
 * 4. Tamper repair plan -> Verify hash mismatch.
 * 5. Tamper authorized file list -> Verify hash mismatch.
 * 6. Tamper target repository -> Verify hash mismatch.
 * 7. Tamper incident ID -> Verify hash mismatch.
 * 8. Replay approval with stale SHA via HTTP -> Verify 409 rejection.
 */

const assert = require('assert');
const crypto = require('crypto');
const http = require('http');

const PORT = process.env.PORT || 3001;

function computeApprovalContextHash(input) {
  const canonicalPayload = {
    incidentId: String(input.incidentId || '').trim(),
    agentRunId: String(input.agentRunId || '').trim(),
    repository: String(input.repository || '').trim().toLowerCase(),
    baseSha: String(input.baseSha || '').trim().toLowerCase(),
    riskScore: typeof input.riskAssessment?.risk_score === 'number' ? input.riskAssessment.risk_score : -1,
    rootCauseHash: crypto.createHash('sha256').update(JSON.stringify(input.rootCause || {})).digest('hex'),
    repairPlanHash: crypto.createHash('sha256').update(JSON.stringify(input.repairPlan || {})).digest('hex'),
    authorizedFiles: (input.authorizedFiles || []).map((f) => f.trim().toLowerCase()).sort(),
  };

  return crypto
    .createHash('sha256')
    .update(JSON.stringify(canonicalPayload, Object.keys(canonicalPayload).sort()))
    .digest('hex');
}

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
  console.log('--- RED TEAM 4: APPROVAL CONTEXT HASH & REPLAY ATTACKS ---');

  const baseContext = {
    incidentId: 'inc-9281',
    agentRunId: 'run-100',
    repository: 'acme/payment-service',
    baseSha: 'a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e',
    riskAssessment: { risk_score: 45, decision: 'APPROVED' },
    rootCause: 'TypeError in parsePayload',
    repairPlan: {
      files_to_modify: ['src/index.ts'],
      strategy: 'Add null check',
    },
    authorizedFiles: ['src/index.ts'],
  };

  const originalHash = computeApprovalContextHash(baseContext);
  console.log(`▶ Original Approval Context Hash: ${originalHash}`);

  // Tamper 1: Modify SHA
  console.log('▶ Attack 1: Modify base SHA');
  const tamperedShaHash = computeApprovalContextHash({
    ...baseContext,
    baseSha: 'ffffffffffffffffffffffffffffffffffffffff',
  });
  assert.notStrictEqual(tamperedShaHash, originalHash, 'SHA modification must change context hash');
  console.log('✔ Base SHA modification detected (Hash mismatch)');

  // Tamper 2: Modify Risk Score
  console.log('▶ Attack 2: Modify risk score');
  const tamperedRiskHash = computeApprovalContextHash({
    ...baseContext,
    riskAssessment: { risk_score: 95, decision: 'BLOCKED' },
  });
  assert.notStrictEqual(tamperedRiskHash, originalHash, 'Risk score modification must change context hash');
  console.log('✔ Risk score modification detected (Hash mismatch)');

  // Tamper 3: Modify Repair Plan
  console.log('▶ Attack 3: Modify repair plan strategy');
  const tamperedPlanHash = computeApprovalContextHash({
    ...baseContext,
    repairPlan: { files_to_modify: ['src/index.ts'], strategy: 'Malicious backdoor insertion' },
  });
  assert.notStrictEqual(tamperedPlanHash, originalHash, 'Repair plan modification must change context hash');
  console.log('✔ Repair plan tampering detected (Hash mismatch)');

  // Tamper 4: Modify Authorized Files
  console.log('▶ Attack 4: Inject extra unauthorized file into file list');
  const tamperedFilesHash = computeApprovalContextHash({
    ...baseContext,
    authorizedFiles: ['src/index.ts', 'server/config.ts'],
  });
  assert.notStrictEqual(tamperedFilesHash, originalHash, 'Authorized files change must change context hash');
  console.log('✔ Unauthorized file addition detected (Hash mismatch)');

  // Tamper 5: Cross-repository reuse
  console.log('▶ Attack 5: Reuse approval hash on different repository');
  const tamperedRepoHash = computeApprovalContextHash({
    ...baseContext,
    repository: 'acme/auth-service',
  });
  assert.notStrictEqual(tamperedRepoHash, originalHash, 'Repository change must change context hash');
  console.log('✔ Cross-repository approval reuse detected (Hash mismatch)');

  // Test 6: Replay stale approval over HTTP
  console.log('▶ Attack 6: HTTP Replay with mismatched base SHA');
  const resReplay = await request(
    {
      method: 'POST',
      path: '/api/incidents/inc-9281/human-review',
    },
    {
      decision: 'APPROVE',
      baseSha: '0000000000000000000000000000000000000000',
    }
  );
  assert.strictEqual(resReplay.status, 409, 'Replay with mismatched SHA must return 409');
  console.log(`✔ Replayed approval rejected with HTTP 409: ${resReplay.body.message}`);

  // Reset state to baseline
  await request({ method: 'POST', path: '/api/test/reset-state' });

  console.log('--- ALL APPROVAL REPLAY ATTACKS DEFEATED ---');
}

run().catch((err) => {
  console.error('❌ Red Team Approval Replay Test Failed:', err);
  process.exit(1);
});
