// Shared types for the RepoGuard application

export type AgentStage = 'DETECT' | 'INSPECT' | 'PLAN' | 'REASON' | 'PATCH' | 'TEST' | 'VERIFY' | 'DELIVER'
export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low'
export type IncidentStatus = 'open' | 'investigating' | 'healing' | 'resolved' | 'requires_review'
export type RunStatus = 'running' | 'completed' | 'failed' | 'requires_review'
export type TestStatus = 'pending' | 'running' | 'passed' | 'failed'
export type NodeHealth = 'healthy' | 'warning' | 'failed' | 'investigating'

export const STAGES: AgentStage[] = ['DETECT', 'INSPECT', 'PLAN', 'REASON', 'PATCH', 'TEST', 'VERIFY', 'DELIVER']

export const STAGE_ICONS: Record<AgentStage, string> = {
  DETECT: 'sensors',
  INSPECT: 'search',
  PLAN: 'account_tree',
  REASON: 'psychology',
  PATCH: 'code',
  TEST: 'science',
  VERIFY: 'verified_user',
  DELIVER: 'merge',
}

export interface Repository {
  id: string
  github_repository_id?: number
  name: string
  full_name: string
  owner?: string
  default_branch: string
  language: string
  visibility?: 'public' | 'private' | string
  html_url?: string
  ci_provider: string
  health_score: number
  last_ci_status: 'passing' | 'failing' | 'unknown'
  total_runs: number
  success_rate: number
  monitoring_enabled?: boolean
  ci_monitoring_enabled?: boolean
  security_monitoring_enabled?: boolean
  pr_monitoring_enabled?: boolean
  auto_fix_enabled?: boolean
  webhook_active?: boolean
  webhook_id?: string
  connection_status?: string
  is_demo?: boolean
  created_at: string
  updated_at?: string
}

export interface GitHubRepoItem {
  id: number
  node_id: string
  name: string
  full_name: string
  owner: {
    login: string
    avatar_url: string
  }
  private: boolean
  html_url: string
  description: string | null
  default_branch: string
  language: string | null
  stargazers_count: number
  updated_at: string
  is_connected?: boolean
}

export interface GitHubAuthStatus {
  configured: boolean
  authenticated: boolean
  auth_type?: 'app' | 'oauth' | 'token' | 'none'
  user?: {
    login: string
    name: string
    avatar_url: string
    html_url: string
  } | null
  error?: string
}

export interface PatchFile {
  path: string
  original_content: string
  proposed_content: string
  diff: string
  reason: string
}

export interface PatchValidationRequirement {
  rule: string
  passed: boolean
  details?: string
}

export interface PatchData {
  patch_status: 'generated' | 'rejected' | 'requires_human_review'
  base_sha: string
  root_cause_status: 'verified' | 'likely' | 'uncertain' | 'disproven'
  files_changed: string[]
  files: PatchFile[]
  patch_diff: string
  patch_summary: string
  validation_requirements: PatchValidationRequirement[]
  risks: string[]
  created_at: string
  rejection_reason?: string
}

export interface TestCommandResult {
  command: string
  exit_code: number
  status: 'passed' | 'failed' | 'timed_out'
  duration_ms: number
  stdout: string
  stderr: string
}

export interface TestData {
  test_status: 'passed' | 'failed' | 'setup_failed' | 'timed_out' | 'requires_human_review'
  base_sha: string
  patched_sha: string
  commands: TestCommandResult[]
  original_failure: {
    workflow_run_id?: string
    failure_signature: string
  }
  patch_application: {
    status: string
    files_changed: string[]
  }
  comparison_result: 'ORIGINAL FAILURE CLEARED' | 'FAILURE PERSISTS' | 'NEW FAILURE INTRODUCED' | 'COMPARISON INCONCLUSIVE'
  new_failures: string[]
  summary: string
  rejection_reason?: string
  created_at: string
}

export interface VerificationCheck {
  name: string
  status: 'passed' | 'failed'
  evidence: string
}

export interface VerificationData {
  verification_status: 'verified' | 'failed' | 'requires_human_review'
  base_sha_verified: boolean
  root_cause_verified: boolean
  patch_verified: boolean
  test_verified: boolean
  original_failure_cleared: boolean
  no_new_failures: boolean
  scope_verified: boolean
  repository_verified: boolean
  incident_verified: boolean
  checks: VerificationCheck[]
  blocking_reasons: string[]
  summary: string
  created_at: string
}

export type DeliveryStatus =
  | 'pending'
  | 'branch_created'
  | 'commit_created'
  | 'pushed'
  | 'pr_created'
  | 'failed'
  | 'requires_human_review'

export interface DeliveryData {
  status: DeliveryStatus
  incident_id: string
  agent_run_id?: string
  repository: string
  branch_name: string
  base_branch: string
  base_sha: string
  commit_sha?: string
  pr_number?: number
  pr_url?: string
  changed_files: string[]
  patch_identity?: string
  failure_reason?: string
  summary?: string
  created_at: string
  updated_at: string
}

export interface Incident {
  id: string
  repository_id: string
  repository_name: string
  title: string
  description: string
  severity: IncidentSeverity
  status: IncidentStatus
  error_type: string
  error_message: string
  commit_sha: string
  branch: string
  workflow_name: string
  build_number: number
  affected_files: string[]
  blast_radius: number
  workflow_run_id?: string
  workflow_url?: string
  github_verified?: boolean
  inspection_data?: any
  repair_plan_data?: any
  patch_data?: PatchData
  test_data?: TestData
  verification_data?: VerificationData
  delivery_data?: DeliveryData
  created_at: string
  resolved_at?: string
}


export interface AgentRun {
  id: string
  incident_id: string
  status: RunStatus
  current_stage: AgentStage
  current_model: string
  confidence: number
  retry_count: number
  started_at: string
  completed_at?: string
  duration_ms: number
  error?: string
}

export interface AgentStep {
  id: string
  run_id: string
  stage: AgentStage
  status: 'pending' | 'running' | 'completed' | 'failed'
  model: string
  summary: string
  evidence_count: number
  started_at: string
  completed_at?: string
  duration_ms: number
  created_at?: string
  metadata?: Record<string, unknown>
}

export interface ActivityEvent {
  id: string
  run_id?: string
  incident_id?: string
  stage?: AgentStage
  event_type: string
  message: string
  severity: 'info' | 'warning' | 'error' | 'success'
  metadata?: Record<string, unknown>
  created_at: string
}

export interface TestResult {
  id: string
  run_id: string
  suite: string
  name: string
  status: TestStatus
  duration_ms: number
  error?: string
  created_at: string
}

export interface PullRequest {
  id: string
  incident_id: string
  run_id: string
  repository_name: string
  pr_number: number
  title: string
  branch: string
  status: 'draft' | 'open' | 'merged' | 'closed'
  files_changed: number
  lines_added: number
  lines_removed: number
  confidence: number
  verification_passed: boolean
  url: string
  created_at: string
}

export interface SecurityAlert {
  id: string
  repository_id: string
  repository_name: string
  cve_id: string
  severity: IncidentSeverity
  cvss_score: number
  package_name: string
  current_version: string
  patched_version: string
  title: string
  description: string
  status: 'open' | 'patching' | 'patched' | 'dismissed'
  auto_fix_available: boolean
  created_at: string
}
