import { useState } from 'react'

export default function TestStage({ incident }: { incident?: any }) {
  const testData = incident?.test_data
  const patchData = incident?.patch_data
  const commitSha = testData?.base_sha || incident?.commit_sha || 'a1b2c3d'

  const rawStatus = testData?.test_status || (patchData?.patch_status === 'generated' ? 'running' : 'requires_human_review')

  const statusLabelMap: Record<string, string> = {
    passed: 'PASSED',
    failed: 'FAILED',
    setup_failed: 'SETUP FAILED',
    timed_out: 'TIMED OUT',
    requires_human_review: 'HUMAN REVIEW REQUIRED',
    running: 'RUNNING',
  }

  const statusColorMap: Record<string, string> = {
    passed: 'bg-tertiary-container/30 text-tertiary border-tertiary/30',
    failed: 'bg-error-container/30 text-error border-error/30',
    setup_failed: 'bg-error-container/30 text-error border-error/30',
    timed_out: 'bg-error-container/30 text-error border-error/30',
    requires_human_review: 'bg-error-container/30 text-error border-error/30',
    running: 'bg-primary-container/30 text-primary border-primary/30',
  }

  const status = statusLabelMap[rawStatus] || 'HUMAN REVIEW REQUIRED'
  const badgeClass = statusColorMap[rawStatus] || statusColorMap.requires_human_review

  const comparisonResult = testData?.comparison_result || 'COMPARISON INCONCLUSIVE'
  const comparisonColorMap: Record<string, string> = {
    'ORIGINAL FAILURE CLEARED': 'bg-tertiary/15 text-tertiary border-tertiary/40',
    'FAILURE PERSISTS': 'bg-error/15 text-error border-error/40',
    'NEW FAILURE INTRODUCED': 'bg-error/15 text-error border-error/40',
    'COMPARISON INCONCLUSIVE': 'bg-surface-container-high text-outline border-outline/30',
  }
  const comparisonClass = comparisonColorMap[comparisonResult] || comparisonColorMap['COMPARISON INCONCLUSIVE']

  const commands = testData?.commands || [
    { command: 'npm run build', exit_code: 0, status: 'passed', duration_ms: 3200, stdout: 'Build completed cleanly', stderr: '' }
  ]

  const [selectedCommandIdx, setSelectedCommandIdx] = useState<number>(0)
  const activeCmd = commands[selectedCommandIdx] || commands[0] || null

  const originalFailureSig = testData?.original_failure?.failure_signature || incident?.error_message || 'CI workflow step build failure'
  const summary = testData?.summary || 'Isolated patch test execution details'

  return (
    <div className="flex flex-col gap-4">
      {/* Stage Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-tertiary">science</span>
          <span className="text-headline-sm text-on-surface">Isolated Patch Test Execution</span>
          <span className={`px-2.5 py-0.5 rounded border text-code-sm font-semibold tracking-wider ${badgeClass}`}>
            {status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-surface-container-high border border-outline/20 text-code-sm text-secondary font-mono flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">commit</span>
            Base SHA: @{commitSha}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-surface-container-high border border-outline/20 text-code-sm text-primary font-mono flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">token</span>
            Workspace: ISOLATED
          </span>
        </div>
      </div>

      {/* Comparison Result HUD */}
      <div className="bg-surface-container rounded-xl p-4 flex items-center justify-between border border-outline/20">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-[28px] text-primary">fact_check</span>
          <div className="flex flex-col">
            <span className="text-label-sm text-outline uppercase tracking-wider font-semibold">Failure Comparison Analysis</span>
            <span className="text-body-sm text-on-surface font-medium">{summary}</span>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full border text-code-sm font-bold tracking-wide ${comparisonClass}`}>
          {comparisonResult}
        </span>
      </div>

      {/* Main Grid: Commands List (Left) + Output & Details (Right) */}
      <div className="grid grid-cols-12 gap-4">
        {/* Left Column: Command Execution List & Original Failure */}
        <div className="col-span-4 flex flex-col gap-4">
          {/* Commands Card */}
          <div className="bg-surface-container rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-label-sm text-outline uppercase tracking-wider font-semibold">Executed Commands</span>
              <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface text-code-sm font-mono">
                {commands.length} command(s)
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {commands.map((cmdItem: any, idx: number) => {
                const isPassed = cmdItem.status === 'passed' || cmdItem.exit_code === 0
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedCommandIdx(idx)}
                    className={`flex flex-col p-3 rounded-lg border text-left transition-all ${
                      selectedCommandIdx === idx
                        ? 'bg-primary/10 border-primary/40'
                        : 'bg-surface-container-low border-outline/10 hover:bg-surface-container-high'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-code-sm font-mono font-bold text-on-surface truncate">{cmdItem.command}</span>
                      <span className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold uppercase ${
                        isPassed ? 'bg-tertiary/20 text-tertiary' : 'bg-error/20 text-error'
                      }`}>
                        {isPassed ? 'PASS' : 'FAIL'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-label-sm text-outline font-mono">
                      <span>exit code: {cmdItem.exit_code}</span>
                      <span>duration: {(cmdItem.duration_ms / 1000).toFixed(1)}s</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Original Failure Signature */}
          <div className="bg-surface-container rounded-xl p-4 flex flex-col gap-2 border border-outline/15">
            <span className="text-label-sm text-outline uppercase tracking-wider font-semibold text-secondary">Original Failure Signature</span>
            <div className="p-3 rounded bg-surface-container-lowest font-mono text-code-sm text-on-surface border border-outline/10 overflow-x-auto">
              {originalFailureSig}
            </div>
          </div>
        </div>

        {/* Right Column: Command Output Viewer */}
        <div className="col-span-8 flex flex-col gap-4">
          <div className="bg-surface-container-lowest border border-outline/20 rounded-xl overflow-hidden flex flex-col flex-1 min-h-[420px]">
            {/* Command Output Header */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-surface-container border-b border-outline/20">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">terminal</span>
                <span className="text-code-sm font-mono text-on-surface font-semibold">
                  {activeCmd ? activeCmd.command : 'Sanitized Execution Output'}
                </span>
              </div>
              {activeCmd && (
                <span className="text-label-sm font-mono text-outline">
                  Exit Code: {activeCmd.exit_code} | {(activeCmd.duration_ms / 1000).toFixed(2)}s
                </span>
              )}
            </div>

            {/* Output Display */}
            <div className="flex-1 p-4 font-mono text-code-sm overflow-x-auto overflow-y-auto max-h-[500px] bg-surface-container-lowest text-on-surface leading-relaxed whitespace-pre-wrap">
              {activeCmd ? (
                <div>
                  {activeCmd.stdout && (
                    <div className="mb-4">
                      <div className="text-label-sm text-tertiary font-bold mb-1">[STDOUT]</div>
                      <div>{activeCmd.stdout}</div>
                    </div>
                  )}
                  {activeCmd.stderr && (
                    <div>
                      <div className="text-label-sm text-error font-bold mb-1">[STDERR]</div>
                      <div className="text-error">{activeCmd.stderr}</div>
                    </div>
                  )}
                  {!activeCmd.stdout && !activeCmd.stderr && (
                    <div className="text-outline italic">Command produced zero standard output.</div>
                  )}
                </div>
              ) : (
                <div className="text-outline italic text-center py-8">No test command outputs recorded.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
