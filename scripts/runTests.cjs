const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const testSuites = [
  // Core Functional Verification Suites (Steps 2 - 11)
  { name: 'Step 2: Webhook Ingestion & HMAC Verification', file: 'tests/test_step2_e2e.cjs' },
  { name: 'Step 3: Context Extraction & Ingestion', file: 'tests/test_step3_e2e.cjs' },
  { name: 'Step 4: AI Reasoning & Root Cause Gate', file: 'tests/test_step4_e2e.cjs' },
  { name: 'Step 5: AST Isolated Patch Generation Safety Gates', file: 'tests/test_step5_e2e.cjs' },
  { name: 'Step 6: Isolated Sandbox Test Execution', file: 'tests/test_step6_e2e.cjs' },
  { name: 'Step 7: Deterministic Verification Gate', file: 'tests/test_step7_e2e.cjs' },
  { name: 'Step 8: Verified GitHub Delivery & Branch Protection', file: 'tests/test_step8_e2e.cjs' },
  { name: 'Step 8.1: Canonical GitHub PR URL & Persistence Verification', file: 'tests/test_pr_url_canonical_verification.cjs' },
  { name: 'Step 9: Repository Reliability Memory', file: 'tests/test_step9_memory_e2e.cjs' },
  { name: 'Step 10: Deterministic Intelligent Refusal / Risk Gate', file: 'tests/test_step10_risk_e2e.cjs' },
  { name: 'Step 11: Human Verification & Safety Revalidation Gate', file: 'tests/test_step11_human_review_e2e.cjs' },
  { name: 'Step 12: Human Review Pipeline Hard Stop & Resume Gate', file: 'tests/test_human_review_pipeline_hard_stop.cjs' },
  { name: 'Step 13: Strict Sequential Pipeline Execution', file: 'tests/test_sequential_pipeline_execution.cjs' },
  { name: 'Step 14: Patch Target File Validation', file: 'tests/test_patch_target_file_validation.cjs' },

  // Core Security Invariants
  { name: 'Security Audit: Fail-Closed & No Auto-Approval Invariants', file: 'tests/security/test_no_auto_approval.cjs' },
  { name: 'Security: Server-Side Workflow State Machine Integrity', file: 'tests/security/security_state_machine.cjs' },
  { name: 'Security: Hostile Client Tampering & Zero-Trust Defense', file: 'tests/security/security_client_tamper.cjs' },
  { name: 'Security: Canonical Path Traversal & Sensitive File Defense', file: 'tests/security/security_path_traversal.cjs' },
  { name: 'Security: Zero Secret Exposure & Metadata Audit', file: 'tests/security/security_secret_exposure.cjs' },
  { name: 'Security: Prompt Injection & Untrusted Data Defense', file: 'tests/security/security_prompt_injection.cjs' },
  { name: 'Security: Demo Mode Isolation & Zero Mutation Guarantee', file: 'tests/security/security_demo_mode.cjs' },

  // Red Team Adversarial Attack Suites (1 - 20)
  { name: 'Red Team 1: Authentication & Session Attacks', file: 'tests/security/redteam_auth.cjs' },
  { name: 'Red Team 2: RBAC & Permission Escalation Attacks', file: 'tests/security/redteam_authorization.cjs' },
  { name: 'Red Team 3: State Machine DAG & Illegal Transitions', file: 'tests/security/redteam_state_machine.cjs' },
  { name: 'Red Team 4: Approval Replay & Context Hash Tampering', file: 'tests/security/redteam_approval_replay.cjs' },
  { name: 'Red Team 5: Remote SHA Race & Stale Base Attacks', file: 'tests/security/redteam_sha_race.cjs' },
  { name: 'Red Team 6: Prompt Injection & Adversarial Directives', file: 'tests/security/redteam_prompt_injection.cjs' },
  { name: 'Red Team 7: Reliability Memory Poisoning Defense', file: 'tests/security/redteam_memory_poisoning.cjs' },
  { name: 'Red Team 8: Canonical Path Traversal Attacks', file: 'tests/security/redteam_path_traversal.cjs' },
  { name: 'Red Team 9: Sandbox Escape & Isolation Attacks', file: 'tests/security/redteam_sandbox_escape.cjs' },
  { name: 'Red Team 10: Secret Scanning & Token Exposure Audit', file: 'tests/security/redteam_secret_exposure.cjs' },
  { name: 'Red Team 11: XSS & HTML Injection Attacks', file: 'tests/security/redteam_xss.cjs' },
  { name: 'Red Team 12: CORS & Hostile Origin Attacks', file: 'tests/security/redteam_cors.cjs' },
  { name: 'Red Team 13: CSRF Cross-Origin State Attacks', file: 'tests/security/redteam_csrf.cjs' },
  { name: 'Red Team 14: IDOR & Object Authorization Attacks', file: 'tests/security/redteam_idor.cjs' },
  { name: 'Red Team 15: Tenant & Repository Data Isolation', file: 'tests/security/redteam_tenant_isolation.cjs' },
  { name: 'Red Team 16: Webhook HMAC & Replay Attacks', file: 'tests/security/redteam_webhook_replay.cjs' },
  { name: 'Red Team 17: Demo Mode Privilege Escalation Attacks', file: 'tests/security/redteam_demo_escalation.cjs' },
  { name: 'Red Team 18: GitHub Delivery & Branch Protection', file: 'tests/security/redteam_github_delivery.cjs' },
  { name: 'Red Team 19: Resource Exhaustion & Rate Limiting', file: 'tests/security/redteam_resource_exhaustion.cjs' },
  { name: 'Red Team 20: LLM Output Tampering & Hallucination', file: 'tests/security/redteam_llm_output.cjs' },
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

  // Ensure state isolation between test suites
  try {
    spawnSync(process.execPath, ['-e', 'fetch("http://localhost:3001/api/test/reset-state", {method:"POST"}).catch(()=>{})'], { stdio: 'ignore' });
  } catch {}

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
  console.log(`${icon} ${res.name.padEnd(56)} : ${res.status} (${res.duration})`);
}
console.log('----------------------------------------------------');
console.log(`TOTAL SUITES: ${testSuites.length} | PASSED: ${totalPassed} | FAILED: ${totalFailed}`);
console.log('====================================================\n');

if (totalFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
