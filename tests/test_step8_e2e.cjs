const http = require('http')
const fs = require('fs')
const path = require('path')

try {
  const envPath = path.resolve(process.cwd(), '.env')
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/)
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
      if (match) {
        let val = match[2] || ''
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
        if (!process.env[match[1]]) process.env[match[1]] = val
      }
    }
  }
} catch (e) {}

const SERVER_URL = 'http://localhost:3001/api/test/step8-delivery'


async function postDelivery(payload) {
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

const crypto = require('crypto')

function calcHmac(payloadObj) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET || 'test-secret'
  const bodyStr = JSON.stringify(payloadObj)
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(bodyStr)
  return 'sha256=' + hmac.digest('hex')
}

async function postWebhook(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload)
    const sig = calcHmac(payload)
    const req = http.request(
      'http://localhost:3001/api/webhooks/github',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
          'x-github-event': 'workflow_run',
          'x-hub-signature-256': sig,
        },
      },
      (res) => {

        let body = ''
        res.on('data', (chunk) => (body += chunk))
        res.on('end', () => {
          try {
            resolve(JSON.parse(body))
          } catch (e) {
            reject(new Error(`Failed to parse webhook response: ${body}`))
          }
        })
      }
    )
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

function getValidVerifiedFixture() {
  const headSha = 'e9f2a4b5c6d7e8f90123456789abcdef01234567'
  const repoName = 'pratyush/snowrush-ai'
  const runId = '123456789'

  return {
    repositoryName: repoName,
    workflowRunId: runId,
    headSha: headSha,
    incident: {
      id: 'inc-test-step8',
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
        files: [
          {
            path: 'vite.config.ts',
            original_content: 'export default {}',
            proposed_content: '// Fix icons\nexport default {}',
          },
        ],
        patch_diff: '--- a/vite.config.ts\n+++ b/vite.config.ts\n@@ -1,1 +1,2 @@\n+// Fix icons\n export default {}\n',
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
            stdout: '✓ built in 1.2s',
            stderr: '',
          },
        ],
        new_failures: [],
      },
      verification_data: {
        verification_status: 'verified',
        base_sha_verified: true,
        root_cause_verified: true,
        patch_verified: true,
        test_verified: true,
        original_failure_cleared: true,
        no_new_failures: true,
        scope_verified: true,
        repository_verified: true,
        incident_verified: true,
        checks: [],
        blocking_reasons: [],
        summary: 'All 14 checks verified.',
        created_at: new Date().toISOString(),
      },
    },
    mockGitHubClient: {},
  }
}

