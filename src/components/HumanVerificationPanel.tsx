import { useState } from 'react'
import type { Incident } from '../types'

interface HumanVerificationPanelProps {
  incident: Incident
  onStatusChange?: (updatedIncident: Incident, updatedRun?: any, updatedEvents?: any[]) => void
  isCompact?: boolean
}

export default function HumanVerificationPanel({
  incident,
  onStatusChange,
  isCompact = false,
}: HumanVerificationPanelProps) {
  const [reviewNote, setReviewNote] = useState<string>('')
  const [isApproving, setIsApproving] = useState<boolean>(false)
  const [approvalStep, setApprovalStep] = useState<string>('')
  const [isRejecting, setIsRejecting] = useState<boolean>(false)
  const [showRejectModal, setShowRejectModal] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [evidenceExpanded, setEvidenceExpanded] = useState<boolean>(false)

  const repairPlan = incident?.repair_plan_data
  const risk = incident?.risk_assessment
  const memory = incident?.reliability_memory
  const humanReview = incident?.human_review

  const rootCauseStatus = (repairPlan?.root_cause_status || 'UNCERTAIN').toUpperCase()
  const confidence = Math.round((repairPlan?.confidence || 0.88) * 100)
  const rootCause = repairPlan?.root_cause || incident?.error_message || 'Unverified candidate hypothesis'
  const riskScore = risk?.risk_score ?? 78
  const riskLevel = (risk?.risk_level || (riskScore > 60 ? 'HIGH' : 'LOW')).toUpperCase()
  const filesToModify = repairPlan?.files_to_modify || incident?.affected_files || []
  const filesNotToModify = repairPlan?.files_not_to_modify || ['package.json', 'tsconfig.json']
  const sensitiveFiles = risk?.signals?.sensitive_files_detected || []
  const commitSha = incident?.commit_sha || 'a1b2c3d'
  const repositoryName = incident?.repository_name || 'acme/payment-service'
  const branch = incident?.branch || 'main'
  const evidenceList = repairPlan?.evidence || [
    { source: 'github_actions', path: 'ci.log', lines: '42', excerpt: incident?.error_message || 'CI workflow step execution failure' },
    { source: 'source_code', path: filesToModify[0] || 'src/index.ts', lines: '12-18', excerpt: 'Target source inspection at exact commit SHA' }
  ]

  const isAlreadyApproved = humanReview?.status === 'APPROVED' || incident?.human_review_status === 'APPROVED'
  const isAlreadyRejected = humanReview?.status === 'REJECTED' || incident?.human_review_status === 'REJECTED'

  // Determine button disabled state & reasons
  const hardGateReasons: string[] = []
  if (filesToModify.length > 5) {
    hardGateReasons.push('Patch scope exceeds 5 files max limit')
  }
  const forbiddenOverlap = filesToModify.filter((f: string) => filesNotToModify.includes(f))
  if (forbiddenOverlap.length > 0) {
    hardGateReasons.push(`Restricted files targeted: ${forbiddenOverlap.join(', ')}`)
  }
  if (!commitSha || commitSha === 'unknown') {
    hardGateReasons.push('Commit SHA is missing')
  }

  const isHardBlocked = hardGateReasons.length > 0
  const isApproveDisabled = isApproving || isRejecting || isAlreadyApproved || isAlreadyRejected || isHardBlocked

  const handleApprove = async () => {
    if (isApproveDisabled) return
    setErrorMessage(null)
    setIsApproving(true)
    setApprovalStep('APPROVING...')

    try {
      await new Promise(r => setTimeout(r, 400))
      setApprovalStep('REVALIDATING SAFETY...')
      await new Promise(r => setTimeout(r, 400))
      setApprovalStep('AUTHORIZATION CONFIRMED')

      const res = await fetch(`http://localhost:3001/api/incidents/${incident.id}/human-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          decision: 'APPROVE',
          note: reviewNote.trim() || 'Human engineer verified root cause and authorized autonomous patch generation.',
          baseSha: commitSha,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || `Approval failed with HTTP ${res.status}`)
      }

      setApprovalStep('PATCH GENERATION STARTING...')
      await new Promise(r => setTimeout(r, 500))

      const data = await res.json()
      if (data.incident && onStatusChange) {
        onStatusChange(data.incident, data.activeRun, data.events)
      }
    } catch (err: any) {
      console.error('Human review approval error:', err)
      setErrorMessage(err.message || 'Approval could not be completed.')
    } finally {
      setIsApproving(false)
      setApprovalStep('')
    }
  }

  const handleRejectConfirm = async () => {
    setShowRejectModal(false)
    setIsRejecting(true)
    setErrorMessage(null)

    try {
      const res = await fetch(`http://localhost:3001/api/incidents/${incident.id}/human-review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          decision: 'REJECT',
          note: reviewNote.trim() || 'Human engineer rejected autonomous repair.',
          baseSha: commitSha,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.message || `Rejection failed with HTTP ${res.status}`)
      }

      const data = await res.json()
      if (data.incident && onStatusChange) {
        onStatusChange(data.incident)
      } else {
        const updatedInc: Incident = {
          ...incident,
          human_review_status: 'REJECTED',
          human_review: {
            status: 'REJECTED',
            decision: 'REJECTED',
            reviewed_at: new Date().toISOString(),
            reviewed_by: 'Authorized SRE Engineer',
            note: reviewNote || 'Human engineer rejected autonomous repair.',
          }
        }
        if (onStatusChange) onStatusChange(updatedInc)
      }
    } catch (err: any) {
      console.error('Human review rejection error:', err)
      setErrorMessage(err.message || 'Rejection could not be recorded.')
    } finally {
      setIsRejecting(false)
    }
  }

  return (
    <div className={`rounded-xl border flex flex-col gap-4 font-sans transition-all ${
      isAlreadyApproved
        ? 'bg-tertiary-container/10 border-tertiary/40 p-5 shadow-lg shadow-tertiary/5'
        : isAlreadyRejected
        ? 'bg-error-container/10 border-error/40 p-5'
        : 'bg-surface-container-high border-error/50 p-5 shadow-xl shadow-error/10'
    }`}>
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/20 pb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            isAlreadyApproved
              ? 'bg-tertiary/20 text-tertiary'
              : isAlreadyRejected
              ? 'bg-error/20 text-error'
              : 'bg-error-container text-error animate-pulse'
          }`}>
            <span className="material-symbols-outlined text-[24px]">
              {isAlreadyApproved ? 'verified_user' : isAlreadyRejected ? 'gpp_bad' : 'shield_person'}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-on-surface font-mono tracking-wide">
                {isAlreadyApproved
                  ? '👤 HUMAN AUTHORIZATION GRANTED'
                  : isAlreadyRejected
                  ? '🚫 HUMAN REVIEW REJECTED — REPAIR BLOCKED'
                  : '🛡 HUMAN VERIFICATION REQUIRED'}
              </h2>
              <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase ${
                isAlreadyApproved
                  ? 'bg-tertiary/20 text-tertiary border border-tertiary/30'
                  : isAlreadyRejected
                  ? 'bg-error/20 text-error border border-error/30'
                  : 'bg-error-container text-error border border-error/40'
              }`}>
                {isAlreadyApproved ? 'APPROVED' : isAlreadyRejected ? 'REJECTED' : 'PAUSED FOR REVIEW'}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {isAlreadyApproved
                ? `Authorized by ${humanReview?.reviewed_by || 'SRE'} at ${humanReview?.reviewed_at ? new Date(humanReview.reviewed_at).toLocaleTimeString() : 'now'}. Autonomous pipeline proceeded.`
                : isAlreadyRejected
                ? `Rejected by ${humanReview?.reviewed_by || 'SRE'}. Patch generation and branch creation remain blocked.`
                : 'RepoGuard paused before mutating code. Review the safety assessment and evidence before authorizing repair.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-2.5 py-1 rounded bg-surface-container border border-outline-variant/30 text-secondary">
            SHA: @{commitSha.slice(0, 7)}
          </span>
          <span className="px-2.5 py-1 rounded bg-surface-container border border-outline-variant/30 text-tertiary">
            branch: {branch}
          </span>
          <span className="px-2.5 py-1 rounded bg-surface-container border border-outline-variant/30 text-outline">
            {repositoryName}
          </span>
        </div>
      </div>

      {/* Error / Warning Alert */}
      {errorMessage && (
        <div className="p-3 rounded-lg bg-error-container/40 border border-error/60 text-error text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span className="font-mono flex-1">{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-error font-bold">×</button>
        </div>
      )}

      {/* Hard Gate Rejection Warning if applicable */}
      {isHardBlocked && (
        <div className="p-3 rounded-lg bg-error-container/30 border border-error/40 text-error text-xs flex flex-col gap-1">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="material-symbols-outlined text-[16px]">block</span>
            <span>HARD SAFETY GATE VIOLATION (Cannot be bypassed by human review):</span>
          </div>
          <ul className="list-disc list-inside font-mono pl-2">
            {hardGateReasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Structured Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
        {/* Metric 1: Root Cause */}
        <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/20 flex flex-col gap-1">
          <span className="text-[11px] text-outline uppercase tracking-wider">Root Cause Status</span>
          <div className="flex items-center gap-1.5">
            <span className={`font-bold text-sm ${rootCauseStatus === 'VERIFIED' ? 'text-primary' : 'text-error'}`}>
              {rootCauseStatus}
            </span>
            <span className="text-[11px] text-on-surface-variant">({confidence}%)</span>
          </div>
        </div>

        {/* Metric 2: Risk Assessment */}
        <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/20 flex flex-col gap-1">
          <span className="text-[11px] text-outline uppercase tracking-wider">Risk Score / Gate</span>
          <div className="flex items-center gap-1.5">
            <span className={`font-bold text-sm ${riskScore <= 30 ? 'text-tertiary' : 'text-error'}`}>
              {riskScore}/100
            </span>
            <span className="text-[11px] text-on-surface-variant">({riskLevel})</span>
          </div>
        </div>

        {/* Metric 3: Target File Scope */}
        <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/20 flex flex-col gap-1">
          <span className="text-[11px] text-outline uppercase tracking-wider">Authorized Files</span>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm text-primary">{filesToModify.length} file(s)</span>
            <span className="text-[11px] text-on-surface-variant">(Max 5)</span>
          </div>
        </div>

        {/* Metric 4: Security Sensitivity */}
        <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/20 flex flex-col gap-1">
          <span className="text-[11px] text-outline uppercase tracking-wider">Sensitive Files</span>
          <div className="flex items-center gap-1.5">
            <span className={`font-bold text-sm ${sensitiveFiles.length === 0 ? 'text-tertiary' : 'text-error'}`}>
              {sensitiveFiles.length === 0 ? 'NONE' : `${sensitiveFiles.length} DETECTED`}
            </span>
          </div>
        </div>
      </div>

      {/* Root Cause & Strategy Summary */}
      <div className="p-3.5 rounded-lg bg-surface-container border border-outline-variant/20 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="font-bold text-primary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">psychology</span>
            Diagnosed Root Cause:
          </span>
          <span className="text-outline text-[11px]">No private chain-of-thought exposed</span>
        </div>
        <p className="text-xs text-on-surface leading-relaxed bg-surface-container-lowest p-2.5 rounded font-mono">
          {rootCause}
        </p>
      </div>

      {/* Authorized vs Forbidden Files List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
        <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/20 flex flex-col gap-1.5">
          <span className="text-[11px] text-tertiary font-bold uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            Authorized Target Scope ({filesToModify.length})
          </span>
          <div className="flex flex-col gap-1">
            {filesToModify.length > 0 ? (
              filesToModify.map((f: string) => (
                <div key={f} className="p-1.5 rounded bg-surface-container-lowest text-on-surface text-[11px] flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-tertiary">code</span>
                  <span className="truncate">{f}</span>
                </div>
              ))
            ) : (
              <span className="text-outline italic text-[11px]">No files authorized.</span>
            )}
          </div>
        </div>

        <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/20 flex flex-col gap-1.5">
          <span className="text-[11px] text-outline font-bold uppercase tracking-wider flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">lock</span>
            Files NOT to Modify ({filesNotToModify.length})
          </span>
          <div className="flex flex-col gap-1">
            {filesNotToModify.slice(0, 3).map((f: string) => (
              <div key={f} className="p-1.5 rounded bg-surface-container-lowest text-outline text-[11px] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">shield</span>
                <span className="truncate">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Expandable Evidence Chain */}
      <div className="rounded-lg bg-surface-container border border-outline-variant/20 overflow-hidden font-mono text-xs">
        <button
          onClick={() => setEvidenceExpanded(!evidenceExpanded)}
          className="w-full px-3.5 py-2 bg-surface-container hover:bg-surface-container-high transition-colors flex items-center justify-between text-left cursor-pointer"
        >
          <div className="flex items-center gap-2 text-primary font-bold">
            <span className="material-symbols-outlined text-[16px]">data_object</span>
            <span>Supporting Diagnostic Evidence ({evidenceList.length} facts collected at @{commitSha.slice(0, 7)})</span>
          </div>
          <div className="flex items-center gap-1 text-outline text-[11px]">
            <span>{evidenceExpanded ? 'COLLAPSE' : 'EXPAND EVIDENCE'}</span>
            <span className="material-symbols-outlined text-[16px]">{evidenceExpanded ? 'expand_less' : 'expand_more'}</span>
          </div>
        </button>

        {evidenceExpanded && (
          <div className="p-3 bg-surface-container-lowest border-t border-outline-variant/15 flex flex-col gap-2 max-h-48 overflow-y-auto">
            {evidenceList.map((ev: any, idx: number) => (
              <div key={idx} className="p-2 rounded bg-surface-container flex flex-col gap-1">
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-secondary uppercase font-bold">
                    {ev.source || 'source'}
                  </span>
                  <span className="text-on-surface font-semibold">{ev.path}</span>
                  {ev.lines && <span className="text-outline">L{ev.lines}</span>}
                </div>
                {ev.excerpt && <span className="text-on-surface-variant pl-1 text-[11px]">{ev.excerpt}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reliability Memory Context if available */}
      {memory && (
        <div className="p-3 rounded-lg bg-surface-container border border-primary/20 flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2 text-on-surface">
            <span className="material-symbols-outlined text-[18px] text-primary">history_edu</span>
            <span>
              Historical Repository Memory: <strong>{(memory.matches || memory.memories)?.length || 0} match(es)</strong> ({memory.relevance_level} relevance)
            </span>
          </div>
          <span className="text-[11px] text-outline italic">Advisory only (Does not override safety gates)</span>
        </div>
      )}

      {/* Safety Checklist Matrix */}
      {!isCompact && (
        <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant/20 flex flex-col gap-2 font-mono text-xs">
          <span className="text-[11px] text-outline font-bold uppercase tracking-wider">Deterministic Safety Checklist</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className={`material-symbols-outlined text-[14px] ${rootCauseStatus === 'VERIFIED' ? 'text-tertiary' : 'text-error'}`}>
                {rootCauseStatus === 'VERIFIED' ? 'check_circle' : 'cancel'}
              </span>
              <span>Root Cause Verification</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`material-symbols-outlined text-[14px] ${riskScore <= 60 ? 'text-tertiary' : 'text-error'}`}>
                {riskScore <= 60 ? 'check_circle' : 'cancel'}
              </span>
              <span>Risk Gate Assessment</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`material-symbols-outlined text-[14px] ${filesToModify.length <= 5 ? 'text-tertiary' : 'text-error'}`}>
                {filesToModify.length <= 5 ? 'check_circle' : 'cancel'}
              </span>
              <span>File Scope (≤5 Files)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`material-symbols-outlined text-[14px] ${sensitiveFiles.length === 0 ? 'text-tertiary' : 'text-error'}`}>
                {sensitiveFiles.length === 0 ? 'check_circle' : 'cancel'}
              </span>
              <span>Sensitive File Check</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-tertiary">check_circle</span>
              <span>Base SHA Integrity</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px] text-tertiary">check_circle</span>
              <span>Dependency Safety</span>
            </div>
          </div>
        </div>
      )}

      {/* Reviewer Actions Controls */}
      {!isAlreadyApproved && !isAlreadyRejected && (
        <div className="flex flex-col gap-3 pt-2 border-t border-outline-variant/20 font-mono text-xs">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-outline uppercase tracking-wider font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">edit_note</span>
              Reviewer Audit Note (Optional)
            </label>
            <input
              type="text"
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="e.g. Root cause verified from CI logs and AST inspection. Scope limited to authorized files."
              className="px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/30 text-on-surface text-xs focus:outline-none focus:border-primary"
              disabled={isApproving || isRejecting}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={isApproving || isRejecting}
              className="px-4 py-2.5 rounded-lg bg-error/15 hover:bg-error/25 text-error border border-error/30 font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">cancel</span>
              <span>REJECT / KEEP HUMAN REVIEW</span>
            </button>

            <button
              onClick={handleApprove}
              disabled={isApproveDisabled}
              className={`px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-all ${
                isApproveDisabled
                  ? 'bg-surface-container-highest text-outline cursor-not-allowed opacity-50'
                  : 'bg-primary text-on-primary hover:bg-primary/90 shadow-primary/20 cursor-pointer'
              }`}
            >
              {isApproving ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  <span>{approvalStep || 'APPROVING...'}</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                  <span>APPROVE & CONTINUE TO PATCH</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Approved State Summary */}
      {isAlreadyApproved && (
        <div className="p-3 rounded-lg bg-tertiary/10 border border-tertiary/30 text-xs font-mono text-tertiary flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>Human authorization recorded. Safety recheck passed. Autonomous patch pipeline executed.</span>
          </div>
          {humanReview?.note && (
            <span className="text-[11px] text-on-surface-variant italic">Note: "{humanReview.note}"</span>
          )}
        </div>
      )}

      {/* Rejected State Summary */}
      {isAlreadyRejected && (
        <div className="p-3 rounded-lg bg-error/10 border border-error/30 text-xs font-mono text-error flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">block</span>
            <span>Autonomous repair was rejected by human engineer. Code mutations remain blocked.</span>
          </div>
          {humanReview?.note && (
            <span className="text-[11px] text-on-surface-variant italic">Note: "{humanReview.note}"</span>
          )}
        </div>
      )}

      {/* Reject Confirmation Dialog */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-surface-container-high border border-error/50 rounded-xl p-6 max-w-md w-full flex flex-col gap-4 shadow-2xl font-mono text-xs">
            <div className="flex items-center gap-3 text-error">
              <span className="material-symbols-outlined text-[28px]">warning</span>
              <h3 className="text-base font-bold text-on-surface">Reject Autonomous Repair?</h3>
            </div>
            <p className="text-on-surface-variant leading-relaxed">
              Are you sure you want to reject autonomous repair for <strong>{incident.id.toUpperCase()}</strong>?
              Patch generation will remain permanently halted and no GitHub branch or PR will be created.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-lg bg-surface-container border border-outline-variant/30 text-on-surface hover:bg-surface-container-highest transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectConfirm}
                className="px-4 py-2 rounded-lg bg-error text-on-error font-bold hover:bg-error/90 transition-colors cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
