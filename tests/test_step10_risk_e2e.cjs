const http = require('http')

const SERVER_URL = 'http://localhost:3001/api/test/step10-risk'

function postRisk(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload)
    const req = http.request(
      SERVER_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = ''
        res.on('data', (chunk) => (body += chunk))
        res.on('end', () => {
          try {
            resolve(JSON.parse(body))
          } catch (e) {
            reject(new Error(`Failed to parse response: ${body}`))
          }
        })
      }
    )
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

async function runStep10Tests() {
  console.log('======================================================================')
  console.log(' STEP 10 E2E: DETERMINISTIC INTELLIGENT REFUSAL / RISK GATE SUITE')
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

  const baseSha = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2'

  try {
    // -------------------------------------------------------------
    // Test K: Safe Case — Verified Root Cause, Clean Scope, Low Risk
    // -------------------------------------------------------------
    console.log('▶ Test K: Safe Case — Verified Root Cause, Clean Scope (<=2 files), Available Tests')
    const resK = await postRisk({
      incident: {
        id: 'inc-safe-001',
        repository_name: 'acme/webapp',
        commit_sha: baseSha,
        error_message: 'Type error in config: Missing icon path',
        workflow_name: 'CI Pipeline',
      },
      rootCauseStatus: 'verified',
      requiresHumanReview: false,
      repairPlan: {
        root_cause_status: 'verified',
        requires_human_review: false,
        files_to_modify: ['vite.config.ts'],
        files_not_to_modify: ['package.json', 'tsconfig.json'],
        test_commands: ['npm run build'],
        confidence: 0.95,
        root_cause: 'Missing PWA icon definition in Vite config',
        repair_strategy: 'Add icon object to VitePWA plugin',
      },
      inspectedFiles: {
        'vite.config.ts': 'export default defineConfig({})',
      },
      headSha: baseSha,
    })

    assert(
      'Safe case evaluates as LOW risk',
      resK.risk_level.toLowerCase() === 'low',
      `Risk level: ${resK.risk_level}, Score: ${resK.risk_score}`
    )
    assert(
      'Safe case grants AUTONOMOUS REPAIR AUTHORIZED',
      resK.decision === 'AUTHORIZED' && resK.autonomous_repair_allowed === true,
      `Decision: ${resK.decision}`
    )
    assert(
      'Safe case has 0 blocking reasons',
      resK.blocking_reasons.length === 0,
      `Blocking reasons: ${JSON.stringify(resK.blocking_reasons)}`
    )

    // -------------------------------------------------------------
    // Test L: Hard Gate 1 — Uncertain Root Cause -> BLOCKED
    // -------------------------------------------------------------
    console.log('\n▶ Test L: Hard Gate 1 — Uncertain Root Cause MUST be Blocked')
    const resL = await postRisk({
      incident: {
        id: 'inc-uncertain-002',
        repository_name: 'acme/webapp',
        commit_sha: baseSha,
        error_message: 'Flaky timeout in end to end tests',
      },
      rootCauseStatus: 'uncertain',
      requiresHumanReview: false,
      repairPlan: {
        root_cause_status: 'uncertain',
        requires_human_review: false,
        files_to_modify: ['src/api.ts'],
        files_not_to_modify: [],
        test_commands: ['npm test'],
        confidence: 0.50,
        root_cause: 'Uncertain timing issue',
      },
      inspectedFiles: { 'src/api.ts': 'export const api = {}' },
      headSha: baseSha,
    })

    assert(
      'Uncertain root cause is BLOCKED',
      resL.decision === 'BLOCKED' && resL.autonomous_repair_allowed === false,
      `Decision: ${resL.decision}`
    )
    assert(
      'Uncertain root cause triggers human review',
      resL.requires_human_review === true
    )
    assert(
      'Blocking reason contains "uncertain"',
      resL.blocking_reasons.some(r => r.toLowerCase().includes('uncertain')),
      `Reasons: ${JSON.stringify(resL.blocking_reasons)}`
    )

    // -------------------------------------------------------------
    // Test M: Hard Gate 2 — Disproven Root Cause -> BLOCKED
    // -------------------------------------------------------------
    console.log('\n▶ Test M: Hard Gate 2 — Disproven Root Cause MUST be Blocked')
    const resM = await postRisk({
      incident: {
        id: 'inc-disproven-003',
        repository_name: 'acme/webapp',
        commit_sha: baseSha,
      },
      rootCauseStatus: 'disproven',
      requiresHumanReview: false,
      repairPlan: {
        root_cause_status: 'disproven',
        requires_human_review: false,
        files_to_modify: ['src/foo.ts'],
      },
      headSha: baseSha,
    })

    assert(
      'Disproven root cause is BLOCKED',
      resM.decision === 'BLOCKED' && resM.autonomous_repair_allowed === false
    )

    // -------------------------------------------------------------
    // Test N: Hard Gate 3 — Patch Modifying Unauthorized Files -> BLOCKED
    // -------------------------------------------------------------
    console.log('\n▶ Test N: Hard Gate 3 — Patch Modifying Unauthorized Files MUST be Blocked')
    const resN = await postRisk({
      incident: {
        id: 'inc-unauthorized-004',
        repository_name: 'acme/webapp',
        commit_sha: baseSha,
      },
      rootCauseStatus: 'verified',
      requiresHumanReview: false,
      repairPlan: {
        root_cause_status: 'verified',
        requires_human_review: false,
        files_to_modify: ['src/App.tsx'],
        files_not_to_modify: ['src/Secret.ts'],
      },
      patchData: {
        patch_status: 'generated',
        files_changed: ['src/App.tsx', 'src/Secret.ts'],
      },
      headSha: baseSha,
    })

    assert(
      'Unauthorized file modification is BLOCKED',
      resN.decision === 'BLOCKED' && resN.autonomous_repair_allowed === false
    )
    assert(
      'Blocking reason mentions unauthorized file',
      resN.blocking_reasons.some(r => r.includes('src/Secret.ts') || r.toLowerCase().includes('unauthorized') || r.toLowerCase().includes('restricted')),
      `Reasons: ${JSON.stringify(resN.blocking_reasons)}`
    )

    // -------------------------------------------------------------
    // Test O: Hard Gate 4 — Security Sensitive Files -> HIGH RISK & BLOCKED
    // -------------------------------------------------------------
    console.log('\n▶ Test O: Hard Gate 4 — Security-Sensitive Files (auth, workflows, migrations) MUST be Blocked')
    const sensitiveFiles = [
      'src/auth/jwt.ts',
      '.github/workflows/deploy.yml',
      'supabase/migrations/20260101_init.sql',
      'src/billing/stripe.ts',
    ]

    for (const sFile of sensitiveFiles) {
      const resO = await postRisk({
        incident: {
          id: `inc-sec-${Date.now()}`,
          repository_name: 'acme/webapp',
          commit_sha: baseSha,
        },
        rootCauseStatus: 'verified',
        requiresHumanReview: false,
        repairPlan: {
          root_cause_status: 'verified',
          requires_human_review: false,
          files_to_modify: [sFile],
          files_not_to_modify: [],
          test_commands: ['npm test'],
        },
        headSha: baseSha,
      })

      assert(
        `Security-sensitive file (${sFile}) is BLOCKED`,
        resO.decision === 'BLOCKED' && resO.risk_level.toLowerCase() === 'high' && resO.autonomous_repair_allowed === false,
        `File: ${sFile} -> Decision: ${resO.decision}, Risk: ${resO.risk_level}`
      )
    }

    // -------------------------------------------------------------
    // Test P: Dependency Changes -> Penalty Added
    // -------------------------------------------------------------
    console.log('\n▶ Test P: Dependency Modifications (package.json / lockfiles) add deterministic risk score')
    const resP = await postRisk({
      incident: {
        id: 'inc-dep-005',
        repository_name: 'acme/webapp',
        commit_sha: baseSha,
      },
      rootCauseStatus: 'verified',
      requiresHumanReview: false,
      repairPlan: {
        root_cause_status: 'verified',
        requires_human_review: false,
        files_to_modify: ['package.json'],
        files_not_to_modify: [],
        test_commands: ['npm test'],
      },
      headSha: baseSha,
    })

    const signalItems = resP.signals?.signal_items || []
    assert(
      'Dependency change flags risk and is blocked from autonomous mutation',
      resP.risk_score >= 35 && (signalItems.some(s => s.name.toLowerCase().includes('depend') && (s.status === 'warning' || s.status === 'warn')) || resP.signals?.dependency_changes_detected === true)
    )

    // -------------------------------------------------------------
    // Test Q: Large Patch Scope (>5 files) -> BLOCKED
    // -------------------------------------------------------------
    console.log('\n▶ Test Q: Patch Scope > 5 Files MUST be Blocked')
    const resQ = await postRisk({
      incident: {
        id: 'inc-large-006',
        repository_name: 'acme/webapp',
        commit_sha: baseSha,
      },
      rootCauseStatus: 'verified',
      requiresHumanReview: false,
      repairPlan: {
        root_cause_status: 'verified',
        requires_human_review: false,
        files_to_modify: ['f1.ts', 'f2.ts', 'f3.ts', 'f4.ts', 'f5.ts', 'f6.ts'],
        files_not_to_modify: [],
      },
      headSha: baseSha,
    })

    assert(
      'Patch scope > 5 files is BLOCKED',
      resQ.decision === 'BLOCKED' && resQ.blocking_reasons.some(r => r.includes('exceeds') || r.includes('boundary') || r.includes('max'))
    )

    // -------------------------------------------------------------
    // Test R & S: Test Failure & Verification Failure -> BLOCKED
    // -------------------------------------------------------------
    console.log('\n▶ Test R & S: Test failure or Verification Failure MUST be Blocked')
    const resR = await postRisk({
      incident: {
        id: 'inc-test-fail-007',
        repository_name: 'acme/webapp',
        commit_sha: baseSha,
      },
      rootCauseStatus: 'verified',
      requiresHumanReview: false,
      repairPlan: {
        root_cause_status: 'verified',
        requires_human_review: false,
        files_to_modify: ['src/index.ts'],
      },
      testData: {
        test_status: 'failed',
        failure_reason: 'Syntax error in patch',
      },
      headSha: baseSha,
    })

    assert(
      'Test execution failure is BLOCKED',
      resR.decision === 'BLOCKED' && resR.blocking_reasons.some(r => r.toLowerCase().includes('test'))
    )

    // -------------------------------------------------------------
    // Test T: SHA Mismatch -> BLOCKED
    // -------------------------------------------------------------
    console.log('\n▶ Test T: SHA Mismatch MUST be Blocked')
    const resT = await postRisk({
      incident: {
        id: 'inc-sha-mismatch-008',
        repository_name: 'acme/webapp',
        commit_sha: '1111111111111111111111111111111111111111',
      },
      rootCauseStatus: 'verified',
      requiresHumanReview: false,
      repairPlan: {
        root_cause_status: 'verified',
        requires_human_review: false,
        files_to_modify: ['src/index.ts'],
      },
      headSha: '2222222222222222222222222222222222222222',
    })

    assert(
      'SHA mismatch is BLOCKED',
      resT.decision === 'BLOCKED' && resT.blocking_reasons.some(r => r.toLowerCase().includes('sha'))
    )

  } catch (err) {
    console.error('Fatal Step 10 Test Exception:', err)
    failed++
  }

  console.log('\n======================================================================')
  console.log(` STEP 10 TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`)
  console.log('======================================================================\n')

  if (failed > 0) process.exit(1)
  else process.exit(0)
}

runStep10Tests()
