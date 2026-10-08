// Mock data store for demo mode — powers the entire UI before Supabase is connected
import type { Repository, Incident, AgentRun, AgentStep, ActivityEvent, TestResult, PullRequest, SecurityAlert, AgentStage } from '../types'

export const mockRepositories: Repository[] = [
  { id: 'repo-1', name: 'snowrush-ai', full_name: 'pratyushwakde24-source/snowrush-ai', default_branch: 'main', language: 'TypeScript', ci_provider: 'GitHub Actions', health_score: 95.0, last_ci_status: 'passing', total_runs: 4120, success_rate: 98.8, created_at: '2024-01-15' },
  { id: 'repo-2', name: 'auth-service', full_name: 'acme/auth-service', default_branch: 'main', language: 'TypeScript', ci_provider: 'GitHub Actions', health_score: 100, last_ci_status: 'passing', total_runs: 3892, success_rate: 99.2, created_at: '2024-01-10' },
  { id: 'repo-3', name: 'checkout-api', full_name: 'acme/checkout-api', default_branch: 'main', language: 'TypeScript', ci_provider: 'GitHub Actions', health_score: 99.9, last_ci_status: 'passing', total_runs: 2841, success_rate: 98.1, created_at: '2024-02-01' },
  { id: 'repo-4', name: 'inventory-service', full_name: 'acme/inventory-service', default_branch: 'main', language: 'Go', ci_provider: 'GitHub Actions', health_score: 99.7, last_ci_status: 'passing', total_runs: 1956, success_rate: 97.4, created_at: '2024-03-01' },
  { id: 'repo-5', name: 'billing-worker', full_name: 'acme/billing-worker', default_branch: 'main', language: 'TypeScript', ci_provider: 'GitHub Actions', health_score: 98.5, last_ci_status: 'passing', total_runs: 1247, success_rate: 96.8, created_at: '2024-04-01' },
]

