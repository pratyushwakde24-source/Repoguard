// Mock data store for demo mode — powers the entire UI before Supabase is connected
import type { Repository, Incident, AgentRun, AgentStep, ActivityEvent, TestResult, PullRequest, SecurityAlert, AgentStage } from '../types'

export const mockRepositories: Repository[] = [
  { id: 'repo-1', name: 'payment-service', full_name: 'acme/payment-service', default_branch: 'main', language: 'TypeScript', ci_provider: 'GitHub Actions', health_score: 71.4, last_ci_status: 'failing', total_runs: 4120, success_rate: 94.8, created_at: '2024-01-15' },
  { id: 'repo-2', name: 'auth-service', full_name: 'acme/auth-service', default_branch: 'main', language: 'TypeScript', ci_provider: 'GitHub Actions', health_score: 100, last_ci_status: 'passing', total_runs: 3892, success_rate: 99.2, created_at: '2024-01-10' },
  { id: 'repo-3', name: 'checkout-api', full_name: 'acme/checkout-api', default_branch: 'main', language: 'TypeScript', ci_provider: 'GitHub Actions', health_score: 99.9, last_ci_status: 'passing', total_runs: 2841, success_rate: 98.1, created_at: '2024-02-01' },
  { id: 'repo-4', name: 'inventory-service', full_name: 'acme/inventory-service', default_branch: 'main', language: 'Go', ci_provider: 'GitHub Actions', health_score: 99.7, last_ci_status: 'passing', total_runs: 1956, success_rate: 97.4, created_at: '2024-03-01' },
  { id: 'repo-5', name: 'billing-worker', full_name: 'acme/billing-worker', default_branch: 'main', language: 'TypeScript', ci_provider: 'GitHub Actions', health_score: 98.5, last_ci_status: 'passing', total_runs: 1247, success_rate: 96.8, created_at: '2024-04-01' },
]

export const mockIncidents: Incident[] = [
  {
    id: 'inc-9281', repository_id: 'repo-1', repository_name: 'acme/payment-service',
    title: 'Payment retry TypeError: Cannot read properties of undefined',
    description: 'Payment retry handler assumes paymentAttempt is always defined on network timeout.',
    severity: 'critical', status: 'healing', error_type: 'TypeError',
    error_message: "Cannot read properties of undefined (reading 'retryCount')",
    commit_sha: '8f31c2a', branch: 'main', workflow_name: 'payment-ci',
    build_number: 9281, affected_files: ['paymentService.ts', 'retryHandler.ts', 'stripe.ts'],
    blast_radius: 2, created_at: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: 'inc-9282', repository_id: 'repo-3', repository_name: 'acme/checkout-api',
    title: 'Cart total calculation precision loss in currency conversion',
    description: 'Floating point rounding in multi-currency cart calculation.',
    severity: 'high', status: 'investigating', error_type: 'LogicError',
    error_message: 'Cart total mismatch: expected 99.99, got 99.98',
    commit_sha: 'a4e7b1f', branch: 'main', workflow_name: 'checkout-ci',
    build_number: 891, affected_files: ['cartService.ts', 'currencyConverter.ts'],
    blast_radius: 1, created_at: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: 'inc-9283', repository_id: 'repo-5', repository_name: 'acme/billing-worker',
    title: 'Invoice generation timeout on large batch processing',
    description: 'Batch invoice generator exceeds 30s timeout on > 500 invoices.',
    severity: 'medium', status: 'open', error_type: 'TimeoutError',
    error_message: 'Worker timeout after 30000ms',
    commit_sha: 'c92d4e1', branch: 'develop', workflow_name: 'billing-ci',
    build_number: 442, affected_files: ['batchProcessor.ts'],
    blast_radius: 0, created_at: new Date(Date.now() - 1800000).toISOString(),
  },
]

