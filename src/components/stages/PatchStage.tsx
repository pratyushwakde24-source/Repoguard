import { useState } from 'react'

export default function PatchStage({ incident }: { incident?: any }) {
  const patchData = incident?.patch_data
  const repairPlan = incident?.repair_plan_data
  const commitSha = patchData?.base_sha || incident?.commit_sha || 'a1b2c3d'

  const rawStatus = patchData?.patch_status || (repairPlan?.root_cause_status === 'verified' ? 'generating' : 'requires_human_review')

  const statusLabelMap: Record<string, string> = {
    generated: 'GENERATED',
    rejected: 'REJECTED',
    requires_human_review: 'HUMAN REVIEW REQUIRED',
    generating: 'GENERATING',
  }

  const statusColorMap: Record<string, string> = {
    generated: 'bg-tertiary-container/30 text-tertiary border-tertiary/30',
    rejected: 'bg-error-container/30 text-error border-error/30',
    requires_human_review: 'bg-error-container/30 text-error border-error/30',
    generating: 'bg-primary-container/30 text-primary border-primary/30',
  }

  const status = statusLabelMap[rawStatus] || 'HUMAN REVIEW REQUIRED'
  const badgeClass = statusColorMap[rawStatus] || statusColorMap.requires_human_review

  const authorizedFiles: string[] = repairPlan?.files_to_modify || incident?.affected_files || []
  const patchFiles: Array<{
    path: string
    original_content: string
    proposed_content: string
    diff: string
    reason: string
  }> = patchData?.files || []

  const [selectedFileIdx, setSelectedFileIdx] = useState<number>(0)
  const activePatchFile = patchFiles[selectedFileIdx] || patchFiles[0] || null

  const validationList = patchData?.validation_requirements || [
    { rule: 'Patch applies cleanly in sandbox', passed: rawStatus === 'generated' },
    { rule: 'Scope valid (authorized files only)', passed: rawStatus === 'generated' },
    { rule: 'Diff size bounded', passed: rawStatus === 'generated' },
    { rule: 'Base SHA verified', passed: Boolean(commitSha) },
  ]

  const risks: string[] = patchData?.risks || repairPlan?.risks || []
  const summary = patchData?.patch_summary || repairPlan?.repair_strategy || 'No patch summary available'

  // Parse raw unified diff into line items for syntax highlighting
  const renderDiffLines = (diffStr: string) => {
    if (!diffStr) return <div className="text-outline p-4 font-mono text-body-sm">No diff available.</div>
    const lines = diffStr.split(/\r?\n/)
    return lines.map((line, idx) => {
      let bg = 'hover:bg-surface-container-high/50'
      let textCol = 'text-on-surface'

      if (line.startsWith('+') && !line.startsWith('+++')) {
        bg = 'bg-tertiary/10 border-l-2 border-tertiary'
        textCol = 'text-tertiary font-medium'
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        bg = 'bg-error/10 border-l-2 border-error'
        textCol = 'text-error font-medium'
      } else if (line.startsWith('@@')) {
        bg = 'bg-primary-container/20 text-primary font-bold'
      } else if (line.startsWith('---') || line.startsWith('+++')) {
        textCol = 'text-outline font-semibold'
      }

      return (
        <div key={idx} className={`px-3 py-0.5 font-mono text-code-sm flex items-center gap-2 ${bg}`}>
          <span className="w-8 text-right text-outline select-none text-[11px] font-mono shrink-0">{idx + 1}</span>
          <span className={`whitespace-pre-wrap ${textCol}`}>{line}</span>
        </div>
      )
    })
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-primary">code</span>
          <span className="text-headline-sm text-on-surface">Verified Patch Artifact</span>
          <span className={`px-2.5 py-0.5 rounded border text-code-sm font-semibold tracking-wider ${badgeClass}`}>
            {status}
          </span>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-surface-container-high border border-outline/20 text-code-sm text-secondary font-mono flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">commit</span>
          Base SHA: @{commitSha}
        </span>
      </div>

      {/* Warning/Halt Banner if Status is not generated */}
      {rawStatus !== 'generated' && (
        <div className="bg-error-container/30 border border-error/40 rounded-xl p-4 flex items-center gap-3 text-error">
          <span className="material-symbols-outlined text-[24px]">shield_lock</span>
          <div className="flex flex-col gap-0.5">
            <span className="text-headline-sm font-bold">PATCH GENERATION HALTED / HUMAN REVIEW REQUIRED</span>
            <span className="text-body-sm text-on-error-container">
              {patchData?.rejection_reason || 'Autonomous patch generation requires a VERIFIED root cause and all safety gates passing.'}
            </span>
          </div>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left Column: Authorized & Changed Files + Summary */}
        <div className="col-span-4 flex flex-col gap-4">
          {/* Authorized Files Card */}
          <div className="bg-surface-container rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-label-sm text-outline uppercase tracking-wider font-semibold">Authorized Files (Step 4 Boundary)</span>
              <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface text-code-sm font-mono">
                {authorizedFiles.length} file(s)
              </span>
            </div>
            <div className="flex flex-col gap-1 mt-1">
              {authorizedFiles.length > 0 ? (
                authorizedFiles.map(f => (
                  <div key={f} className="flex items-center gap-2 p-2 rounded bg-surface-container-low text-code-sm text-on-surface border border-outline/10">
                    <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
                    <span className="font-mono text-on-surface truncate flex-1">{f}</span>
                  </div>
                ))
              ) : (
                <span className="text-body-sm text-outline italic">No authorized files declared.</span>
              )}
            </div>
          </div>

          {/* Changed Files Card */}
          <div className="bg-surface-container rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-label-sm text-outline uppercase tracking-wider font-semibold">Changed Files in Patch</span>
              <span className="px-2 py-0.5 rounded bg-tertiary/10 text-tertiary text-code-sm font-mono font-semibold">
                {patchFiles.length} file(s)
              </span>
            </div>
            <div className="flex flex-col gap-1 mt-1">
              {patchFiles.length > 0 ? (
                patchFiles.map((f, idx) => (
                  <button
                    key={f.path}
                    onClick={() => setSelectedFileIdx(idx)}
                    className={`flex items-center justify-between p-2 rounded text-code-sm transition-all text-left ${
                      selectedFileIdx === idx
                        ? 'bg-primary/15 border border-primary/40 text-primary font-medium'
                        : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="material-symbols-outlined text-[16px] text-tertiary">edit_note</span>
                      <span className="font-mono truncate">{f.path}</span>
                    </div>
                    <span className="material-symbols-outlined text-[16px] opacity-60">chevron_right</span>
                  </button>
                ))
              ) : (
                <span className="text-body-sm text-outline italic">Zero source files modified.</span>
              )}
            </div>
          </div>

          {/* Validation Requirements Checklist */}
          <div className="bg-surface-container rounded-xl p-4 flex flex-col gap-2">
            <span className="text-label-sm text-outline uppercase tracking-wider font-semibold">Patch Validation Checklist</span>
            <div className="flex flex-col gap-1.5 mt-1">
              {validationList.map((item: { rule: string; passed: boolean; details?: string }, idx: number) => (
                <div key={idx} className="flex items-start gap-2 text-body-sm">
                  <span className={`material-symbols-outlined text-[18px] shrink-0 ${item.passed ? 'text-tertiary' : 'text-error'}`}>
                    {item.passed ? 'check_circle' : 'cancel'}
                  </span>
                  <div className="flex flex-col">
                    <span className={item.passed ? 'text-on-surface' : 'text-error font-medium'}>{item.rule}</span>
                    {item.details && <span className="text-label-sm text-outline font-mono">{item.details}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risks Section */}
          {risks.length > 0 && (
            <div className="bg-surface-container rounded-xl p-4 flex flex-col gap-2">
              <span className="text-label-sm text-outline uppercase tracking-wider font-semibold text-secondary">Declared Patch Risks</span>
              <ul className="list-disc list-inside flex flex-col gap-1 text-body-sm text-on-surface-variant">
                {risks.map((risk: string, idx: number) => (
                  <li key={idx}>{risk}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right Column: Unified Diff Viewer & Summary */}
        <div className="col-span-8 flex flex-col gap-4">
          {/* Patch Summary Card */}
          <div className="bg-surface-container rounded-xl p-4 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-primary">
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              <span className="text-label-sm uppercase tracking-wider font-semibold">Patch Rationale & Summary</span>
            </div>
            <p className="text-body-sm text-on-surface leading-relaxed">{summary}</p>
          </div>

          {/* Syntax-Highlighted Unified Diff Viewer */}
          <div className="bg-surface-container-lowest border border-outline/20 rounded-xl overflow-hidden flex flex-col flex-1 min-h-[400px]">
            {/* Diff Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-surface-container border-b border-outline/20">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-secondary">difference</span>
                <span className="text-code-sm font-mono text-on-surface font-semibold">
                  {activePatchFile ? activePatchFile.path : 'Unified Diff Output'}
                </span>
              </div>
              <span className="text-label-sm text-outline font-mono">
                {activePatchFile ? `Reason: ${activePatchFile.reason}` : `Base SHA: @${commitSha}`}
              </span>
            </div>

            {/* Diff Body */}
            <div className="flex-1 overflow-x-auto overflow-y-auto max-h-[500px] py-2 bg-surface-container-lowest">
              {activePatchFile ? (
                renderDiffLines(activePatchFile.diff)
              ) : patchData?.patch_diff ? (
                renderDiffLines(patchData.patch_diff)
              ) : (
                <div className="p-8 text-center text-outline text-body-sm flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-[32px] opacity-40">code_off</span>
                  <span>No patch diff generated. Safety gates prevented patch generation.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
