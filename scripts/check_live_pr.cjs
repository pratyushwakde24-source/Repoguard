const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Load .env file natively into process.env with multiline and escaped newline support
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

async function main() {
  console.log('===============================================================');
  console.log('STEP 1: QUERYING INCIDENT STATE (inc-9281)');
  console.log('===============================================================');
  
  const incRes = await fetch('http://localhost:3001/api/incidents/inc-9281').then(r => r.json());
  const inc = incRes.incident || {};
  console.log('incident.id:', inc.id);
  console.log('incident.repository:', inc.repository_name);
  console.log('incident.delivery_data:', inc.delivery_data);
  console.log('delivery_data.status:', inc.delivery_data?.status);
  console.log('delivery_data.pr_number:', inc.delivery_data?.pr_number);
  console.log('delivery_data.pr_url:', inc.delivery_data?.pr_url);

  console.log('\n===============================================================');
  console.log('STEP 2: QUERYING REAL GITHUB PULL REQUESTS');
  console.log('===============================================================');

  const targetRepo = 'pratyushwakde24-source/snowrush-ai';
  const [owner, repo] = targetRepo.split('/');
  const token = await getInstallationToken(owner);

  const prsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls?state=all`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'RepoGuard-Verification',
    },
  });
  const prs = await prsRes.json();
  console.log(`Found ${prs.length} Pull Requests on ${targetRepo}:`);
  for (const pr of prs) {
    console.log(`- PR #${pr.number}: state=${pr.state}, title="${pr.title}", html_url=${pr.html_url}, head=${pr.head?.ref}, base=${pr.base?.ref}`);
  }
}

main().catch(console.error);
