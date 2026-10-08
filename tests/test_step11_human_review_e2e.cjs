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

async function runStep11Tests() {
  console.log('======================================================================')
  console.log(' STEP 11 E2E: HUMAN VERIFICATION & APPROVAL / RISK REVALIDATION SUITE')
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
    // Test A: Query Incident Review State
    // -------------------------------------------------------------
    console.log('▶ Test A: Query Incident Review State (GET /api/incidents/inc-9281/human-review)')
    const resA = await request('/api/incidents/inc-9281/human-review')
    assert('HTTP 200 OK on GET /human-review', resA.status === 200, `Got ${resA.status}`)
    assert('Review data contains incident & review_required status', resA.data && resA.data.incident_id === 'inc-9281', JSON.stringify(resA.data))
    assert('Risk assessment details present in response', resA.data.risk_assessment && typeof resA.data.risk_assessment.risk_score === 'number', 'Missing risk_assessment')
    assert('Initial state is PENDING without auto-approval', resA.data.human_review?.status === 'PENDING', `Status was ${resA.data.human_review?.status}`)

    // -------------------------------------------------------------
    // Test B: Rejection Flow (POST /api/test/step11-human-review with reject)
    // -------------------------------------------------------------
    console.log('\n▶ Test B: Rejection Flow — Human Rejects Autonomous Patch Generation')
    const resB = await request('/api/test/step11-human-review', { method: 'POST' }, {
      action: 'reject',
      incident: {
        id: 'inc-test-step11-reject',
        commit_sha: '8f31c2a',
        affected_files: ['src/paymentService.ts'],
        status: 'investigating',
        risk_assessment: { requires_human_review: true, risk_score: 78 },
      },
      note: 'Rejecting autonomous patch: manual investigation preferred.',
    })
    assert('HTTP 200 OK on Rejection', resB.status === 200, `Got ${resB.status}`)
    assert('Decision recorded as REJECTED', resB.data.decision === 'REJECTED' || resB.data.incident?.human_review_status === 'REJECTED', JSON.stringify(resB.data))
    assert('Human review status is REJECTED', resB.data.incident?.human_review?.status === 'REJECTED', JSON.stringify(resB.data.incident?.human_review))

    // -------------------------------------------------------------
    // Test C: Stale Approval Rejection (SHA Mismatch returns 409)
    // -------------------------------------------------------------
    console.log('\n▶ Test C: Stale Approval Detection — Refuses Approval When Base SHA Mismatches (HTTP 409)')
    const resC = await request('/api/test/step11-human-review', { method: 'POST' }, {
      action: 'approve',
      baseSha: 'stale_commit_sha_mismatch_12345',
      incident: {
        id: 'inc-test-stale',
        commit_sha: 'actual_valid_commit_sha_99999',
        status: 'investigating',
        risk_assessment: { requires_human_review: true, risk_score: 15 },
      },
    })
    assert('HTTP 409 Conflict returned on Stale Base SHA', resC.status === 409, `Got ${resC.status}`)
    assert('STALE_APPROVAL error code in response', resC.data.error === 'STALE_APPROVAL', JSON.stringify(resC.data))

    // -------------------------------------------------------------
    // Test D: Hard Safety Gate Revalidation (Cannot override scope limit > 5 files)
    // -------------------------------------------------------------
    console.log('\n▶ Test D: Deterministic Hard Safety Gate Protection — Refuses Approval When Hard Gate Violated (HTTP 422)')
    const resD = await request('/api/test/step11-human-review', { method: 'POST' }, {
      action: 'approve',
      baseSha: 'matching_sha_123',
      incident: {
        id: 'inc-test-overscoped',
        commit_sha: 'matching_sha_123',
        affected_files: ['file1.ts', 'file2.ts', 'file3.ts', 'file4.ts', 'file5.ts', 'file6.ts'],
        status: 'investigating',
        risk_assessment: { requires_human_review: true, risk_score: 75 },
      },
    })
    assert('HTTP 422 Unprocessable Entity on Hard Gate Violation', resD.status === 422, `Got ${resD.status}`)
    assert('SAFETY_GATE_FAILED error returned', resD.data.error === 'SAFETY_GATE_FAILED', JSON.stringify(resD.data))

    // -------------------------------------------------------------
    // Test E: Safe Human Approval Flow with Provenance ID
    // -------------------------------------------------------------
    console.log('\n▶ Test E: Safe Human Approval Flow — Revalidates Safety, Generates Provenance ID & Transitions to APPROVED')
    const resE = await request('/api/test/step11-human-review', { method: 'POST' }, {
      action: 'approve',
      baseSha: '8f31c2a',
      incident: {
        id: 'inc-test-step11-approve',
        commit_sha: '8f31c2a',
        affected_files: ['src/paymentService.ts'],
        status: 'investigating',
        risk_assessment: { requires_human_review: true, risk_score: 78 },
      },
      note: 'Authorized autonomous patch generation after reviewing root-cause evidence.',
    })
    assert('HTTP 200 OK on Approval', resE.status === 200, `Got ${resE.status}`)
    assert('Decision recorded as APPROVED', resE.data.decision === 'APPROVED', JSON.stringify(resE.data))
    assert('Incident human_review_status updated to APPROVED', resE.data.incident?.human_review_status === 'APPROVED', resE.data.incident?.human_review_status)
    assert('Approval request ID created', typeof resE.data.incident?.human_review?.approval_request_id === 'string', 'Missing approval_request_id')
    assert('Revalidation result passed', resE.data.incident?.human_review?.revalidation_result?.passed === true, JSON.stringify(resE.data.incident?.human_review))

    // -------------------------------------------------------------
    // Test F: Approval Idempotency Protection
    // -------------------------------------------------------------
    console.log('\n▶ Test F: Idempotency Protection — Repeated Approval Returns Existing State Safely')
    const resF = await request('/api/test/step11-human-review', { method: 'POST' }, {
      action: 'approve',
      baseSha: '8f31c2a',
      incident: {
        id: 'inc-test-step11-approve',
        commit_sha: '8f31c2a',
        affected_files: ['src/paymentService.ts'],
        status: 'healing',
        human_review_status: 'APPROVED',
        risk_assessment: { requires_human_review: true, risk_score: 78 },
      },
      note: 'Duplicate click',
    })
    assert('HTTP 200 OK on duplicate approval request', resF.status === 200, `Got ${resF.status}`)
    assert('Returns existing approved state without duplicate runs', resF.data.incident?.human_review_status === 'APPROVED', JSON.stringify(resF.data))

    // -------------------------------------------------------------
    // Test G: Clean State of inc-9281
    // -------------------------------------------------------------
    console.log('\n▶ Test G: Guarantee inc-9281 Remains Unmodified and in PENDING Review State')
    const resG = await request('/api/incidents/inc-9281')
    assert('HTTP 200 OK on fetching incident details', resG.status === 200, `Got ${resG.status}`)
    assert('inc-9281 human_review_status is PENDING', resG.data.incident?.human_review_status === 'PENDING', `Was ${resG.data.incident?.human_review_status}`)

    console.log('\n======================================================================')
    console.log(` STEP 11 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
    console.log('======================================================================')

    if (failed > 0) {
      process.exit(1)
    }
  } catch (err) {
    console.error('Fatal test error:', err)
    process.exit(1)
  }
}

runStep11Tests()
