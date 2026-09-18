import { VerificationData, VerificationCheck } from '../src/types.js'

export interface VerificationParams {
  incident: any
  activeRun?: any
  repositoryName: string
  workflowRunId: string
  headSha: string
}

export function executeDeterministicVerification(params: VerificationParams): VerificationData {
  const {
    incident,
    repositoryName,
    workflowRunId,
    headSha,
  } = params

  const repairPlan = incident?.repair_plan_data
  const patchData = incident?.patch_data
  const testData = incident?.test_data

  const checks: VerificationCheck[] = []
  const blockingReasons: string[] = []

  const baseSha = headSha || incident?.commit_sha || ''
  const rootCauseStatus = repairPlan?.root_cause_status || 'uncertain'
  const requiresHumanReview = Boolean(repairPlan?.requires_human_review)

  // 1. BASE_SHA CHECK
  const isBaseShaMatch = Boolean(baseSha && patchData?.base_sha === baseSha)
  checks.push({
    name: 'BASE_SHA',
    status: isBaseShaMatch ? 'passed' : 'failed',
    evidence: isBaseShaMatch
      ? `Exact base SHA verified: @${baseSha}`
      : `Base SHA mismatch: incident base SHA @${baseSha} vs patch base SHA @${patchData?.base_sha || 'missing'}`,
  })
  if (!isBaseShaMatch) blockingReasons.push(`Base SHA mismatch (@${baseSha} vs @${patchData?.base_sha || 'missing'})`)

  // 2. ROOT_CAUSE_STATUS CHECK
  const isRootCauseVerified = rootCauseStatus === 'verified' && !requiresHumanReview
  checks.push({
    name: 'ROOT_CAUSE_STATUS',
    status: isRootCauseVerified ? 'passed' : 'failed',
    evidence: isRootCauseVerified
      ? `Root cause status is strictly VERIFIED (confidence: ${repairPlan?.confidence || 0.9})`
      : `Root cause status is '${rootCauseStatus}' (requires_human_review: ${requiresHumanReview})`,
  })
  if (!isRootCauseVerified) blockingReasons.push(`Root cause is not strictly verified (status: '${rootCauseStatus}')`)

  // 3. PATCH_STATUS CHECK
  const isPatchGenerated = patchData?.patch_status === 'generated'
  checks.push({
    name: 'PATCH_STATUS',
    status: isPatchGenerated ? 'passed' : 'failed',
    evidence: isPatchGenerated
      ? `Step 5 patch status is GENERATED`
      : `Patch status is '${patchData?.patch_status || 'missing'}'`,
  })
  if (!isPatchGenerated) blockingReasons.push(`Patch status is '${patchData?.patch_status || 'missing'}' (expected GENERATED)`)

  // 4. PATCH_APPLICATION CHECK
  const isPatchApplied = testData?.patch_application?.status === 'applied'
  checks.push({
    name: 'PATCH_APPLICATION',
    status: isPatchApplied ? 'passed' : 'failed',
    evidence: isPatchApplied
      ? `Patch applied cleanly in isolated sandbox`
      : `Patch application status: '${testData?.patch_application?.status || 'missing'}'`,
  })
  if (!isPatchApplied) blockingReasons.push(`Patch application failed or was unauthorized (${testData?.patch_application?.status || 'missing'})`)

  // 5. AUTHORIZED_FILES CHECK
  const filesToModify: string[] = repairPlan?.files_to_modify || []
  const filesNotToModify: string[] = repairPlan?.files_not_to_modify || []
  const patchFiles: Array<{ path: string }> = patchData?.files || []

  let authorizedFilesOk = patchFiles.length > 0
  for (const pf of patchFiles) {
    if (!filesToModify.includes(pf.path) || filesNotToModify.includes(pf.path)) {
      authorizedFilesOk = false
      break
    }
  }
  checks.push({
    name: 'AUTHORIZED_FILES',
    status: authorizedFilesOk ? 'passed' : 'failed',
    evidence: authorizedFilesOk
      ? `All modified files [${patchFiles.map(f => f.path).join(', ')}] are in authorized list [${filesToModify.join(', ')}]`
      : `Unauthorized file modification detected in patch files`,
  })
  if (!authorizedFilesOk) blockingReasons.push('Patch modifies files outside declared authorized boundaries')

  // 6. PATCH_SCOPE CHECK (Recalculating diff metrics independently)
  let actualLinesAdded = 0
  let actualLinesRemoved = 0
  const patchDiff = patchData?.patch_diff || ''

  if (patchDiff) {
    const diffLines = patchDiff.split(/\r?\n/)
    for (const line of diffLines) {
      if (line.startsWith('+') && !line.startsWith('+++')) actualLinesAdded++
      if (line.startsWith('-') && !line.startsWith('---')) actualLinesRemoved++
    }
  }

  const isScopeValid = patchFiles.length > 0 && patchFiles.length <= 5 && actualLinesAdded <= 200 && actualLinesRemoved <= 200
  checks.push({
    name: 'PATCH_SCOPE',
    status: isScopeValid ? 'passed' : 'failed',
    evidence: isScopeValid
      ? `Recalculated patch scope: ${patchFiles.length} file(s), +${actualLinesAdded} lines added, -${actualLinesRemoved} lines removed (within limits)`
      : `Patch scope bounds exceeded: ${patchFiles.length} files, +${actualLinesAdded} added, -${actualLinesRemoved} removed`,
  })
  if (!isScopeValid) blockingReasons.push(`Patch scope bounds exceeded (files: ${patchFiles.length}/5, +${actualLinesAdded}/200, -${actualLinesRemoved}/200)`)

  // 7. TEST_EXECUTION CHECK
  const testStatusPassed = testData?.test_status === 'passed'
  const commands: Array<{ command: string; exit_code: number; status: string }> = testData?.commands || []
  const allCommandsPassed = commands.length > 0 && commands.every(c => c.exit_code === 0 && c.status === 'passed')

  const isTestExecutionOk = testStatusPassed && allCommandsPassed
  checks.push({
    name: 'TEST_EXECUTION',
    status: isTestExecutionOk ? 'passed' : 'failed',
    evidence: isTestExecutionOk
      ? `All ${commands.length} test command(s) returned exit code 0`
      : `Test execution status is '${testData?.test_status || 'missing'}' (commands passed: ${allCommandsPassed})`,
  })
  if (!isTestExecutionOk) blockingReasons.push(`Test execution failed or returned non-zero exit codes`)

  // 8. ORIGINAL_FAILURE_CLEARED CHECK
  const isFailureCleared = testData?.comparison_result === 'ORIGINAL FAILURE CLEARED'
  const combinedTestOutput = commands.map(c => (c as any).stdout + '\n' + (c as any).stderr).join('\n')
  const failureSig = incident?.error_message || ''
  const sigInOutput = failureSig && combinedTestOutput.toLowerCase().includes(failureSig.toLowerCase())

  const isOriginalFailureCleared = isFailureCleared && !sigInOutput
  checks.push({
    name: 'ORIGINAL_FAILURE_CLEARED',
    status: isOriginalFailureCleared ? 'passed' : 'failed',
    evidence: isOriginalFailureCleared
      ? `Original failure signature '${failureSig}' is absent and comparison confirmed CLEARED`
      : `Original failure signature persisted or comparison result is '${testData?.comparison_result || 'missing'}'`,
  })
  if (!isOriginalFailureCleared) blockingReasons.push(`Original failure was not confirmed cleared by sandbox testing`)

  // 9. NO_NEW_FAILURES CHECK
  const newFailures: string[] = testData?.new_failures || []
  const isNoNewFailures = isTestExecutionOk && newFailures.length === 0
  checks.push({
    name: 'NO_NEW_FAILURES',
    status: isNoNewFailures ? 'passed' : 'failed',
    evidence: isNoNewFailures
      ? `No new regressions, timeouts, or errors introduced by patch`
      : `New failures or regressions detected: ${newFailures.join(', ') || 'Command failure'}`,
  })
  if (!isNoNewFailures) blockingReasons.push(`New regressions or command failures detected during testing`)

  // 10. WORKSPACE_INTEGRITY CHECK
  const isWorkspaceIntegrityOk = isPatchApplied && newFailures.every(f => !f.includes('UNAUTHORIZED_WORKSPACE_CHANGE'))
  checks.push({
    name: 'WORKSPACE_INTEGRITY',
    status: isWorkspaceIntegrityOk ? 'passed' : 'failed',
    evidence: isWorkspaceIntegrityOk
      ? `Workspace sandbox integrity verified: no unauthorized mutations or extra files`
      : `Workspace sandbox reported integrity error or unauthorized changes`,
  })
  if (!isWorkspaceIntegrityOk) blockingReasons.push('Workspace integrity check failed: unauthorized file writes detected')

  // 11. PATCH_NON_EMPTY CHECK
  const isPatchNonEmpty = actualLinesAdded + actualLinesRemoved > 0
  checks.push({
    name: 'PATCH_NON_EMPTY',
    status: isPatchNonEmpty ? 'passed' : 'failed',
    evidence: isPatchNonEmpty
      ? `Recalculated diff contains +${actualLinesAdded} -${actualLinesRemoved} changed lines`
      : `Patch diff is empty (0 lines added, 0 lines removed)`,
  })
  if (!isPatchNonEmpty) blockingReasons.push('Patch diff is empty (0 lines changed)')

  // 12. PATCH_BASE_CONSISTENCY CHECK
  const isPatchBaseConsistent = patchData?.base_sha === testData?.base_sha && patchData?.base_sha === baseSha
  checks.push({
    name: 'PATCH_BASE_CONSISTENCY',
    status: isPatchBaseConsistent ? 'passed' : 'failed',
    evidence: isPatchBaseConsistent
      ? `Step 5 patch base SHA (@${patchData?.base_sha}) matches Step 6 test base SHA (@${testData?.base_sha})`
      : `Base SHA inconsistency between Step 5 (@${patchData?.base_sha}) and Step 6 (@${testData?.base_sha})`,
  })
  if (!isPatchBaseConsistent) blockingReasons.push('Inconsistency between Step 5 patch base SHA and Step 6 test base SHA')

  // 13. REPOSITORY_CONSISTENCY CHECK
  const isRepoConsistent = Boolean(repositoryName && incident?.repository_name === repositoryName)
  checks.push({
    name: 'REPOSITORY_CONSISTENCY',
    status: isRepoConsistent ? 'passed' : 'failed',
    evidence: isRepoConsistent
      ? `Repository '${repositoryName}' matches incident repository`
      : `Repository mismatch: '${repositoryName}' vs '${incident?.repository_name}'`,
  })
  if (!isRepoConsistent) blockingReasons.push(`Repository metadata mismatch ('${repositoryName}' vs '${incident?.repository_name}')`)

  // 14. INCIDENT_CONSISTENCY CHECK
  const isIncidentConsistent = Boolean(workflowRunId && incident?.workflow_run_id === workflowRunId)
  checks.push({
    name: 'INCIDENT_CONSISTENCY',
    status: isIncidentConsistent ? 'passed' : 'failed',
    evidence: isIncidentConsistent
      ? `Workflow run ID #${workflowRunId} is consistent across incident telemetry`
      : `Workflow run ID mismatch: #${workflowRunId} vs #${incident?.workflow_run_id}`,
  })
  if (!isIncidentConsistent) blockingReasons.push(`Workflow run ID mismatch (#${workflowRunId} vs #${incident?.workflow_run_id})`)

  // Overall Verification Decision (Strict Fail-Closed)
  const isVerified = checks.every(c => c.status === 'passed') && blockingReasons.length === 0

  const verificationStatus: 'verified' | 'requires_human_review' = isVerified ? 'verified' : 'requires_human_review'

  return {
    verification_status: verificationStatus,
    base_sha_verified: isBaseShaMatch,
    root_cause_verified: isRootCauseVerified,
    patch_verified: isPatchGenerated && isPatchApplied,
    test_verified: isTestExecutionOk,
    original_failure_cleared: isOriginalFailureCleared,
    no_new_failures: isNoNewFailures,
    scope_verified: isScopeValid && authorizedFilesOk,
    repository_verified: isRepoConsistent,
    incident_verified: isIncidentConsistent,
    checks,
    blocking_reasons: blockingReasons,
    summary: isVerified
      ? `Deterministic Verification Gate PASSED. All 14 verification checks verified for commit @${baseSha}.`
      : `Deterministic Verification Gate HALTED: ${blockingReasons.length} check(s) failed. Requires human review.`,
    created_at: new Date().toISOString(),
  }
}