export const mockIncidents: Incident[] = [
  {
    id: 'inc-9281',
    repository_id: 'repo-1',
    repository_name: 'pratyushwakde24-source/snowrush-ai',
    title: 'Payment retry TypeError: Cannot read properties of undefined',
    description: 'Payment retry handler assumes paymentAttempt is always defined on network timeout.',
    severity: 'critical',
    status: 'investigating',
    error_type: 'TypeError',
    error_message: "Cannot read properties of undefined (reading 'retryCount')",
    commit_sha: '6f69df453ce7b65977ff21f3d90c0b6dd67f40f6',
    branch: 'main',
    workflow_name: 'payment-ci',
    build_number: 9281,
    affected_files: ['vite.config.ts'],
    blast_radius: 1,
    human_review_status: 'PENDING',
    human_review: {
      status: 'PENDING',
      decision: null,
    },
    active_run: {
      id: 'run-001',
      incident_id: 'inc-9281',
      status: 'requires_human_review',
      current_stage: 'REASON',
      current_model: 'Nemotron 3 Ultra',
      confidence: 0.94,
      retry_count: 0,
      started_at: new Date(Date.now() - 31000).toISOString(),
      duration_ms: 31000,
    },
    repair_plan_data: {
      root_cause_status: 'verified',
      root_cause: "VitePWA plugin references non-existent icon files pwa-192x192.png and pwa-512x512.png in build manifest",
      confidence: 0.94,
      repair_strategy: "Remove missing icons array from VitePWA configuration in vite.config.ts to resolve build failure",
      expected_effect: "Vite build executes cleanly without missing icon file resolution errors",
      files_to_modify: ['vite.config.ts'],
      files_not_to_modify: ['package.json', 'tsconfig.json'],
      test_commands: ['npm run build', 'npm test'],
      risks: ['Sensitive payment flow retry logic'],
      requires_human_review: true,
    },
    inspection_data: {
      repository: 'pratyushwakde24-source/snowrush-ai',
      commit_sha: '6f69df453ce7b65977ff21f3d90c0b6dd67f40f6',
      tree_count: 14,
      inspected_files: ['vite.config.ts'],
      sources: {
        'vite.config.ts': `import { defineConfig } from 'vite'\nimport { VitePWA } from 'vite-plugin-pwa'\n\nexport default defineConfig({\n  plugins: [\n    VitePWA({\n      registerType: 'autoUpdate',\n      manifest: {\n        name: 'Snowrush AI',\n        short_name: 'Snowrush',\n        icons: [\n          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },\n          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' }\n        ]\n      }\n    })\n  ]\n})\n`
      },
      config_context: ['package.json'],
      configs: {
        'package.json': JSON.stringify({
          name: 'snowrush-ai',
          version: '1.0.0',
          scripts: {
            build: 'node -e "console.log(\'Build verified cleanly\')"',
            test: 'node -e "console.log(\'Tests verified cleanly\')"',
          },
        }, null, 2),
      },
    },
    reliability_memory: {
      relevance_level: 'HIGH',
      relevance_score: 0.88,
      matched_count: 2,
      memories: [
        {
          id: 'mem-8891',
          repository_full_name: 'acme/payment-service',
          incident_id: 'inc-8891',
          workflow_name: 'payment-ci',
          failure_signature: "TypeError: Cannot read properties of undefined in payment handler",
          error_type: 'TypeError',
          root_cause_status: 'verified',
          root_cause_summary: 'Missing defensive check on Stripe session response payload in retry handler',
          evidence_summary: 'src/paymentService.ts line 64 threw unhandled TypeError on webhook timeout',
          relevant_files: ['src/paymentService.ts'],
          changed_files: ['src/paymentService.ts'],
          patch_status: 'generated',
          test_status: 'passed',
          verification_status: 'verified',
          delivery_status: 'pr_created',
          repair_outcome: 'verified_repair',
          repair_success: true,
          human_review_required: false,
          commit_sha: '4d8a1b2',
          repair_branch: 'repoguard/repair/inc-8891-4d8a1b2',
          pull_request_number: 142,
          pull_request_url: 'https://github.com/acme/payment-service/pull/142',
          is_demo: true,
          created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: 'mem-8412',
          repository_full_name: 'acme/payment-service',
          incident_id: 'inc-8412',
          workflow_name: 'payment-ci',
          failure_signature: 'Payment timeout unhandled promise rejection in retry queue',
          error_type: 'TypeError',
          root_cause_status: 'verified',
          root_cause_summary: 'Retry queue handler accessed undefined attemptId during gateway reconnect',
          evidence_summary: 'src/paymentService.ts line 102 null dereference',
          relevant_files: ['src/paymentService.ts'],
          changed_files: ['src/paymentService.ts'],
          patch_status: 'generated',
          test_status: 'passed',
          verification_status: 'verified',
          delivery_status: 'pr_created',
          repair_outcome: 'verified_repair',
          repair_success: true,
          human_review_required: false,
          commit_sha: '2e9c4f1',
          repair_branch: 'repoguard/repair/inc-8412-2e9c4f1',
          pull_request_number: 118,
          pull_request_url: 'https://github.com/acme/payment-service/pull/118',
          is_demo: true,
          created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        }
      ],
      signals: [
        { name: 'Repository Match', matched: true, description: 'Exact repository match (acme/payment-service)' },
        { name: 'Workflow Match', matched: true, description: 'Same CI workflow (payment-ci)' },
        { name: 'Error Type Match', matched: true, description: 'Matching failure category (TypeError)' },
        { name: 'File Overlap', matched: true, description: 'Overlapping file: src/paymentService.ts' },
        { name: 'Verified Historical Repair', matched: true, description: '2 verified successful repairs in memory (PR #142, PR #118)' },
      ],
      summary: 'Found 2 relevant historical incidents in repository reliability memory. Relevance: HIGH.',
    },
    risk_assessment: {
      risk_level: 'HIGH',
      risk_score: 78,
      decision: 'BLOCKED',
      autonomous_repair_allowed: false,
      requires_human_review: true,
      blocking_reasons: [
        'Sensitive payment retry mutation requires explicit human authorization',
        'Deterministic risk gate threshold exceeded (78/100)'
      ],
      signals: {
        root_cause_status: 'VERIFIED',
        root_cause_verified: true,
        patch_scope_files: 1,
        patch_scope_bounded: true,
        file_sensitivity_level: 'high',
        sensitive_files_detected: ['src/paymentService.ts'],
        dependency_changes_detected: false,
        dependency_files: [],
        historical_match_relevance: 'HIGH',
        historical_verified_repairs: 2,
        sha_consistent: true,
        evidence_complete: true,
        signal_items: [
          { name: 'Root Cause Status', status: 'passed', value: 'VERIFIED (94% confidence)', is_blocking: false },
          { name: 'Patch Scope', status: 'passed', value: '1 file (Minimal boundary)', is_blocking: false },
          { name: 'File Sensitivity', status: 'warning', value: 'Sensitive Payment Domain (src/paymentService.ts)', is_blocking: true },
          { name: 'Dependency Modifications', status: 'passed', value: 'None (Zero package mutations)', is_blocking: false },
          { name: 'Base SHA & Tree Consistency', status: 'passed', value: 'Exact SHA @8f31c2a verified', is_blocking: false },
          { name: 'Reliability Memory Match', status: 'passed', value: 'HIGH (2 verified past repairs)', is_blocking: false },
          { name: 'Test Plan Verification', status: 'passed', value: '2 commands configured (npm run build, npm test)', is_blocking: false },
        ],
      },
      summary: 'Autonomous repair PAUSED (Risk Level: HIGH, Score: 78/100). Deterministic safety policy requires human authorization before mutating payment domain files.',
      evaluated_at: new Date(Date.now() - 20000).toISOString(),
    },
    created_at: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: 'inc-9282',
    repository_id: 'repo-3',
    repository_name: 'acme/checkout-api',
    title: 'Auth token signing key rotated without fallback certificate',
    description: 'Auth provider credential rotation failed. Multiple potential root causes across auth service and database session table.',
    severity: 'critical',
    status: 'investigating',
    error_type: 'SecurityException',
    error_message: '401 Unauthorized across all integration endpoints: Token signature verification failed',
    commit_sha: 'a4e7b1f',
    branch: 'main',
    workflow_name: 'security-scan',
    build_number: 891,
    affected_files: ['src/auth/jwt.ts', 'src/auth/session.ts', 'package.json'],
    blast_radius: 3,
    repair_plan_data: {
      root_cause_status: 'uncertain',
      root_cause: 'Uncertain root cause: Multiple possible failure points between JWT key rotation and database session expiration.',
      confidence: 0.52,
      repair_strategy: '[CONDITIONAL HYPOTHESIS] Unverified candidate hypothesis. Requires human review before patch generation.',
      expected_effect: 'Token validation passes',
      files_to_modify: [],
      files_not_to_modify: ['package.json', 'tsconfig.json'],
      test_commands: ['npm test'],
      risks: ['Authentication security vulnerability', 'Accidental key overwrite'],
      requires_human_review: true,
    },
    reliability_memory: {
      relevance_level: 'LOW',
      relevance_score: 0.25,
      matched_count: 1,
      memories: [
        {
          id: 'mem-0988',
          repository_full_name: 'acme/checkout-api',
          incident_id: 'inc-0988',
          workflow_name: 'Security Scan',
          failure_signature: 'Authentication token signing key rotated without fallback certificate',
          error_type: 'SecurityException',
          root_cause_status: 'uncertain',
          root_cause_summary: 'Auth provider credential rotation failed. Multiple potential root causes.',
          evidence_summary: 'ci.log reported 401 Unauthorized across all integration endpoints',
          relevant_files: ['src/auth/jwt.ts'],
          changed_files: [],
          patch_status: 'requires_human_review',
          test_status: 'requires_human_review',
          verification_status: 'requires_human_review',
          delivery_status: 'requires_human_review',
          repair_outcome: 'blocked_human_review',
          repair_success: false,
          human_review_required: true,
          commit_sha: 'a4e7b1f',
          is_demo: true,
          created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        }
      ],
      signals: [
        { name: 'Repository Match', matched: true, description: 'Exact repository match (acme/checkout-api)' },
        { name: 'Workflow Match', matched: false, description: 'Different workflow' },
        { name: 'Error Type Match', matched: true, description: 'SecurityException' },
        { name: 'File Overlap', matched: false, description: 'No clean overlap' },
        { name: 'Verified Historical Repair', matched: false, description: 'Previous incident was also blocked for human review' },
      ],
      summary: 'Historical repository memory scanned: Past incident on auth module was blocked for safety.',
    },
    risk_assessment: {
      risk_level: 'HIGH',
      risk_score: 95,
      decision: 'BLOCKED',
      autonomous_repair_allowed: false,
      requires_human_review: true,
      blocking_reasons: [
        'Root cause status is UNCERTAIN (insufficient diagnostic evidence)',
        'High-risk sensitive files targeted for autonomous repair: src/auth/jwt.ts, src/auth/session.ts',
        'Repair plan declares 0 authorized files to modify',
      ],
      signals: {
        root_cause_status: 'UNCERTAIN',
        root_cause_verified: false,
        patch_scope_files: 0,
        patch_scope_bounded: false,
        file_sensitivity_level: 'high',
        sensitive_files_detected: ['src/auth/jwt.ts', 'src/auth/session.ts'],
        dependency_changes_detected: false,
        dependency_files: [],
        historical_match_relevance: 'LOW',
        historical_verified_repairs: 0,
        sha_consistent: true,
        evidence_complete: false,
        signal_items: [
          { name: 'Root Cause Status', status: 'failed', value: 'UNCERTAIN (52% confidence)', is_blocking: true },
          { name: 'Patch Scope', status: 'failed', value: '0 files authorized', is_blocking: true },
          { name: 'File Sensitivity', status: 'failed', value: 'High Risk (src/auth/jwt.ts, src/auth/session.ts)', is_blocking: true },
          { name: 'Dependency Modifications', status: 'passed', value: 'None', is_blocking: false },
          { name: 'Base SHA & Tree Consistency', status: 'passed', value: 'Exact SHA @a4e7b1f verified', is_blocking: false },
          { name: 'Reliability Memory Match', status: 'passed', value: 'LOW (Negative historical pattern)', is_blocking: false },
          { name: 'Test Plan Verification', status: 'passed', value: '1 command configured (npm test)', is_blocking: false },
        ],
      },
      summary: 'Autonomous repair BLOCKED (Risk Level: HIGH, Score: 95/100). 3 blocking safety rule(s) violated. Human review required.',
      evaluated_at: new Date(Date.now() - 300000).toISOString(),
    },
    created_at: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: 'inc-9283',
    repository_id: 'repo-5',
    repository_name: 'acme/billing-worker',
    title: 'Invoice generation timeout on large batch processing',
    description: 'Batch invoice generator exceeds 30s timeout on > 500 invoices.',
    severity: 'medium',
    status: 'open',
    error_type: 'TimeoutError',
    error_message: 'Worker timeout after 30000ms',
    commit_sha: 'c92d4e1',
    branch: 'develop',
    workflow_name: 'billing-ci',
    build_number: 442,
    affected_files: ['batchProcessor.ts'],
    blast_radius: 0,
    created_at: new Date(Date.now() - 1800000).toISOString(),
  },
]


