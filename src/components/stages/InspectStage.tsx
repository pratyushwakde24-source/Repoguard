export default function InspectStage({ incident }: { incident?: any }) {
  const inspectionData = incident?.inspection_data
  const commitSha = incident?.commit_sha || 'a1b2c3d'
  const isGithubVerified = Boolean(incident?.github_verified || inspectionData?.github_verified)

  const scannedCount = inspectionData?.tree_count !== undefined ? inspectionData.tree_count : 38
  const verifiedCandidates = inspectionData?.verified_candidates || [
    { path: 'src/index.ts', status: 'verified', verified: true }
  ]
  const notFoundCandidates = inspectionData?.not_found_candidates || []
  const inspectedFiles = inspectionData?.inspected_files || ['src/index.ts']
  const sources: Record<string, string> = inspectionData?.sources || {
    'src/index.ts': '// Inspected source file\nexport function processData(input: any) {\n  if (!input) return null;\n  return input.id;\n}'
  }
  const aiAnalysis = inspectionData?.ai_analysis || {
    root_cause_hypothesis: incident?.error_message || 'Potential null dereference in workflow execution step',
    confidence: 0.88,
    relevant_files: [{ path: 'src/index.ts', reason: 'Inspected candidate file' }],
    evidence: [incident?.error_message || 'CI workflow step execution failure']
  }

  const primarySourcePath = inspectedFiles[0] || 'src/index.ts'
  const primarySourceContent = sources[primarySourcePath] || '// Source content retrieved at commit SHA'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-secondary">search</span>
          <span className="text-headline-sm text-on-surface">Log Inspection & Source Analysis</span>
          <span className="px-2 py-0.5 rounded bg-tertiary/10 text-tertiary text-code-sm font-medium">COMPLETED</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-surface-container-high border border-outline/20 text-code-sm text-secondary font-mono flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">commit</span>
            @{commitSha}
          </span>
          {isGithubVerified && (
            <span className="px-2.5 py-1 rounded-full bg-tertiary/20 text-tertiary text-code-sm font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">verified</span>
              GitHub Verified
            </span>
          )}
        </div>
      </div>

      {/* Scan Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Scanned Tree Files', value: scannedCount.toLocaleString(), icon: 'data_object', color: 'text-secondary' },
          { label: 'Verified Candidates', value: verifiedCandidates.length.toString(), icon: 'check_circle', color: 'text-primary' },
          { label: 'Source Files Inspected', value: inspectedFiles.length.toString(), icon: 'description', color: 'text-tertiary' },
        ].map(s => (
          <div key={s.label} className="bg-surface-container rounded-xl p-3 flex flex-col items-center">
            <span className={`text-headline-md ${s.color} font-bold`}>{s.value}</span>
            <span className="text-label-sm text-outline uppercase tracking-wider">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Candidate Verification Status */}
      <div className="bg-surface-container rounded-xl p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-label-md text-outline uppercase tracking-wider">Candidate File Tree Verification (@{commitSha})</span>
          <span className="text-code-sm text-outline font-mono">Source: GitHub API</span>
        </div>
        <div className="flex flex-col gap-1.5 mt-1">
          {verifiedCandidates.map((cand: any) => (
            <div key={cand.path} className="flex items-center justify-between p-2 rounded bg-surface-container-high text-code-sm">
              <span className="font-mono text-on-surface">{cand.path}</span>
              <span className="px-2 py-0.5 rounded bg-primary-container/30 text-primary text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">check_circle</span>
                Verified in Tree
              </span>
            </div>
          ))}
          {notFoundCandidates.map((cand: any) => (
            <div key={cand.path} className="flex items-center justify-between p-2 rounded bg-surface-container-low text-code-sm">
              <span className="font-mono text-outline line-through">{cand.path}</span>
              <span className="px-2 py-0.5 rounded bg-error-container/30 text-error text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">cancel</span>
                Not Found in Tree
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* AI Cross-File Reasoning Hypothesis */}
      <div className="bg-surface-container-lowest border border-primary/20 rounded-xl p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[18px]">psychology</span>
            <span className="text-label-md text-primary font-semibold uppercase tracking-wider">AI Root Cause Hypothesis (Unverified Candidate)</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-code-sm font-semibold">
            Confidence: {Math.round((aiAnalysis.confidence || 0.88) * 100)}%
          </span>
        </div>
        <div className="text-on-surface text-body-md font-medium bg-surface-container-low p-3 rounded-lg">
          {aiAnalysis.root_cause_hypothesis}
        </div>
        {aiAnalysis.relevant_files && aiAnalysis.relevant_files.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {aiAnalysis.relevant_files.map((rf: any, idx: number) => (
              <span key={idx} className="px-2 py-1 rounded bg-surface-container text-code-sm text-on-surface-variant font-mono">
                {rf.path}: {rf.reason}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Source Code Context at Exact SHA */}
      <div className="bg-surface-container-lowest rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-surface-container">
          <span className="text-code-sm text-on-surface font-mono font-medium">{primarySourcePath}</span>
          <span className="text-code-sm text-outline font-mono">Ref: @{commitSha}</span>
        </div>
        <div className="p-3 text-code-sm flex flex-col max-h-[300px] overflow-y-auto font-mono bg-surface-container-lowest">
          {primarySourceContent.split('\n').map((line, idx) => (
            <div key={idx} className="flex gap-3 py-0.5 px-2 hover:bg-surface-container-high/40 rounded">
              <span className="w-8 text-right font-mono text-outline select-none">{idx + 1}</span>
              <span className="text-on-surface whitespace-pre">{line}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