export const mockActiveRun: AgentRun = {
  id: 'run-001', incident_id: 'inc-9281', status: 'running',
  current_stage: 'REASON', current_model: 'Nemotron 3 Ultra',
  confidence: 0.94, retry_count: 0,
  started_at: new Date(Date.now() - 31000).toISOString(),
  duration_ms: 31000,
}

export const mockSteps: AgentStep[] = [
  { id: 'step-1', run_id: 'run-001', stage: 'DETECT', status: 'completed', model: 'Nemotron Fast', summary: 'CI failure detected from GitHub webhook', evidence_count: 1, started_at: '', completed_at: '', duration_ms: 3200, created_at: '' },
  { id: 'step-2', run_id: 'run-001', stage: 'INSPECT', status: 'completed', model: 'Nemotron Fast', summary: '12,481 lines scanned, 38 relevant, 3 candidate files', evidence_count: 3, started_at: '', completed_at: '', duration_ms: 5100, created_at: '' },
  { id: 'step-3', run_id: 'run-001', stage: 'PLAN', status: 'completed', model: 'Nemotron Reasoning', summary: 'Repair graph constructed: Failure → File → Function → Test → Patch', evidence_count: 5, started_at: '', completed_at: '', duration_ms: 4800, created_at: '' },
  { id: 'step-4', run_id: 'run-001', stage: 'REASON', status: 'running', model: 'Nemotron 3 Ultra', summary: 'Root cause identified with 94% confidence', evidence_count: 8, started_at: '', duration_ms: 7200, created_at: '' },
]

export const mockActivityEvents: ActivityEvent[] = [
  { id: 'evt-1', run_id: 'run-001', incident_id: 'inc-9281', stage: 'DETECT', event_type: 'webhook_received', message: 'CI failure detected (acme/payment-service:main#9281)', severity: 'info', created_at: new Date(Date.now() - 29000).toISOString() },
  { id: 'evt-2', run_id: 'run-001', incident_id: 'inc-9281', stage: 'DETECT', event_type: 'incident_created', message: 'Incident INC-9281 created — CRITICAL severity assigned', severity: 'warning', created_at: new Date(Date.now() - 28000).toISOString() },
  { id: 'evt-3', run_id: 'run-001', incident_id: 'inc-9281', stage: 'INSPECT', event_type: 'logs_collected', message: 'CI logs collected — 12,481 lines ingested', severity: 'info', created_at: new Date(Date.now() - 24000).toISOString() },
  { id: 'evt-4', run_id: 'run-001', incident_id: 'inc-9281', stage: 'INSPECT', event_type: 'files_identified', message: 'AST parsing completed: 3 candidate files mapped', severity: 'info', created_at: new Date(Date.now() - 19000).toISOString() },
  { id: 'evt-5', run_id: 'run-001', incident_id: 'inc-9281', stage: 'PLAN', event_type: 'plan_created', message: 'Repair graph constructed with 5 nodes', severity: 'info', created_at: new Date(Date.now() - 14000).toISOString() },
  { id: 'evt-6', run_id: 'run-001', incident_id: 'inc-9281', stage: 'REASON', event_type: 'root_cause', message: 'Root cause identified with 94% confidence', severity: 'success', created_at: new Date(Date.now() - 10000).toISOString() },
  { id: 'evt-7', run_id: 'run-001', incident_id: 'inc-9281', stage: 'REASON', event_type: 'synthesizing', message: 'Generating AST patch and regression test assertions...', severity: 'info', created_at: new Date(Date.now() - 3000).toISOString() },
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
    id: 'pr-184', incident_id: 'inc-9281', run_id: 'run-001',
    repository_name: 'acme/payment-service', pr_number: 184,
    title: 'fix: add null-safe guard for payment retry attempt state',
    branch: 'repoguard/fix-inc-9281-retry-state',
    status: 'open', files_changed: 3, lines_added: 24, lines_removed: 4,
    confidence: 0.94, verification_passed: true,
    url: 'https://github.com/acme/payment-service/pull/184',
    created_at: new Date().toISOString(),
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
