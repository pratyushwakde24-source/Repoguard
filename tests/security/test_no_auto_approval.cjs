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
        } catch (e) {
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

async function runSecurityAudit() {
  console.log('======================================================================')
  console.log(' SECURITY AUDIT: NO AUTO-APPROVAL / FAIL-CLOSED SECURITY INVARIANT')
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
    // -----------------------------------------------------------------
    // 1. Invariant: Incident requiring review MUST be PENDING initially
    // -----------------------------------------------------------------
    console.log('▶ Invariant 1: Incident requiring human review starts as PENDING')
    const res1 = await request('/api/incidents/inc-9281')
    assert('HTTP 200 OK on GET /api/incidents/inc-9281', res1.status === 200)
    assert('human_review_status is PENDING', res1.data.incident?.human_review_status === 'PENDING', `Was ${res1.data.incident?.human_review_status}`)
    assert('No reviewer recorded yet (null/undefined)', !res1.data.incident?.human_reviewed_by, `Found: ${res1.data.incident?.human_reviewed_by}`)
    assert('No review timestamp recorded yet', !res1.data.incident?.human_reviewed_at, `Found: ${res1.data.incident?.human_reviewed_at}`)
    assert('No approval request ID exists yet', !res1.data.incident?.approval_request_id, `Found: ${res1.data.incident?.approval_request_id}`)

    // -----------------------------------------------------------------
    // 2. Invariant: Quiescent Wait — Doing nothing generates NO auto-approval
    // -----------------------------------------------------------------
    console.log('\n▶ Invariant 2: Quiescent Wait — Simulating 3 seconds idle time without human action')
    await new Promise(r => setTimeout(r, 3000))
    const res2 = await request('/api/incidents/inc-9281')
    assert('Still PENDING after idle wait', res2.data.incident?.human_review_status === 'PENDING', `Was ${res2.data.incident?.human_review_status}`)
    assert('No HUMAN_REVIEW_APPROVED events generated during wait', !res2.data.events?.some(e => e.type === 'HUMAN_REVIEW_APPROVED' && e.incident_id === 'inc-9281'), 'Found unexpected approval event')

    // -----------------------------------------------------------------
    // 3. Invariant: Hard gate violation cannot be approved
    // -----------------------------------------------------------------
    console.log('\n▶ Invariant 3: Hard safety gate refusal (cannot bypass >5 files limit)')
    const res3 = await request('/api/test/step11-human-review', { method: 'POST' }, {
      action: 'approve',
      baseSha: 'matching_sha_123',
      incident: {
        id: 'inc-test-security-scope',
        commit_sha: 'matching_sha_123',
        affected_files: ['f1.ts', 'f2.ts', 'f3.ts', 'f4.ts', 'f5.ts', 'f6.ts'],
        status: 'investigating',
        risk_assessment: { requires_human_review: true, risk_score: 90 },
      },
    })
    assert('HTTP 422 returned on overscoped files', res3.status === 422, `Got ${res3.status}`)
    assert('SAFETY_GATE_FAILED error code returned', res3.data.error === 'SAFETY_GATE_FAILED', JSON.stringify(res3.data))

    // -----------------------------------------------------------------
    // 4. Invariant: Stale SHA cannot be approved
    // -----------------------------------------------------------------
    console.log('\n▶ Invariant 4: Stale SHA refusal (cannot approve when commit SHA changed)')
    const res4 = await request('/api/test/step11-human-review', { method: 'POST' }, {
      action: 'approve',
      baseSha: 'stale_commit_sha',
      incident: {
        id: 'inc-test-security-stale',
        commit_sha: 'new_actual_commit_sha',
        status: 'investigating',
        risk_assessment: { requires_human_review: true, risk_score: 20 },
      },
    })
    assert('HTTP 409 Conflict on Stale SHA', res4.status === 409, `Got ${res4.status}`)
    assert('STALE_APPROVAL error code returned', res4.data.error === 'STALE_APPROVAL', JSON.stringify(res4.data))

    // -----------------------------------------------------------------
    // 5. Invariant: Explicit Approval Generates Provenance ID and Context Hash
    // -----------------------------------------------------------------
    console.log('\n▶ Invariant 5: Explicit Approval Generates Cryptographic Provenance')
    const res5 = await request('/api/test/step11-human-review', { method: 'POST' }, {
      action: 'approve',
      baseSha: '8f31c2a',
      incident: {
        id: 'inc-test-security-approve',
        commit_sha: '8f31c2a',
        affected_files: ['src/paymentService.ts'],
        status: 'investigating',
        risk_assessment: { requires_human_review: true, risk_score: 78 },
      },
      note: 'Security engineer verified audit.',
    })
    assert('HTTP 200 OK on valid explicit approval', res5.status === 200)
    assert('human_review_status becomes APPROVED only after explicit request', res5.data.incident?.human_review_status === 'APPROVED')
    assert('approval_request_id is generated', typeof res5.data.incident?.human_review?.approval_request_id === 'string' && res5.data.incident?.human_review?.approval_request_id.startsWith('apr-'))
    assert('approval_context_hash is generated', typeof res5.data.incident?.human_review?.approval_context_hash === 'string' && res5.data.incident?.human_review?.approval_context_hash.length === 64)

    console.log('\n======================================================================')
    console.log(` SECURITY AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`)
    console.log('======================================================================')

    if (failed > 0) process.exit(1)
  } catch (err) {
    console.error('Fatal Security Audit error:', err)
    process.exit(1)
  }
}

runSecurityAudit()
