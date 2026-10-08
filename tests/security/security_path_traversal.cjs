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

async function runPathTraversalSecuritySuite() {
  console.log('======================================================================')
  console.log(' SECURITY TEST: CANONICAL PATH TRAVERSAL & SENSITIVE PATH PROTECTION')
  console.log(' Threat Model: Malicious patch paths attempting to escape sandbox')
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
    // Test 1: Standard Relative Path Traversal (../../etc/passwd)
    // -------------------------------------------------------------
    console.log('▶ Test 1: Sandbox rejects standard relative traversal (../../etc/passwd)')
    const res1 = await request('/api/test/step6-execution', { method: 'POST' }, {
      incidentId: 'inc-traversal-1',
      repository: 'test/repo',
      commitSha: '6f69df4',
      rootCauseStatus: 'verified',
      requiresHumanReview: false,
      repairPlan: { files_to_modify: ['../../etc/passwd'], test_commands: ['npm test'] },
      patchData: {
        patch_status: 'generated',
        files_changed: ['../../etc/passwd'],
        files: [{ path: '../../etc/passwd', proposed_content: 'root:x:0:0:::' }],
      },
      inspectedFiles: {
        '../../etc/passwd': 'original content',
      },
    })
    assert('Test execution setup rejected path traversal', res1.data.test_status === 'setup_failed' || res1.data.test_status === 'failed', JSON.stringify(res1.data))
    assert('Rejection reason mentions PATH_TRAVERSAL or BASE_SHA_MISMATCH', res1.data.rejection_reason === 'PATH_TRAVERSAL_DETECTED' || res1.data.rejection_reason === 'BASE_SHA_MISMATCH', res1.data.rejection_reason)

    // -------------------------------------------------------------
    // Test 2: Windows Backslash Traversal (..\\..\\Windows\\win.ini)
    // -------------------------------------------------------------
    console.log('\n▶ Test 2: Sandbox rejects Windows backslash traversal (..\\..\\Windows\\win.ini)')
    const res2 = await request('/api/test/step6-execution', { method: 'POST' }, {
      incidentId: 'inc-traversal-2',
      repository: 'test/repo',
      commitSha: '6f69df4',
      rootCauseStatus: 'verified',
      requiresHumanReview: false,
      repairPlan: { files_to_modify: ['..\\..\\Windows\\win.ini'], test_commands: ['npm test'] },
      patchData: {
        patch_status: 'generated',
        files_changed: ['..\\..\\Windows\\win.ini'],
        files: [{ path: '..\\..\\Windows\\win.ini', proposed_content: '[windows]' }],
      },
      inspectedFiles: {
        '..\\..\\Windows\\win.ini': '[windows]',
      },
    })
    assert('Backslash traversal rejected safely', res2.data.test_status === 'setup_failed' || res2.data.test_status === 'failed', JSON.stringify(res2.data))

    // -------------------------------------------------------------
    // Test 3: URL-Encoded Traversal (%2e%2e%2f%2e%2e%2fetc%2fshadow)
    // -------------------------------------------------------------
    console.log('\n▶ Test 3: Sandbox rejects URL-encoded path traversal (%2e%2e%2f)')
    const res3 = await request('/api/test/step6-execution', { method: 'POST' }, {
      incidentId: 'inc-traversal-3',
      repository: 'test/repo',
      commitSha: '6f69df4',
      rootCauseStatus: 'verified',
      requiresHumanReview: false,
      repairPlan: { files_to_modify: ['%2e%2e%2fetc%2fshadow'], test_commands: ['npm test'] },
      patchData: {
        patch_status: 'generated',
        files_changed: ['%2e%2e%2fetc%2fshadow'],
        files: [{ path: '%2e%2e%2fetc%2fshadow', proposed_content: 'root:x:' }],
      },
      inspectedFiles: {
        '%2e%2e%2fetc%2fshadow': 'root:x:',
      },
    })
    assert('URL-encoded traversal rejected', res3.data.test_status === 'setup_failed' || res3.data.test_status === 'failed', JSON.stringify(res3.data))

    // -------------------------------------------------------------
    // Test 4: Protected Sensitive File (.env) in Patch
    // -------------------------------------------------------------
    console.log('\n▶ Test 4: Attempt to modify sensitive environment file (.env.production)')
    const res4 = await request('/api/test/step6-execution', { method: 'POST' }, {
      incidentId: 'inc-traversal-4',
      repository: 'test/repo',
      commitSha: '6f69df4',
      rootCauseStatus: 'verified',
      requiresHumanReview: false,
      repairPlan: { files_to_modify: ['.env.production'], test_commands: ['npm test'] },
      patchData: {
        patch_status: 'generated',
        files_changed: ['.env.production'],
        files: [{ path: '.env.production', proposed_content: 'SECRET_KEY=hacked' }],
      },
      inspectedFiles: {
        '.env.production': 'SECRET_KEY=original',
      },
    })
    assert('Protected sensitive file modification rejected', res4.data.test_status === 'failed' || res4.data.test_status === 'setup_failed', JSON.stringify(res4.data))
    assert('Rejection reason identifies sensitive file or change refusal', res4.data.rejection_reason === 'SENSITIVE_FILE_PROTECTION' || res4.data.rejection_reason === 'UNAUTHORIZED_WORKSPACE_CHANGE', res4.data.rejection_reason)

    // -------------------------------------------------------------
    // Test 5: Protected Private Key (id_rsa / server.key)
    // -------------------------------------------------------------
    console.log('\n▶ Test 5: Attempt to modify private SSH key (id_rsa)')
    const res5 = await request('/api/test/step6-execution', { method: 'POST' }, {
      incidentId: 'inc-traversal-5',
      repository: 'test/repo',
      commitSha: '6f69df4',
      rootCauseStatus: 'verified',
      requiresHumanReview: false,
      repairPlan: { files_to_modify: ['id_rsa'], test_commands: ['npm test'] },
      patchData: {
        patch_status: 'generated',
        files_changed: ['id_rsa'],
        files: [{ path: 'id_rsa', proposed_content: 'ssh-rsa key' }],
      },
      inspectedFiles: {
        'id_rsa': 'ssh-rsa key',
      },
    })
    assert('Private key modification rejected', res5.data.test_status === 'failed' || res5.data.test_status === 'setup_failed', JSON.stringify(res5.data))

    console.log('\n======================================================================')
    console.log(` PATH TRAVERSAL SUITE: ${passed} PASSED, ${failed} FAILED`)
    console.log('======================================================================')

    if (failed > 0) process.exit(1)
  } catch (err) {
    console.error('Fatal test error:', err)
    process.exit(1)
  }
}

runPathTraversalSecuritySuite()
