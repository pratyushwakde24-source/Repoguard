const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
const secretMatch = envContent.match(/^GITHUB_WEBHOOK_SECRET\s*=\s*(.*)$/m);
const webhookSecret = secretMatch ? secretMatch[1].trim().replace(/^['"]|['"]$/g, '') : '';

console.log('Webhook secret loaded:', Boolean(webhookSecret));

function calcHmac(payloadObj) {
  if (!webhookSecret) return '';
  const bodyBuf = Buffer.from(JSON.stringify(payloadObj));
  const hmac = crypto.createHmac('sha256', webhookSecret);
  hmac.update(bodyBuf);
  return 'sha256=' + hmac.digest('hex');
}

async function runStep4E2ETest() {
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

  console.log('\n========================================');
  console.log(`STEP 4 E2E TEST: Sending Failure Webhook for run #${testRunId} @ SHA ${realCommitSha}`);
  console.log('========================================');

  const res = await fetch('http://localhost:3001/api/webhooks/github', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-github-event': 'workflow_run',
      'x-hub-signature-256': sigValid
    },
    body: JSON.stringify(payloadFail)
  });

  console.log('Webhook Response Status:', res.status);
  const data = await res.json();
  console.log('Webhook Response Body:', JSON.stringify(data, null, 2));

  const incidentId = `inc-${testRunId}`;
  console.log('\nWaiting for background worker to complete Step 3 & Step 4 (Polling up to 30 seconds)...');

  let detailData = null;
  for (let attempt = 1; attempt <= 15; attempt++) {
    await new Promise(r => setTimeout(r, 2000));
    const detailRes = await fetch(`http://localhost:3001/api/incidents/${incidentId}`);
    if (detailRes.ok) {
      detailData = await detailRes.json();
      const currentStage = detailData.activeRun?.current_stage;
      const currentStatus = detailData.activeRun?.status;
      console.log(`Attempt ${attempt} (${attempt * 2}s): Stage=${currentStage}, Status=${currentStatus}`);
      if (currentStage === 'REASON' && (currentStatus === 'completed' || currentStatus === 'requires_human_review')) {
        console.log('Step 4 REASON stage completed!');
        break;
      }
    }
  }

  if (detailData && detailData.incident) {
    const inc = detailData.incident;
    console.log('\n--- INCIDENT DETAILS ---');
    console.log('Incident ID:', inc.id);
    console.log('Title:', inc.title);
    console.log('Commit SHA:', inc.commit_sha);
    console.log('Status:', inc.status);

    if (inc.repair_plan_data) {
      const plan = inc.repair_plan_data;
      console.log('\n========================================');
      console.log('--- STEP 4 REPAIR PLAN & ROOT CAUSE VERIFICATION ---');
      console.log('========================================');
      console.log('Root Cause Status:', plan.root_cause_status);
      console.log('Root Cause Statement:', plan.root_cause);
      console.log('Confidence Quotient:', plan.confidence);
      console.log('\nSupporting Evidence Chain:');
      console.log(JSON.stringify(plan.evidence, null, 2));
      console.log('\nRelevant Files:');
      console.log(JSON.stringify(plan.relevant_files, null, 2));
      console.log('\nMinimal Repair Strategy:', plan.repair_strategy);
      console.log('Expected Effect:', plan.expected_effect);
      console.log('Risks:', plan.risks);
      console.log('\nPatch Boundaries:');
      console.log('  Files to Modify:', plan.files_to_modify);
      console.log('  Files to Add:', plan.files_to_add);
      console.log('  Files to Delete:', plan.files_to_delete);
      console.log('  Files NOT to Modify:', plan.files_not_to_modify);
      console.log('\nPlanned Verification Commands (from package.json):');
      console.log(plan.test_commands);
    } else {
      console.error('FAILED: Repair plan data not found on incident object.');
    }

    console.log('\n--- ACTIVE RUN STATE ---');
    console.log('Current Stage:', detailData.activeRun?.current_stage);
    console.log('Current Model:', detailData.activeRun?.current_model);
    console.log('Run Status:', detailData.activeRun?.status);

    console.log('\n--- ACTIVITY EVENTS LOG ---');
    (detailData.events || []).slice(0, 10).forEach(e => {
      console.log(`[${e.stage}] ${e.event_type}: ${e.message}`);
    });
  } else {
    console.error('FAILED: Incident details could not be retrieved.');
  }
}

runStep4E2ETest();
