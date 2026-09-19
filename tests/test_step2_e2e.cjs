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

async function runStep2E2ETest() {
  const freshRunId = Math.floor(Math.random() * 9000000) + 1000000;
  const payloadFail = {
    action: 'completed',
    workflow_run: {
      id: freshRunId,
      name: 'CI Build & Test',
      conclusion: 'failure',
      head_sha: 'b2c3d4e5f6a7',
      head_branch: 'repoguard/e2e-test',
      html_url: `https://github.com/pratyushwakde24-source/snowrush-ai/actions/runs/${freshRunId}`,
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
  console.log(`STEP 2 E2E TEST: Sending Fresh Workflow Run Failure #${freshRunId}`);
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

  // Wait 4 seconds for background processIngestedWorkflowFailure worker...
  console.log('\nWaiting 4 seconds for background processIngestedWorkflowFailure worker...');
  await new Promise(r => setTimeout(r, 4000));

  // Check incidents list
  console.log('\nChecking GET http://localhost:3001/api/incidents ...');
  const incRes = await fetch('http://localhost:3001/api/incidents');
  const incData = await incRes.json();
  console.log('Incidents Count:', incData.incidents ? incData.incidents.length : 0);
  if (incData.incidents && incData.incidents.length > 0) {
    const latest = incData.incidents[0];
    console.log('Latest Incident ID:', latest.id);
    console.log('Title:', latest.title);
    console.log('Workflow Run ID:', latest.workflow_run_id);
    console.log('Error Type:', latest.error_type);
    console.log('Error Message:', latest.error_message);
    console.log('Affected Files:', latest.affected_files);
    console.log('GitHub Verified:', latest.github_verified);

    // Fetch details
    console.log(`\nChecking GET http://localhost:3001/api/incidents/${latest.id} ...`);
    const detailRes = await fetch(`http://localhost:3001/api/incidents/${latest.id}`);
    const detailData = await detailRes.json();
    console.log('Active Run Stage:', detailData.activeRun?.current_stage);
    console.log('Active Run Status:', detailData.activeRun?.status);
    console.log('Events Count:', detailData.events?.length);
    console.log('Latest Event Message:', detailData.events?.[0]?.message);
  }
}

runStep2E2ETest();