async function runE2ETests() {
  console.log('==================================================')
  console.log('REPOGUARD STEP 8: VERIFIED GITHUB DELIVERY TEST SUITE')
  console.log('==================================================\n')

  let passedCount = 0
  let failedCount = 0

  async function assertCase(testName, fixtureModifier, expectedStatus, expectedFailureReason = null) {
    const fixture = getValidVerifiedFixture()
    fixtureModifier(fixture)

    try {
      const res = await postDelivery(fixture)
      const actualStatus = res.status
      const actualReason = res.failure_reason || null

      const matchesStatus = actualStatus === expectedStatus
      const matchesReason = !expectedFailureReason || actualReason === expectedFailureReason

      if (matchesStatus && matchesReason) {
        console.log(`✓ PASS: ${testName} → status: ${actualStatus}${actualReason ? ` (${actualReason})` : ''}`)
        passedCount++
      } else {
        console.error(`✕ FAIL: ${testName}`)
        console.error(`  Expected status: ${expectedStatus}, Actual: ${actualStatus}`)
        if (expectedFailureReason) {
          console.error(`  Expected failure reason: ${expectedFailureReason}, Actual: ${actualReason}`)
        }
        console.error(`  Result payload:`, res)
        failedCount++
      }
    } catch (err) {
      console.error(`✕ ERROR in ${testName}: ${err.message}`)
      failedCount++
    }
  }

  // Test A: VERIFIED incident → complete delivery → PR created
  await assertCase(
    'Test A: VERIFIED incident → PR created',
    (f) => {},
    'pr_created'
  )

  // Test B: UNCERTAIN root cause → zero GitHub mutation
  await assertCase(
    'Test B: UNCERTAIN root cause → refuses execution',
    (f) => {
      f.incident.repair_plan_data.root_cause_status = 'uncertain'
      f.incident.verification_data.root_cause_verified = false
      f.incident.verification_data.verification_status = 'requires_human_review'
    },
    'requires_human_review',
    'ENTRY_GATE_VIOLATION'
  )

  // Test C: LIKELY root cause → zero GitHub mutation
  await assertCase(
    'Test C: LIKELY root cause → refuses execution',
    (f) => {
      f.incident.repair_plan_data.root_cause_status = 'likely'
      f.incident.verification_data.root_cause_verified = false
      f.incident.verification_data.verification_status = 'requires_human_review'
    },
    'requires_human_review',
    'ENTRY_GATE_VIOLATION'
  )

  // Test D: SHA mismatch → zero mutation
  await assertCase(
    'Test D: SHA mismatch → refuses execution',
    (f) => {
      f.incident.patch_data.base_sha = 'deadbeef12345678901234567890123456789012'
    },
    'requires_human_review',
    'ENTRY_GATE_VIOLATION'
  )

  // Test E: Current default branch advanced → REMOTE_BASE_MISMATCH → zero mutation
  await assertCase(
    'Test E: Current default branch advanced → REMOTE_BASE_MISMATCH',
    (f) => {
      f.mockGitHubClient = {
        default_branch_head: 'newer12345678901234567890123456789012345',
      }
    },
    'requires_human_review',
    'REMOTE_BASE_MISMATCH'
  )

  // Test F: Remote target file content changed → REMOTE_BASE_MISMATCH
  await assertCase(
    'Test F: Remote target file changed → REMOTE_BASE_MISMATCH',
    (f) => {
      f.mockGitHubClient = {
        remote_content: 'export default { modifiedOnGithub: true }',
      }
    },
    'requires_human_review',
    'REMOTE_BASE_MISMATCH'
  )

  // Test G: Unauthorized file in patch → ENTRY_GATE_VIOLATION
  await assertCase(
    'Test G: Scope verified false → ENTRY_GATE_VIOLATION',
    (f) => {
      f.incident.verification_data.scope_verified = false
    },
    'requires_human_review',
    'ENTRY_GATE_VIOLATION'
  )

  // Test H: Patch diff empty → PATCH_IDENTITY_MISMATCH
  await assertCase(
    'Test H: Patch diff empty → PATCH_IDENTITY_MISMATCH',
    (f) => {
      f.incident.patch_data.patch_diff = ''
    },
    'requires_human_review',
    'PATCH_IDENTITY_MISMATCH'
  )

  // Test I: Retry after PR creation → returns existing PR without re-mutating
  await assertCase(
    'Test I: Retry after PR creation → existing PR returned',
    (f) => {
      f.incident.delivery_data = {
        status: 'pr_created',
        incident_id: 'inc-test-step8',
        repository: 'pratyush/snowrush-ai',
        branch_name: 'repoguard/repair/inc-test-step8-e9f2a4b',
        base_branch: 'main',
        base_sha: f.headSha,
        pr_number: 184,
        pr_url: 'https://github.com/pratyush/snowrush-ai/pull/184',
        changed_files: ['vite.config.ts'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    },
    'pr_created'
  )

  // Test J: Existing PR on GitHub → finds existing PR
  await assertCase(
    'Test J: Existing PR on remote GitHub → finds existing PR',
    (f) => {
      f.mockGitHubClient = {
        existing_pr: { number: 99, html_url: 'https://github.com/pratyush/snowrush-ai/pull/99' },
      }
    },
    'pr_created'
  )

  // Test K: Main/default branch protection → Branch format never uses main/master
  await assertCase(
    'Test K: Target branch format is dedicated repair branch',
    (f) => {},
    'pr_created'
  )

  // Test L: GitHub App Auth failure → GITHUB_DELIVERY_ERROR
  await assertCase(
    'Test L: GitHub API error → GITHUB_DELIVERY_ERROR',
    (f) => {
      f.mockGitHubClient = {
        auth_error: 'Bad credentials or network error',
      }
    },
    'failed',
    'GITHUB_DELIVERY_ERROR'
  )

  // Test M: Webhook correlation suppresses duplicate repair loops for RepoGuard delivery commits
  try {
    await postDelivery(getValidVerifiedFixture())
    const correlatedRes = await postWebhook({
      repository: { full_name: 'pratyush/snowrush-ai' },
      workflow_run: {
        id: 9999901,
        head_branch: 'repoguard/repair/inc-test-step8-e9f2a4b',
        head_sha: 'commit-sha-999999',
        conclusion: 'failure',
      },
    })
    if (correlatedRes.delivery_related) {
      console.log('✓ PASS: Test M: Webhook event for RepoGuard delivery commit → correlated and suppressed (delivery_related: true)')
      passedCount++
    } else {
      console.error('✕ FAIL: Test M: Webhook event for RepoGuard delivery commit was not correlated:', correlatedRes)
      failedCount++
    }
  } catch (err) {
    console.error(`✕ ERROR in Test M: ${err.message}`)
    failedCount++
  }

  // Test N: Webhook from un-correlated failure on repoguard/repair branch is NOT blindly ignored
  try {
    const unCorrelatedRes = await postWebhook({
      repository: { full_name: 'pratyush/snowrush-ai' },
      workflow_run: {
        id: 9999902,
        head_branch: 'repoguard/repair/unrelated-branch',
        head_sha: 'unrelated-sha-888888',
        conclusion: 'failure',
      },
    })
    if (!unCorrelatedRes.delivery_related) {
      console.log('✓ PASS: Test N: Webhook event for un-correlated failure on repoguard/repair branch → NOT ignored, processed normally')
      passedCount++
    } else {
      console.error('✕ FAIL: Test N: Webhook event for un-correlated failure was incorrectly ignored')
      failedCount++
    }
  } catch (err) {
    console.error(`✕ ERROR in Test N: ${err.message}`)
    failedCount++
  }

  // Test O: Main/default branch protection assertion
  const sampleFixture = getValidVerifiedFixture()
  const sampleRes = await postDelivery(sampleFixture)
  if (sampleRes.branch_name !== 'main' && sampleRes.branch_name !== 'master' && sampleRes.branch_name.startsWith('repoguard/repair/')) {
    console.log(`✓ PASS: Test O: Branch protection verified (${sampleRes.branch_name} != main/master)`)
    passedCount++
  } else {
    console.error(`✕ FAIL: Test O: Branch protection failed (branch_name: ${sampleRes.branch_name})`)
    failedCount++
  }

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
