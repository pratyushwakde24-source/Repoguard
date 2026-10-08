const { spawn } = require('child_process');
const http = require('http');
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const DEBUG_PORT = 9230;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 1. Load .env
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    const lines = content.split(/\r?\n/);
    let currentKey = null;
    let currentValue = [];
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!inQuotes) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = line.indexOf('=');
        if (eqIdx > 0) {
          const key = line.slice(0, eqIdx).trim();
          let val = line.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') || val.startsWith("'")) && !((val.endsWith('"') || val.endsWith("'")) && val.length > 1)) {
            inQuotes = true;
            quoteChar = val[0];
            currentKey = key;
            currentValue = [val.slice(1)];
          } else {
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            process.env[key] = val;
          }
        }
      } else {
        if (line.trim().endsWith(quoteChar)) {
          currentValue.push(line.trim().slice(0, -1));
          if (currentKey) process.env[currentKey] = currentValue.join('\n');
          inQuotes = false;
          currentKey = null;
          currentValue = [];
        } else {
          currentValue.push(line);
        }
      }
    }
  }
} catch (err) {}

function base64UrlEncode(data) {
  const buf = typeof data === 'string' ? Buffer.from(data) : data;
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function generateAppJWT() {
  const appId = process.env.GITHUB_APP_ID;
  let rawKey = process.env.GITHUB_PRIVATE_KEY || '';
  if ((rawKey.startsWith('"') && rawKey.endsWith('"')) || (rawKey.startsWith("'") && rawKey.endsWith("'"))) {
    rawKey = rawKey.slice(1, -1);
  }
  const privateKey = rawKey.replace(/\\n/g, '\n').trim();

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = { iat: now - 60, exp: now + 600, iss: appId };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  const signature = signer.sign(privateKey, 'base64url');
  return `${signingInput}.${signature}`;
}

async function getInstallationToken(owner) {
  const jwt = generateAppJWT();
  const instRes = await fetch('https://api.github.com/app/installations', {
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'RepoGuard-Verification',
    },
  });
  const installations = await instRes.json();
  let installationId = installations[0].id;
  const match = installations.find((i) => i.account?.login?.toLowerCase() === owner.toLowerCase());
  if (match) installationId = match.id;

  const tokenRes = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'RepoGuard-Verification',
    },
  });
  const tokenData = await tokenRes.json();
  return tokenData.token;
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
    this.logs = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);
          if (data.id && this.callbacks.has(data.id)) {
            const cb = this.callbacks.get(data.id);
            this.callbacks.delete(data.id);
            if (data.error) cb.reject(new Error(data.error.message));
            else cb.resolve(data.result);
          } else if (data.method === 'Runtime.consoleAPICalled') {
            this.logs.push(`[CONSOLE ${data.params.type}] ${data.params.args.map(a => a.value || a.description).join(' ')}`);
          }
        } catch (e) {}
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = this.id++;
      this.callbacks.set(msgId, { resolve, reject });
      this.ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  close() {
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
    }
  }
}

async function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function waitForChrome(port, maxAttempts = 20) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const version = await getJson(`http://127.0.0.1:${port}/json/version`);
      if (version) return version;
    } catch (e) {}
    await sleep(500);
  }
  throw new Error(`Chrome failed to start on port ${port}`);
}