export const mockActiveRun: AgentRun = {
  id: 'run-001', incident_id: 'inc-9281', status: 'requires_human_review',
  current_stage: 'REASON', current_model: 'Nemotron 3 Ultra',
  confidence: 0.94, retry_count: 0,
  started_at: new Date(Date.now() - 31000).toISOString(),
  duration_ms: 31000,
}

export const mockSteps: AgentStep[] = [
  { id: 'step-1', run_id: 'run-001', stage: 'DETECT', status: 'completed', model: 'Nemotron Fast', summary: 'CI failure detected from GitHub webhook', evidence_count: 1, started_at: '', completed_at: '', duration_ms: 3200, created_at: '' },
  { id: 'step-2', run_id: 'run-001', stage: 'INSPECT', status: 'completed', model: 'Nemotron Fast', summary: '12,481 lines scanned, 38 relevant, 3 candidate files', evidence_count: 3, started_at: '', completed_at: '', duration_ms: 5100, created_at: '' },
  { id: 'step-3', run_id: 'run-001', stage: 'PLAN', status: 'completed', model: 'Nemotron Reasoning', summary: 'Repair graph constructed: Failure → File → Function → Test → Patch', evidence_count: 5, started_at: '', completed_at: '', duration_ms: 4800, created_at: '' },
  { id: 'step-4', run_id: 'run-001', stage: 'REASON', status: 'running', model: 'Nemotron 3 Ultra', summary: 'Root cause verified — awaiting human verification', evidence_count: 8, started_at: '', duration_ms: 7200, created_at: '' },
]

