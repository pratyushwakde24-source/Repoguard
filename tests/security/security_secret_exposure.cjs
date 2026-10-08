const http = require('http')

const BASE_URL = 'http://localhost:3001'

function request(path, options = {}, payload = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL)
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    }

    if (payload) {
      const data = JSON.stringify(payload)
      reqOptions.headers['Content-Length'] = Buffer.byteLength(data)
    }

    const req = http.request(reqOptions, (res) => {
      let body = ''
      res.on('data', (chunk) => (body += chunk))
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {}
          resolve({ status: res.statusCode, data: parsed, raw: body })
        } catch {
          resolve({ status: res.statusCode, raw: body })
        }
      })
    })

    req.on('error', reject)
    if (payload) {
      req.write(JSON.stringify(payload))
    }
    req.end()
  })
}

async function runSecretExposureSecuritySuite() {
  console.log('======================================================================')
  console.log(' SECURITY TEST: ZERO SECRET EXPOSURE AUDIT')
  console.log(' Threat Model: Server endpoints accidentally leaking private keys/tokens')
  console.log('======================================================================\n')

  let passed = 0
  let failed = 0

  function assert(name, condition, details = '') {
    if (condition) {
      console.log(`  [PASS] ${name}`)
      passed++
    } else {
      console.error(`  [FAIL] ${name} - ${details}`)
      failed++
    }
  }

  try {
    const endpointsToAudit = [
      '/api/health',
      '/api/ai/status',
      '/api/github/status',
      '/api/security/policy',
      '/api/security/posture',
      '/api/incidents',
      '/api/repositories',
      '/api/pull-requests',
      '/api/reliability-memory',
    ]

    for (const ep of endpointsToAudit) {
      console.log(`▶ Auditing endpoint payload: GET ${ep}`)
      const res = await request(ep)
      const rawText = res.raw || JSON.stringify(res.data)

      assert(`${ep}: No RSA Private Key header leaked`, !rawText.includes('BEGIN RSA PRIVATE KEY') && !rawText.includes('BEGIN PRIVATE KEY'), 'Leaked private key header!')
      assert(`${ep}: No GitHub App Client Secret leaked`, !rawText.includes('GITHUB_CLIENT_SECRET='), 'Leaked client secret!')
      assert(`${ep}: No Webhook Secret leaked`, !rawText.includes('GITHUB_WEBHOOK_SECRET='), 'Leaked webhook secret!')
      assert(`${ep}: No Nebius API Key leaked`, !rawText.includes('NEBIUS_API_KEY='), 'Leaked Nebius API key!')
    }

    // Test Security Policy Metadata
    console.log('\n▶ Auditing /api/security/policy metadata response')
    const polRes = await request('/api/security/policy')
    assert('Policy version returned', polRes.data.version === 1)
    assert('Policy hash prefix is truncated (16 chars)', typeof polRes.data.policyHashPrefix === 'string' && polRes.data.policyHashPrefix.length === 16)
    assert('No raw policy secret keys exposed', !JSON.stringify(polRes.data).includes('private_key'))

    console.log('\n======================================================================')
    console.log(` SECRET EXPOSURE SUITE: ${passed} PASSED, ${failed} FAILED`)
    console.log('======================================================================')

    if (failed > 0) process.exit(1)
  } catch (err) {
    console.error('Fatal test error:', err)
    process.exit(1)
  }
}

runSecretExposureSecuritySuite()
