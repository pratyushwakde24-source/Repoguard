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

async function runStep3E2ETest() {
  const testRunId = Math.floor(Math.random() * 9000000) + 1000000;
  // Real commit SHA on pratyushwakde24-source/snowrush-ai
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
  console.log(`STEP 3 E2E TEST: Sending Failure Webhook for run #${testRunId} @ REAL SHA ${realCommitSha}`);
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

  // Wait 10 seconds for full Step 1 -> Step 2 -> Step 3 execution (GitHub tree retrieval, candidate verification, source retrieval, Nebius reasoning)...
  console.log('\nWaiting 10 seconds for background processIngestedWorkflowFailure worker...');
  await new Promise(r => setTimeout(r, 10000));

  const incidentId = `inc-${testRunId}`;
  console.log(`\nChecking GET http://localhost:3001/api/incidents/${incidentId} ...`);
  const detailRes = await fetch(`http://localhost:3001/api/incidents/${incidentId}`);
  const detailData = await detailRes.json();

  if (detailData.incident) {
    const inc = detailData.incident;
    console.log('\n--- INCIDENT DETAILS ---');
    console.log('Incident ID:', inc.id);
    console.log('Title:', inc.title);
    console.log('Commit SHA:', inc.commit_sha);
    console.log('GitHub Verified:', inc.github_verified);
    console.log('Status:', inc.status);

    if (inc.inspection_data) {
      console.log('\n--- STEP 3 INSPECTION EVIDENCE ---');
      console.log('Repository:', inc.inspection_data.repository);
      console.log('Commit SHA:', inc.inspection_data.commit_sha);
      console.log('Scanned Tree Items:', inc.inspection_data.tree_count);
      console.log('Verified Candidates:', JSON.stringify(inc.inspection_data.verified_candidates));
      console.log('Inspected Files:', JSON.stringify(inc.inspection_data.inspected_files));
      console.log('Sources Retrieved Keys:', Object.keys(inc.inspection_data.sources || {}));
      if (Object.keys(inc.inspection_data.sources || {}).length > 0) {
        const firstKey = Object.keys(inc.inspection_data.sources)[0];
        console.log(`Source Content Excerpt (${firstKey}):`, inc.inspection_data.sources[firstKey].slice(0, 150));
      }
      console.log('\n--- AI REASONING HYPOTHESIS ---');
      console.log('Root Cause Hypothesis:', inc.inspection_data.ai_analysis?.root_cause_hypothesis);
      console.log('Confidence:', inc.inspection_data.ai_analysis?.confidence);
      console.log('Relevant Files:', JSON.stringify(inc.inspection_data.ai_analysis?.relevant_files));
    }

    console.log('\n--- ACTIVE RUN STATE ---');
    console.log('Current Stage:', detailData.activeRun?.current_stage);
    console.log('Current Model:', detailData.activeRun?.current_model);
    console.log('Run Status:', detailData.activeRun?.status);

    console.log('\n--- STEP 3 ACTIVITY EVENTS ---');
    (detailData.events || []).slice(0, 8).forEach(e => {
      console.log(`[${e.stage}] ${e.event_type}: ${e.message}`);
    });
  } else {
    console.error('FAILED: Incident not found in backend details endpoint.');
  }
}

runStep3E2ETest();
