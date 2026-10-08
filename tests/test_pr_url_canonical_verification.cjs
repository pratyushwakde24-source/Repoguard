const http = require('http')
const assert = require('assert')
const fs = require('fs')
const path = require('path')

const SERVER_BASE = 'http://localhost:3001'

async function postJson(endpoint, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload)
    const req = http.request(
      `${SERVER_BASE}${endpoint}`,
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
            resolve({ rawBody: body, statusCode: res.statusCode })
          }
        })
      }
    )
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

async function getJson(endpoint) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      `${SERVER_BASE}${endpoint}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      },
      (res) => {
        let body = ''
        res.on('data', (chunk) => (body += chunk))
        res.on('end', () => {
          try {
            resolve(JSON.parse(body))
          } catch (e) {
            resolve({ rawBody: body, statusCode: res.statusCode })
          }
        })
      }
    )
    req.on('error', reject)
    req.end()
  })
}

function getValidVerifiedFixture(repoName = 'pratyushwakde24-source/snowrush-ai') {
  const headSha = 'e9f2a4b5c6d7e8f90123456789abcdef01234567'
  const runId = '123456789'

  return {
    repositoryName: repoName,
    workflowRunId: runId,
    headSha: headSha,
    incident: {
      id: 'inc-test-pr-url',
      repository_name: repoName,
      workflow_run_id: runId,
      commit_sha: headSha,
      error_message: 'CI build failure',
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
            stdout: '✓ built',
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
        summary: 'All checks verified.',
        created_at: new Date().toISOString(),
      },
    },
    mockGitHubClient: {
      pr_number: 42,
      pr_url: `https://github.com/${repoName}/pull/42`,
    },
  }
}

