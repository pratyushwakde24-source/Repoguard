import { RiskAssessment, RiskSignalItem, MemoryRetrievalResult } from '../src/types.js'

export interface RiskEvaluationParams {
  incident?: any
  rootCauseStatus?: string
  requiresHumanReview?: boolean
  repairPlan?: any
  patchData?: any
  testData?: any
  verificationData?: any
  inspectedFiles?: Record<string, string>
  repoTree?: any[]
  commitSha?: string
  headSha?: string
  reliabilityMemory?: MemoryRetrievalResult
}

// Sensitive file patterns requiring strict scrutiny or blocking
const SENSITIVE_FILE_PATTERNS = [
  // Auth & Security
  /auth/i,
  /passport/i,
  /jwt/i,
  /session/i,
  /oauth/i,
  /credential/i,
  /crypto/i,
  /cipher/i,
  /bcrypt/i,
  /signature/i,
  /secret/i,
  // CI/CD & Workflows
  /\.github\/workflows\//i,
  /ci\.yml/i,
  /\.circleci/i,
  /\.travis/i,
  // Database Migrations & Schemas
  /database\/migrations\//i,
  /db\/migrations\//i,
  /migrations\//i,
  /schema\.sql/i,
  /prisma\/migrations\//i,
  /alembic\//i,
  // Payment & Financial Logic
  /billing/i,
  /payment/i,
  /stripe/i,
  /checkout/i,
  /invoice/i,
  // Infrastructure & Access Control
  /k8s\//i,
  /docker-compose/i,
  /terraform/i,
  /infra\//i,
  /policy/i,
  /rbac/i,
  /access-control/i,
]

// Dependency configuration files
const DEPENDENCY_FILE_PATTERNS = [
  /package\.json$/i,
  /package-lock\.json$/i,
  /yarn\.lock$/i,
  /pnpm-lock\.yaml$/i,
  /requirements\.txt$/i,
  /Pipfile(\.lock)?$/i,
  /Cargo\.(toml|lock)$/i,
  /go\.(mod|sum)$/i,
  /pom\.xml$/i,
  /build\.gradle$/i,
]

/**
 * Deterministic Risk Assessment Engine.
 * Evaluates multi-dimensional engineering signals before PATCH and DELIVER stages.
 * Derives a deterministic risk score (0-100) and enforces fail-closed hard safety gates.
 */
