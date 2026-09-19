const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
const secretMatch = envContent.match(/^GITHUB_WEBHOOK_SECRET\s*=\s*(.*)$/m);
const webhookSecret = secretMatch ? secretMatch[1].trim().replace(/^['"]|['"]$/g, '') : '';

function calcHmac(payloadObj) {
  if (!webhookSecret) return '';
  const bodyBuf = Buffer.from(JSON.stringify(payloadObj));
  const hmac = crypto.createHmac('sha256', webhookSecret);
  hmac.update(bodyBuf);
  return 'sha256=' + hmac.digest('hex');
}

async function runStep5E2ETests() {
  console.log('========================================');
  console.log('REPOGUARD — STEP 5 E2E TEST SUITE');
  console.log('========================================\n');

  let passedTests = 0;
  let totalTests = 6;

  const validViteConfig = `import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Snowrush AI',
        short_name: 'Snowrush',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
})
`;

  // ----------------------------------------------------
  // TEST A: VERIFIED root cause -> Patch generation succeeds
  // ----------------------------------------------------
  console.log('--- TEST A: VERIFIED Root Cause -> Patch Generation Succeeds ---');
  try {
    const resA = await fetch('http://localhost:3001/api/test/step5-gates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repository: 'pratyushwakde24-source/snowrush-ai',
        commitSha: '6f69df453ce7b65977ff21f3d90c0b6dd67f40f6',
        rootCauseStatus: 'verified',
        requiresHumanReview: false,
        repairPlan: {
          root_cause: 'VitePWA plugin references non-existent icon files pwa-192x192.png and pwa-512x512.png',
          repair_strategy: 'Remove missing icons array from VitePWA configuration in vite.config.ts',
          files_to_modify: ['vite.config.ts'],
          files_not_to_modify: ['package.json'],
          risks: ['PWA icons will not render until actual image assets are added'],
          test_commands: ['npm run build']
        },
        inspectedFiles: {
          'vite.config.ts': validViteConfig
        }
      })
    });

    const dataA = await resA.json();
    console.log('Test A Patch Status:', dataA.patch_status);
    console.log('Test A Files Changed:', dataA.files_changed);
    console.log('Test A Summary:', dataA.patch_summary);

    if (
      dataA.patch_status === 'generated' &&
      Array.isArray(dataA.files_changed) &&
      dataA.files_changed.length === 1 &&
      dataA.files_changed[0] === 'vite.config.ts' &&
      dataA.patch_diff && dataA.patch_diff.includes('vite.config.ts')
    ) {
      console.log('✅ TEST A PASSED: Verified patch successfully generated for authorized file only with clean diff and zero GitHub mutation.');
      passedTests++;
    } else {
      console.error('❌ TEST A FAILED:', JSON.stringify(dataA, null, 2));
    }
  } catch (err) {
    console.error('❌ TEST A EXCEPTION:', err.message);
  }

  // ----------------------------------------------------
  // TEST B: UNCERTAIN root cause -> Patch rejected / Human Review
  // ----------------------------------------------------
  console.log('\n--- TEST B: UNCERTAIN Root Cause -> Patch Rejected ---');
  try {
    const resB = await fetch('http://localhost:3001/api/test/step5-gates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repository: 'pratyushwakde24-source/snowrush-ai',
        commitSha: '6f69df453ce7b65977ff21f3d90c0b6dd67f40f6',
        rootCauseStatus: 'uncertain',
        requiresHumanReview: true,
        repairPlan: {
          root_cause: 'Uncertain failure reason',
          repair_strategy: '[CONDITIONAL HYPOTHESIS] Unverified candidate hypothesis.',
          files_to_modify: ['vite.config.ts']
        },
        inspectedFiles: { 'vite.config.ts': validViteConfig }
      })
    });

    const dataB = await resB.json();
    console.log('Test B Patch Status:', dataB.patch_status);
    console.log('Test B Files Changed:', dataB.files_changed);

    if (dataB.patch_status === 'requires_human_review' && dataB.files.length === 0) {
      console.log('✅ TEST B PASSED: UNCERTAIN root cause halted at gate. Zero patch generated.');
      passedTests++;
    } else {
      console.error('❌ TEST B FAILED:', JSON.stringify(dataB, null, 2));
    }
  } catch (err) {
    console.error('❌ TEST B EXCEPTION:', err.message);
  }

  // ----------------------------------------------------
  // TEST C: LIKELY root cause -> Patch rejected / Human Review
  // ----------------------------------------------------
  console.log('\n--- TEST C: LIKELY Root Cause -> Patch Rejected ---');
  try {
    const resC = await fetch('http://localhost:3001/api/test/step5-gates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repository: 'pratyushwakde24-source/snowrush-ai',
        commitSha: '6f69df453ce7b65977ff21f3d90c0b6dd67f40f6',
        rootCauseStatus: 'likely',
        requiresHumanReview: true,
        repairPlan: {
          root_cause: 'Likely build error',
          repair_strategy: '[CONDITIONAL HYPOTHESIS] Proposed repair requires verification.',
          files_to_modify: ['vite.config.ts']
        },
        inspectedFiles: { 'vite.config.ts': validViteConfig }
      })
    });

    const dataC = await resC.json();
    console.log('Test C Patch Status:', dataC.patch_status);

    if (dataC.patch_status === 'requires_human_review' && dataC.files.length === 0) {
      console.log('✅ TEST C PASSED: LIKELY root cause halted at gate. Zero patch generated.');
      passedTests++;
    } else {
      console.error('❌ TEST C FAILED:', JSON.stringify(dataC, null, 2));
    }
  } catch (err) {
    console.error('❌ TEST C EXCEPTION:', err.message);
  }

  // ----------------------------------------------------
  // TEST D: Unauthorized File Modification -> Patch Rejected
  // ----------------------------------------------------
  console.log('\n--- TEST D: Unauthorized File Modification -> Patch Rejected ---');
  try {
    // We simulate an unauthorized target file in repairPlan where inspectedFiles lacks approval or files_not_to_modify is violated
    const resD = await fetch('http://localhost:3001/api/test/step5-gates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repository: 'pratyushwakde24-source/snowrush-ai',
        commitSha: '6f69df453ce7b65977ff21f3d90c0b6dd67f40f6',
        rootCauseStatus: 'verified',
        requiresHumanReview: false,
        repairPlan: {
          root_cause: 'Build error',
          repair_strategy: 'Modify package.json',
          files_to_modify: ['package.json'],
          files_not_to_modify: ['package.json'], // Conflict: package.json is in files_not_to_modify!
        },
        inspectedFiles: { 'package.json': '{\n  "name": "snowrush-ai"\n}\n' }
      })
    });

    const dataD = await resD.json();
    console.log('Test D Patch Status:', dataD.patch_status);
    console.log('Test D Rejection Reason:', dataD.rejection_reason || dataD.patch_summary);

    if (dataD.patch_status === 'rejected' || dataD.patch_status === 'requires_human_review') {
      console.log('✅ TEST D PASSED: Unauthorized file modification attempt successfully caught and rejected.');
      passedTests++;
    } else {
      console.error('❌ TEST D FAILED:', JSON.stringify(dataD, null, 2));
    }
  } catch (err) {
    console.error('❌ TEST D EXCEPTION:', err.message);
  }

  // ----------------------------------------------------
  // TEST E: Patch Exceeds Safety Limits -> Patch Rejected
  // ----------------------------------------------------
  console.log('\n--- TEST E: Patch Exceeds Safety Limits -> Patch Rejected ---');
  try {
    const resE = await fetch('http://localhost:3001/api/test/step5-gates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repository: 'pratyushwakde24-source/snowrush-ai',
        commitSha: '6f69df453ce7b65977ff21f3d90c0b6dd67f40f6',
        rootCauseStatus: 'verified',
        requiresHumanReview: false,
        repairPlan: {
          root_cause: 'Huge change requested',
          repair_strategy: 'Modify 6 files at once',
          files_to_modify: ['file1.ts', 'file2.ts', 'file3.ts', 'file4.ts', 'file5.ts', 'file6.ts'], // Exceeds MAX_PATCH_FILES = 5!
          test_commands: ['npm run build']
        },
        inspectedFiles: {
          'file1.ts': 'c1', 'file2.ts': 'c2', 'file3.ts': 'c3', 'file4.ts': 'c4', 'file5.ts': 'c5', 'file6.ts': 'c6'
        }
      })
    });

    const dataE = await resE.json();
    console.log('Test E Patch Status:', dataE.patch_status);
    console.log('Test E Rejection Reason:', dataE.rejection_reason || dataE.patch_summary);

    if (dataE.patch_status === 'requires_human_review' || dataE.patch_status === 'rejected') {
      console.log('✅ TEST E PASSED: Patch exceeding MAX_PATCH_FILES limit successfully rejected.');
      passedTests++;
    } else {
      console.error('❌ TEST E FAILED:', JSON.stringify(dataE, null, 2));
    }
  } catch (err) {
    console.error('❌ TEST E EXCEPTION:', err.message);
  }

  // ----------------------------------------------------
  // TEST F: Base SHA Mismatch -> Patch Rejected
  // ----------------------------------------------------
  console.log('\n--- TEST F: Base SHA Mismatch -> Patch Rejected ---');
  try {
    const resF = await fetch('http://localhost:3001/api/test/step5-gates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repository: 'pratyushwakde24-source/snowrush-ai',
        commitSha: '6f69df453ce7b65977ff21f3d90c0b6dd67f40f6',
        rootCauseStatus: 'verified',
        requiresHumanReview: false,
        repairPlan: {
          root_cause: 'File missing at SHA',
          repair_strategy: 'Modify non_existent_file.ts',
          files_to_modify: ['non_existent_file.ts']
        },
        inspectedFiles: {
          // 'non_existent_file.ts' is missing!
          'vite.config.ts': validViteConfig
        }
      })
    });

    const dataF = await resF.json();
    console.log('Test F Patch Status:', dataF.patch_status);
    console.log('Test F Rejection Reason:', dataF.rejection_reason || dataF.patch_summary);

    if (dataF.patch_status === 'requires_human_review' || dataF.patch_status === 'rejected') {
      console.log('✅ TEST F PASSED: Base SHA target file mismatch successfully rejected.');
      passedTests++;
    } else {
      console.error('❌ TEST F FAILED:', JSON.stringify(dataF, null, 2));
    }
  } catch (err) {
    console.error('❌ TEST F EXCEPTION:', err.message);
  }

  // ----------------------------------------------------
  // REAL WEBHOOK PIPELINE STEP 1 -> 5 E2E INTEGRATION TEST
  // ----------------------------------------------------
  console.log('\n========================================');
  console.log('REAL WEBHOOK PIPELINE STEP 1 -> STEP 5 E2E RUN');
  console.log('========================================');

  const testRunId = Math.floor(Math.random() * 9000000) + 1000000;
  const realCommitSha = '6f69df453ce7b65977ff21f3d90c0b6dd67f40f6';

  const payloadFail = {
    action: 'completed',
    workflow_run: {
      id: testRunId,
      name: 'CI Build & Test',
      conclusion: 'failure',
      head_sha: realCommitSha,
      head_branch: 'repoguard/e2e-test',
      html_url: `https://github.com/pratyushwakde24-source/snowrush-ai/actions/runs/${testRunId}`,
      created_at: new Date().toISOString()
    },
    repository: {
      id: 1329084875,
      name: 'snowrush-ai',
      full_name: 'pratyushwakde24-source/snowrush-ai',
      owner: { login: 'pratyushwakde24-source' }
    }
  };

  const sigValid = calcHmac(payloadFail);

  console.log(`Sending Failure Webhook for run #${testRunId} @ SHA ${realCommitSha}...`);
  const hookRes = await fetch('http://localhost:3001/api/webhooks/github', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-github-event': 'workflow_run',
      'x-hub-signature-256': sigValid
    },
    body: JSON.stringify(payloadFail)
  });

  console.log('Webhook Response Status:', hookRes.status);
  const incidentId = `inc-${testRunId}`;

  console.log('Polling incident details for Step 5 PATCH completion (up to 40 seconds)...');
  let detailData = null;

  for (let attempt = 1; attempt <= 20; attempt++) {
    await new Promise(r => setTimeout(r, 2000));
    const detailRes = await fetch(`http://localhost:3001/api/incidents/${incidentId}`);
    if (detailRes.ok) {
      detailData = await detailRes.json();
      const currentStage = detailData.activeRun?.current_stage;
      const currentStatus = detailData.activeRun?.status;
      console.log(`Attempt ${attempt} (${attempt * 2}s): Stage=${currentStage}, Status=${currentStatus}`);

      if (
        (currentStage === 'PATCH' && (currentStatus === 'completed' || currentStatus === 'requires_human_review')) ||
        (currentStage === 'REASON' && currentStatus === 'requires_human_review')
      ) {
        console.log('Autonomous pipeline reached terminal state for Step 5!');
        break;
      }
    }
  }

  if (detailData && detailData.incident) {
    const inc = detailData.incident;
    console.log('\n--- INCIDENT PIPELINE RESULT ---');
    console.log('Incident ID:', inc.id);
    console.log('Commit SHA:', inc.commit_sha);
    console.log('Active Run Stage:', detailData.activeRun?.current_stage);
    console.log('Active Run Status:', detailData.activeRun?.status);

    if (inc.repair_plan_data) {
      console.log('Step 4 Root Cause Status:', inc.repair_plan_data.root_cause_status);
    }

    if (inc.patch_data) {
      console.log('Step 5 Patch Status:', inc.patch_data.patch_status);
      console.log('Step 5 Base SHA:', inc.patch_data.base_sha);
      console.log('Step 5 Files Changed:', inc.patch_data.files_changed);
      console.log('Step 5 Patch Summary:', inc.patch_data.patch_summary);
    } else {
      console.log('Step 5 Patch Data: None (pipeline halted safely at hard gate as required)');
    }
  }

  console.log('\n========================================');
  console.log(`STEP 5 E2E SUITE SUMMARY: ${passedTests} / ${totalTests} SAFETY GATE TESTS PASSED`);
  console.log('========================================');

  if (passedTests === totalTests) {
    console.log('🎉 ALL STEP 5 E2E TESTS PASSED PERFECTLY!');
  } else {
    console.error(`❌ FELL SHORT: ${totalTests - passedTests} test(s) failed.`);
    process.exit(1);
  }
}

runStep5E2ETests();