export const mockActivityEvents: ActivityEvent[] = [
  { id: 'evt-1', run_id: 'run-001', incident_id: 'inc-9281', stage: 'DETECT', event_type: 'webhook_received', message: 'CI failure detected (acme/payment-service:main#9281)', severity: 'info', created_at: new Date(Date.now() - 29000).toISOString() },
  { id: 'evt-2', run_id: 'run-001', incident_id: 'inc-9281', stage: 'DETECT', event_type: 'incident_created', message: 'Incident INC-9281 created — CRITICAL severity assigned', severity: 'warning', created_at: new Date(Date.now() - 28000).toISOString() },
  { id: 'evt-3', run_id: 'run-001', incident_id: 'inc-9281', stage: 'INSPECT', event_type: 'logs_collected', message: 'CI logs collected — 12,481 lines ingested', severity: 'info', created_at: new Date(Date.now() - 24000).toISOString() },
  { id: 'evt-4', run_id: 'run-001', incident_id: 'inc-9281', stage: 'INSPECT', event_type: 'files_identified', message: 'AST parsing completed: 3 candidate files mapped', severity: 'info', created_at: new Date(Date.now() - 19000).toISOString() },
  { id: 'evt-5', run_id: 'run-001', incident_id: 'inc-9281', stage: 'PLAN', event_type: 'plan_created', message: 'Repair graph constructed with 5 nodes', severity: 'info', created_at: new Date(Date.now() - 14000).toISOString() },
  { id: 'evt-6', run_id: 'run-001', incident_id: 'inc-9281', stage: 'REASON', event_type: 'root_cause', message: 'Root cause verified with 94% confidence', severity: 'success', created_at: new Date(Date.now() - 10000).toISOString() },
  { id: 'evt-7', run_id: 'run-001', incident_id: 'inc-9281', stage: 'REASON', event_type: 'requires_human_review', message: '[REQUIRES HUMAN REVIEW] Risk Gate evaluated HIGH (78/100). Autonomous patch generation halted. Waiting for explicit human verification.', severity: 'warning', created_at: new Date(Date.now() - 3000).toISOString() },
]

