const http = require('http')

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3001'

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function runRegressionTests() {
  console.log('======================================================================')
  console.log(' CRITICAL REGRESSION TEST: HUMAN REVIEW PIPELINE HARD STOP & RESUME')
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
    // Reset server state to clean baseline
    await request('/api/test/reset-state', { method: 'POST' })

    // -----------------------------------------------------------------------
    // Part 1: Initial Quiescent State Verification for inc-9281
    // -----------------------------------------------------------------------
    console.log('▶ Step 1: Query initial state of inc-9281 (Pending Human Review)')
    const initialRes = await request('/api/incidents/inc-9281')
    assert('HTTP 200 OK for inc-9281', initialRes.status === 200, `Status: ${initialRes.status}`)
    const inc = initialRes.data.incident
    assert('Incident exists and has ID inc-9281', inc && inc.id === 'inc-9281')
    assert('human_review_status is PENDING', inc.human_review_status === 'PENDING', `Got: ${inc.human_review_status}`)
    assert('requires_human_review is true', inc.requires_human_review === true || inc.repair_plan_data?.requires_human_review === true)
    
    // Check execution status and stage
    const activeRun = inc.active_run
    assert('active_run current_stage is REASON', activeRun?.current_stage === 'REASON', `Got: ${activeRun?.current_stage}`)
    assert('active_run status is requires_human_review', activeRun?.status === 'requires_human_review', `Got: ${activeRun?.status}`)

    // Check downstream stages are NOT generated or completed
    assert('patch_data is not generated', !inc.patch_data || inc.patch_data.patch_status !== 'generated', `Got: ${inc.patch_data?.patch_status}`)
    assert('test_data is not passed', !inc.test_data || inc.test_data.test_status !== 'passed', `Got: ${inc.test_data?.test_status}`)
    assert('verification_data is not verified', !inc.verification_data || inc.verification_data.verification_status !== 'verified', `Got: ${inc.verification_data?.verification_status}`)
    assert('delivery_data does not have status pr_created', !inc.delivery_data || inc.delivery_data.status !== 'pr_created', `Got: ${inc.delivery_data?.status}`)

    // -----------------------------------------------------------------------
    // Part 2: Asynchronous Execution Invariance Test (Wait 6 seconds)
    // -----------------------------------------------------------------------
    console.log('\n▶ Step 2: Asynchronous Timer Test — Wait 6 seconds to prove pipeline remains permanently paused')
    await sleep(6000)

    const afterWaitRes = await request('/api/incidents/inc-9281')
    const incAfterWait = afterWaitRes.data.incident
    assert('After 6s wait: current_stage is still REASON', incAfterWait.active_run?.current_stage === 'REASON', `Got: ${incAfterWait.active_run?.current_stage}`)
    assert('After 6s wait: human_review_status is still PENDING', incAfterWait.human_review_status === 'PENDING', `Got: ${incAfterWait.human_review_status}`)
    assert('After 6s wait: delivery_data status is NOT pr_created', !incAfterWait.delivery_data || incAfterWait.delivery_data.status !== 'pr_created', `Got: ${incAfterWait.delivery_data?.status}`)
    assert('After 6s wait: patch_data is NOT generated', !incAfterWait.patch_data || incAfterWait.patch_data.patch_status !== 'generated', `Got: ${incAfterWait.patch_data?.patch_status}`)

    // -----------------------------------------------------------------------
    // Part 3: Rejection Flow Verification
    // -----------------------------------------------------------------------
    console.log('\n▶ Step 3: Human Rejection Flow — Permanently Stops Pipeline')
    const rejectRes = await request('/api/test/step11-human-review', { method: 'POST' }, {
      action: 'reject',
      incident: {
        id: 'inc-test-hardstop-reject',
        commit_sha: 'a9b8c7d',
        affected_files: ['src/services/billing.ts'],
        status: 'investigating',
        risk_assessment: { requires_human_review: true, risk_score: 82 },
      },
      note: 'Rejecting due to manual change freeze.',
    })
    assert('HTTP 200 OK on Rejection', rejectRes.status === 200, `Status: ${rejectRes.status}`)
    assert('Decision is REJECTED', rejectRes.data.decision === 'REJECTED')
    assert('Human review status recorded as REJECTED', rejectRes.data.incident?.human_review?.status === 'REJECTED')

    // -----------------------------------------------------------------------
    // Part 4: Stale Approval Prevention
    // -----------------------------------------------------------------------
    console.log('\n▶ Step 4: Stale Base SHA Guard — Rejects Mismatched Commit SHA (HTTP 409)')
    const staleRes = await request('/api/incidents/inc-9281/human-review', { method: 'POST' }, {
      decision: 'APPROVE',
      baseSha: 'stale_mismatched_sha_00000',
      note: 'Approving with stale SHA',
    })
    assert('HTTP 409 Conflict on Stale Base SHA', staleRes.status === 409, `Status: ${staleRes.status}`)
    assert('Error message mentions STALE_APPROVAL', staleRes.data.error === 'STALE_APPROVAL', JSON.stringify(staleRes.data))

    // -----------------------------------------------------------------------
    // Part 5: Approval and Safe Downstream Continuation
    // -----------------------------------------------------------------------
    console.log('\n▶ Step 5: Valid Human Approval Flow — Revalidates Safety & Resumes Pipeline')
    const approveRes = await request('/api/incidents/inc-9281/human-review', { method: 'POST' }, {
      decision: 'APPROVE',
      baseSha: incAfterWait.commit_sha || '8f31c2a',
      note: 'Authorized after expert review.',
    })
    assert('HTTP 200 OK on Valid Approval', approveRes.status === 200, `Status: ${approveRes.status}`)
    assert('Approval decision is APPROVED', approveRes.data.decision === 'APPROVED')
    assert('Incident human_review_status transitions to APPROVED', approveRes.data.incident?.human_review_status === 'APPROVED')
    assert('Active run advances past REASON stage', approveRes.data.activeRun?.current_stage !== 'REASON', `Stage is: ${approveRes.data.activeRun?.current_stage}`)

    // -----------------------------------------------------------------------
    // Part 6: Idempotent Approval Protection
    // -----------------------------------------------------------------------
    console.log('\n▶ Step 6: Approval Idempotency Test — Repeated Approval Returns Safely')
    const duplicateApproveRes = await request('/api/incidents/inc-9281/human-review', { method: 'POST' }, {
      decision: 'APPROVE',
      baseSha: incAfterWait.commit_sha || '8f31c2a',
      note: 'Duplicate approval click',
    })
    assert('HTTP 200 OK on duplicate approval', duplicateApproveRes.status === 200, `Status: ${duplicateApproveRes.status}`)

    console.log('\n======================================================================')
    console.log(` CRITICAL REGRESSION TEST RESULTS: ${passed} PASSED, ${failed} FAILED`)
    console.log('======================================================================')

    if (failed > 0) {
      process.exit(1)
    }
  } catch (err) {
    console.error('Fatal regression test error:', err)
    process.exit(1)
  }
}

runRegressionTests()
