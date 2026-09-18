import express from 'express'
import cors from 'cors'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import {
  getSafeNebiusStatus,
  testNebiusConnectivity,
  fetchNebiusModelCatalog,
  NebiusAIProvider,
} from './nebius.js'
import { executeIsolatedPatchTest } from './testService.js'
import { executeDeterministicVerification } from './verificationService.js'
import { executeGitHubDelivery } from './deliveryService.js'


// Load .env file natively into process.env with multiline and escaped newline support
try {
  const envPath = path.resolve(process.cwd(), '.env')
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8')
    const lines = content.split(/\r?\n/)
    let currentKey: string | null = null
    let currentValue: string[] = []
    let inQuotes = false
    let quoteChar = ''

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!inQuotes) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eqIdx = line.indexOf('=')
        if (eqIdx > 0) {
          const key = line.slice(0, eqIdx).trim()
          let val = line.slice(eqIdx + 1).trim()
          if ((val.startsWith('"') || val.startsWith("'")) && !((val.endsWith('"') || val.endsWith("'")) && val.length > 1)) {
            inQuotes = true
            quoteChar = val[0]
            currentKey = key
            currentValue = [val.slice(1)]
          } else {
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1)
            }
            process.env[key] = val
          }
        }
      } else {
        if (line.trim().endsWith(quoteChar)) {
          currentValue.push(line.trim().slice(0, -1))
          if (currentKey) process.env[currentKey] = currentValue.join('\n')
          inQuotes = false
          currentKey = null
          currentValue = []
        } else {
          currentValue.push(line)
        }
      }
    }
    console.log(`[ENV LOAD] Successfully loaded environment from: ${envPath}`)
  } else {
    console.warn(`[ENV LOAD WARNING] Could not find .env file at: ${envPath}`)
  }
} catch (err: any) {
  console.warn('Native .env parsing error:', err.message)
}
import { 
  mockIncidents, 
  mockActiveRun, 
  mockSteps, 
  mockActivityEvents, 
  mockPullRequests, 
  mockSecurityAlerts,
} from '../src/data/mockData.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: true,
  credentials: true,
}))

// Raw body parser middleware for webhook HMAC verification
app.use(express.json({
  verify: (req: any, _res, buf) => {
    req.rawBody = buf
  },
}))

// Server-side Supabase client if env configured
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null

// Dynamic getters for GitHub App environment variables
const getGithubAppId = () => process.env.GITHUB_APP_ID || ''
const getGithubClientId = () => process.env.GITHUB_CLIENT_ID || ''
const getGithubClientSecret = () => process.env.GITHUB_CLIENT_SECRET || ''
const getGithubPrivateKey = () => {
  let key = process.env.GITHUB_PRIVATE_KEY || ''
  if (!key) return ''
  key = key.replace(/\\n/g, '\n').trim()
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim()
  }
  return key
}
const getGithubWebhookSecret = () => process.env.GITHUB_WEBHOOK_SECRET || ''

// Session data store (Session ID -> Session Data)
interface SessionData {
  id: string
  installation_id?: string
  oauth_state?: string
  user?: {
    login: string
    name: string
    avatar_url: string
    html_url: string
    id?: number
  }
  created_at: number
}

const sessions = new Map<string, SessionData>()

// Helper to parse HTTP cookie
function parseCookies(req: express.Request): Record<string, string> {
  const list: Record<string, string> = {}
  const rc = req.headers.cookie
  if (rc) {
    rc.split(';').forEach((cookie) => {
      const parts = cookie.split('=')
      if (parts.length >= 2) {
        list[parts[0].trim()] = decodeURIComponent(parts.slice(1).join('=').trim())
      }
    })
  }
  return list
}

// Get or create session from request
function getSession(req: express.Request, res?: express.Response): SessionData {
  const cookies = parseCookies(req)
  let sessionId = cookies['repoguard_session']

  if (sessionId && sessions.has(sessionId)) {
    return sessions.get(sessionId)!
  }

  sessionId = crypto.randomUUID()
  const newSession: SessionData = { id: sessionId, created_at: Date.now() }
  sessions.set(sessionId, newSession)

  if (res) {
    res.setHeader(
      'Set-Cookie',
      `repoguard_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
    )
  }

  return newSession
}

// In-memory state fallback
let incidents = [...mockIncidents]
let activeRun = { ...mockActiveRun }
let steps = [...mockSteps]
let events = [...mockActivityEvents]
let repositories: any[] = []
let pullRequests = [...mockPullRequests]
let securityAlerts = [...mockSecurityAlerts]

// Helper to encode Base64Url
function base64UrlEncode(data: string | Buffer): string {
  const buf = typeof data === 'string' ? Buffer.from(data) : data
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

// Generate RS256 JWT for GitHub App authentication
function generateAppJWT(): { jwt: string | null; error?: string } {
  const appId = getGithubAppId()
  const privateKey = getGithubPrivateKey()

  if (!appId) return { jwt: null, error: 'GITHUB_APP_ID is not configured in server environment.' }
  if (!privateKey) return { jwt: null, error: 'GITHUB_PRIVATE_KEY is not configured in server environment.' }
  try {
    const now = Math.floor(Date.now() / 1000)
    const header = { alg: 'RS256', typ: 'JWT' }
    const payload = {
      iat: now - 60,
      exp: now + 600,
      iss: appId,
    }

    const encodedHeader = base64UrlEncode(JSON.stringify(header))
    const encodedPayload = base64UrlEncode(JSON.stringify(payload))
    const signingInput = `${encodedHeader}.${encodedPayload}`

    const signer = crypto.createSign('RSA-SHA256')
    signer.update(signingInput)
    const signature = signer.sign(privateKey, 'base64url')

    return { jwt: `${signingInput}.${signature}` }
  } catch (err: any) {
    console.error('Failed to generate GitHub App JWT:', err.message)
    return { jwt: null, error: `JWT signing failed: ${err.message}` }
  }
}

// Fetch GitHub App Installation Access Token for given installationId
async function getInstallationAccessToken(installationId: string): Promise<{ token: string | null; error?: string }> {
  const { jwt, error: jwtError } = generateAppJWT()
  if (!jwt) return { token: null, error: jwtError || 'Failed to generate GitHub App JWT.' }

  try {
    const tokenRes = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'RepoGuard-Backend',
      },
    })

    if (!tokenRes.ok) {
      const errText = await tokenRes.text()
      console.error(`GitHub API installation token error (${tokenRes.status}):`, errText)
      return { token: null, error: `GitHub API installation token HTTP ${tokenRes.status}: ${errText}` }
    }

    const tokenData = await tokenRes.json()
    return { token: tokenData.token || null }
  } catch (err: any) {
    console.error('Error fetching installation token:', err.message)
    return { token: null, error: `Installation token exception: ${err.message}` }
  }
}

// Fetch active GitHub App installations
async function getAppInstallations(): Promise<{ installations: any[]; error?: string }> {
  const { jwt, error: jwtError } = generateAppJWT()
  if (!jwt) return { installations: [], error: jwtError }

  try {
    const res = await fetch('https://api.github.com/app/installations', {
      headers: {
        Authorization: `Bearer ${jwt}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'RepoGuard-Backend',
      },
    })

    if (res.ok) {
      const data = await res.json()
      return { installations: data || [] }
    } else {
      const errText = await res.text()
      console.warn(`Fetch app installations status: ${res.status}`)
      return { installations: [], error: `App installations HTTP ${res.status}: ${errText}` }
    }
  } catch (err: any) {
    console.error('Failed to fetch App installations:', err.message)
    return { installations: [], error: `Fetch App installations exception: ${err.message}` }
  }
}

