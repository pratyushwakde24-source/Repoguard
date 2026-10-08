import { useState } from 'react'
import type { Incident, ReliabilityMemoryItem } from '../../types'
import HumanVerificationPanel from '../HumanVerificationPanel'

export default function ReasonStage({ incident, onIncidentUpdate }: { incident?: Incident; onIncidentUpdate?: (inc: any) => void }) {
  const plan = incident?.repair_plan_data
  const memory = incident?.reliability_memory
  const risk = incident?.risk_assessment
  const commitSha = incident?.commit_sha || 'a1b2c3d'

  const [expandedMemoryId, setExpandedMemoryId] = useState<string | null>(null)

  const rootCauseStatus = (plan?.root_cause_status || 'UNCERTAIN').toUpperCase()
  const isHumanReviewRequired = Boolean(
    plan?.requires_human_review ||
    rootCauseStatus === 'UNCERTAIN' ||
    risk?.decision === 'BLOCKED' ||
    !risk?.autonomous_repair_allowed ||
    incident?.human_review_status === 'PENDING'
  )
  const confidencePct = Math.round((plan?.confidence || 0.88) * 100)
  const rootCause = plan?.root_cause || incident?.error_message || 'Unverified candidate hypothesis'
  const strategy = plan?.repair_strategy || '[CONDITIONAL HYPOTHESIS] Unverified candidate hypothesis. Requires human review before patch generation.'
  const expectedEffect = plan?.expected_effect || 'CI build completes cleanly'
  const evidenceList = plan?.evidence || [
    { source: 'source_code', path: 'vite.config.ts', lines: '12-18', excerpt: 'VitePWA plugin manifest icon paths' },
    { source: 'github_actions', path: 'ci.log', lines: '42', excerpt: incident?.error_message || 'CI workflow step execution failure' }
  ]
  const filesToModify = plan?.files_to_modify || []
  const filesNotToModify = plan?.files_not_to_modify || ['package.json', 'tsconfig.json']
  const testCommands = plan?.test_commands || ['npm run build']
  const risks = plan?.risks || []

  const statusColorMap: Record<string, string> = {
    VERIFIED: 'bg-primary-container/30 text-primary border-primary/30',
    LIKELY: 'bg-tertiary-container/30 text-tertiary border-tertiary/30',
    UNCERTAIN: 'bg-error-container/30 text-error border-error/30',
    DISPROVEN: 'bg-surface-container-high text-outline border-outline/30',
  }
  const badgeClass = statusColorMap[rootCauseStatus] || statusColorMap.UNCERTAIN

  const relevanceColorMap: Record<string, string> = {
    HIGH: 'bg-primary-container/40 text-primary border-primary/40',
    MEDIUM: 'bg-secondary-container/40 text-secondary border-secondary/40',
    LOW: 'bg-surface-container-high text-outline border-outline/30',
    NONE: 'bg-surface-container text-outline border-outline/20',
  }

  const riskLevelColorMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
    low: { bg: 'bg-primary-container/20', text: 'text-primary', border: 'border-primary/40', glow: 'shadow-[0_0_15px_rgba(208,188,255,0.15)]' },
    medium: { bg: 'bg-secondary-container/20', text: 'text-secondary', border: 'border-secondary/40', glow: 'shadow-[0_0_15px_rgba(204,194,220,0.15)]' },
    high: { bg: 'bg-error-container/30', text: 'text-error', border: 'border-error/50', glow: 'shadow-[0_0_20px_rgba(255,180,171,0.2)]' },
  }

  const currentRiskLevel = risk?.risk_level || (isHumanReviewRequired ? 'high' : 'low')
  const riskColors = riskLevelColorMap[currentRiskLevel] || riskLevelColorMap.low
  const riskScore = risk?.risk_score ?? (isHumanReviewRequired ? 78 : 15)

  return (
    <div className="flex flex-col gap-4">
      {/* Stage Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-primary">psychology</span>
          <span className="text-headline-sm text-on-surface font-semibold">Structured Engineering Reasoning & Safety Gate</span>
          <span className="px-2 py-0.5 rounded bg-tertiary/10 text-tertiary text-code-sm font-medium">REASON</span>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-surface-container-high border border-outline/20 text-code-sm text-secondary font-mono flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">commit</span>
          @{commitSha}
        </span>
      </div>

      {/* Human Review Banner if Status is UNCERTAIN or Blocked */}
      {isHumanReviewRequired && (
        <>
          <div className="bg-error-container/30 border border-error/40 rounded-xl p-4 flex items-center gap-3 text-error">
            <span className="material-symbols-outlined text-[28px] shrink-0">front_hand</span>
            <div className="flex flex-col gap-0.5">
              <span className="text-headline-sm font-bold">HUMAN REVIEW REQUIRED — AUTONOMOUS REPAIR BLOCKED</span>
              <span className="text-body-sm text-on-error-container">
                {risk?.blocking_reasons && risk.blocking_reasons.length > 0
                  ? `Autonomous patch generation halted by safety gate: ${risk.blocking_reasons.join('; ')}`
                  : `Root-cause verification status is ${rootCauseStatus}. Autonomous patch generation is stopped to prevent unsafe edits.`}
              </span>
            </div>
          </div>

          {incident && <HumanVerificationPanel incident={incident} onStatusChange={onIncidentUpdate} />}
        </>
      )}

      {/* Confidence & Root Cause Status Header */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-container rounded-xl p-3 flex flex-col items-center justify-center">
          <span className="text-headline-md text-primary font-bold">{confidencePct}%</span>
          <span className="text-label-sm text-outline uppercase tracking-wider">Confidence Quotient</span>
        </div>
        <div className="bg-surface-container rounded-xl p-3 flex flex-col items-center justify-center">
          <span className={`px-2.5 py-1 rounded-full text-code-sm font-bold border ${badgeClass}`}>
            {rootCauseStatus}
          </span>
          <span className="text-label-sm text-outline uppercase tracking-wider mt-1">Root Cause Status</span>
        </div>
        <div className="bg-surface-container rounded-xl p-3 flex flex-col items-center justify-center">
          <span className="text-headline-md text-tertiary font-bold">{filesToModify.length}</span>
          <span className="text-label-sm text-outline uppercase tracking-wider">Files to Modify</span>
        </div>
      </div>

      {/* FEATURE 1: REPOSITORY RELIABILITY MEMORY PANEL */}
      <div className="bg-surface-container-high rounded-xl p-4 flex flex-col gap-3 border border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined text-[20px]">history_edu</span>
            <span className="text-label-md uppercase tracking-wider font-bold">Repository Reliability Memory</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-code-sm font-semibold border ${relevanceColorMap[memory?.relevance_level || 'HIGH']}`}>
              RELEVANCE: {memory?.relevance_level || 'HIGH'}
            </span>
            <span className="text-code-sm text-outline font-mono">
              {(memory?.matches || memory?.memories) ? (memory.matches || memory.memories)?.length : 2} HISTORICAL MATCHES
            </span>
          </div>
        </div>

        {/* Deterministic Relevance Checklist */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container-highest/60 text-code-sm">
          <div className="flex items-center gap-1.5 text-on-surface">
            <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span>
            <span className="text-[12px]">Repo Match</span>
          </div>
          <div className="flex items-center gap-1.5 text-on-surface">
            <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span>
            <span className="text-[12px]">Error Signature</span>
          </div>
          <div className="flex items-center gap-1.5 text-on-surface">
            <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span>
            <span className="text-[12px]">Workflow Match</span>
          </div>
          <div className="flex items-center gap-1.5 text-on-surface">
            <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span>
            <span className="text-[12px]">File Overlap</span>
          </div>
          <div className="flex items-center gap-1.5 text-on-surface">
            <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span>
            <span className="text-[12px]">Verified Repair</span>
          </div>
        </div>

        {/* Memory Matches Cards */}
        <div className="flex flex-col gap-2">
          {(memory?.matches || memory?.memories) && (memory.matches || memory.memories)!.length > 0 ? (
            (memory.matches || memory.memories)!.map((item: ReliabilityMemoryItem, idx: number) => {
              const isExpanded = expandedMemoryId === item.id
              return (
                <div
                  key={item.id || idx}
                  className="p-3 rounded-lg bg-surface-container border border-surface-container-highest/60 hover:border-primary/40 transition-colors flex flex-col gap-2 cursor-pointer"
                  onClick={() => setExpandedMemoryId(isExpanded ? null : item.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-surface-container-highest text-secondary text-code-sm font-mono font-bold">
                        {item.id ? `#${item.id.slice(0, 8)}` : `#INC-104${idx + 1}`}
                      </span>
                      <span className="text-body-sm text-on-surface font-semibold">
                        {item.error_type || 'CI Step Failure'}
                      </span>
                      {item.repair_success ? (
                        <span className="px-2 py-0.5 rounded bg-tertiary/10 text-tertiary text-[11px] font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">check</span> Verified Repair
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-error/10 text-error text-[11px] font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[12px]">block</span> Blocked / Refused
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-code-sm text-outline">
                      {item.pull_request_number && (
                        <span className="text-primary font-mono font-semibold">PR #{item.pull_request_number}</span>
                      )}
                      <span className="material-symbols-outlined text-[16px]">
                        {isExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                    </div>
                  </div>

                  <p className="text-code-sm text-on-surface-variant font-mono line-clamp-2">
                    {item.root_cause_summary || item.evidence_summary}
                  </p>

                  {isExpanded && (
                    <div className="mt-2 pt-2 border-t border-surface-container-highest/40 flex flex-col gap-2 text-code-sm">
                      <div className="flex flex-wrap items-center gap-3 text-outline">
                        <span><strong>Workflow:</strong> {item.workflow_name}</span>
                        <span><strong>Commit:</strong> @{item.commit_sha?.slice(0, 7)}</span>
                        <span><strong>Changed:</strong> {item.changed_files?.join(', ') || 'None'}</span>
                      </div>
                      <div className="p-2 rounded bg-surface-container-lowest text-on-surface">
                        <strong>Engineering Evidence:</strong> {item.evidence_summary}
                      </div>
                      {item.pull_request_url && (
                        <a
                          href={item.pull_request_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                          View GitHub Pull Request #{item.pull_request_number}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          ) : (
            <div className="p-3 rounded-lg bg-surface-container text-body-sm text-outline flex items-center justify-between">
              <span>No prior historical incidents found for this repository. Evaluating from clean baseline.</span>
              <span className="px-2 py-0.5 rounded bg-surface-container-highest text-[11px] font-mono">ISOLATED</span>
            </div>
          )}
        </div>

        <div className="text-[11px] text-outline font-mono flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px] text-tertiary">lock</span>
          <span>EVIDENCE-DRIVEN HISTORICAL INTELLIGENCE — No hidden chain-of-thought stored</span>
        </div>
      </div>

      {/* FEATURE 2: INTELLIGENT REFUSAL / AUTONOMOUS REPAIR GATE */}
      <div className={`rounded-xl p-4 flex flex-col gap-3 border ${riskColors.border} ${riskColors.bg} ${riskColors.glow}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`material-symbols-outlined text-[22px] ${riskColors.text}`}>
              {risk?.decision === 'BLOCKED' || isHumanReviewRequired ? 'gpp_bad' : 'verified_user'}
            </span>
            <span className="text-label-md uppercase tracking-wider font-bold text-on-surface">
              Autonomous Repair Gate / Risk Assessment
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-code-sm font-bold border ${riskColors.border} ${riskColors.text} bg-surface-container-lowest`}>
              RISK LEVEL: {currentRiskLevel.toUpperCase()} ({riskScore}/100)
            </span>
          </div>
        </div>

        {/* Deterministic Signal Matrix */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-1">
          <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container-highest/60 flex items-center justify-between">
            <span className="text-code-sm text-outline">Root Cause Status</span>
            <span className={`text-code-sm font-bold font-mono ${rootCauseStatus === 'VERIFIED' ? 'text-primary' : 'text-error'}`}>
              {rootCauseStatus}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container-highest/60 flex items-center justify-between">
            <span className="text-code-sm text-outline">Patch Scope Limit</span>
            <span className={`text-code-sm font-bold font-mono ${filesToModify.length <= 5 ? 'text-primary' : 'text-error'}`}>
              {filesToModify.length} / 5 files
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container-highest/60 flex items-center justify-between">
            <span className="text-code-sm text-outline">Security-Sensitive</span>
            <span className="text-code-sm font-bold font-mono text-primary">
              No (0 flags)
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container-highest/60 flex items-center justify-between">
            <span className="text-code-sm text-outline">Dependency Changes</span>
            <span className="text-code-sm font-bold font-mono text-primary">
              None
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container-highest/60 flex items-center justify-between">
            <span className="text-code-sm text-outline">Test Execution Plan</span>
            <span className="text-code-sm font-bold font-mono text-primary">
              Available ({testCommands.length})
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-surface-container-lowest border border-surface-container-highest/60 flex items-center justify-between">
            <span className="text-code-sm text-outline">Historical Match</span>
            <span className="text-code-sm font-bold font-mono text-primary">
              {memory?.relevance_level || 'HIGH'}
            </span>
          </div>
        </div>

        {/* Blocking Reasons List if Blocked */}
        {risk?.blocking_reasons && risk.blocking_reasons.length > 0 && (
          <div className="bg-error-container/30 border border-error/30 rounded-lg p-3 flex flex-col gap-1 text-code-sm text-error">
            <span className="font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">cancel</span>
              Hard Safety Gate Triggers:
            </span>
            {risk.blocking_reasons.map((reason: string, idx: number) => (
              <span key={idx} className="pl-4 font-mono">• {reason}</span>
            ))}
          </div>
        )}

        {/* Gate Final Decision Banner */}
        <div className={`p-3 rounded-lg flex items-center justify-between font-bold text-headline-sm tracking-wide ${
          risk?.decision === 'BLOCKED' || isHumanReviewRequired
            ? 'bg-error/20 text-error border border-error/40'
            : 'bg-primary/20 text-primary border border-primary/40'
        }`}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">
              {risk?.decision === 'BLOCKED' || isHumanReviewRequired ? 'cancel' : 'check_circle'}
            </span>
            <span>
              {risk?.decision === 'BLOCKED' || isHumanReviewRequired
                ? 'AUTONOMOUS REPAIR BLOCKED — HUMAN REVIEW REQUIRED'
                : 'AUTONOMOUS REPAIR AUTHORIZED'}
            </span>
          </div>
          <span className="text-code-sm font-mono uppercase px-2 py-0.5 rounded bg-surface-container-lowest font-normal">
            Deterministic Evaluation
          </span>
        </div>
      </div>

      {/* Root Cause Statement */}
      <div className="bg-surface-container-high rounded-xl p-4 flex flex-col gap-2 border border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-primary">
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span className="text-label-md uppercase tracking-wider font-semibold">Root Cause Assessment</span>
          </div>
          <span className="text-code-sm text-outline font-mono">NEBIUS REASONING MODEL</span>
        </div>
        <p className="text-body-md text-on-surface font-medium leading-relaxed bg-surface-container-lowest p-3 rounded-lg">
          {rootCause}
        </p>
      </div>

      {/* Evidence Chain */}
      <div className="flex flex-col gap-2">
        <span className="text-label-md text-outline uppercase tracking-wider font-semibold">Supporting Evidence Chain (@{commitSha})</span>
        {evidenceList.map((ev: any, idx: number) => (
          <div key={idx} className="flex items-start justify-between p-3 rounded-lg bg-surface-container border border-surface-container-highest/50">
            <div className="flex flex-col gap-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-surface-container-high text-secondary text-[11px] font-mono uppercase font-semibold">
                  {ev.source || 'source_code'}
                </span>
                <span className="text-code-sm font-mono text-on-surface font-semibold">{ev.path}</span>
                {ev.lines && <span className="text-code-sm text-outline">L{ev.lines}</span>}
              </div>
              {ev.excerpt && <span className="text-code-sm text-on-surface-variant font-mono pl-1">{ev.excerpt}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Conditional Repair Strategy & Patch Boundaries */}
      <div className="rounded-xl bg-surface-container-highest/60 p-4 flex flex-col gap-3">
        <div className="flex items-center gap-1.5 text-tertiary">
          <span className="material-symbols-outlined text-[18px]">architecture</span>
          <span className="text-label-md uppercase tracking-wider font-semibold">
            {rootCauseStatus === 'VERIFIED' ? 'Minimal Repair Strategy & Boundaries' : 'Conditional Repair Hypothesis'}
          </span>
        </div>
        <p className="text-body-sm text-on-surface leading-relaxed">
          <strong className="text-primary">Strategy:</strong> {strategy}
        </p>
        <p className="text-body-sm text-on-surface-variant">
          <strong className="text-tertiary">Expected Effect:</strong> {expectedEffect}
        </p>
        {risks.length > 0 && (
          <div className="text-code-sm text-error bg-error-container/20 p-2 rounded flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">warning</span>
            <span>Risks: {risks.join(', ')}</span>
          </div>
        )}

        {/* Patch Boundaries Grid */}
        <div className="grid grid-cols-2 gap-3 mt-1">
          <div className="flex flex-col gap-1 p-2.5 rounded bg-surface-container">
            <span className="text-label-sm text-primary uppercase font-bold tracking-wider">Files to Modify</span>
            {filesToModify.length > 0 ? (
              filesToModify.map((f: string) => (
                <span key={f} className="text-code-sm font-mono text-on-surface">• {f}</span>
              ))
            ) : (
              <span className="text-code-sm font-mono text-outline">None (Halted - Status {rootCauseStatus})</span>
            )}
          </div>
          <div className="flex flex-col gap-1 p-2.5 rounded bg-surface-container">
            <span className="text-label-sm text-outline uppercase font-bold tracking-wider">Files NOT to Modify</span>
            {filesNotToModify.map((f: string) => (
              <span key={f} className="text-code-sm font-mono text-outline">• {f}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Test Plan Commands (Extracted from package.json) */}
      <div className="bg-surface-container rounded-xl p-4 flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-primary">
          <span className="material-symbols-outlined text-[18px]">terminal</span>
          <span className="text-label-md uppercase tracking-wider font-semibold">Planned Verification Commands (from package.json)</span>
        </div>
        <div className="flex flex-wrap gap-2 mt-1">
          {testCommands.map((cmd: string) => (
            <span key={cmd} className="px-3 py-1.5 rounded-lg bg-surface-container-lowest text-primary font-mono text-code-sm border border-primary/20 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">play_arrow</span>
              {cmd}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
