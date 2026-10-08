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
          resolve({ status: res.statusCode, data: parsed })
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

async function runStateMachineSecuritySuite() {
  console.log('======================================================================')
  console.log(' SECURITY TEST: SERVER-SIDE WORKFLOW STATE MACHINE INTEGRITY')
  console.log(' Threat Model: Client attempts illegal stage jumps to bypass gates')
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
    // -------------------------------------------------------------
    // Test 1: Illegal Jump REASON -> DELIVER (Direct API skip)
    // -------------------------------------------------------------
    console.log('▶ Test 1: Direct Illegal Jump REASON -> DELIVER must return HTTP 409')
    const res1 = await request('/api/incidents/inc-9281/advance-stage', { method: 'POST' }, {
      targetStage: 'DELIVER',
    })
    assert('HTTP 409 or 422 returned on illegal jump to DELIVER', res1.status === 409 || res1.status === 422, `Got ${res1.status}`)
    assert('Error code is INVALID_STATE_TRANSITION', res1.data.error === 'INVALID_STATE_TRANSITION', JSON.stringify(res1.data))

    // -------------------------------------------------------------
    // Test 2: Illegal Jump DETECT -> PATCH (Skipping Inspect & Reason)
    // -------------------------------------------------------------
    console.log('\n▶ Test 2: Direct Illegal Jump DETECT -> PATCH must return HTTP 409')
    const res2 = await request('/api/incidents/inc-9281/advance-stage', { method: 'POST' }, {
      targetStage: 'PATCH',
    })
    assert('HTTP 409 returned on illegal jump to PATCH', res2.status === 409 || res2.status === 403, `Got ${res2.status}`)

    // -------------------------------------------------------------
    // Test 3: Illegal Jump PATCH -> DELIVER (Skipping Test & Verify)
    // -------------------------------------------------------------
    console.log('\n▶ Test 3: Direct Jump PATCH -> DELIVER without Test & Verify must be blocked')
    const res3 = await request('/api/incidents/inc-9281/deliver', { method: 'POST' }, {
      verified: true, // Forged client boolean
    })
    assert('HTTP 409 or 422 returned on unverified deliver call', res3.status === 409 || res3.status === 422, `Got ${res3.status}`)

    // -------------------------------------------------------------
    // Test 4: Direct Patch Call when Human Review is PENDING
    // -------------------------------------------------------------
    console.log('\n▶ Test 4: Direct Patch API call on incident requiring human review must return HTTP 403')
    const res4 = await request('/api/incidents/inc-9281/patch', { method: 'POST' }, {
      approved: true, // Forged client field
      risk_score: 5,  // Forged client score
    })
    assert('HTTP 403 returned on unapproved patch attempt', res4.status === 403, `Got ${res4.status}`)
    assert('HUMAN_REVIEW_REQUIRED returned', res4.data.error === 'HUMAN_REVIEW_REQUIRED', JSON.stringify(res4.data))

    // -------------------------------------------------------------
    // Test 5: Verify Active Incident State Remains Safe & Intact
    // -------------------------------------------------------------
    console.log('\n▶ Test 5: Invariant check — Incident state not mutated by illegal transition attacks')
    const incRes = await request('/api/incidents/inc-9281')
    assert('Incident is still in safe state', incRes.data.incident?.human_review_status === 'PENDING', `Status: ${incRes.data.incident?.human_review_status}`)

    console.log('\n======================================================================')
    console.log(` STATE MACHINE SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`)
    console.log('======================================================================')

    if (failed > 0) process.exit(1)
  } catch (err) {
    console.error('Fatal test error:', err)
    process.exit(1)
  }
}

runStateMachineSecuritySuite()