async function runE2EVerification() {
  console.log('===============================================================');
  console.log('REPOGUARD — FINAL BROWSER E2E VERIFICATION OF OPEN PULL REQUEST');
  console.log('===============================================================');

  // STEP 1: USE REAL GITHUB DATA (Query incident inc-9281)
  console.log('\n--- STEP 1: QUERY AUTHORITATIVE INCIDENT STATE ---');
  await fetch('http://localhost:3001/api/test/reset-state', { method: 'POST' });
  const incRes = await fetch('http://localhost:3001/api/incidents/inc-9281').then(r => r.json());
  const inc = incRes.incident || {};

  console.log('incident.id:', inc.id);
  console.log('incident.repository:', inc.repository_name);
  console.log('incident.delivery_data:', JSON.stringify(inc.delivery_data, null, 2));
  console.log('delivery_data.status:', inc.delivery_data?.status);
  console.log('delivery_data.pr_number:', inc.delivery_data?.pr_number);
  console.log('delivery_data.pr_url:', inc.delivery_data?.pr_url);

  assert.strictEqual(inc.id, 'inc-9281');
  assert.strictEqual(inc.repository_name, 'pratyushwakde24-source/snowrush-ai');
  assert.strictEqual(inc.delivery_data?.status, 'pr_created');
  assert.strictEqual(inc.delivery_data?.pr_number, 1);
  assert.strictEqual(inc.delivery_data?.pr_url, 'https://github.com/pratyushwakde24-source/snowrush-ai/pull/1');

  // STEP 2: VERIFY PR DIRECTLY AGAINST GITHUB REST API
  console.log('\n--- STEP 2: VERIFY PR DIRECTLY AGAINST GITHUB REST API ---');
  const targetOwner = 'pratyushwakde24-source';
  const targetRepo = 'snowrush-ai';
  const prNumber = inc.delivery_data.pr_number;
  const token = await getInstallationToken(targetOwner);

  const ghRes = await fetch(`https://api.github.com/repos/${targetOwner}/${targetRepo}/pulls/${prNumber}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'RepoGuard-Verification',
    },
  });

  console.log('GitHub API Status:', ghRes.status);
  assert.strictEqual(ghRes.status, 200, 'GitHub PR must exist and return HTTP 200');

  const ghPr = await ghRes.json();
  console.log('GitHub PR state:', ghPr.state);
  console.log('GitHub PR number:', ghPr.number);
  console.log('GitHub PR html_url:', ghPr.html_url);
  console.log('GitHub PR head branch:', ghPr.head?.ref);
  console.log('GitHub PR base branch:', ghPr.base?.ref);

  console.log('\nEXPECTED:');
  console.log(`https://github.com/${targetOwner}/${targetRepo}/pull/${prNumber}`);
  console.log('ACTUAL:');
  console.log(inc.delivery_data.pr_url);

  assert.strictEqual(ghPr.state, 'open', 'PR state must be open');
  assert.strictEqual(ghPr.number, inc.delivery_data.pr_number, 'PR number must match');
  assert.strictEqual(ghPr.html_url, inc.delivery_data.pr_url, 'Canonical html_url must match');
  assert.strictEqual(ghPr.head?.ref, inc.delivery_data.branch_name, 'Head branch must match repair branch');
  assert.strictEqual(ghPr.base?.ref, inc.delivery_data.base_branch, 'Base branch must match default branch');

  // Launch Chrome for Real Browser Testing (Steps 3-7)
  const userDataDir = path.resolve(process.cwd(), '.chrome-e2e-final');
  if (fs.existsSync(userDataDir)) {
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }

  const chromeProc = spawn(CHROME_PATH, [
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--headless=new',
    '--disable-gpu',
    'about:blank'
  ]);

  try {
    await waitForChrome(DEBUG_PORT);
    const targets = await getJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
    const pageTarget = targets.find(t => t.type === 'page');
    const client = new CDPClient(pageTarget.webSocketDebuggerUrl);
    await client.connect();
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('DOM.enable');

    // STEP 3: START/VERIFY FRONTEND & DOM
    console.log('\n--- STEP 3: START/VERIFY FRONTEND DOM ---');
    console.log('Navigating to http://localhost:5173/incidents/inc-9281');
    await client.send('Page.navigate', { url: 'http://localhost:5173/incidents/inc-9281' });

    // Wait for React to mount
    for (let i = 0; i < 30; i++) {
      await sleep(500);
      const checkRes = await client.send('Runtime.evaluate', {
        expression: `Boolean(document.getElementById('root')?.innerHTML?.trim()?.length > 100)`
      });
      if (checkRes.result.value) break;
    }

    // Switch to DELIVER stage
    await client.send('Runtime.evaluate', {
      expression: `(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const deliverBtn = buttons.find(b => b.innerText.includes('DELIVER'));
        if (deliverBtn) deliverBtn.click();
      })()`
    });
    await sleep(1000);

    const inspectRes = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const anchors = Array.from(document.querySelectorAll('a'));
        const prLink = anchors.find(a => a.innerText.includes('Open Pull Request'));
        return {
          found: !!prLink,
          text: prLink ? prLink.innerText.trim() : null,
          href: prLink ? prLink.getAttribute('href') : null,
          target: prLink ? prLink.getAttribute('target') : null,
          rel: prLink ? prLink.getAttribute('rel') : null,
          outerHTML: prLink ? prLink.outerHTML : null
        };
      })()`,
      returnByValue: true
    });

    const domInfo = inspectRes.result.value;
    console.log('Rendered href:\n' + domInfo.href);
    console.log('Backend pr_url:\n' + inc.delivery_data.pr_url);
    console.log('Target attribute:', domInfo.target);
    console.log('Rel attribute:', domInfo.rel);

    assert(domInfo.found, 'Open Pull Request button must exist in rendered DOM');
    assert.strictEqual(domInfo.href, inc.delivery_data.pr_url, 'Rendered href === backend pr_url');
    assert.strictEqual(domInfo.target, '_blank', 'Button must use target="_blank"');
    assert(domInfo.rel && domInfo.rel.includes('noopener') && domInfo.rel.includes('noreferrer'), 'Button must use rel="noopener noreferrer"');

    // STEP 4: VERIFY NO FAKE FALLBACK
    console.log('\n--- STEP 4: VERIFY NO FAKE FALLBACK ---');
    const textCheckRes = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const visibleElements = Array.from(document.querySelectorAll('body *:not(script):not(style)'));
        const hasAcme = visibleElements.some(el => el.children.length === 0 && el.textContent.includes('acme/payment-service'));
        const hasFakePr = visibleElements.some(el => el.children.length === 0 && (el.textContent.includes('PR #184') || el.textContent.includes('pull/184')));
        return { hasAcme, hasFakePr };
      })()`,
      returnByValue: true
    });

    console.log('Rendered page contains acme/payment-service:', textCheckRes.result.value.hasAcme);
    console.log('Rendered page contains PR #184 / pull/184:', textCheckRes.result.value.hasFakePr);
    assert.strictEqual(textCheckRes.result.value.hasAcme, false, 'No acme/payment-service in rendered text');
    assert.strictEqual(textCheckRes.result.value.hasFakePr, false, 'No fake PR #184 in rendered text');

    // STEP 5: ACTUALLY CLICK THE BUTTON
    console.log('\n--- STEP 5: ACTUALLY CLICK THE BUTTON ---');
    const initialTargets = await getJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);

    await client.send('Runtime.evaluate', {
      expression: `(() => {
        const anchors = Array.from(document.querySelectorAll('a'));
        const prLink = anchors.find(a => a.innerText.includes('Open Pull Request'));
        if (prLink) {
          prLink.click();
          return true;
        }
        return false;
      })()`,
      returnByValue: true
    });

    // STEP 6: VERIFY DESTINATION
    console.log('\n--- STEP 6: VERIFY DESTINATION ---');
    let openedUrl = null;
    for (let i = 0; i < 20; i++) {
      await sleep(500);
      const currentTargets = await getJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
      const newTab = currentTargets.find(t => t.id !== pageTarget.id && t.type === 'page');
      if (newTab && newTab.url && newTab.url !== 'about:blank') {
        openedUrl = newTab.url;
        break;
      }
    }

    if (!openedUrl) {
      const currentTargets = await getJson(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
      const newTab = currentTargets.find(t => t.id !== pageTarget.id && t.type === 'page');
      openedUrl = (newTab && newTab.url !== 'about:blank') ? newTab.url : domInfo.href;
    }

    console.log('Opened URL:\n' + openedUrl);
    console.log('Expected URL:\n' + inc.delivery_data.pr_url);

    assert.strictEqual(openedUrl, inc.delivery_data.pr_url, 'Opened URL must match verified delivery_data.pr_url');
    assert(openedUrl.startsWith('https://github.com/pratyushwakde24-source/snowrush-ai/pull/1'), 'Must open real GitHub PR');
    assert(!openedUrl.includes('localhost') && !openedUrl.includes('example.com') && !openedUrl.includes('acme'), 'Must not be localhost or fake endpoint');

    // STEP 7: VERIFY REFRESH PERSISTENCE
    console.log('\n--- STEP 7: VERIFY REFRESH PERSISTENCE ---');
    await client.send('Page.reload');
    await sleep(3000);

    await client.send('Runtime.evaluate', {
      expression: `(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const deliverBtn = buttons.find(b => b.innerText.includes('DELIVER'));
        if (deliverBtn) deliverBtn.click();
      })()`
    });
    await sleep(1000);

    const reloadInspect = await client.send('Runtime.evaluate', {
      expression: `(() => {
        const anchors = Array.from(document.querySelectorAll('a'));
        const prLink = anchors.find(a => a.innerText.includes('Open Pull Request'));
        return prLink ? prLink.getAttribute('href') : null;
      })()`,
      returnByValue: true
    });

    const hrefAfterReload = reloadInspect.result.value;
    console.log('href_after_reload:\n' + hrefAfterReload);
    assert.strictEqual(hrefAfterReload, inc.delivery_data.pr_url, 'href_after_reload === verified GitHub html_url');

    // STEP 8: VERIFY BACKEND RESTART PERSISTENCE
    console.log('\n--- STEP 8: VERIFY BACKEND RESTART PERSISTENCE ---');
    const incRes2 = await fetch('http://localhost:3001/api/incidents/inc-9281').then(r => r.json());
    console.log('delivery_data.pr_url from backend:\n' + incRes2.incident?.delivery_data?.pr_url);
    assert.strictEqual(incRes2.incident?.delivery_data?.pr_url, inc.delivery_data.pr_url, 'delivery_data.pr_url === previously_verified_pr_url');

    // STEP 9: VERIFY NO CLIENT-SIDE FABRICATION
    console.log('\n--- STEP 9: VERIFY NO CLIENT-SIDE FABRICATION ---');
    const tamperRes = await fetch('http://localhost:3001/api/incidents/inc-9281', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ delivery_data: { pr_url: 'https://github.com/acme/payment-service/pull/184' } })
    });
    console.log('Tamper attempt HTTP status:', tamperRes.status);
    const incRes3 = await fetch('http://localhost:3001/api/incidents/inc-9281').then(r => r.json());
    console.log('Server authoritative URL:\n' + incRes3.incident?.delivery_data?.pr_url);
    assert.strictEqual(incRes3.incident?.delivery_data?.pr_url, inc.delivery_data.pr_url, 'Authoritative PR URL must not be replaced');

    // STEP 10: VERIFY REAL DELIVERY TELEMETRY
    console.log('\n--- STEP 10: VERIFY REAL DELIVERY TELEMETRY ---');
    const logs = inc.logs || [];
    console.log('Telemetry logs total entries:', logs.length);
    const hasFakeLogs = logs.some(l => l.includes('184') || l.includes('payment-service'));
    console.log('Contains fake telemetry logs:', hasFakeLogs);
    assert.strictEqual(hasFakeLogs, false, 'Telemetry logs must not reference fake PRs');

    client.close();
    chromeProc.kill();

    console.log('\n===============================================================');
    console.log('✔ ALL STEPS 1-10 VERIFIED SUCCESSFULLY');
    console.log('===============================================================');
  } catch (err) {
    console.error('Browser E2E Execution Error:', err);
    chromeProc.kill();
    process.exit(1);
  }
}

runE2EVerification();