export const mockPreviousEvents: ActivityEvent[] = [
  { id: 'evt-p1', stage: 'DELIVER', event_type: 'pr_merged', message: 'PR #183 merged autonomously', severity: 'success', created_at: new Date(Date.now() - 180000).toISOString() },
  { id: 'evt-p2', stage: 'TEST', event_type: 'tests_passed', message: '142 tests passed verification', severity: 'info', created_at: new Date(Date.now() - 360000).toISOString() },
  { id: 'evt-p3', stage: 'DETECT', event_type: 'ci_failure', message: 'CI failure detected — checkout-api #891', severity: 'error', created_at: new Date(Date.now() - 540000).toISOString() },
]

export const mockTestResults: TestResult[] = [
  { id: 'tr-1', run_id: 'run-001', suite: 'Unit', name: 'PaymentService.processAttempt', status: 'passed', duration_ms: 45, created_at: '' },
  { id: 'tr-2', run_id: 'run-001', suite: 'Unit', name: 'PaymentService.retryWithBackoff', status: 'passed', duration_ms: 32, created_at: '' },
  { id: 'tr-3', run_id: 'run-001', suite: 'Unit', name: 'RetryHandler.queueRetry', status: 'passed', duration_ms: 28, created_at: '' },
  { id: 'tr-4', run_id: 'run-001', suite: 'Integration', name: 'PaymentFlow.endToEnd', status: 'passed', duration_ms: 1240, created_at: '' },
  { id: 'tr-5', run_id: 'run-001', suite: 'Integration', name: 'StripeWebhook.processEvent', status: 'passed', duration_ms: 890, created_at: '' },
  { id: 'tr-6', run_id: 'run-001', suite: 'Typecheck', name: 'tsc --noEmit', status: 'passed', duration_ms: 3200, created_at: '' },
  { id: 'tr-7', run_id: 'run-001', suite: 'Lint', name: 'eslint src/', status: 'passed', duration_ms: 1800, created_at: '' },
  { id: 'tr-8', run_id: 'run-001', suite: 'Security', name: 'npm audit', status: 'passed', duration_ms: 2100, created_at: '' },
]

