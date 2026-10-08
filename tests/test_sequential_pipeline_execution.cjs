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

async function runSequentialPipelineTests() {
  console.log('======================================================================')
  console.log(' STRICT SEQUENTIAL PIPELINE EXECUTION & PATCH RESUMPTION TEST')
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
    // -----------------------------------------------------------------------
    // STEP 0: Reset server state
    // -----------------------------------------------------------------------
    await request('/api/test/reset-state', { method: 'POST' })

    // -----------------------------------------------------------------------
    // PHASE 1: BEFORE APPROVAL — HARD STOP AT REASON
    // -----------------------------------------------------------------------
    console.log('▶ PHASE 1: Verify Initial Halted State at REASON before approval')
    const resInitial = await request('/api/incidents/inc-9281')
    assert('HTTP 200 OK for inc-9281', resInitial.status === 200, `Status: ${resInitial.status}`)
    const incBefore = resInitial.data.incident
    const runBefore = resInitial.data.activeRun || incBefore.active_run

    assert('Incident human_review_status is PENDING', incBefore.human_review_status === 'PENDING')
    assert('Active run current_stage is REASON', runBefore?.current_stage === 'REASON', `Got: ${runBefore?.current_stage}`)
    assert('Active run status is requires_human_review', runBefore?.status === 'requires_human_review', `Got: ${runBefore?.status}`)
    assert('Patch data is not generated yet', !incBefore.patch_data || incBefore.patch_data.patch_status !== 'generated')
    assert('Delivery data is not pr_created', !incBefore.delivery_data || incBefore.delivery_data.status !== 'pr_created')

    console.log('\n▶ Waiting 6s to confirm pipeline remains quiescent without approval...')
    await sleep(6000)

    const resWait = await request('/api/incidents/inc-9281')
    const incWait = resWait.data.incident
    assert('After wait: still paused at REASON', (resWait.data.activeRun || incWait.active_run)?.current_stage === 'REASON')
    assert('After wait: human review remains PENDING', incWait.human_review_status === 'PENDING')
    assert('After wait: patch has not been generated', !incWait.patch_data || incWait.patch_data.patch_status !== 'generated')

    // -----------------------------------------------------------------------
    // PHASE 2: HUMAN APPROVAL VIA REAL API
    // -----------------------------------------------------------------------
    console.log('\n▶ PHASE 2: Submit Human Authorization via POST /api/incidents/inc-9281/human-review')
    const baseSha = incWait.commit_sha || '6f69df453ce7b65977ff21f3d90c0b6dd67f40f6'
    const resApprove = await request('/api/incidents/inc-9281/human-review', { method: 'POST' }, {
      decision: 'APPROVE',
      baseSha,
      note: 'Authorized after reviewing root cause and minimal repair scope.',
    })

    assert('HTTP 200 OK on Approval submission', resApprove.status === 200, `Status: ${resApprove.status}`)
    assert('Approval decision returned APPROVED', resApprove.data.decision === 'APPROVED')
    assert('Incident human_review_status transitions to APPROVED', resApprove.data.incident?.human_review_status === 'APPROVED')

    // -----------------------------------------------------------------------
    // PHASE 3: VERIFY REAL SEQUENTIAL COMPLETION
    // -----------------------------------------------------------------------
    console.log('\n▶ PHASE 3: Verify Sequential Backend Execution (PATCH -> TEST -> VERIFY -> DELIVER)')
    const incAfter = resApprove.data.incident
    const runAfter = resApprove.data.activeRun

    // 1. PATCH Validation
    assert('Patch was generated', incAfter.patch_data && incAfter.patch_data.patch_status === 'generated', `Patch status: ${incAfter.patch_data?.patch_status}`)
    assert('Patch base_sha matches approved commit SHA', incAfter.patch_data?.base_sha === baseSha, `Base SHA: ${incAfter.patch_data?.base_sha}`)
    assert('Patch contains non-empty diff', Boolean(incAfter.patch_data?.patch_diff && incAfter.patch_data.patch_diff.length > 10))

    // 2. TEST Validation
    assert('Test execution passed in sandbox', incAfter.test_data && incAfter.test_data.test_status === 'passed', `Test status: ${incAfter.test_data?.test_status}`)
    assert('Original failure cleared', incAfter.test_data?.comparison_result === 'ORIGINAL FAILURE CLEARED' || incAfter.test_data?.test_status === 'passed')

    // 3. VERIFY Validation
    assert('Deterministic verification passed', incAfter.verification_data && incAfter.verification_data.verification_status === 'verified', `Verify status: ${incAfter.verification_data?.verification_status}`)

    // 4. DELIVER Validation
    assert('Delivery succeeded with status pr_created', incAfter.delivery_data && incAfter.delivery_data.status === 'pr_created', `Delivery status: ${incAfter.delivery_data?.status}`)
    assert('Pull Request URL exists and is valid', Boolean(incAfter.delivery_data?.pr_url && incAfter.delivery_data.pr_url.startsWith('http')), `PR URL: ${incAfter.delivery_data?.pr_url}`)
    assert('Pull Request number is recorded', typeof incAfter.delivery_data?.pr_number === 'number' && incAfter.delivery_data.pr_number > 0, `PR Number: ${incAfter.delivery_data?.pr_number}`)

    // 5. Final State Validation
    assert('Incident status resolved or healing', incAfter.status === 'resolved' || incAfter.status === 'healing', `Incident status: ${incAfter.status}`)
    assert('Active run is completed or deliver stage reached', runAfter?.status === 'completed' || runAfter?.current_stage === 'DELIVER', `Run status: ${runAfter?.status}`)

    console.log('\n======================================================================')
    console.log(` SEQUENTIAL PIPELINE RESULTS: ${passed} PASSED, ${failed} FAILED`)
    console.log('======================================================================')

    if (failed > 0) process.exit(1)
  } catch (err) {
    console.error('Fatal test exception:', err)
    process.exit(1)
  }
}

runSequentialPipelineTests()
