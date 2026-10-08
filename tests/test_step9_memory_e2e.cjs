const http = require('http')

const SERVER_URL = 'http://localhost:3001/api/test/step9-memory'

function postMemory(payload) {
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

async function runStep9Tests() {
  console.log('======================================================================')
  console.log(' STEP 9 E2E: REPOSITORY RELIABILITY MEMORY VERIFICATION SUITE')
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
    // Test A: Clean Baseline / No Historical Incidents
    // -------------------------------------------------------------
    console.log('▶ Test A: Query on brand new repository with zero historical memory')
    const resA = await postMemory({
      action: 'query',
      incident: {
        id: 'inc-new-repo-001',
        repository_name: 'acme-corp/never-seen-before-repo-12345',
        workflow_name: 'CI Workflow',
        error_type: 'UnknownSyntaxError',
        error_message: 'Unexpected token < at index 0',
        affected_files: ['src/unknown.ts'],
      }
    })

    assert(
      'Returns valid MemoryRetrievalResult structure',
      resA && Array.isArray(resA.matches) && typeof resA.relevance_level === 'string'
    )
    assert(
      'Clean baseline returns 0 matches for isolated repo',
      resA.matches.length === 0,
      `Matches length: ${resA.matches.length}`
    )
    assert(
      'Relevance level is NONE or LOW when no matches exist',
      resA.relevance_level === 'NONE' || resA.relevance_level === 'LOW',
      `Relevance: ${resA.relevance_level}`
    )

    // -------------------------------------------------------------
    // Test B & D: Record Verified Historical Repair Memory
    // -------------------------------------------------------------
    console.log('\n▶ Test B & D: Record verified historical repair in memory')
    const testRepo = 'pratyushwakde24-source/repoguard-test-suite-repo'
    const recordRes1 = await postMemory({
      action: 'record',
      memoryItem: {
        repository_name: testRepo,
        workflow_name: 'CI Pipeline',
        error_type: 'TypeScriptCompilationError',
        failure_signature: 'Cannot find name PWA_ICON_192 in vite.config.ts',
        commit_sha: 'a1b2c3d4e5f6',
        repair_branch: 'repoguard/repair/inc-1001-a1b2c3d',
        pull_request_number: 42,
        pull_request_url: 'https://github.com/pratyushwakde24-source/repoguard-test-suite-repo/pull/42',
        root_cause_status: 'verified',
        root_cause_summary: 'Missing PWA icon definition in Vite plugin config',
        evidence_summary: 'Icon definition absent in vite.config.ts manifest array',
        relevant_files: ['vite.config.ts'],
        changed_files: ['vite.config.ts'],
        patch_status: 'applied',
        test_status: 'passed',
        verification_status: 'verified',
        delivery_status: 'pr_created',
        repair_outcome: 'verified_repair',
        repair_success: true,
        human_review_required: false,
        risk_level: 'low',
        risk_score: 12,
      }
    })

    assert(
      'Record verified repair returns success',
      recordRes1 && recordRes1.success === true && recordRes1.memory && recordRes1.memory.id
    )

    // -------------------------------------------------------------
    // Test C: Record Second Historical Incident (Multiple matches)
    // -------------------------------------------------------------
    console.log('\n▶ Test C: Record second incident for same repo and check query')
    await postMemory({
      action: 'record',
      memoryItem: {
        repository_name: testRepo,
        workflow_name: 'CI Pipeline',
        error_type: 'TypeScriptCompilationError',
        failure_signature: 'Type error in api client index.ts',
        commit_sha: 'b2c3d4e5f6a1',
        repair_branch: 'repoguard/repair/inc-1002-b2c3d4e',
        pull_request_number: 43,
        pull_request_url: 'https://github.com/pratyushwakde24-source/repoguard-test-suite-repo/pull/43',
        root_cause_status: 'verified',
        root_cause_summary: 'Undefined response interface in src/api.ts',
        evidence_summary: 'Response property type mismatch',
        relevant_files: ['src/api.ts', 'src/index.ts'],
        changed_files: ['src/api.ts'],
        patch_status: 'applied',
        test_status: 'passed',
        verification_status: 'verified',
        delivery_status: 'pr_created',
        repair_outcome: 'verified_repair',
        repair_success: true,
        human_review_required: false,
        risk_level: 'low',
        risk_score: 15,
      }
    })

    const queryRes = await postMemory({
      action: 'query',
      incident: {
        id: 'inc-current-1045',
        repository_name: testRepo,
        workflow_name: 'CI Pipeline',
        error_type: 'TypeScriptCompilationError',
        error_message: 'Cannot find name PWA_ICON_192 in vite.config.ts:14',
        affected_files: ['vite.config.ts'],
      }
    })

    assert(
      'Multiple matching historical incidents retrieved',
      queryRes.matches.length >= 2,
      `Matches length: ${queryRes.matches.length}`
    )
    assert(
      'Memory relevance is evaluated as HIGH for exact match',
      queryRes.relevance_level === 'HIGH',
      `Relevance: ${queryRes.relevance_level}`
    )
    assert(
      'Exact file overlap and error match is ranked first',
      queryRes.matches[0].relevant_files && queryRes.matches[0].relevant_files.includes('vite.config.ts'),
      `First match files: ${JSON.stringify(queryRes.matches[0].relevant_files)}`
    )

    // -------------------------------------------------------------
    // Test E: Record Negative Memory (Human Review Required / Blocked)
    // -------------------------------------------------------------
    console.log('\n▶ Test E: Record negative memory for blocked unsafe repair')
    const negRecordRes = await postMemory({
      action: 'record',
      memoryItem: {
        repository_name: testRepo,
        workflow_name: 'Security Checks',
        error_type: 'AuthTokenLeakageRisk',
        failure_signature: 'Suspicious credential exposed in src/auth.ts',
        commit_sha: 'c3d4e5f6a1b2',
        repair_branch: 'main',
        root_cause_status: 'uncertain',
        root_cause_summary: 'Uncertain credential origin',
        evidence_summary: 'Blocked by Risk Gate: Sensitive auth file involved',
        relevant_files: ['src/auth.ts'],
        changed_files: ['src/auth.ts'],
        patch_status: 'blocked',
        test_status: 'skipped',
        verification_status: 'skipped',
        delivery_status: 'skipped',
        repair_outcome: 'human_review_required',
        repair_success: false,
        human_review_required: true,
        risk_level: 'high',
        risk_score: 85,
      }
    })

    assert(
      'Negative memory successfully recorded with human_review_required',
      negRecordRes.success === true && negRecordRes.memory.repair_success === false && negRecordRes.memory.human_review_required === true
    )

    // -------------------------------------------------------------
    // Test F & G: Repository Isolation Guarantee (Zero Cross-Repo Leakage)
    // -------------------------------------------------------------
    console.log('\n▶ Test F & G: Verify strict repository isolation across tenants')
    const isolatedRepoQuery = await postMemory({
      action: 'query',
      incident: {
        id: 'inc-tenant-other',
        repository_name: 'another-isolated-org/different-project',
        workflow_name: 'CI Pipeline',
        error_type: 'TypeScriptCompilationError',
        error_message: 'Cannot find name PWA_ICON_192',
        affected_files: ['vite.config.ts'],
      }
    })

    assert(
      'Cross-repository isolation is 100% enforced (0 leaked items from other repo)',
      isolatedRepoQuery.matches.length === 0,
      `Isolated repo matches: ${isolatedRepoQuery.matches.length}`
    )

    // -------------------------------------------------------------
    // Test H: No Chain-of-Thought in Memory Summaries
    // -------------------------------------------------------------
    console.log('\n▶ Test H: Verify no hidden chain-of-thought or raw internal prompts are stored')
    const allRepoMemories = await postMemory({
      action: 'by_repo',
      repositoryName: testRepo,
    })

    let hasCoT = false
    if (allRepoMemories && allRepoMemories.memories) {
      for (const m of allRepoMemories.memories) {
        const text = JSON.stringify(m)
        if (text.includes('thinking_process') || text.includes('chain_of_thought') || text.includes('<thought>')) {
          hasCoT = true
          break
        }
      }
    }
    assert(
      'Zero chain-of-thought leaked in memory storage (structured conclusions only)',
      !hasCoT
    )

  } catch (err) {
    console.error('Fatal Step 9 Test Exception:', err)
    failed++
  }

  console.log('\n======================================================================')
  console.log(` STEP 9 TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`)
  console.log('======================================================================\n')

  if (failed > 0) process.exit(1)
  else process.exit(0)
}

runStep9Tests()