export const mockPullRequests: PullRequest[] = [
  {
    id: 'pr-1', incident_id: 'inc-8891', run_id: 'run-8891',
    repository_name: 'acme/payment-service', pr_number: 142,
    title: 'fix(repoguard): automated CI repair [inc-8891]',
    branch: 'repoguard/repair/inc-8891-4d8a1b2',
    status: 'merged', files_changed: 1, lines_added: 2, lines_removed: 0,
    confidence: 0.95, verification_passed: true,
    url: 'https://github.com/acme/payment-service/pull/142',
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'pr-183', incident_id: 'inc-9280', run_id: 'run-000',
    repository_name: 'acme/auth-service', pr_number: 183,
    title: 'fix: handle expired token refresh race condition',
    branch: 'repoguard/fix-inc-9280-token-refresh',
    status: 'merged', files_changed: 2, lines_added: 18, lines_removed: 3,
    confidence: 0.96, verification_passed: true,
    url: 'https://github.com/acme/auth-service/pull/183',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
]

export const mockSecurityAlerts: SecurityAlert[] = [
  {
    id: 'sa-1', repository_id: 'repo-1', repository_name: 'acme/payment-service',
    cve_id: 'CVE-2024-21538', severity: 'critical', cvss_score: 9.8,
    package_name: 'cross-spawn', current_version: '7.0.3', patched_version: '7.0.5',
    title: 'Regular Expression Denial of Service in cross-spawn',
    description: 'A ReDoS vulnerability in cross-spawn allows attackers to cause denial of service.',
    status: 'patching', auto_fix_available: true, created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'sa-2', repository_id: 'repo-3', repository_name: 'acme/checkout-api',
    cve_id: 'CVE-2024-45296', severity: 'high', cvss_score: 7.5,
    package_name: 'path-to-regexp', current_version: '6.2.1', patched_version: '6.3.0',
    title: 'Backtracking ReDoS in path-to-regexp',
    description: 'Polynomial-time regex backtracking in path matching.',
    status: 'open', auto_fix_available: true, created_at: new Date(Date.now() - 172800000).toISOString(),
  },
]

// Chart data
export const pipelineRunData = [
  { run: '#4109', status: 'passed', duration: 142, rate: 100 },
  { run: '#4110', status: 'passed', duration: 168, rate: 100 },
  { run: '#4111', status: 'passed', duration: 128, rate: 100 },
  { run: '#4112', status: 'failed', duration: 94, rate: 0 },
  { run: '#4113', status: 'passed', duration: 155, rate: 100 },
  { run: '#4114', status: 'passed', duration: 172, rate: 100 },
  { run: '#4115', status: 'passed', duration: 110, rate: 100 },
  { run: '#4116', status: 'failed', duration: 82, rate: 0 },
  { run: '#4117', status: 'passed', duration: 145, rate: 100 },
  { run: '#4118', status: 'passed', duration: 178, rate: 100 },
  { run: '#4119', status: 'healed', duration: 156, rate: 100 },
  { run: '#4120', status: 'running', duration: 110, rate: 50 },
]

export function getStageIndex(stage: AgentStage): number {
  const stages: AgentStage[] = ['DETECT', 'INSPECT', 'PLAN', 'REASON', 'PATCH', 'TEST', 'VERIFY', 'DELIVER']
  return stages.indexOf(stage)
}

export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}

export function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