// GET /api/health
app.get('/api/health', (req, res) => {
  const appId = getGithubAppId()
  const privKey = getGithubPrivateKey()
  const webhookSec = getGithubWebhookSecret()
  console.log('[API Health Check]', { appId: Boolean(appId), privKey: Boolean(privKey), webhookSec: Boolean(webhookSec) })
  res.json({
    status: 'ok',
    service: 'repoguard-backend',
    github_app_id: appId || null,
    github_configured: Boolean(appId && privKey),
    supabase_configured: Boolean(supabase),
    webhook_secret_configured: Boolean(webhookSec),
    timestamp: new Date().toISOString(),
  })
})

// GET /api/ai/status
app.get('/api/ai/status', (req, res) => {
  const aiStatus = getSafeNebiusStatus()
  res.json(aiStatus)
})

// POST /api/ai/test
app.post('/api/ai/test', async (req, res) => {
  const result = await testNebiusConnectivity()
  res.json(result)
})

// POST /api/test/step5-gates (Step 5 E2E Safety Gate Testing Endpoint)
app.post('/api/test/step5-gates', async (req, res) => {
  const nebius = new NebiusAIProvider()
  try {
    const result = await nebius.generateVerifiedPatch(req.body)
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/test/step6-execution (Step 6 E2E Isolated Patch Test Execution Endpoint)
app.post('/api/test/step6-execution', async (req, res) => {
  try {
    const result = await executeIsolatedPatchTest(req.body)
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/test/step7-verification (Step 7 E2E Deterministic Verification Endpoint)
app.post('/api/test/step7-verification', (req, res) => {
  try {
    const result = executeDeterministicVerification(req.body)
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/test/step8-delivery (Step 8 E2E Verified GitHub Delivery Endpoint)
app.post('/api/test/step8-delivery', async (req, res) => {
  try {
    const result = await executeGitHubDelivery(req.body)
    if (req.body.incident) {
      const inc = { ...req.body.incident, delivery_data: result }
      const idx = incidents.findIndex(i => i.id === inc.id)
      if (idx >= 0) incidents[idx] = inc
      else incidents.push(inc)
    }
    res.json(result)
  } catch (err: any) {
    res.status(500).json({ error: err.message })
  }
})




// GET /api/ai/models
app.get('/api/ai/models', async (req, res) => {
  const catalog = await fetchNebiusModelCatalog()
  res.json(catalog)
})

// GET /api/github/login
app.get('/api/github/login', (req, res) => {
  const session = getSession(req, res)
  const state = crypto.randomUUID()
  session.oauth_state = state

  // Direct redirect to GitHub App installation page with state tracking
  const appInstallUrl = `https://github.com/apps/RepoGuard-Pratyush/installations/new?state=${state}`
  console.log('[GitHub Login Initiated] Redirecting user to:', appInstallUrl)
  res.redirect(appInstallUrl)
})

// GET /api/github/callback
app.get('/api/github/callback', async (req, res) => {
  const session = getSession(req, res)
  const { code, state, installation_id, setup_action } = req.query as Record<string, string>

  // Safe server-side diagnostic logging (NEVER log private keys or secrets)
  console.log('[GitHub Callback Diagnostic]', {
    setup_action: setup_action || null,
    installation_id_present: Boolean(installation_id),
    installation_id: installation_id || null,
    code_present: Boolean(code),
    state_present: Boolean(state),
    session_id: session.id,
    timestamp: new Date().toISOString(),
  })

  // Store installation_id if present in callback
  if (installation_id) {
    session.installation_id = installation_id
  }

  // Optionally exchange code for user access token if code is provided
  const clientId = getGithubClientId()
  const clientSecret = getGithubClientSecret()
  if (code && clientId && clientSecret) {
    try {
      const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': 'RepoGuard-Backend',
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      })

      if (tokenRes.ok) {
        const tokenData = await tokenRes.json()
        if (tokenData.access_token) {
          const userRes = await fetch('https://api.github.com/user', {
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
              'User-Agent': 'RepoGuard-Backend',
              Accept: 'application/vnd.github.v3+json',
            },
          })

          if (userRes.ok) {
            const userData = await userRes.json()
            session.user = {
              login: userData.login,
              name: userData.name || userData.login,
              avatar_url: userData.avatar_url,
              html_url: userData.html_url,
              id: userData.id,
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Error exchanging OAuth code:', err.message)
    }
  }

  // Set HTTP-only session cookie
  res.setHeader(
    'Set-Cookie',
    `repoguard_session=${session.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
  )

  // Redirect browser back to frontend
  res.redirect('http://localhost:5173/repositories?github_connected=true')
})

// GET /api/github/status
app.get('/api/github/status', async (req, res) => {
  const session = getSession(req, res)

  if (!getGithubAppId() || !getGithubPrivateKey()) {
    return res.json({
      configured: false,
      authenticated: false,
      auth_type: 'app',
      installation_id: null,
      user: null,
      message: 'GitHub App ID or Private Key is not configured on the server (.env).',
    })
  }

  // Resolve installation_id
  let installationId = session.installation_id
  if (!installationId) {
    const { installations, error: instError } = await getAppInstallations()
    if (installations.length > 0) {
      installationId = String(installations[0].id)
      session.installation_id = installationId
    } else if (instError) {
      return res.json({
        configured: true,
        authenticated: false,
        auth_type: 'app',
        installation_id: null,
        user: session.user || null,
        error: instError,
        message: instError,
      })
    }
  }

  if (!installationId) {
    return res.json({
      configured: true,
      authenticated: false,
      auth_type: 'app',
      installation_id: null,
      user: session.user || null,
      error: 'GitHub App installation ID was not received.',
      message: 'GitHub App installation ID was not received. Please authorize the app.',
    })
  }

  // Test installation access token generation
  const { token, error: tokenError } = await getInstallationAccessToken(installationId)
  if (!token) {
    return res.json({
      configured: true,
      authenticated: false,
      auth_type: 'app',
      installation_id: installationId,
      user: session.user || null,
      error: tokenError || 'Failed to acquire installation access token.',
      message: tokenError || 'Failed to acquire installation access token.',
    })
  }

  res.json({
    configured: true,
    authenticated: true,
    auth_type: 'app',
    installation_id: installationId,
    user: session.user || null,
    webhook_configured: Boolean(getGithubWebhookSecret()),
  })
})

// GET /api/github/user
app.get('/api/github/user', async (req, res) => {
  const session = getSession(req, res)

  if (session.user) {
    return res.json({
      authenticated: true,
      user: session.user,
    })
  }

  res.json({
    authenticated: false,
    user: null,
  })
})

// GET /api/github/repos
app.get('/api/github/repos', async (req, res) => {
  const session = getSession(req, res)

  if (!getGithubAppId() || !getGithubPrivateKey()) {
    return res.status(400).json({
      configured: false,
      repos: [],
      error: 'GITHUB_APP_ID or GITHUB_PRIVATE_KEY missing on server.',
      message: 'GitHub App configuration missing on server (.env).',
    })
  }

  // Determine installation ID
  let installationId = session.installation_id
  if (!installationId) {
    const { installations } = await getAppInstallations()
    if (installations.length > 0) {
      installationId = String(installations[0].id)
      session.installation_id = installationId
    }
  }

  if (!installationId) {
    return res.status(400).json({
      configured: true,
      repos: [],
      error: 'GitHub App installation ID was not received.',
      message: 'GitHub App installation ID was not received. Please click "Install GitHub App & Authorize".',
    })
  }

  // Obtain installation access token
  const { token: instToken, error: tokenError } = await getInstallationAccessToken(installationId)
  if (!instToken) {
    return res.status(400).json({
      configured: true,
      repos: [],
      error: tokenError || 'Failed to generate GitHub App installation access token.',
      message: tokenError || 'Failed to generate GitHub App installation access token.',
    })
  }

  // Fetch connected repositories from Supabase and in-memory list to cross-reference
  let connectedFullNames = new Set<string>()
  let connectedIds = new Set<string>()

  repositories.forEach((r: any) => {
    if (r.full_name) connectedFullNames.add(r.full_name.toLowerCase())
    if (r.github_repository_id) connectedIds.add(String(r.github_repository_id))
  })

  if (supabase) {
    try {
      const { data } = await supabase.from('repositories').select('github_repository_id, full_name')
      if (data) {
        data.forEach((r: any) => {
          if (r.full_name) connectedFullNames.add(r.full_name.toLowerCase())
          if (r.github_repository_id) connectedIds.add(String(r.github_repository_id))
        })
      }
    } catch (err: any) {
      console.warn('Supabase fetch notice:', err.message)
    }
  }

  // Call GitHub API to list repositories accessible to the installation
  try {
    const ghRes = await fetch('https://api.github.com/installation/repositories?per_page=100', {
      headers: {
        Authorization: `Bearer ${instToken}`,
        'User-Agent': 'RepoGuard-Backend',
        Accept: 'application/vnd.github.v3+json',
      },
    })

    if (!ghRes.ok) {
      const errText = await ghRes.text()
      console.error(`GitHub installation repos API error (${ghRes.status}):`, errText)
      return res.status(ghRes.status).json({
        configured: true,
        repos: [],
        error: `GitHub API HTTP ${ghRes.status}: ${errText}`,
        message: `GitHub API error (${ghRes.status}): ${errText}`,
      })
    }

    const data = await ghRes.json()
    const ghRepos = data.repositories || []

    const repos = ghRepos.map((r: any) => ({
      id: r.id,
      github_repository_id: r.id,
      node_id: r.node_id,
      name: r.name,
      full_name: r.full_name,
      owner: {
        login: r.owner.login,
        avatar_url: r.owner.avatar_url,
      },
      private: r.private,
      html_url: r.html_url,
      description: r.description || '',
      default_branch: r.default_branch || 'main',
      language: r.language || 'TypeScript',
      stargazers_count: r.stargazers_count,
      updated_at: r.updated_at,
      is_connected: connectedFullNames.has(r.full_name.toLowerCase()) || connectedIds.has(String(r.id)),
    }))

    return res.json({ configured: true, repos })
  } catch (err: any) {
    console.error('Failed to fetch installation repos:', err.message)
    return res.status(500).json({
      configured: true,
      repos: [],
      error: err.message,
      message: `Failed to fetch GitHub installation repos: ${err.message}`,
    })
  }
})

// POST /api/github/connect-repo
app.post('/api/github/connect-repo', async (req, res) => {
  const {
    github_repository_id,
    full_name,
    owner,
    name,
    default_branch,
    language,
    visibility,
    html_url,
    ci_monitoring_enabled = true,
    security_monitoring_enabled = true,
    pr_monitoring_enabled = true,
    auto_fix_enabled = true,
    is_demo = false,
  } = req.body

  if (!full_name || !name) {
    return res.status(400).json({ error: 'Missing required repository details (full_name, name)' })
  }

  const repoIdNum = github_repository_id ? Number(github_repository_id) : undefined

  // Real mode duplicate check against Supabase
  if (!is_demo && supabase) {
    try {
      const { data: existingSupabase } = await supabase
        .from('repositories')
        .select('*')
        .or(`github_repository_id.eq.${repoIdNum || 0},full_name.ilike.${full_name}`)

      if (existingSupabase && existingSupabase.length > 0) {
        return res.status(409).json({
          error: 'ALREADY_CONNECTED',
          message: `Repository ${full_name} is already connected to RepoGuard.`,
          repository: existingSupabase[0],
        })
      }
    } catch (err: any) {
      console.warn('Supabase duplicate check notice:', err.message)
    }
  }

  // Duplicate check against in-memory list
  const isDuplicateInMemory = repositories.some((r) => {
    if (repoIdNum && r.github_repository_id === repoIdNum) return true
    return r.full_name.toLowerCase() === full_name.toLowerCase()
  })

  if (isDuplicateInMemory) {
    const existingRepo = repositories.find(
      (r) =>
        r.full_name.toLowerCase() === full_name.toLowerCase() ||
        (repoIdNum && r.github_repository_id === repoIdNum)
    )
    return res.status(409).json({
      error: 'ALREADY_CONNECTED',
      message: `Repository ${full_name} is already connected to RepoGuard.`,
      repository: existingRepo,
    })
  }

  // Webhook active status is true ONLY if webhook secret is configured
  const webhookConfigured = Boolean(getGithubWebhookSecret())

  // Construct repository record
  const repoId = `repo-${Date.now()}`
  const newRepo = {
    id: repoId,
    github_repository_id: repoIdNum || Math.floor(Math.random() * 90000000) + 10000000,
    name,
    full_name,
    owner: owner || full_name.split('/')[0] || 'owner',
    default_branch: default_branch || 'main',
    language: language || 'TypeScript',
    visibility: visibility || 'public',
    html_url: html_url || `https://github.com/${full_name}`,
    ci_provider: 'GitHub Actions',
    health_score: 100.0,
    last_ci_status: 'passing',
    total_runs: 0,
    success_rate: 100.0,
    monitoring_enabled: true,
    ci_monitoring_enabled,
    security_monitoring_enabled,
    pr_monitoring_enabled,
    auto_fix_enabled,
    webhook_active: webhookConfigured,
    connection_status: 'connected',
    is_demo: Boolean(is_demo),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // Persist to Supabase in Real Mode
  if (!is_demo && supabase) {
    try {
      const { data: inserted, error: sbError } = await supabase
        .from('repositories')
        .insert([newRepo])
        .select()

      if (sbError) {
        console.error('Supabase insert repository error:', sbError.message)
        return res.status(500).json({ error: `Supabase database insert failed: ${sbError.message}` })
      }

      if (inserted && inserted.length > 0) {
        repositories.unshift(inserted[0])
        return res.json({
          success: true,
          repository: inserted[0],
          webhook_configured: webhookConfigured,
        })
      }
    } catch (err: any) {
      console.error('Supabase connection exception:', err.message)
      return res.status(500).json({ error: `Database error: ${err.message}` })
    }
  }

  // In-memory fallback
  repositories.unshift(newRepo)

  res.json({
    success: true,
    repository: newRepo,
    webhook_configured: webhookConfigured,
  })
})

// Helper to fetch jobs listing for a workflow run
async function fetchWorkflowRunJobs(repoFullName: string, runId: string, instToken: string) {
  try {
    const res = await fetch(`https://api.github.com/repos/${repoFullName}/actions/runs/${runId}/jobs`, {
      headers: {
        Authorization: `Bearer ${instToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'RepoGuard-Backend',
      },
    })
    if (!res.ok) return { jobs: [] }
    const data = await res.json()
    return { jobs: data.jobs || [] }
  } catch (err: any) {
    console.error(`[GitHub Jobs API Error] ${err.message}`)
    return { jobs: [] }
  }
}

// Helper to fetch raw text logs for a specific job
async function fetchJobLogText(repoFullName: string, jobId: string, instToken: string): Promise<string> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repoFullName}/actions/jobs/${jobId}/logs`, {
      headers: {
        Authorization: `Bearer ${instToken}`,
        'User-Agent': 'RepoGuard-Backend',
      },
      redirect: 'follow',
    })
    if (!res.ok) return ''
    const text = await res.text()
    return text || ''
  } catch (err: any) {
    console.error(`[GitHub Log Text API Error] ${err.message}`)
    return ''
  }
}

// Helper to check if a file path should be excluded from inspection
function isIgnoredPath(filePath: string): boolean {
  const ignoredPrefixes = ['node_modules/', 'dist/', 'build/', 'coverage/', '.git/']
  const ignoredFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']
  const lower = filePath.toLowerCase()
  if (ignoredPrefixes.some(prefix => lower.startsWith(prefix) || lower.includes('/' + prefix))) return true
  if (ignoredFiles.some(file => lower.endsWith(file))) return true
  return false
}

// Helper to fetch repository tree at exact commit SHA via Git Trees API
async function fetchRepositoryTree(repoFullName: string, commitSha: string, instToken: string): Promise<{ tree: any[]; truncated: boolean }> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repoFullName}/git/trees/${commitSha}?recursive=1`, {
      headers: {
        Authorization: `Bearer ${instToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'RepoGuard-Backend',
      },
    })
    if (!res.ok) {
      console.warn(`[GitHub Tree API Notice] Status ${res.status} for SHA @${commitSha}`)
      return { tree: [], truncated: false }
    }
    const data = await res.json()
    return {
      tree: data.tree || [],
      truncated: Boolean(data.truncated),
    }
  } catch (err: any) {
    console.error(`[GitHub Tree API Error] ${err.message}`)
    return { tree: [], truncated: false }
  }
}

// Helper to fetch file content at exact commit SHA via Contents API
async function fetchFileContentAtSha(repoFullName: string, filePath: string, commitSha: string, instToken: string): Promise<string> {
  const maxFileBytes = Number(process.env.MAX_FILE_BYTES) || 100000
  try {
    const res = await fetch(`https://api.github.com/repos/${repoFullName}/contents/${filePath}?ref=${commitSha}`, {
      headers: {
        Authorization: `Bearer ${instToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'RepoGuard-Backend',
      },
    })
    if (!res.ok) return ''
    const data = await res.json()
    if (data.type === 'file' && data.content) {
      const decoded = Buffer.from(data.content, 'base64').toString('utf-8')
      return decoded.slice(0, maxFileBytes)
    }
    return ''
  } catch (err: any) {
    console.error(`[GitHub Content API Error] ${err.message}`)
    return ''
  }
}

// Background Worker for Async Ingested Workflow Failure & Step 2 Log Analysis
async function processIngestedWorkflowFailure(payload: any) {
  const repoFullName = payload.repository?.full_name
  const repoId = payload.repository?.id ? String(payload.repository.id) : undefined
  const workflowRunId = payload.workflow_run?.id ? String(payload.workflow_run.id) : undefined

  if (!repoFullName || !workflowRunId) return

  // 1. Resolve installation ID & token
  let installationId: string | undefined
  const { installations } = await getAppInstallations()
  if (installations.length > 0) {
    installationId = String(installations[0].id)
  }

  if (!installationId) {
    console.warn(`[Ingest Worker Warning] Could not resolve App Installation ID for ${repoFullName}`)
    return
  }

  const { token: instToken, error: tokenErr } = await getInstallationAccessToken(installationId)
  if (!instToken) {
    console.error(`[Ingest Worker Error] Token resolution failed for ${repoFullName}:`, tokenErr)
    return
  }

  // 2. Authoritative Verification via GitHub REST API
  let verifiedRun: any = null
  try {
    const ghRes = await fetch(`https://api.github.com/repos/${repoFullName}/actions/runs/${workflowRunId}`, {
      headers: {
        Authorization: `Bearer ${instToken}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'RepoGuard-Backend',
      },
    })

    if (ghRes.ok) {
      verifiedRun = await ghRes.json()
      console.log(`[GitHub API Verified] Workflow run #${workflowRunId} verified for ${repoFullName}`)
    } else {
      const errText = await ghRes.text()
      console.warn(`[GitHub API Notice] Status ${ghRes.status} for run #${workflowRunId}:`, errText.slice(0, 150))
    }
  } catch (err: any) {
    console.error('[GitHub API Exception]:', err.message)
  }

  // 3. Step 2: Fetch Failed Jobs & Job Text Logs from GitHub API
  const { jobs } = await fetchWorkflowRunJobs(repoFullName, workflowRunId, instToken)
  const failedJobs = jobs.filter((j: any) => j.conclusion === 'failure')
  const primaryJob = failedJobs[0] || jobs[0] || null

  let failedStepName = 'Run tests'
  if (primaryJob && Array.isArray(primaryJob.steps)) {
    const failedStep = primaryJob.steps.find((s: any) => s.conclusion === 'failure')
    if (failedStep) failedStepName = failedStep.name
  }

  let rawLogText = ''
  if (primaryJob?.id) {
    rawLogText = await fetchJobLogText(repoFullName, String(primaryJob.id), instToken)
    console.log(`[GitHub Log Retrieval] Fetched ${rawLogText.length} bytes of log text for job #${primaryJob.id}`)
  }

  // 4. Step 2: Nemotron Nano Failure Analysis (Server-side NebiusAIProvider)
  let logAnalysis: any = {
    error_type: 'CIWorkflowFailure',
    error_message: payload.workflow_run?.head_commit?.message || verifiedRun?.display_title || `Workflow run #${workflowRunId} failed`,
    failing_file: null,
    failing_line: null,
    failed_job_name: primaryJob?.name || 'Build',
    failed_step_name: failedStepName,
    suggested_inspected_files: ['src/index.ts'],
    evidence_excerpt: rawLogText ? rawLogText.slice(-300) : `Workflow #${workflowRunId} failed`,
  }

  const nebiusStatus = getSafeNebiusStatus()
  if (nebiusStatus.configured && rawLogText) {
    try {
      const nebius = new NebiusAIProvider()
      logAnalysis = await nebius.analyzeLogs(rawLogText, {
        job_name: primaryJob?.name,
        step_name: failedStepName,
      })
      console.log(`[Nemotron Nano Log Analysis] Analysis completed for step '${failedStepName}':`, logAnalysis.error_type, logAnalysis.error_message)
    } catch (aiErr: any) {
      console.warn('[Nemotron Nano Log Analysis Notice]:', aiErr.message)
    }
  }

  // 5. Construct Incident Object
  const incidentId = `inc-${workflowRunId}`
  const newIncident = {
    id: incidentId,
    repository_id: repoId || `repo-${repoFullName}`,
    repository_name: repoFullName,
    title: payload.workflow_run?.name ? `CI Failure in ${payload.workflow_run.name}` : `CI Failure in ${repoFullName}`,
    description: `GitHub Actions workflow run #${workflowRunId} failed on branch ${payload.workflow_run?.head_branch || 'main'}`,
    severity: 'critical' as const,
    status: 'healing' as const,
    error_type: logAnalysis.error_type || 'CIWorkflowFailure',
    error_message: logAnalysis.error_message || `Workflow run #${workflowRunId} failed`,
    commit_sha: (payload.workflow_run?.head_sha || verifiedRun?.head_sha || 'a1b2c3d').slice(0, 7),
    branch: payload.workflow_run?.head_branch || verifiedRun?.head_branch || 'main',
    workflow_name: payload.workflow_run?.name || verifiedRun?.name || 'CI Pipeline',
    build_number: payload.workflow_run?.run_number || verifiedRun?.run_number || Number(workflowRunId.slice(-4)),
    affected_files: logAnalysis.suggested_inspected_files || ['src/index.ts'],
    blast_radius: 1,
    workflow_run_id: workflowRunId,
    workflow_url: payload.workflow_run?.html_url || verifiedRun?.html_url || `https://github.com/${repoFullName}/actions/runs/${workflowRunId}`,
    github_verified: Boolean(verifiedRun),
    created_at: new Date().toISOString(),
  }

  // 6. Supabase Database Insertion with Idempotency Error Handling
  if (supabase) {
    try {
      const { error: sbErr } = await supabase.from('incidents').insert([newIncident])
      if (sbErr) {
        if (sbErr.code === '23505') {
          console.log(`[Supabase Idempotency] Incident for workflow_run #${workflowRunId} already exists in database.`)
          return
        }
        console.warn('Supabase incident insert warning:', sbErr.message)
      }
    } catch (e: any) {
      console.warn('Supabase incident exception:', e.message)
    }
  }

  // In-memory idempotency check & store
  const existingInMemory = incidents.find(i => i.workflow_run_id === workflowRunId || i.id === incidentId)
  if (!existingInMemory) {
    incidents.unshift(newIncident)
  }

  // 7. Create Agent Run & Transition DETECT -> INSPECT
  activeRun = {
    id: `run-${Date.now()}`,
    incident_id: incidentId,
    status: 'running',
    current_stage: 'INSPECT',
    current_model: 'Nebius Token Factory',
    confidence: 0.88,
    retry_count: 0,
    started_at: new Date().toISOString(),
    duration_ms: 0,
  }

  events.unshift({
    id: `evt-${Date.now()}-detect`,
    run_id: activeRun.id,
    incident_id: incidentId,
    stage: 'DETECT',
    event_type: 'log_analysis_completed',
    message: `[NEMOTRON NANO] Failure analysis completed for step '${logAnalysis.failed_step_name || failedStepName}': ${logAnalysis.error_type} - ${logAnalysis.error_message}`,
    severity: 'info',
    created_at: new Date().toISOString(),
  })

  // 8. Trigger Real Nebius Autonomous Repair Pipeline (INSPECT & beyond)
  processAutonomousRepairRun(incidentId, 'real')
}

// POST /api/webhooks/github
app.post('/api/webhooks/github', (req: any, res) => {
  const event = req.headers['x-github-event'] as string || 'workflow_run'
  const signature = req.headers['x-hub-signature-256'] as string

  const webhookSecret = getGithubWebhookSecret()

  // Validate HMAC signature if GITHUB_WEBHOOK_SECRET is configured
  if (webhookSecret) {
    if (!signature) {
      return res.status(401).json({ error: 'Missing X-Hub-Signature-256 header' })
    }

    try {
      const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body))
      const hmac = crypto.createHmac('sha256', webhookSecret)
      hmac.update(rawBody)
      const expectedSignature = 'sha256=' + hmac.digest('hex')

      const sigBuffer = Buffer.from(signature)
      const expBuffer = Buffer.from(expectedSignature)

      if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
        console.warn('Webhook signature verification failed.')
        return res.status(403).json({ error: 'Invalid webhook signature' })
      }
    } catch (err: any) {
      console.error('Webhook signature check error:', err.message)
      return res.status(500).json({ error: 'Signature verification error' })
    }
  }

  const payload = req.body || {}
  const workflowRun = payload.workflow_run

  // CHANGE 2: Webhook Loop Protection via Delivery Correlation
  const repoName = payload.repository?.full_name || ''
  const headBranch = workflowRun?.head_branch || payload.ref || ''
  const headSha = workflowRun?.head_sha || payload.after || ''

  let isCorrelatedDelivery = false
  for (const inc of incidents) {
    const d = inc.delivery_data
    if (d && d.repository === repoName) {
      if ((d.commit_sha && d.commit_sha === headSha) || (d.branch_name && headBranch.includes(d.branch_name))) {
        isCorrelatedDelivery = true
        break
      }
    }
  }

  if (isCorrelatedDelivery) {
    console.log(`[Webhook Loop Protection] Webhook event for commit @${headSha} on branch '${headBranch}' correlated with known RepoGuard delivery. Suppressing recursive repair loop.`)
    return res.json({
      received: true,
      delivery_related: true,
      ignored: true,
      message: `Webhook correlated with known RepoGuard delivery commit @${headSha}. Autonomous repair loop suppressed.`,
    })
  }

  // Filter for completed workflow_run failure events
  if (event === 'workflow_run') {
    const conclusion = workflowRun?.conclusion
    if (conclusion !== 'failure') {
      return res.json({
        received: true,
        ignored: true,
        reason: `workflow_run event ignored because conclusion is '${conclusion || 'in_progress'}', not 'failure'`,
      })
    }
  }


  const workflowRunId = workflowRun?.id ? String(workflowRun.id) : undefined
  if (workflowRunId) {
    // Database-first idempotency check
    const existing = incidents.find(i => i.workflow_run_id === workflowRunId || i.id === `inc-${workflowRunId}`)
    if (existing) {
      return res.json({
        received: true,
        duplicate: true,
        incidentId: existing.id,
        message: `Incident for workflow_run #${workflowRunId} already exists.`,
      })
    }
  }

  // Fast HTTP 202 response + async background processing
  processIngestedWorkflowFailure(payload)

  res.status(202).json({
    received: true,
    status: 'processing',
    event,
    signature_verified: Boolean(webhookSecret),
    workflow_run_id: workflowRunId || null,
  })
})

// GET /api/incidents
app.get('/api/incidents', (req, res) => {
  res.json({ incidents })
})

// GET /api/incidents/:id
app.get('/api/incidents/:id', (req, res) => {
  const incident = incidents.find(i => i.id === req.params.id)
  if (!incident) return res.status(404).json({ error: 'Incident not found' })
  res.json({ incident, activeRun, steps, events })
})

// GET /api/repositories
app.get('/api/repositories', async (req, res) => {
  if (supabase) {
    try {
      const { data, error: sbError } = await supabase.from('repositories').select('*').order('created_at', { ascending: false })
      if (!sbError && data && data.length > 0) {
        return res.json({ repositories: data })
      }
    } catch (err: any) {
      console.warn('Supabase fetch repositories error:', err.message)
    }
  }
  res.json({ repositories })
})

// GET /api/pull-requests
app.get('/api/pull-requests', (req, res) => {
  res.json({ pullRequests })
})

// GET /api/security
app.get('/api/security', (req, res) => {
  res.json({ securityAlerts })
})

// Real Autonomous Repair Worker Pipeline using NebiusAIProvider
async function processAutonomousRepairRun(incidentId: string, mode: 'real' | 'demo' = 'real') {
  const incident = incidents.find(i => i.id === incidentId)
  if (!incident) return

  incident.status = 'healing'

  if (mode === 'real') {
    const nebiusStatus = getSafeNebiusStatus()
    if (!nebiusStatus.configured) {
      activeRun = {
        id: `run-${Date.now()}`,
        incident_id: incidentId,
        status: 'failed',
        current_stage: 'DETECT',
        current_model: 'Nebius Token Factory',
        confidence: 0,
        retry_count: 0,
        started_at: new Date().toISOString(),
        duration_ms: 0,
        error_code: 'AI_PROVIDER_ERROR',
        error_message: 'REAL MODE requires NEBIUS_API_KEY configured in server environment (.env).',
      }
      events.unshift({
        id: `evt-${Date.now()}`,
        run_id: activeRun.id,
        incident_id: incidentId,
        stage: 'DETECT',
        event_type: 'AI_PROVIDER_ERROR',
        message: 'REAL MODE ERROR: NEBIUS_API_KEY is missing on server.',
        severity: 'error',
        created_at: new Date().toISOString(),
      })
      if (incident) incident.status = 'investigating'
      return
    }

    const nebius = new NebiusAIProvider()
    try {
      // 1. Resolve installation token for GitHub API operations
      let installationId: string | undefined
      const { installations } = await getAppInstallations()
      if (installations.length > 0) installationId = String(installations[0].id)
      const { token: instToken } = installationId ? await getInstallationAccessToken(installationId) : { token: null }

      const repoFullName = incident.repository_name
      const commitSha = incident.commit_sha || 'main'

      // 2. DETECT STAGE
      const fastModel = await nebius.resolveModel('fast')
      activeRun = {
        id: `run-${Date.now()}`,
        incident_id: incidentId,
        status: 'running',
        current_stage: 'DETECT',
        current_model: fastModel,
        confidence: 0.85,
        retry_count: 0,
        started_at: new Date().toISOString(),
        duration_ms: 500,
      }

      // 3. STEP 3: INSPECT STAGE - Retrieve Repository Tree at exact commit SHA
      activeRun.current_stage = 'INSPECT'
      events.unshift({
        id: `evt-${Date.now()}-tree-start`,
        run_id: activeRun.id,
        incident_id: incidentId,
        stage: 'INSPECT',
        event_type: 'tree_retrieval_started',
        message: `[GitHub Git Trees API] Retrieving tree structure for ${repoFullName} at commit @${commitSha}`,
        severity: 'info',
        created_at: new Date().toISOString(),
      })

      let repoTree: any[] = []
      if (instToken) {
        const treeData = await fetchRepositoryTree(repoFullName, commitSha, instToken)
        repoTree = treeData.tree || []
      }

      events.unshift({
        id: `evt-${Date.now()}-tree-retrieved`,
        run_id: activeRun.id,
        incident_id: incidentId,
        stage: 'INSPECT',
        event_type: 'tree_retrieved',
        message: `[GitHub Git Trees API] Retrieved repository tree containing ${repoTree.length} items at commit @${commitSha}`,
        severity: 'info',
        created_at: new Date().toISOString(),
      })

      // 4. STEP 3: Candidate Verification & Selection
      const rawCandidates: string[] = Array.isArray(incident.affected_files) ? incident.affected_files : ['src/index.ts']
      const verifiedCandidates: Array<{ path: string; status: string; verified: boolean }> = []
      const notFoundCandidates: Array<{ path: string; status: string; verified: boolean }> = []

      const treePathsSet = new Set(repoTree.map((t: any) => t.path))

      for (const candPath of rawCandidates) {
        if (!candPath || isIgnoredPath(candPath)) continue
        if (treePathsSet.has(candPath) || repoTree.length === 0) {
          verifiedCandidates.push({ path: candPath, status: 'verified', verified: true })
        } else {
          notFoundCandidates.push({ path: candPath, status: 'not_found', verified: false })
        }
      }

      events.unshift({
        id: `evt-${Date.now()}-candidates-verified`,
        run_id: activeRun.id,
        incident_id: incidentId,
        stage: 'INSPECT',
        event_type: 'candidates_verified',
        message: `[Candidate Verification] Verified ${verifiedCandidates.length} candidate file(s), ${notFoundCandidates.length} candidate(s) not found in commit @${commitSha}`,
        severity: 'info',
        created_at: new Date().toISOString(),
      })

      // 5. STEP 3: Bounded Source File Retrieval at Exact SHA
      const maxInspectedFiles = Number(process.env.MAX_INSPECTED_FILES) || 12
      const inspectedSourceFiles: Record<string, string> = {}
      const targetPaths = verifiedCandidates.slice(0, maxInspectedFiles).map(c => c.path)

      // Fallback default candidate if no verified candidate found
      if (targetPaths.length === 0 && repoTree.length > 0) {
        const firstBlob = repoTree.find((t: any) => t.type === 'blob' && !isIgnoredPath(t.path))
        if (firstBlob) targetPaths.push(firstBlob.path)
      }

      if (instToken) {
        for (const filePath of targetPaths) {
          const content = await fetchFileContentAtSha(repoFullName, filePath, commitSha, instToken)
          if (content) {
            inspectedSourceFiles[filePath] = content
          }
        }
      }

      // Check relevant config files if present in tree
      const configFilesToInspect = ['package.json', 'tsconfig.json', 'vite.config.ts', 'vite.config.js']
      const configContext: Record<string, string> = {}
      if (instToken) {
        for (const cfgPath of configFilesToInspect) {
          if (treePathsSet.has(cfgPath)) {
            const cfgContent = await fetchFileContentAtSha(repoFullName, cfgPath, commitSha, instToken)
            if (cfgContent) configContext[cfgPath] = cfgContent
          }
        }
      }

      events.unshift({
        id: `evt-${Date.now()}-source-retrieved`,
        run_id: activeRun.id,
        incident_id: incidentId,
        stage: 'INSPECT',
        event_type: 'source_files_retrieved',
        message: `[Source Code Retrieval] Retrieved ${Object.keys(inspectedSourceFiles).length} source file(s) and ${Object.keys(configContext).length} config file(s) at SHA @${commitSha}`,
        severity: 'info',
        created_at: new Date().toISOString(),
      })

      // 6. STEP 3: Nebius Cross-File Reasoning using NEBIUS_REASONING_MODEL
      const reasoningModel = await nebius.resolveModel('reasoning')
      activeRun.current_model = reasoningModel

      events.unshift({
        id: `evt-${Date.now()}-reasoning-started`,
        run_id: activeRun.id,
        incident_id: incidentId,
        stage: 'INSPECT',
        event_type: 'cross_file_reasoning_started',
        message: `[Nebius Reasoning] Initiating cross-file failure analysis with model ${reasoningModel}`,
        severity: 'info',
        created_at: new Date().toISOString(),
      })

      const reasoningResult = await nebius.performCrossFileReasoning(
        incident.error_message || 'CI workflow step execution failure',
        commitSha,
        inspectedSourceFiles,
        configContext
      )

      activeRun.confidence = reasoningResult.confidence || 0.88

      events.unshift({
        id: `evt-${Date.now()}-reasoning-completed`,
        run_id: activeRun.id,
        incident_id: incidentId,
        stage: 'INSPECT',
        event_type: 'cross_file_reasoning_completed',
        message: `[Nebius Reasoning] Analysis completed (${reasoningModel}): ${reasoningResult.root_cause_hypothesis}`,
        severity: 'info',
        created_at: new Date().toISOString(),
      })

      // 7. Store Inspection Record on Incident (Separating Authoritative GitHub Evidence vs AI Hypotheses)
      const inspectionData = {
        repository: repoFullName,
        commit_sha: commitSha,
        tree_count: repoTree.length,
        verified_candidates: verifiedCandidates,
        not_found_candidates: notFoundCandidates,
        inspected_files: Object.keys(inspectedSourceFiles),
        sources: inspectedSourceFiles,
        config_context: Object.keys(configContext),
        ai_analysis: reasoningResult,
        github_verified: Boolean(instToken),
        inspected_at: new Date().toISOString(),
      }

      incident.inspection_data = inspectionData
      incident.affected_files = Object.keys(inspectedSourceFiles).length > 0 ? Object.keys(inspectedSourceFiles) : rawCandidates

      events.unshift({
        id: `evt-${Date.now()}-inspect-completed`,
        run_id: activeRun.id,
        incident_id: incidentId,
        stage: 'INSPECT',
        event_type: 'inspect_stage_completed',
        message: `[INSPECT Completed] Real repository inspection and cross-file reasoning completed for commit @${commitSha}`,
        severity: 'success',
        created_at: new Date().toISOString(),
      })

      // 8. STEP 4: REASON STAGE - Root Cause Verification & Structured Repair Planning
      activeRun.current_stage = 'REASON'

      events.unshift({
        id: `evt-${Date.now()}-reason-started`,
        run_id: activeRun.id,
        incident_id: incidentId,
        stage: 'REASON',
        event_type: 'root_cause_verification_started',
        message: `[Nebius Reasoning] Initiating root cause verification and minimal repair planning with model ${reasoningModel}`,
        severity: 'info',
        created_at: new Date().toISOString(),
      })

      // Extract package.json script commands if available
      let availableScripts: string[] = ['build']
      if (configContext['package.json']) {
        try {
          const pkgJson = JSON.parse(configContext['package.json'])
          if (pkgJson.scripts && typeof pkgJson.scripts === 'object') {
            availableScripts = Object.keys(pkgJson.scripts)
          }
        } catch {
          // fallback default
        }
      }

      const repairPlan = await nebius.verifyRootCauseAndPlanRepair({
        logs: incident.error_message || 'CI workflow step execution failure',
        commitSha,
        inspectedFiles: inspectedSourceFiles,
        configContext,
        step3Hypothesis: reasoningResult,
        availableScripts,
      })

      activeRun.confidence = repairPlan.confidence || 0.88

      events.unshift({
        id: `evt-${Date.now()}-root-cause-verified`,
        run_id: activeRun.id,
        incident_id: incidentId,
        stage: 'REASON',
        event_type: 'root_cause_verified',
        message: `[Nebius Reasoning] Root cause status: ${repairPlan.root_cause_status.toUpperCase()} — ${repairPlan.root_cause}`,
        severity: repairPlan.root_cause_status === 'verified' ? 'success' : 'info',
        created_at: new Date().toISOString(),
      })

      events.unshift({
        id: `evt-${Date.now()}-repair-plan-created`,
        run_id: activeRun.id,
        incident_id: incidentId,
        stage: 'REASON',
        event_type: 'repair_plan_created',
        message: `[Repair Plan] Strategy: ${repairPlan.repair_strategy} | Boundary: Modify [${repairPlan.files_to_modify.join(', ')}] | Test: [${repairPlan.test_commands.join(', ')}]`,
        severity: 'info',
        created_at: new Date().toISOString(),
      })

      incident.repair_plan_data = repairPlan

      if (repairPlan.root_cause_status === 'uncertain') {
        activeRun.status = 'requires_human_review'
        incident.status = 'investigating'
        events.unshift({
          id: `evt-${Date.now()}-human-review`,
          run_id: activeRun.id,
          incident_id: incidentId,
          stage: 'REASON',
          event_type: 'requires_human_review',
          message: '[REQUIRES HUMAN REVIEW] Root cause verification is UNCERTAIN. Halting autonomous repair pipeline before patch generation.',
          severity: 'warning',
          created_at: new Date().toISOString(),
        })
      } else {
        activeRun.status = 'completed'
        incident.status = 'investigating'
      }

      events.unshift({
        id: `evt-${Date.now()}-reason-completed`,
        run_id: activeRun.id,
        incident_id: incidentId,
        stage: 'REASON',
        event_type: 'reason_stage_completed',
        message: `[REASON Completed] Root cause verified and structured repair plan produced at commit @${commitSha}`,
        severity: 'success',
        created_at: new Date().toISOString(),
      })

      // 9. STEP 5: PATCH STAGE — Verified Patch Generation with Hard Safety Gates
      if (repairPlan.root_cause_status === 'verified' && !repairPlan.requires_human_review) {
        activeRun.current_stage = 'PATCH'

        events.unshift({
          id: `evt-${Date.now()}-patch-started`,
          run_id: activeRun.id,
          incident_id: incidentId,
          stage: 'PATCH',
          event_type: 'patch_generation_started',
          message: `[Nebius Reasoning] Initiating verified patch generation with model ${reasoningModel} for commit @${commitSha}`,
          severity: 'info',
          created_at: new Date().toISOString(),
        })

        const patchResult = await nebius.generateVerifiedPatch({
          repository: repoFullName,
          commitSha,
          rootCauseStatus: repairPlan.root_cause_status,
          requiresHumanReview: repairPlan.requires_human_review,
          repairPlan,
          inspectedFiles: inspectedSourceFiles,
          configContext,
        })

        incident.patch_data = patchResult

        if (patchResult.patch_status === 'generated') {
          events.unshift({
            id: `evt-${Date.now()}-patch-completed`,
            run_id: activeRun.id,
            incident_id: incidentId,
            stage: 'PATCH',
            event_type: 'patch_generation_completed',
            message: `[PATCH Completed] Minimal evidence-grounded source patch generated for commit @${commitSha} (${patchResult.files_changed.length} file(s) changed)`,
            severity: 'success',
            created_at: new Date().toISOString(),
          })

          // 10. STEP 6: TEST STAGE — Isolated Patch Test Execution
          activeRun.current_stage = 'TEST'
          events.unshift({
            id: `evt-${Date.now()}-test-started`,
            run_id: activeRun.id,
            incident_id: incidentId,
            stage: 'TEST',
            event_type: 'patch_test_execution_started',
            message: `[Isolated Sandbox] Executing isolated patch test execution in temporary workspace for commit @${commitSha}`,
            severity: 'info',
            created_at: new Date().toISOString(),
          })

          const testResult = await executeIsolatedPatchTest({
            incidentId,
            repository: repoFullName,
            commitSha,
            rootCauseStatus: repairPlan.root_cause_status,
            requiresHumanReview: repairPlan.requires_human_review,
            repairPlan,
            patchData: patchResult,
            inspectedFiles: inspectedSourceFiles,
            configContext,
            originalFailureSignature: incident.error_message || 'CI failure step execution',
            workflowRunId,
          })

          incident.test_data = testResult

          if (testResult.test_status === 'passed') {
            events.unshift({
              id: `evt-${Date.now()}-test-passed`,
              run_id: activeRun.id,
              incident_id: incidentId,
              stage: 'TEST',
              event_type: 'patch_test_execution_completed',
              message: `[TEST Passed] Isolated patch test execution PASSED. Comparison: ${testResult.comparison_result}. Transitioning to VERIFY stage.`,
              severity: 'success',
              created_at: new Date().toISOString(),
            })

            // 11. STEP 7: VERIFY STAGE — Deterministic Verification Gate
            activeRun.current_stage = 'VERIFY'
            events.unshift({
              id: `evt-${Date.now()}-verify-started`,
              run_id: activeRun.id,
              incident_id: incidentId,
              stage: 'VERIFY',
              event_type: 'deterministic_verification_started',
              message: `[Deterministic Verification Gate] Initiating 14 independent verification checks for commit @${commitSha}`,
              severity: 'info',
              created_at: new Date().toISOString(),
            })

            const verificationResult = executeDeterministicVerification({
              incident,
              activeRun,
              repositoryName: repoFullName,
              workflowRunId,
              headSha: commitSha,
            })

            incident.verification_data = verificationResult

            if (verificationResult.verification_status === 'verified') {
              activeRun.status = 'verified'
              incident.status = 'healing'
              events.unshift({
                id: `evt-${Date.now()}-verify-passed`,
                run_id: activeRun.id,
                incident_id: incidentId,
                stage: 'VERIFY',
                event_type: 'deterministic_verification_passed',
                message: `[VERIFY Completed] Deterministic verification gate PASSED. All 14 verification checks verified for commit @${commitSha}.`,
                severity: 'success',
                created_at: new Date().toISOString(),
              })

              // 12. STEP 8: DELIVER STAGE — Verified GitHub Delivery / Pull Request
              activeRun.current_stage = 'DELIVER'
              events.unshift({
                id: `evt-${Date.now()}-deliver-started`,
                run_id: activeRun.id,
                incident_id: incidentId,
                stage: 'DELIVER',
                event_type: 'github_delivery_started',
                message: `[GitHub Delivery] Initiating GitHub PR delivery on branch repoguard/repair/${incidentId.replace(/[^a-zA-Z0-9-]/g, '').toLowerCase()}-${commitSha.slice(0, 7)}`,
                severity: 'info',
                created_at: new Date().toISOString(),
              })

              const deliveryResult = await executeGitHubDelivery({
                incident,
                activeRun,
                repositoryName: repoFullName,
                workflowRunId,
                headSha: commitSha,
              })

              incident.delivery_data = deliveryResult

              if (deliveryResult.status === 'pr_created') {
                activeRun.status = 'completed'
                incident.status = 'resolved'
                events.unshift({
                  id: `evt-${Date.now()}-pr-created`,
                  run_id: activeRun.id,
                  incident_id: incidentId,
                  stage: 'DELIVER',
                  event_type: 'github_pr_created',
                  message: `[DELIVER Completed] Pull Request #${deliveryResult.pr_number} created on ${repoFullName}. PR URL: ${deliveryResult.pr_url}`,
                  severity: 'success',
                  created_at: new Date().toISOString(),
                })
              } else {
                activeRun.status = 'requires_human_review'
                incident.status = 'investigating'
                events.unshift({
                  id: `evt-${Date.now()}-deliver-halted`,
                  run_id: activeRun.id,
                  incident_id: incidentId,
                  stage: 'DELIVER',
                  event_type: 'github_delivery_halted',
                  message: `[REQUIRES HUMAN REVIEW] GitHub delivery halted: ${deliveryResult.failure_reason || deliveryResult.summary}`,
                  severity: 'warning',
                  created_at: new Date().toISOString(),
                })
              }
            } else {
              activeRun.status = 'requires_human_review'
              incident.status = 'investigating'
              events.unshift({
                id: `evt-${Date.now()}-verify-failed`,
                run_id: activeRun.id,
                incident_id: incidentId,
                stage: 'VERIFY',
                event_type: 'deterministic_verification_failed',
                message: `[REQUIRES HUMAN REVIEW] Deterministic verification gate HALTED: ${verificationResult.blocking_reasons.join(', ')}`,
                severity: 'warning',
                created_at: new Date().toISOString(),
              })
            }
          } else {
            activeRun.status = 'requires_human_review'
            incident.status = 'investigating'
            events.unshift({
              id: `evt-${Date.now()}-test-failed`,
              run_id: activeRun.id,
              incident_id: incidentId,
              stage: 'TEST',
              event_type: 'patch_test_execution_failed',
              message: `[REQUIRES HUMAN REVIEW] Isolated patch test execution ${testResult.test_status.toUpperCase()}. Comparison: ${testResult.comparison_result}. ${testResult.rejection_reason || testResult.summary}`,
              severity: 'warning',
              created_at: new Date().toISOString(),
            })

            const verificationResult = executeDeterministicVerification({
              incident,
              activeRun,
              repositoryName: repoFullName,
              workflowRunId,
              headSha: commitSha,
            })

            incident.verification_data = verificationResult
          }
        } else {
          activeRun.status = 'requires_human_review'
          incident.status = 'investigating'
          events.unshift({
            id: `evt-${Date.now()}-patch-rejected`,
            run_id: activeRun.id,
            incident_id: incidentId,
            stage: 'PATCH',
            event_type: 'patch_generation_rejected',
            message: `[REQUIRES HUMAN REVIEW] Patch generation halted/rejected: ${patchResult.rejection_reason || patchResult.patch_summary}`,
            severity: 'warning',
            created_at: new Date().toISOString(),
          })
        }
      } else {
        // Hard Gate: UNCERTAIN, LIKELY, DISPROVEN, or requires_human_review MUST NOT ENTER PATCH
        activeRun.status = 'requires_human_review'
        incident.status = 'investigating'
        events.unshift({
          id: `evt-${Date.now()}-human-review-gate`,
          run_id: activeRun.id,
          incident_id: incidentId,
          stage: 'REASON',
          event_type: 'requires_human_review',
          message: `[REQUIRES HUMAN REVIEW] Root cause status '${repairPlan.root_cause_status}' does not permit patch generation. Halting before PATCH stage.`,
          severity: 'warning',
          created_at: new Date().toISOString(),
        })
      }

      // Persist in Supabase if configured
      if (supabase) {
        try {
          await supabase.from('agent_runs').insert([activeRun])
          await supabase.from('incidents').update({
            affected_files: incident.affected_files,
            status: incident.status,
            verification_data: incident.verification_data,
            delivery_data: incident.delivery_data,
          }).eq('id', incidentId)
        } catch (e: any) {
          console.warn('Supabase agent_run/incident update notice:', e.message)
        }
      }
    } catch (err: any) {
      console.error('[REAL MODE Nebius Autonomous Run Error]:', err.message)
      activeRun.status = 'failed'
      activeRun.error_code = 'AI_PROVIDER_ERROR'
      activeRun.error_message = err.message
      events.unshift({
        id: `evt-${Date.now()}-error`,
        run_id: activeRun.id,
        incident_id: incidentId,
        stage: activeRun.current_stage,
        event_type: 'AI_PROVIDER_ERROR',
        message: `AI PROVIDER ERROR: ${err.message}`,
        severity: 'error',
        created_at: new Date().toISOString(),
      })
    }
  } else {
    // DEMO MODE Execution
    activeRun = {
      id: `run-${Date.now()}`,
      incident_id: incidentId,
      status: 'running',
      current_stage: 'DETECT',
      current_model: 'Demo Mock AI Provider',
      confidence: 0.90,
      retry_count: 0,
      started_at: new Date().toISOString(),
      duration_ms: 0,
    }
    events = [
      {
        id: `evt-${Date.now()}`,
        run_id: activeRun.id,
        incident_id: incidentId,
        stage: 'DETECT',
        event_type: 'demo_triggered',
        message: `DEMO MODE self-healing triggered for ${incidentId}`,
        severity: 'warning',
        created_at: new Date().toISOString(),
      }
    ]

    const stages = ['DETECT', 'INSPECT', 'PLAN', 'REASON', 'PATCH', 'TEST', 'VERIFY', 'DELIVER'] as const
    let currentIdx = 0
    const interval = setInterval(() => {
      currentIdx++
      if (currentIdx < stages.length) {
        const stage = stages[currentIdx]
        activeRun.current_stage = stage
        events.unshift({
          id: `evt-${Date.now()}-${currentIdx}`,
          run_id: activeRun.id,
          incident_id: incidentId,
          stage: stage,
          event_type: `${stage.toLowerCase()}_demo_step`,
          message: `[DEMO MODE] Stage ${stage} executed`,
          severity: stage === 'DELIVER' ? 'success' : 'info',
          created_at: new Date().toISOString(),
        })
        if (stage === 'DELIVER') {
          activeRun.status = 'completed'
          if (incident) incident.status = 'resolved'
          clearInterval(interval)
        }
      } else {
        clearInterval(interval)
      }
    }, 2000)
  }
}

// POST /api/trigger-healing
app.post('/api/trigger-healing', async (req, res) => {
  const { incidentId, mode = 'real' } = req.body || {}
  const targetId = incidentId || (incidents[0] ? incidents[0].id : 'inc-9281')

  processAutonomousRepairRun(targetId, mode)
  res.json({ message: `Autonomous repair run started in ${mode.toUpperCase()} mode`, incidentId: targetId })
})

app.listen(PORT, () => {
  console.log(`⚡ RepoGuard Backend running at http://localhost:${PORT}`)
})
