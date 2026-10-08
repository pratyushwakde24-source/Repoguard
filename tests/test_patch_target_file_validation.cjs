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

async function runTargetFileValidationTests() {
  console.log('======================================================================')
  console.log(' STEP 5 / RISK GATE: PATCH TARGET FILE VALIDATION SUITE')
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

  const baseSha = '6f69df453ce7b65977ff21f3d90c0b6dd67f40f6'
  const repo = 'pratyushwakde24-source/snowrush-ai'

  const validViteConfig = `import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Snowrush AI',
        short_name: 'Snowrush'
      }
    })
  ]
})`

  try {
    // -----------------------------------------------------------------------
    // Case A: Real file exists at approved SHA
    // -----------------------------------------------------------------------
    console.log('▶ Case A: Real file exists at approved SHA -> PASS')
    const resA = await request('/api/test/step5-gates', { method: 'POST' }, {
      repository: repo,
      commitSha: baseSha,
      rootCauseStatus: 'verified',
      requiresHumanReview: false,
      repairPlan: {
        root_cause: 'VitePWA missing icons in vite.config.ts',
        repair_strategy: 'Remove missing icons array in vite.config.ts',
        files_to_modify: ['vite.config.ts'],
        files_not_to_modify: ['package.json'],
        test_commands: ['npm run build'],
      },
      inspectedFiles: {
        'vite.config.ts': validViteConfig,
      },
    })
    assert('HTTP 200 on Case A', resA.status === 200, `Got ${resA.status}`)
    assert('Case A generates verified patch cleanly', resA.data.patch_status === 'generated', `Got: ${resA.data.patch_status}`)
    assert('Case A files_changed contains vite.config.ts', resA.data.files_changed && resA.data.files_changed.includes('vite.config.ts'))

    // -----------------------------------------------------------------------
    // Case B: File does not exist at approved SHA
    // -----------------------------------------------------------------------
    console.log('\n▶ Case B: Target file does not exist at approved SHA -> FAIL CLOSED')
    const resB = await request('/api/test/step5-gates', { method: 'POST' }, {
      repository: repo,
      commitSha: baseSha,
      rootCauseStatus: 'verified',
      requiresHumanReview: false,
      repairPlan: {
        root_cause: 'Unknown file error',
        repair_strategy: 'Attempt to modify non-existent file',
        files_to_modify: ['non_existent_file.ts'],
        files_not_to_modify: ['package.json'],
        test_commands: ['npm run build'],
      },
      inspectedFiles: {
        'vite.config.ts': validViteConfig,
      },
    })
    assert('HTTP 200 on Case B rejection payload', resB.status === 200)
    assert('Case B fails closed and requires review', resB.data.patch_status === 'requires_human_review', `Got: ${resB.data.patch_status}`)
    assert('Case B rejection reason indicates target file check failed', resB.data.rejection_reason && resB.data.rejection_reason.includes('Target Files Exist at Base SHA'), resB.data.rejection_reason)

    // -----------------------------------------------------------------------
    // Case C: Same file exists with relative prefix ./
    // -----------------------------------------------------------------------
    console.log('\n▶ Case C: Relative prefix ./ normalized correctly -> PASS')
    const resC = await request('/api/test/step5-gates', { method: 'POST' }, {
      repository: repo,
      commitSha: baseSha,
      rootCauseStatus: 'verified',
      requiresHumanReview: false,
      repairPlan: {
        root_cause: 'VitePWA missing icons',
        repair_strategy: 'Remove missing icons array in vite.config.ts',
        files_to_modify: ['./vite.config.ts'],
        files_not_to_modify: ['package.json'],
        test_commands: ['npm run build'],
      },
      inspectedFiles: {
        'vite.config.ts': validViteConfig,
      },
    })
    assert('Case C generates verified patch with ./ prefix normalized', resC.data.patch_status === 'generated', `Got: ${resC.data.patch_status}`)

    // -----------------------------------------------------------------------
    // Case D: Windows backslash path
    // -----------------------------------------------------------------------
    console.log('\n▶ Case D: Windows backslash path normalized correctly -> PASS')
    const resD = await request('/api/test/step5-gates', { method: 'POST' }, {
      repository: repo,
      commitSha: baseSha,
      rootCauseStatus: 'verified',
      requiresHumanReview: false,
      repairPlan: {
        root_cause: 'VitePWA missing icons',
        repair_strategy: 'Remove missing icons array in vite.config.ts',
        files_to_modify: ['src\\services\\checkout.ts'],
        files_not_to_modify: ['package.json'],
        test_commands: ['npm run build'],
      },
      inspectedFiles: {
        'src/services/checkout.ts': 'export const checkout = () => {}',
      },
    })
    assert('Case D generates patch with backslash normalization', resD.data.patch_status === 'generated', `Got: ${resD.data.patch_status}`)

    // -----------------------------------------------------------------------
    // Case E: Sensitive file blocked
    // -----------------------------------------------------------------------
    console.log('\n▶ Case E: Sensitive file modification blocked -> SENSITIVE_FILE_BLOCKED')
    const resE = await request('/api/test/step5-gates', { method: 'POST' }, {
      repository: repo,
      commitSha: baseSha,
      rootCauseStatus: 'verified',
      requiresHumanReview: false,
      repairPlan: {
        root_cause: 'Database credentials update',
        repair_strategy: 'Modify production env file',
        files_to_modify: ['.env.production'],
        files_not_to_modify: [],
        test_commands: ['npm run build'],
      },
      inspectedFiles: {
        '.env.production': 'DATABASE_URL=postgres://...',
      },
    })
    assert('Case E blocks sensitive file patch', resE.data.patch_status === 'requires_human_review', `Got: ${resE.data.patch_status}`)
    assert('Case E rejection cites Protected Sensitive Files Blocked', resE.data.rejection_reason && resE.data.rejection_reason.includes('Protected Sensitive Files Blocked'))

    console.log('\n======================================================================')
    console.log(` TARGET FILE VALIDATION RESULTS: ${passed} PASSED, ${failed} FAILED`)
    console.log('======================================================================')

    if (failed > 0) process.exit(1)
  } catch (err) {
    console.error('Fatal test exception:', err)
    process.exit(1)
  }
}

runTargetFileValidationTests()
