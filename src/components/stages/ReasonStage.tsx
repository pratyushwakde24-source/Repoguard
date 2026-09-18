export default function ReasonStage({ incident }: { incident?: any }) {
  const plan = incident?.repair_plan_data
  const commitSha = incident?.commit_sha || 'a1b2c3d'

  const rootCauseStatus = (plan?.root_cause_status || 'UNCERTAIN').toUpperCase()
  const isHumanReviewRequired = Boolean(plan?.requires_human_review || rootCauseStatus === 'UNCERTAIN')
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-primary">psychology</span>
          <span className="text-headline-sm text-on-surface">Structured Engineering Reasoning & Repair Plan</span>
          <span className="px-2 py-0.5 rounded bg-tertiary/10 text-tertiary text-code-sm font-medium">COMPLETED</span>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-surface-container-high border border-outline/20 text-code-sm text-secondary font-mono flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">commit</span>
          @{commitSha}
        </span>
      </div>

      {/* Human Review Banner if Status is UNCERTAIN */}
      {isHumanReviewRequired && (
        <div className="bg-error-container/30 border border-error/40 rounded-xl p-4 flex items-center gap-3 text-error">
          <span className="material-symbols-outlined text-[24px]">front_hand</span>
          <div className="flex flex-col gap-0.5">
            <span className="text-headline-sm font-bold">HUMAN REVIEW REQUIRED — AUTONOMOUS REPAIR HALTED</span>
            <span className="text-body-sm text-on-error-container">
              Root-cause verification status is <strong>{rootCauseStatus}</strong>. Autonomous patch generation is stopped to prevent unsafe edits.
            </span>
          </div>
        </div>
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


