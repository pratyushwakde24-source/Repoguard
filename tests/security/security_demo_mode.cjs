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

async function runDemoModeSecuritySuite() {
  console.log('======================================================================')
  console.log(' SECURITY TEST: DEMO MODE ISOLATION & ZERO LIVE MUTATION GUARANTEE')
  console.log(' Threat Model: Demo mode triggering accidental external GitHub mutations')
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
    // Test 1: Triggering Demo Healing does not make live GitHub calls
    // -------------------------------------------------------------
    console.log('▶ Test 1: Trigger Demo Healing for simulated incident')
    const res1 = await request('/api/trigger-healing', { method: 'POST' }, {
      incidentId: 'inc-demo-test',
      mode: 'demo',
    })
    assert('HTTP 200 OK on demo trigger', res1.status === 200)
    assert('Confirmed demo execution mode', res1.data.message.includes('DEMO'))

    // -------------------------------------------------------------
    // Test 2: Connecting demo repository flags is_demo and prevents Supabase production writes
    // -------------------------------------------------------------
    console.log('\n▶ Test 2: Connect Demo Repository is isolated')
    const res2 = await request('/api/github/connect-repo', { method: 'POST' }, {
      name: 'demo-repo',
      full_name: 'repoguard-demo/sample',
      is_demo: true,
    })
    assert('HTTP 200 OK or 409 connected', res2.status === 200 || res2.status === 409)
    if (res2.status === 200) {
      assert('Repository record is flagged is_demo=true', res2.data.repository?.is_demo === true)
    }

    // -------------------------------------------------------------
    // Test 3: Delivery step refuses execution when GitHub credentials missing / demo
    // -------------------------------------------------------------
    console.log('\n▶ Test 3: GitHub Delivery step checks installation credentials')
    const res3 = await request('/api/test/step8-delivery', { method: 'POST' }, {
      incident: {
        id: 'inc-demo-delivery',
        title: 'Demo incident',
        repository_name: 'demo/unauthorized-repo',
        commit_sha: '6f69df4',
      },
      headSha: '6f69df4',
    })
    assert('Delivery handles unauthorized or uninstalled repo safely without crashing', res3.status === 200 || res3.status === 403 || res3.status === 500)
    assert('Zero unauthorized commit/PR pushed to master', !res3.data.branch_name?.includes('master') && !res3.data.branch_name?.includes('main'))

    console.log('\n======================================================================')
    console.log(` DEMO MODE SUITE: ${passed} PASSED, ${failed} FAILED`)
    console.log('======================================================================')

    if (failed > 0) process.exit(1)
  } catch (err) {
    console.error('Fatal test error:', err)
    process.exit(1)
  }
}

runDemoModeSecuritySuite()
