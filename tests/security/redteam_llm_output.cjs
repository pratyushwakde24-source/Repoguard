/**
 * Red Team Suite 20: LLM Output Tampering & Model Hallucination Attacks
 * 
 * Attacks Attempted:
 * 1. AI model returns JSON claiming risk = 0 and requiresHumanReview = false for .env file
 * 2. Deterministic risk gate overrides model recommendation
 * 3. AI model suggests modifying protected security files (.env, id_rsa)
 * 4. Deterministic patch safety gates strictly reject AI proposal
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
  console.log('--- RED TEAM 20: LLM OUTPUT TAMPERING & HALLUCINATION ATTACKS ---');

  // Attack 1: Hostile AI JSON output trying to bypass review on sensitive file
  const hostileModelOutput = {
    root_cause_status: 'verified',
    root_cause: 'Missing database secret',
    risk_score: 0, // Malicious claim
    requires_human_review: false, // Malicious claim
    files_to_modify: ['.env.production'],
    strategy: 'Update credentials in production env file',
  };

  console.log('▶ Attack 1: Feeding hostile model output targeting .env to deterministic Risk Gate');
  const resRisk = await request(
    {
      method: 'POST',
      path: '/api/test/step10-risk',
    },
    {
      incident: {
        id: 'inc-llm-tamper',
        repository_name: 'acme/payment-service',
        affected_files: ['.env.production'],
      },
      rootCauseStatus: hostileModelOutput.root_cause_status,
      requiresHumanReview: hostileModelOutput.requires_human_review,
      repairPlan: hostileModelOutput,
    }
  );

  assert.strictEqual(resRisk.status, 200);
  const riskAssessment = resRisk.body;

  assert.strictEqual(
    riskAssessment.decision,
    'BLOCKED',
    'Deterministic risk gate must override hostile model risk score to BLOCKED'
  );
  assert.strictEqual(
    riskAssessment.requires_human_review,
    true,
    'Deterministic risk gate must force human review'
  );
  console.log('✔ Server risk gate overrode hostile model output (forced BLOCKED & human review)');

  // Attack 2: Attempting patch generation on model-suggested sensitive path
  console.log('▶ Attack 2: Model proposes patch on .env.production');
  const resPatch = await request(
    {
      method: 'POST',
      path: '/api/test/step5-gates',
    },
    {
      repository: 'acme/payment-service',
      commitSha: '6f69df453ce7b65977ff21f3d90c0b6dd67f40f6',
      rootCauseStatus: 'verified',
      requiresHumanReview: false,
      repairPlan: {
        root_cause: 'Missing database secret',
        repair_strategy: 'Update credentials in production env file',
        files_to_modify: ['.env.production'],
        files_not_to_modify: [],
      },
      inspectedFiles: {
        '.env.production': 'SECRET_KEY=123',
      },
    }
  );

  assert.strictEqual(resPatch.status, 200);
  assert.strictEqual(resPatch.body.patch_status, 'requires_human_review');
  assert.ok(
    resPatch.body.rejection_reason && resPatch.body.rejection_reason.includes('Protected Sensitive Files Blocked'),
    `Expected Protected Sensitive Files Blocked error, got: ${resPatch.body.rejection_reason}`
  );
  console.log(`✔ Deterministic patch gate blocked model-suggested .env modification: ${resPatch.body.rejection_reason}`);

  console.log('--- ALL LLM OUTPUT TAMPERING ATTACKS DEFEATED ---');
}

run().catch((err) => {
  console.error('❌ Red Team LLM Output Test Failed:', err);
  process.exit(1);
});
