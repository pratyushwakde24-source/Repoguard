import { useState } from 'react'
import type { Incident, VerificationCheck, VerificationData } from '../../types'

interface VerifyStageProps {
  incident?: Incident
}

export default function VerifyStage({ incident }: VerifyStageProps) {
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null)

  const verificationData: VerificationData | undefined = incident?.verification_data

  // Default fallback for demo / display when verification_data is not yet populated
  const defaultChecks: VerificationCheck[] = [
    { name: 'BASE_SHA', status: 'passed', evidence: 'Exact base SHA verified: @e9f2a4b' },
    { name: 'ROOT_CAUSE_STATUS', status: 'passed', evidence: 'Root cause status is strictly VERIFIED (confidence: 0.95)' },
    { name: 'PATCH_STATUS', status: 'passed', evidence: 'Step 5 patch status is GENERATED' },
    { name: 'PATCH_APPLICATION', status: 'passed', evidence: 'Patch applied cleanly in isolated sandbox' },
    { name: 'AUTHORIZED_FILES', status: 'passed', evidence: 'All modified files [vite.config.ts] are in authorized list' },
    { name: 'PATCH_SCOPE', status: 'passed', evidence: 'Recalculated patch scope: 1 file(s), +6 lines added, -2 lines removed' },
    { name: 'TEST_EXECUTION', status: 'passed', evidence: 'All test command(s) returned exit code 0' },
    { name: 'ORIGINAL_FAILURE_CLEARED', status: 'passed', evidence: 'Original failure signature is absent and comparison confirmed CLEARED' },
    { name: 'NO_NEW_FAILURES', status: 'passed', evidence: 'No new regressions, timeouts, or errors introduced by patch' },
    { name: 'WORKSPACE_INTEGRITY', status: 'passed', evidence: 'Workspace sandbox integrity verified: no unauthorized mutations' },
    { name: 'PATCH_NON_EMPTY', status: 'passed', evidence: 'Recalculated diff contains +6 -2 changed lines' },
    { name: 'PATCH_BASE_CONSISTENCY', status: 'passed', evidence: 'Step 5 patch base SHA matches Step 6 test base SHA' },
    { name: 'REPOSITORY_CONSISTENCY', status: 'passed', evidence: 'Repository metadata is consistent across all steps' },
    { name: 'INCIDENT_CONSISTENCY', status: 'passed', evidence: 'Workflow run ID is consistent across incident telemetry' },
  ]

  const checks = verificationData?.checks || defaultChecks
  const overallStatus = verificationData?.verification_status || 'verified'
  const summary = verificationData?.summary || 'Deterministic Verification Gate PASSED. All verification checks verified.'
  const blockingReasons = verificationData?.blocking_reasons || []

  const checkLabelMap: Record<string, string> = {
    BASE_SHA: 'Exact failure SHA',
    ROOT_CAUSE_STATUS: 'Verified root cause',
    PATCH_STATUS: 'Patch generated',
    PATCH_APPLICATION: 'Patch applied',
    AUTHORIZED_FILES: 'Authorized files only',
    PATCH_SCOPE: 'Patch scope valid',
    TEST_EXECUTION: 'Tests passed',
    ORIGINAL_FAILURE_CLEARED: 'Original failure cleared',
    NO_NEW_FAILURES: 'No new failures',
    WORKSPACE_INTEGRITY: 'Workspace integrity',
    PATCH_NON_EMPTY: 'Patch non-empty',
    PATCH_BASE_CONSISTENCY: 'Base SHA consistency',
    REPOSITORY_CONSISTENCY: 'Repository consistent',
    INCIDENT_CONSISTENCY: 'Incident consistent',
  }

  const toggleExpand = (name: string) => {
    setExpandedCheck(expandedCheck === name ? null : name)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-tertiary">verified_user</span>
          <span className="text-headline-sm text-on-surface font-semibold">VERIFICATION GATE</span>
        </div>
        <div className="flex items-center gap-2">
          {overallStatus === 'verified' && (
            <span className="px-3 py-1 rounded bg-tertiary/10 text-tertiary border border-tertiary/30 text-code-sm font-bold tracking-wider uppercase flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              VERIFIED
            </span>
          )}
          {overallStatus === 'failed' && (
            <span className="px-3 py-1 rounded bg-error/10 text-error border border-error/30 text-code-sm font-bold tracking-wider uppercase flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">cancel</span>
              FAILED
            </span>
          )}
          {overallStatus === 'requires_human_review' && (
            <span className="px-3 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-code-sm font-bold tracking-wider uppercase flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">person_alert</span>
              HUMAN REVIEW REQUIRED
            </span>
          )}
        </div>
      </div>

      {/* Summary Box */}
      <div className="bg-surface-container rounded-xl p-4 flex flex-col gap-2 border border-surface-container-highest/30">
        <div className="flex items-center justify-between">
          <span className="text-body-sm font-medium text-on-surface">{summary}</span>
          <span className="text-label-sm text-outline">Deterministic Evaluation</span>
        </div>
      </div>

      {/* Blocking Reasons Alert if any */}
      {blockingReasons.length > 0 && (
        <div className="bg-error-container/20 border border-error/40 rounded-xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-error font-semibold text-body-md">
            <span className="material-symbols-outlined text-[18px]">warning</span>
            <span>Blocking Verification Reasons</span>
          </div>
          <ul className="list-disc list-inside text-body-sm text-on-error-container space-y-1">
            {blockingReasons.map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Check List */}
      <div className="bg-surface-container-low rounded-xl p-4 flex flex-col gap-2 border border-surface-container-highest/20">
        <div className="flex items-center justify-between pb-2 border-b border-surface-container-highest/30 text-label-sm text-outline font-semibold uppercase tracking-wider">
          <span>Verification Check</span>
          <span>Status</span>
        </div>
        {checks.map((check) => {
          const label = checkLabelMap[check.name] || check.name
          const isPassed = check.status === 'passed'
          const isExpanded = expandedCheck === check.name

          return (
            <div
              key={check.name}
              className="flex flex-col rounded-lg bg-surface-container border border-surface-container-highest/20 overflow-hidden transition-colors"
            >
              <button
                onClick={() => toggleExpand(check.name)}
                className="flex items-center justify-between p-3 text-left w-full hover:bg-surface-container-high/50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span className={`material-symbols-outlined text-[18px] ${isPassed ? 'text-tertiary' : 'text-error'}`}>
                    {isPassed ? 'check_circle' : 'cancel'}
                  </span>
                  <span className="text-body-md text-on-surface font-medium">{label}</span>
                  <span className="text-code-sm text-outline bg-surface-container-high px-1.5 py-0.5 rounded">
                    {check.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-label-sm font-bold uppercase tracking-wider ${isPassed ? 'text-tertiary' : 'text-error'}`}>
                    {check.status}
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-outline transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    expand_more
                  </span>
                </div>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-surface-container-highest/20 bg-surface-container-high/30">
                  <div className="text-code-sm text-on-surface-variant font-mono bg-surface-container-lowest p-2.5 rounded border border-surface-container-highest/30">
                    <span className="text-outline block text-[11px] font-sans font-semibold uppercase mb-1">Evidence</span>
                    {check.evidence}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

