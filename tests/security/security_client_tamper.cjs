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

async function runClientTamperSecuritySuite() {
  console.log('======================================================================')
  console.log(' ADVERSARIAL SECURITY TEST: HOSTILE CLIENT TAMPERING & ZERO TRUST')
  console.log(' Axiom: THE CLIENT IS HOSTILE. NEVER TRUST THE FRONTEND.')
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
    // Attack A: Forged Client Payload — riskScore = 0
    // -------------------------------------------------------------
    console.log('▶ Attack A: Hostile client submits forged `riskScore = 0` to bypass risk gate')
    const resA = await request('/api/incidents/inc-9281/patch', { method: 'POST' }, {
      risk_score: 0,
      riskScore: 0,
      risk_level: 'LOW',
      autonomous_repair_allowed: true,
    })
    assert('Server ignores client riskScore and returns HTTP 403', resA.status === 403, `Got ${resA.status}`)
    assert('Server enforces HUMAN_REVIEW_REQUIRED', resA.data.error === 'HUMAN_REVIEW_REQUIRED', JSON.stringify(resA.data))

    // -------------------------------------------------------------
    // Attack B: Forged Client Payload — requiresHumanReview = false
    // -------------------------------------------------------------
    console.log('\n▶ Attack B: Hostile client flips `requiresHumanReview = false` in payload')
    const resB = await request('/api/incidents/inc-9281/patch', { method: 'POST' }, {
      requires_human_review: false,
      requiresHumanReview: false,
      human_review_required: false,
    })
    assert('Server rejects forged boolean with HTTP 403', resB.status === 403, `Got ${resB.status}`)

    // -------------------------------------------------------------
    // Attack C: Forged Client Payload — rootCauseStatus = 'VERIFIED' on uncertain incident
    // -------------------------------------------------------------
    console.log('\n▶ Attack C: Hostile client forged rootCauseStatus = VERIFIED')
    const resC = await request('/api/incidents/inc-9281/patch', { method: 'POST' }, {
      root_cause_status: 'verified',
      rootCauseStatus: 'VERIFIED',
      decision: 'AUTHORIZED',
    })
    assert('Server verifies authoritative DB state and blocks patch', resC.status === 403, `Got ${resC.status}`)

    // -------------------------------------------------------------
    // Attack D: Forged Client Payload — approved = true
    // -------------------------------------------------------------
    console.log('\n▶ Attack D: Hostile client submits fake `approved = true` boolean without signature')
    const resD = await request('/api/incidents/inc-9281/patch', { method: 'POST' }, {
      approved: true,
      human_review_status: 'APPROVED',
    })
    assert('Server checks authoritative human_review_status in DB and blocks with 403', resD.status === 403, `Got ${resD.status}`)

    // -------------------------------------------------------------
    // Attack E: Forged Client Payload — files = [".github/workflows/ci.yml"]
    // -------------------------------------------------------------
    console.log('\n▶ Attack E: Hostile client attempts to inject workflow file into patch scope')
    const resE = await request('/api/test/step5-gates', { method: 'POST' }, {
      repository: 'pratyushwakde24-source/snowrush-ai',
      commitSha: '6f69df4',
      rootCauseStatus: 'verified',
      requiresHumanReview: false,
      repairPlan: {
        root_cause_status: 'verified',
        root_cause: 'Build error',
        repair_strategy: 'Modify workflow',
        files_to_modify: ['.github/workflows/ci.yml'], // Protected file!
      },
      inspectedFiles: {
        '.github/workflows/ci.yml': 'name: CI',
      },
    })
    assert('Patch to sensitive file (.github/workflows/*) rejected or halted', resE.data.patch_status === 'requires_human_review' || resE.status === 422, JSON.stringify(resE.data))

    // -------------------------------------------------------------
    // Attack F: Forged Client Payload — Over 5 files
    // -------------------------------------------------------------
    console.log('\n▶ Attack F: Hostile client attempts overscoped patch (6 files)')
    const resF = await request('/api/test/step5-gates', { method: 'POST' }, {
      repository: 'pratyushwakde24-source/snowrush-ai',
      commitSha: '6f69df4',
      rootCauseStatus: 'verified',
      requiresHumanReview: false,
      repairPlan: {
        root_cause_status: 'verified',
        root_cause: 'Build error',
        repair_strategy: 'Modify multiple files',
        files_to_modify: ['f1.ts', 'f2.ts', 'f3.ts', 'f4.ts', 'f5.ts', 'f6.ts'],
      },
      inspectedFiles: {
        'f1.ts': '1', 'f2.ts': '2', 'f3.ts': '3', 'f4.ts': '4', 'f5.ts': '5', 'f6.ts': '6'
      },
    })
    assert('Overscoped patch halted at gate', resF.data.patch_status === 'requires_human_review', JSON.stringify(resF.data))

    // -------------------------------------------------------------
    // Attack G: Security Self-Test API Endpoint returns PASS
    // -------------------------------------------------------------
    console.log('\n▶ Attack G: Run Server-Side Security Invariant Self-Test (/api/security/self-test)')
    const resG = await request('/api/security/self-test', { method: 'POST' })
    assert('HTTP 200 OK on /api/security/self-test', resG.status === 200, `Got ${resG.status}`)
    assert('Self-test overall status is PASS', resG.data.status === 'PASS', JSON.stringify(resG.data))
    assert('Security posture is HARDENED', resG.data.security_posture === 'HARDENED', resG.data.security_posture)
    assert('All sub-tests passed', resG.data.passed_count === resG.data.tests_run, `Passed ${resG.data.passed_count}/${resG.data.tests_run}`)

    console.log('\n======================================================================')
    console.log(` CLIENT TAMPERING SUITE: ${passed} PASSED, ${failed} FAILED`)
    console.log('======================================================================')

    if (failed > 0) process.exit(1)
  } catch (err) {
    console.error('Fatal test error:', err)
    process.exit(1)
  }
}

runClientTamperSecuritySuite()