export function evaluateAutonomousRepairRisk(params: RiskEvaluationParams): RiskAssessment {
  const {
    incident,
    patchData = incident?.patch_data,
    testData = incident?.test_data,
    verificationData = incident?.verification_data,
    inspectedFiles = incident?.inspection_data?.sources || {},
    reliabilityMemory = incident?.reliability_memory,
  } = params

  const repairPlan = params.repairPlan || incident?.repair_plan_data
  const commitSha = params.headSha || params.commitSha || incident?.commit_sha

  const blockingReasons: string[] = []
  const signalItems: RiskSignalItem[] = []
  let derivedRiskScore = 0

  // Check SHA Mismatch if both headSha and incident.commit_sha are provided
  if (params.headSha && incident?.commit_sha && params.headSha !== incident.commit_sha) {
    blockingReasons.push(`Repository SHA mismatch: Head @${params.headSha.slice(0, 7)} does not match incident commit @${incident.commit_sha.slice(0, 7)}`)
    derivedRiskScore += 50
  }

  // Check Test and Verification failure hard gates
  if (testData && (testData.test_status === 'failed' || testData.test_status === 'rejected')) {
    blockingReasons.push(`Isolated patch test failed: ${testData.failure_reason || testData.summary || 'Test execution rejected'}`)
    derivedRiskScore += 60
  }
  if (verificationData && verificationData.verification_status === 'failed') {
    blockingReasons.push(`Deterministic verification gate failed: ${(verificationData.blocking_reasons || []).join(', ')}`)
    derivedRiskScore += 60
  }

  // ============================================================
  // SIGNAL 1: ROOT CAUSE STATUS & CERTAINTY (Max +70 / HARD GATES)
  // ============================================================
  const rootCauseStatus = (params.rootCauseStatus || repairPlan?.root_cause_status || 'uncertain').toLowerCase()
  const isHumanReviewForced = Boolean(params.requiresHumanReview !== undefined ? params.requiresHumanReview : repairPlan?.requires_human_review)

  if (rootCauseStatus === 'verified' && !isHumanReviewForced) {
    signalItems.push({
      name: 'Root Cause Status',
      status: 'passed',
      value: 'VERIFIED',
      is_blocking: false,
    })
  } else if (rootCauseStatus === 'likely') {
    derivedRiskScore += 35
    signalItems.push({
      name: 'Root Cause Status',
      status: 'warning',
      value: 'LIKELY (Unconfirmed)',
      is_blocking: true,
    })
    blockingReasons.push('Root cause is only LIKELY (requires definitive verification proof)')
  } else if (rootCauseStatus === 'disproven') {
    derivedRiskScore += 100
    signalItems.push({
      name: 'Root Cause Status',
      status: 'failed',
      value: 'DISPROVEN',
      is_blocking: true,
    })
    blockingReasons.push('Root cause hypothesis was DISPROVEN by repository evidence')
  } else {
    // UNCERTAIN or unestablished
    derivedRiskScore += 70
    signalItems.push({
      name: 'Root Cause Status',
      status: 'failed',
      value: 'UNCERTAIN',
      is_blocking: true,
    })
    blockingReasons.push('Root cause status is UNCERTAIN (insufficient diagnostic evidence)')
  }

  if (isHumanReviewForced && rootCauseStatus === 'verified') {
    derivedRiskScore += 40
    blockingReasons.push('Human review flag explicitly requested in repair plan')
  }

  // ============================================================
  // SIGNAL 2: PATCH SCOPE BOUNDARIES (Max +50 / HARD GATES)
  // ============================================================
  const filesToModify: string[] = Array.isArray(repairPlan?.files_to_modify) ? repairPlan.files_to_modify : []
  const filesNotToModify: string[] = Array.isArray(repairPlan?.files_not_to_modify) ? repairPlan.files_not_to_modify : []
  const patchScopeCount = filesToModify.length

  if (rootCauseStatus === 'verified' && patchScopeCount === 0) {
    derivedRiskScore += 50
    signalItems.push({
      name: 'Patch Scope',
      status: 'failed',
      value: '0 files declared',
      is_blocking: true,
    })
    blockingReasons.push('Repair plan declares 0 authorized files to modify')
  } else if (patchScopeCount > 0 && patchScopeCount <= 2) {
    signalItems.push({
      name: 'Patch Scope',
      status: 'passed',
      value: `${patchScopeCount} file(s) (Minimal)`,
      is_blocking: false,
    })
  } else if (patchScopeCount > 2 && patchScopeCount <= 5) {
    derivedRiskScore += 15
    signalItems.push({
      name: 'Patch Scope',
      status: 'warning',
      value: `${patchScopeCount} files (Moderate)`,
      is_blocking: false,
    })
  } else if (patchScopeCount > 5) {
    derivedRiskScore += 60
    signalItems.push({
      name: 'Patch Scope',
      status: 'failed',
      value: `${patchScopeCount} files (Exceeds Max Limit of 5)`,
      is_blocking: true,
    })
    blockingReasons.push(`Patch scope exceeds safety boundary (${patchScopeCount} files > 5 max allowed)`)
  }

  // Check if any file in filesToModify or patchData.files_changed is in filesNotToModify
  const actualChangedFiles: string[] = Array.isArray(patchData?.files_changed) ? patchData.files_changed : []
  const unauthorizedOverlap = [
    ...filesToModify.filter(f => filesNotToModify.includes(f)),
    ...actualChangedFiles.filter(f => filesNotToModify.includes(f) || (filesToModify.length > 0 && !filesToModify.includes(f)))
  ]
  const uniqueUnauthorized = Array.from(new Set(unauthorizedOverlap))

  if (uniqueUnauthorized.length > 0) {
    derivedRiskScore += 80
    signalItems.push({
      name: 'Authorized Boundary',
      status: 'failed',
      value: `Unauthorized: ${uniqueUnauthorized.join(', ')}`,
      is_blocking: true,
    })
    blockingReasons.push(`Files [${uniqueUnauthorized.join(', ')}] are unauthorized or restricted in repair plan`)
  }

  // ============================================================
  // SIGNAL 3: SENSITIVE FILE DETECTION (Max +40)
  // ============================================================
  const sensitiveFilesFound: string[] = []
  for (const filePath of filesToModify) {
    if (SENSITIVE_FILE_PATTERNS.some(pat => pat.test(filePath))) {
      sensitiveFilesFound.push(filePath)
    }
  }

  let fileSensitivityLevel: 'none' | 'moderate' | 'high' = 'none'
  if (sensitiveFilesFound.length > 0) {
    fileSensitivityLevel = 'high'
    derivedRiskScore += 45
    signalItems.push({
      name: 'File Sensitivity',
      status: 'failed',
      value: `High Risk (${sensitiveFilesFound.join(', ')})`,
      is_blocking: true,
    })
    blockingReasons.push(`High-risk sensitive files targeted for autonomous repair: ${sensitiveFilesFound.join(', ')}`)
  } else {
    signalItems.push({
      name: 'File Sensitivity',
      status: 'passed',
      value: 'Standard application logic (No sensitive files)',
      is_blocking: false,
    })
  }

  // ============================================================
  // SIGNAL 4: DEPENDENCY FILE CHANGES (Max +30)
  // ============================================================
  const dependencyFilesFound: string[] = []
  for (const filePath of filesToModify) {
    if (DEPENDENCY_FILE_PATTERNS.some(pat => pat.test(filePath))) {
      dependencyFilesFound.push(filePath)
    }
  }

  const hasDependencyChanges = dependencyFilesFound.length > 0
  if (hasDependencyChanges) {
    derivedRiskScore += 30
    signalItems.push({
      name: 'Dependency Modifications',
      status: 'warning',
      value: `Modified (${dependencyFilesFound.join(', ')})`,
      is_blocking: true,
    })
    blockingReasons.push(`Dependency configuration modified autonomously: ${dependencyFilesFound.join(', ')}`)
  } else {
    signalItems.push({
      name: 'Dependency Modifications',
      status: 'passed',
      value: 'None (Zero package/lockfile mutations)',
      is_blocking: false,
    })
  }

  // ============================================================
  // SIGNAL 5: COMMIT SHA & REPOSITORY CONSISTENCY (Max +40)
  // ============================================================
  const isShaValid = Boolean(commitSha && commitSha !== 'unknown' && commitSha.length >= 7)
  const isTargetFilesInInspected = filesToModify.every(f => inspectedFiles[f] !== undefined)

  if (isShaValid && isTargetFilesInInspected) {
    signalItems.push({
      name: 'Base SHA & Tree Consistency',
      status: 'passed',
      value: `Exact SHA @${commitSha.slice(0, 7)} verified in workspace tree`,
      is_blocking: false,
    })
  } else {
    derivedRiskScore += 40
    signalItems.push({
      name: 'Base SHA & Tree Consistency',
      status: 'failed',
      value: `SHA @${commitSha || 'missing'} mismatch with inspected files`,
      is_blocking: true,
    })
    blockingReasons.push(`Target files not confirmed at exact failure SHA @${commitSha || 'missing'}`)
  }

  // ============================================================
  // SIGNAL 6: HISTORICAL RELIABILITY MEMORY (Discount -15 or +15)
  // ============================================================
  const memRelevance = reliabilityMemory?.relevance_level || 'NONE'
  const memoryList = reliabilityMemory?.matches || reliabilityMemory?.memories || []
  const verifiedRepairsCount = memoryList.filter((m: any) => m.repair_success && m.verification_status === 'verified').length

  if (memRelevance === 'HIGH' && verifiedRepairsCount > 0) {
    derivedRiskScore = Math.max(0, derivedRiskScore - 15)
    signalItems.push({
      name: 'Reliability Memory Match',
      status: 'passed',
      value: `HIGH (${verifiedRepairsCount} verified historical repair(s))`,
      is_blocking: false,
    })
  } else if (memRelevance === 'MEDIUM') {
    derivedRiskScore = Math.max(0, derivedRiskScore - 5)
    signalItems.push({
      name: 'Reliability Memory Match',
      status: 'passed',
      value: `MEDIUM (${verifiedRepairsCount} verified past incident(s))`,
      is_blocking: false,
    })
  } else {
    signalItems.push({
      name: 'Reliability Memory Match',
      status: 'passed',
      value: memRelevance === 'LOW' ? 'LOW (Cold match)' : 'NONE (First seen pattern)',
      is_blocking: false,
    })
  }

  // ============================================================
  // SIGNAL 7: PLANNED TEST COMMANDS (Max +20)
  // ============================================================
  const testCommands: string[] = Array.isArray(repairPlan?.test_commands) ? repairPlan.test_commands : []
  if (testCommands.length > 0) {
    signalItems.push({
      name: 'Test Plan Verification',
      status: 'passed',
      value: `${testCommands.length} command(s) configured (${testCommands[0]})`,
      is_blocking: false,
    })
  } else {
    derivedRiskScore += 20
    signalItems.push({
      name: 'Test Plan Verification',
      status: 'warning',
      value: 'No test commands declared in repair plan',
      is_blocking: false,
    })
  }

  // ============================================================
  // FINAL RISK CALCULATION & FAIL-CLOSED DECISION
  // ============================================================
  const finalScore = Math.min(100, Math.max(0, derivedRiskScore))

  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'
  if (finalScore >= 60 || blockingReasons.length > 0) {
    riskLevel = 'HIGH'
  } else if (finalScore >= 30) {
    riskLevel = 'MEDIUM'
  } else {
    riskLevel = 'LOW'
  }

  // Fail-closed gate: Any blocking reason or HIGH risk blocks autonomous repair
  const isAutonomousAllowed = riskLevel !== 'HIGH' && blockingReasons.length === 0
  const isHumanReviewRequired = !isAutonomousAllowed

  const decision = isAutonomousAllowed ? 'AUTHORIZED' : 'BLOCKED'
  const summary = isAutonomousAllowed
    ? `Autonomous repair AUTHORIZED (Risk Level: ${riskLevel}, Score: ${finalScore}/100). All deterministic safety gates passed.`
    : `Autonomous repair BLOCKED (Risk Level: ${riskLevel}, Score: ${finalScore}/100). ${blockingReasons.length} blocking safety rule(s) violated. Human review required.`

  return {
    risk_level: riskLevel,
    risk_score: finalScore,
    decision,
    autonomous_repair_allowed: isAutonomousAllowed,
    requires_human_review: isHumanReviewRequired,
    blocking_reasons: blockingReasons,
    signals: {
      root_cause_status: rootCauseStatus.toUpperCase(),
      root_cause_verified: rootCauseStatus === 'verified' && !isHumanReviewForced,
      patch_scope_files: patchScopeCount,
      patch_scope_bounded: patchScopeCount > 0 && patchScopeCount <= 5 && unauthorizedOverlap.length === 0,
      file_sensitivity_level: fileSensitivityLevel,
      sensitive_files_detected: sensitiveFilesFound,
      dependency_changes_detected: hasDependencyChanges,
      dependency_files: dependencyFilesFound,
      historical_match_relevance: memRelevance,
      historical_verified_repairs: verifiedRepairsCount,
      sha_consistent: isShaValid && isTargetFilesInInspected,
      evidence_complete: rootCauseStatus === 'verified',
      signal_items: signalItems,
    },
    summary,
    evaluated_at: new Date().toISOString(),
  }
}

export const evaluateAutonomousRepairRiskGate = evaluateAutonomousRepairRisk

export function getRiskAssessmentSummary(assessment: RiskAssessment): string {
  return assessment.summary
}
