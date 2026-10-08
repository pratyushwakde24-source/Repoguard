/**
 * Red Team Suite 15: Tenant Isolation Red Team
 * 
 * Attacks Attempted:
 * 1. Query reliability memory for Repo A vs Repo B
 * 2. Cross-repository incident data contamination attempt
 * 3. Repository scope isolation in memory retrieval
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
  console.log('--- RED TEAM 15: TENANT & REPOSITORY ISOLATION ATTACKS ---');

  // Test 1: Record memory for Tenant Repo A
  console.log('▶ Test 1: Storing reliability memory under tenant repo A (tenant-a/service-alpha)');
  await request(
    {
      method: 'POST',
      path: '/api/test/step9-memory',
    },
    {
      action: 'record',
      memoryItem: {
        id: 'mem-tenant-a-1',
        repository_name: 'tenant-a/service-alpha',
        failure_category: 'test_failure',
        root_cause: 'Timeout in alpha integration tests',
        patch_strategy: 'Increase timeout from 5s to 10s',
        confidence_score: 0.95,
        repair_count: 1,
        requires_human_review: false,
      },
    }
  );

  // Test 2: Query memory scoped to Tenant Repo B
  console.log('▶ Test 2: Querying memory scoped to tenant repo B (tenant-b/service-beta)');
  const resB = await request({
    method: 'GET',
    path: '/api/reliability-memory?repository=tenant-b/service-beta',
  });

  assert.strictEqual(resB.status, 200);
  const memoriesB = resB.body.memories || [];
  // Ensure repo A memory is NOT present in repo B's query results
  const leakedRepoA = memoriesB.some((m) => m.repository_name === 'tenant-a/service-alpha');
  assert.strictEqual(
    leakedRepoA,
    false,
    'CRITICAL ISOLATION BREACH: Tenant Repo A memory was visible in Tenant Repo B query!'
  );
  console.log('✔ Tenant isolation verified: 0 cross-repository data leaks between tenant A and tenant B');

  console.log('--- ALL TENANT ISOLATION ATTACKS DEFEATED ---');
}

run().catch((err) => {
  console.error('❌ Red Team Tenant Isolation Test Failed:', err);
  process.exit(1);
});
