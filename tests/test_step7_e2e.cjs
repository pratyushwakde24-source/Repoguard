const http = require('http')

const SERVER_URL = 'http://localhost:3001/api/test/step7-verification'

async function postVerification(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload)
    const req = http.request(
      'http://localhost:3001/api/test/step7-verification',
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

function getValidFixture() {
  const headSha = 'e9f2a4b5c6d7e8f90123456789abcdef01234567'
  const repoName = 'pratyush/snowrush-ai'
  const runId = '123456789'

  return {
    repositoryName: repoName,
    workflowRunId: runId,
    headSha: headSha,
    incident: {
      id: 'inc-test-step7',
      repository_name: repoName,
      workflow_run_id: runId,
      commit_sha: headSha,
      error_message: 'pwa-192x192.png not found in public folder',
      repair_plan_data: {
        root_cause_status: 'verified',
        requires_human_review: false,
        files_to_modify: ['vite.config.ts'],
        files_not_to_modify: ['src/App.tsx'],
        confidence: 0.95,
      },
      patch_data: {
        patch_status: 'generated',
        base_sha: headSha,
        files: [{ path: 'vite.config.ts' }],
        patch_diff: '--- a/vite.config.ts\n+++ b/vite.config.ts\n@@ -1,3 +1,5 @@\n+// Fix icons\n+export default {}\n',
      },
      test_data: {
        test_status: 'passed',
        comparison_result: 'ORIGINAL FAILURE CLEARED',
        base_sha: headSha,
        patch_application: { status: 'applied' },
        commands: [
          {
            command: 'npm run build',
            exit_code: 0,
            status: 'passed',
            stdout: 'vite v5.0.0 building for production...\n✓ built in 1.2s',
            stderr: '',
          },
        ],
        new_failures: [],
      },
    },
  }
}

async function runE2ETests() {
  console.log('==================================================')
  console.log('REPOGUARD STEP 7: E2E VERIFICATION GATE TEST SUITE')
  console.log('==================================================\n')

  let passedCount = 0
  let failedCount = 0

  async function assertCase(testName, fixtureModifier, expectedStatus, expectedFailedCheckName = null) {
    const fixture = getValidFixture()
    fixtureModifier(fixture)

    try {
      const res = await postVerification(fixture)
      const actualStatus = res.verification_status
      const matchesStatus = actualStatus === expectedStatus

      let checkOk = true
      if (expectedFailedCheckName) {
        const failedCheck = res.checks.find((c) => c.name === expectedFailedCheckName)
        if (!failedCheck || failedCheck.status !== 'failed') {
          checkOk = false
        }
      }

      if (matchesStatus && checkOk) {
        console.log(`✓ PASS: ${testName} → ${actualStatus}`)
        passedCount++
      } else {
        console.error(`✕ FAIL: ${testName}`)
        console.error(`  Expected status: ${expectedStatus}, Actual: ${actualStatus}`)
        if (expectedFailedCheckName) {
          console.error(`  Expected failed check: ${expectedFailedCheckName}`)
        }
        console.error(`  Blocking reasons:`, res.blocking_reasons)
        failedCount++
      }
    } catch (err) {
      console.error(`✕ ERROR in ${testName}: ${err.message}`)
      failedCount++
    }
  }

  // Test A: All valid evidence → VERIFIED
  await assertCase(
    'Test A: All valid evidence',
    (f) => {},
    'verified'
  )

  // Test B: Test failure → REQUIRES_HUMAN_REVIEW
  await assertCase(
    'Test B: Test failure',
    (f) => {
      f.incident.test_data.test_status = 'failed'
      f.incident.test_data.commands[0].exit_code = 1
      f.incident.test_data.commands[0].status = 'failed'
    },
    'requires_human_review',
    'TEST_EXECUTION'
  )

  // Test C: Original failure persists → REQUIRES_HUMAN_REVIEW
  await assertCase(
    'Test C: Original failure persists',
    (f) => {
      f.incident.test_data.comparison_result = 'ORIGINAL FAILURE PERSISTS'
    },
    'requires_human_review',
    'ORIGINAL_FAILURE_CLEARED'
  )

  // Test D: New failure introduced → REQUIRES_HUMAN_REVIEW
  await assertCase(
    'Test D: New failure introduced',
    (f) => {
      f.incident.test_data.new_failures = ['SyntaxError in src/index.ts']
    },
    'requires_human_review',
    'NO_NEW_FAILURES'
  )

  // Test E: Unauthorized file → REQUIRES_HUMAN_REVIEW
  await assertCase(
    'Test E: Unauthorized file',
    (f) => {
      f.incident.patch_data.files.push({ path: 'src/App.tsx' })
    },
    'requires_human_review',
    'AUTHORIZED_FILES'
  )

  // Test F: SHA mismatch → REQUIRES_HUMAN_REVIEW
  await assertCase(
    'Test F: SHA mismatch',
    (f) => {
      f.headSha = 'ffffffffffffffffffffffffffffffffffffffff'
    },
    'requires_human_review',
    'BASE_SHA'
  )

  // Test G: Root cause LIKELY → REQUIRES_HUMAN_REVIEW
  await assertCase(
    'Test G: Root cause LIKELY',
    (f) => {
      f.incident.repair_plan_data.root_cause_status = 'likely'
    },
    'requires_human_review',
    'ROOT_CAUSE_STATUS'
  )

  // Test H: Root cause UNCERTAIN → REQUIRES_HUMAN_REVIEW
  await assertCase(
    'Test H: Root cause UNCERTAIN',
    (f) => {
      f.incident.repair_plan_data.root_cause_status = 'uncertain'
    },
    'requires_human_review',
    'ROOT_CAUSE_STATUS'
  )

  // Test I: Missing evidence → REQUIRES_HUMAN_REVIEW
  await assertCase(
    'Test I: Missing evidence',
    (f) => {
      delete f.incident.test_data
    },
    'requires_human_review'
  )

  // Test J: Incident metadata mismatch → REQUIRES_HUMAN_REVIEW
  await assertCase(
    'Test J: Incident metadata mismatch',
    (f) => {
      f.workflowRunId = '999999999'
    },
    'requires_human_review',
    'INCIDENT_CONSISTENCY'
  )

  // Test K: Patch diff is empty → REQUIRES_HUMAN_REVIEW
  await assertCase(
    'Test K: Patch diff is empty',
    (f) => {
      f.incident.patch_data.patch_diff = ''
    },
    'requires_human_review',
    'PATCH_NON_EMPTY'
  )

  // Test L: All checks pass → VERIFIED
  await assertCase(
    'Test L: All checks pass',
    (f) => {},
    'verified'
  )

  console.log('\n--------------------------------------------------')
  console.log(`SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`)
  console.log('--------------------------------------------------')

  if (failedCount > 0) {
    process.exit(1)
  }
}

runE2ETests().catch((err) => {
  console.error('Fatal E2E test suite error:', err)
  process.exit(1)
})
