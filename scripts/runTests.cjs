const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const testSuites = [
  { name: 'Step 2: Webhook Ingestion & HMAC Verification', file: 'tests/test_step2_e2e.cjs' },
  { name: 'Step 3: Context Extraction & Ingestion', file: 'tests/test_step3_e2e.cjs' },
  { name: 'Step 4: AI Reasoning & Root Cause Gate', file: 'tests/test_step4_e2e.cjs' },
  { name: 'Step 5: AST Isolated Patch Generation Safety Gates', file: 'tests/test_step5_e2e.cjs' },
  { name: 'Step 6: Isolated Sandbox Test Execution', file: 'tests/test_step6_e2e.cjs' },
  { name: 'Step 7: Deterministic Verification Gate', file: 'tests/test_step7_e2e.cjs' },
  { name: 'Step 8: Verified GitHub Delivery & Branch Protection', file: 'tests/test_step8_e2e.cjs' },
];

console.log('====================================================');
console.log('      REPOGUARD AUTOMATED REGRESSION TEST SUITE     ');
console.log('====================================================\n');

let totalPassed = 0;
let totalFailed = 0;
const results = [];

for (const suite of testSuites) {
  let relativePath = suite.file;
  let filePath = path.resolve(process.cwd(), relativePath);
  
  if (!fs.existsSync(filePath)) {
    const fallbackPath = path.resolve(process.cwd(), relativePath.replace('tests/', 'scratch/'));
    if (fs.existsSync(fallbackPath)) {
      filePath = fallbackPath;
    } else {
      console.log(`❌ [SKIPPED] ${suite.name} - File not found: ${suite.file}`);
      totalFailed++;
      results.push({ name: suite.name, status: 'NOT FOUND' });
      continue;
    }
  }

  console.log(`\n▶ RUNNING: ${suite.name}`);
  console.log('----------------------------------------------------');

  const start = Date.now();
  const proc = spawnSync(process.execPath, [filePath], {
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env,
  });
  const duration = ((Date.now() - start) / 1000).toFixed(1);

  if (proc.status === 0) {
    console.log(`✔ PASSED: ${suite.name} (${duration}s)`);
    totalPassed++;
    results.push({ name: suite.name, status: 'PASSED', duration: `${duration}s` });
  } else {
    console.log(`✖ FAILED: ${suite.name} (exit code ${proc.status}) (${duration}s)`);
    totalFailed++;
    results.push({ name: suite.name, status: 'FAILED', duration: `${duration}s` });
  }
}

console.log('\n====================================================');
console.log('                   TEST SUMMARY                     ');
console.log('====================================================');
for (const res of results) {
  const icon = res.status === 'PASSED' ? '✔' : '✖';
  console.log(`${icon} ${res.name.padEnd(52)} : ${res.status} (${res.duration})`);
}
console.log('----------------------------------------------------');
console.log(`TOTAL SUITES: ${testSuites.length} | PASSED: ${totalPassed} | FAILED: ${totalFailed}`);
console.log('====================================================\n');

if (totalFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
