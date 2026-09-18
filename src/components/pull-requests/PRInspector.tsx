import type { PullRequest } from '../../types'
import { formatTimeAgo } from '../../data/mockData'

interface PRInspectorProps {
  pr: PullRequest
  onMerge: (id: string) => void
}

export default function PRInspector({ pr, onMerge }: PRInspectorProps) {
  const isMerged = pr.status === 'merged'
  const confidencePct = Math.round(pr.confidence * 100)

  return (
    <div className="w-full lg:w-[380px] lg:min-w-[360px] flex-shrink-0 bg-surface-container-high border border-outline-variant/30 rounded-xl p-5 flex flex-col gap-5 shadow-sm">
      {/* Inspector Header */}
      <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="material-symbols-outlined text-primary text-[20px] flex-shrink-0">analytics</span>
          <h2 className="font-mono font-bold text-on-surface text-sm truncate">
            PR Inspector & Audit
          </h2>
        </div>
        <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20 flex-shrink-0">
          #{pr.pr_number}
        </span>
      </div>

      {/* Selected PR Overview Card */}
      <div className="flex flex-col gap-1.5 bg-surface-container/60 p-3.5 rounded-lg border border-outline-variant/20 font-mono text-xs">
        <span className="text-on-surface-variant text-[11px] uppercase tracking-wider font-semibold">Title</span>
        <h3 className="font-sans font-semibold text-on-surface text-sm leading-snug break-words">
          {pr.title}
        </h3>
        <div className="flex items-center gap-2 mt-1 text-on-surface-variant text-[11px]">
          <span>Repo: <strong className="text-on-surface">{pr.repository_name}</strong></span>
        </div>
      </div>

      {/* Verification Score Block */}
      <div className="bg-surface-container rounded-xl p-4 border border-outline-variant/25 flex flex-col items-center gap-3">
        <span className="text-[11px] font-mono text-on-surface-variant uppercase tracking-wider font-semibold">
          AI Verification Score
        </span>
        
        <div className="flex items-baseline gap-1">
          <span className="text-4xl md:text-5xl font-bold font-mono text-tertiary tracking-tight">
            {confidencePct}%
          </span>
        </div>

        <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-tertiary/15 text-tertiary border border-tertiary/30">
          ✓ TRUST GATE PASSED
        </span>

        {/* Audit Checklist */}
        <div className="w-full mt-2 pt-3 border-t border-outline-variant/20 flex flex-col gap-2 font-mono text-xs">
          <div className="flex items-center justify-between text-tertiary">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>Tests Passed</span>
            </div>
            <span className="text-[11px] text-on-surface-variant">100% (8/8)</span>
          </div>

          <div className="flex items-center justify-between text-tertiary">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>No Regressions</span>
            </div>
            <span className="text-[11px] text-on-surface-variant">Zero side-effects</span>
          </div>

          <div className="flex items-center justify-between text-tertiary">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>Security Scan Clean</span>
            </div>
            <span className="text-[11px] text-on-surface-variant">0 CVEs</span>
          </div>

          <div className="flex items-center justify-between text-tertiary">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>Typecheck Passed</span>
            </div>
            <span className="text-[11px] text-on-surface-variant">0 errors</span>
          </div>
        </div>
      </div>

      {/* Details Breakdown */}
      <div className="flex flex-col gap-2.5 font-mono text-xs">
        <div className="flex justify-between py-1.5 border-b border-outline-variant/10">
          <span className="text-on-surface-variant">Status</span>
          <span className={`font-bold uppercase ${isMerged ? 'text-tertiary' : 'text-primary'}`}>
            {pr.status}
          </span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-outline-variant/10">
          <span className="text-on-surface-variant">Incident ID</span>
          <span className="text-secondary font-bold">{pr.incident_id.toUpperCase()}</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-outline-variant/10">
          <span className="text-on-surface-variant">Model Used</span>
          <span className="text-on-surface">Nemotron 3 Ultra</span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-outline-variant/10">
          <span className="text-on-surface-variant">Changes</span>
          <span className="text-on-surface">
            <span className="text-tertiary font-bold">+{pr.lines_added}</span>{' '}
            <span className="text-error font-bold">-{pr.lines_removed}</span> ({pr.files_changed} files)
          </span>
        </div>
        <div className="flex justify-between py-1.5 border-b border-outline-variant/10">
          <span className="text-on-surface-variant">Delivered</span>
          <span className="text-on-surface-variant">{formatTimeAgo(pr.created_at)}</span>
        </div>
      </div>

      {/* Dedicated Action Row */}
      <div className="flex flex-col sm:flex-row items-center gap-2 mt-auto pt-2">
        <a
          href={pr.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 w-full py-2.5 px-3 rounded-lg bg-surface-container-highest border border-outline-variant/30 text-on-surface hover:text-primary hover:border-primary/40 transition-all font-mono text-xs font-semibold"
        >
          <span>View on GitHub</span>
          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
        </a>

        {!isMerged ? (
          <button
            onClick={() => onMerge(pr.id)}
            className="flex-1 flex items-center justify-center gap-1.5 w-full py-2.5 px-3 rounded-lg bg-tertiary/20 text-tertiary border border-tertiary/40 hover:bg-tertiary/30 transition-all font-mono text-xs font-semibold cursor-pointer shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">merge</span>
            <span>Merge PR</span>
          </button>
        ) : (
          <div className="flex-1 flex items-center justify-center gap-1.5 w-full py-2.5 px-3 rounded-lg bg-tertiary/10 text-tertiary border border-tertiary/20 font-mono text-xs font-semibold">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>PR Merged</span>
          </div>
        )}
      </div>
    </div>
  )
}