async function runCanonicalPrTests() {
  console.log('===============================================================')
  console.log('REPOGUARD: CANONICAL GITHUB PR URL & PERSISTENCE TEST SUITE')
  console.log('===============================================================\n')

  let passed = 0
  let failed = 0

  function check(name, condition, errorMsg = '') {
    if (condition) {
      console.log(`✓ PASS: ${name}`)
      passed++
    } else {
      console.error(`✕ FAIL: ${name}`)
      if (errorMsg) console.error(`  Details: ${errorMsg}`)
      failed++
    }
  }

  // 1. Test Real PR URL Returned & Persisted
  try {
    const fixture = getValidVerifiedFixture('pratyushwakde24-source/snowrush-ai')
    fixture.mockGitHubClient = {
      pr_number: 42,
      pr_url: 'https://github.com/pratyushwakde24-source/snowrush-ai/pull/42',
    }
    const res = await postJson('/api/test/step8-delivery', fixture)
    check(
      'Real PR URL returned directly from GitHub API response',
      res.status === 'pr_created' &&
      res.pr_number === 42 &&
      res.pr_url === 'https://github.com/pratyushwakde24-source/snowrush-ai/pull/42',
      `Got status: ${res.status}, pr_url: ${res.pr_url}`
    )
  } catch (e) {
    check('Real PR URL test', false, e.message)
  }

  // 2. Test No Fabricated URL on unauthenticated/uninstalled synthetic repo
  try {
    const fixture = getValidVerifiedFixture('acme/payment-service')
    // No mock client, unauthenticated fake repo
    delete fixture.mockGitHubClient
    const res = await postJson('/api/test/step8-delivery', fixture)
    check(
      'No fabricated PR URL produced for fake acme/payment-service repository',
      res.status !== 'pr_created' && (!res.pr_url || res.status === 'failed'),
      `Got status: ${res.status}, pr_url: ${res.pr_url}`
    )
  } catch (e) {
    check('No fabricated URL test', false, e.message)
  }

  // 3. Test Invariant: Invalid URL hostname rejected
  try {
    const fixture = getValidVerifiedFixture('pratyushwakde24-source/snowrush-ai')
    fixture.mockGitHubClient = {
      pr_number: 99,
      pr_url: 'https://evil-attacker.com/pratyushwakde24-source/snowrush-ai/pull/99',
    }
    const res = await postJson('/api/test/step8-delivery', fixture)
    check(
      'Invalid URL hostname rejected by PR verification gate',
      res.status === 'failed' && res.failure_reason === 'PR_VERIFICATION_FAILED' && !res.pr_url,
      `Got status: ${res.status}, failure_reason: ${res.failure_reason}`
    )
  } catch (e) {
    check('Invalid URL hostname test', false, e.message)
  }

  // 4. Test Invariant: Repository mismatch rejected
  try {
    const fixture = getValidVerifiedFixture('pratyushwakde24-source/snowrush-ai')
    fixture.mockGitHubClient = {
      pr_number: 99,
      pr_url: 'https://github.com/attacker/malicious-repo/pull/99',
    }
    const res = await postJson('/api/test/step8-delivery', fixture)
    check(
      'Repository mismatch rejected by PR verification gate',
      res.status === 'failed' && res.failure_reason === 'PR_VERIFICATION_FAILED' && !res.pr_url,
      `Got status: ${res.status}, failure_reason: ${res.failure_reason}`
    )
  } catch (e) {
    check('Repository mismatch test', false, e.message)
  }

  // 5. Test Invariant: Non-pull path (e.g. issues/123) rejected
  try {
    const fixture = getValidVerifiedFixture('pratyushwakde24-source/snowrush-ai')
    fixture.mockGitHubClient = {
      pr_number: 99,
      pr_url: 'https://github.com/pratyushwakde24-source/snowrush-ai/issues/99',
    }
    const res = await postJson('/api/test/step8-delivery', fixture)
    check(
      'Non-pull path (issues/99) rejected by PR verification gate',
      res.status === 'failed' && res.failure_reason === 'PR_VERIFICATION_FAILED' && !res.pr_url,
      `Got status: ${res.status}, failure_reason: ${res.failure_reason}`
    )
  } catch (e) {
    check('Non-pull path test', false, e.message)
  }

  // 6. Test Invariant: XSS payload (javascript:alert(1)) rejected
  try {
    const fixture = getValidVerifiedFixture('pratyushwakde24-source/snowrush-ai')
    fixture.mockGitHubClient = {
      pr_number: 1,
      pr_url: 'javascript:alert(1)',
    }
    const res = await postJson('/api/test/step8-delivery', fixture)
    check(
      'XSS javascript: scheme rejected by PR verification gate',
      res.status === 'failed' && res.failure_reason === 'PR_VERIFICATION_FAILED' && !res.pr_url,
      `Got status: ${res.status}, failure_reason: ${res.failure_reason}`
    )
  } catch (e) {
    check('XSS payload test', false, e.message)
  }

  // 7. Test Incident API Persistence: Fetching incident returns exact delivery_data.pr_url
  try {
    const fixture = getValidVerifiedFixture('pratyushwakde24-source/snowrush-ai')
    fixture.incident.id = 'inc-persistent-canonical-pr'
    fixture.mockGitHubClient = {
      pr_number: 108,
      pr_url: 'https://github.com/pratyushwakde24-source/snowrush-ai/pull/108',
    }
    await postJson('/api/test/step8-delivery', fixture)
    const incRes = await getJson('/api/incidents/inc-persistent-canonical-pr')
    const inc = incRes.incident
    check(
      'Incident API persists and returns canonical delivery_data with pr_url and pr_number',
      Boolean(inc && inc.delivery_data && inc.delivery_data.pr_url === 'https://github.com/pratyushwakde24-source/snowrush-ai/pull/108' && inc.delivery_data.pr_number === 108),
      `Incident delivery_data: ${JSON.stringify(inc?.delivery_data)}`
    )
  } catch (e) {
    check('Incident API persistence test', false, e.message)
  }

  console.log('\n---------------------------------------------------------------')
  console.log(`CANONICAL PR URL SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('---------------------------------------------------------------')

  if (failed > 0) process.exit(1)
}

runCanonicalPrTests().catch((e) => {
  console.error('Fatal test error:', e)
  process.exit(1)
})
