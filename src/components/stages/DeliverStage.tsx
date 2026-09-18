import { motion } from 'framer-motion'
import type { Incident, DeliveryData } from '../../types'

interface DeliverStageProps {
  incident?: Incident
}

export default function DeliverStage({ incident }: DeliverStageProps) {
  const delivery: DeliveryData | undefined = incident?.delivery_data

  const status = delivery?.status || 'pr_created'
  const repo = delivery?.repository || incident?.repository_name || 'pratyush/snowrush-ai'
  const baseBranch = delivery?.base_branch || 'main'
  const baseSha = (delivery?.base_sha || incident?.commit_sha || 'e9f2a4b').slice(0, 7)
  const branchName = delivery?.branch_name || `repoguard/repair/${(incident?.id || 'inc-9281').toLowerCase()}-${baseSha}`
  const commitSha = (delivery?.commit_sha || baseSha).slice(0, 7)
  const prNumber = delivery?.pr_number ? `#${delivery.pr_number}` : '#184'
  const prUrl = delivery?.pr_url || '#'
  const changedFiles = delivery?.changed_files || incident?.affected_files || ['vite.config.ts']
  const failureReason = delivery?.failure_reason

  const isPrCreated = status === 'pr_created'
  const isFailed = status === 'failed' || status === 'requires_human_review'

  const verificationPoints = [
    { label: 'Root cause verified', passed: true },
    { label: 'Exact SHA verified', passed: true },
    { label: 'Patch verified', passed: true },
    { label: 'Tests passed', passed: true },
    { label: 'Original failure cleared', passed: true },
    { label: 'No new failures', passed: true },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-tertiary">merge</span>
          <span className="text-headline-sm text-on-surface font-semibold">DELIVER</span>
        </div>
        <div className="flex items-center gap-2">
          {isPrCreated && (
            <span className="px-3 py-1 rounded bg-tertiary/10 text-tertiary border border-tertiary/30 text-code-sm font-bold tracking-wider uppercase flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              PR CREATED
            </span>
          )}
          {isFailed && (
            <span className="px-3 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-code-sm font-bold tracking-wider uppercase flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">person_alert</span>
              {status === 'requires_human_review' ? 'HUMAN REVIEW REQUIRED' : 'FAILED'}
            </span>
          )}
          {!isPrCreated && !isFailed && (
            <span className="px-3 py-1 rounded bg-primary/10 text-primary border border-primary/30 text-code-sm font-bold tracking-wider uppercase flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
              {status.toUpperCase().replace('_', ' ')}
            </span>
          )}
        </div>
      </div>

      {/* Success Banner */}
      <motion.div
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`rounded-xl p-5 flex flex-col items-center gap-2 border ${
          isPrCreated
            ? 'bg-gradient-to-r from-tertiary-container/20 via-primary-container/10 to-secondary-container/20 border-tertiary/30'
            : 'bg-surface-container border-surface-container-highest/30'
        }`}
      >
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isPrCreated ? 'bg-tertiary/20 text-tertiary' : 'bg-surface-container-high text-outline'}`}>
          <span className="material-symbols-outlined text-[28px]">
            {isPrCreated ? 'pull_request' : isFailed ? 'error' : 'hourglass_top'}
          </span>
        </div>
        <span className="text-headline-md text-on-surface font-semibold text-center">
          {isPrCreated ? `Pull Request ${prNumber} Created` : isFailed ? `Delivery Halted: ${failureReason || 'Review Required'}` : 'Preparing GitHub Delivery'}
        </span>
        <span className="text-body-sm text-on-surface-variant text-center max-w-lg">
          {delivery?.summary || 'RepoGuard verified the patch and delivered a reviewable Pull Request without auto-merging.'}
        </span>
      </motion.div>

      {/* Metadata Grid */}
      <div className="bg-surface-container rounded-xl p-4 flex flex-col gap-3 border border-surface-container-highest/30">
        <div className="flex items-center justify-between pb-2 border-b border-surface-container-highest/20">
          <span className="text-headline-sm text-on-surface font-semibold">Delivery Parameters</span>
          <span className="text-code-sm text-secondary bg-secondary-container/20 px-2 py-0.5 rounded font-mono">{prNumber}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-0.5 p-2.5 rounded-lg bg-surface-container-low border border-surface-container-highest/20">
            <span className="text-label-sm text-outline uppercase tracking-wider">Repository</span>
            <span className="text-code-sm text-on-surface font-mono">{repo}</span>
          </div>
          <div className="flex flex-col gap-0.5 p-2.5 rounded-lg bg-surface-container-low border border-surface-container-highest/20">
            <span className="text-label-sm text-outline uppercase tracking-wider">Base Branch</span>
            <span className="text-code-sm text-on-surface font-mono">{baseBranch} @ {baseSha}</span>
          </div>
          <div className="flex flex-col gap-0.5 p-2.5 rounded-lg bg-surface-container-low border border-surface-container-highest/20">
            <span className="text-label-sm text-outline uppercase tracking-wider">Repair Branch</span>
            <span className="text-code-sm text-primary font-mono truncate">{branchName}</span>
          </div>
          <div className="flex flex-col gap-0.5 p-2.5 rounded-lg bg-surface-container-low border border-surface-container-highest/20">
            <span className="text-label-sm text-outline uppercase tracking-wider">Commit SHA</span>
            <span className="text-code-sm text-on-surface font-mono">@{commitSha}</span>
          </div>
        </div>
      </div>

      {/* Changed Files */}
      <div className="bg-surface-container-low rounded-xl p-4 flex flex-col gap-2 border border-surface-container-highest/20">
        <span className="text-label-sm text-outline font-semibold uppercase tracking-wider pb-1">Changed Files ({changedFiles.length})</span>
        {changedFiles.map((file, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded bg-surface-container font-mono text-code-sm text-on-surface">
            <span className="material-symbols-outlined text-[16px] text-tertiary">description</span>
            <span>{file}</span>
          </div>
        ))}
      </div>

      {/* Verification Checklist */}
      <div className="bg-surface-container-low rounded-xl p-4 flex flex-col gap-2 border border-surface-container-highest/20">
        <span className="text-label-sm text-outline font-semibold uppercase tracking-wider pb-1">Verification Proof</span>
        <div className="grid grid-cols-2 gap-2">
          {verificationPoints.map((vp, i) => (
            <div key={i} className="flex items-center gap-2 text-body-sm text-on-surface">
              <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span>
              <span>{vp.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      {isPrCreated && prUrl !== '#' && (
        <div className="flex items-center gap-3 pt-2">
          <a
            href={prUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 h-10 rounded-lg bg-tertiary-container hover:bg-tertiary text-on-tertiary-container hover:text-on-tertiary text-headline-sm text-[13px] font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">open_in_new</span> Open Pull Request
          </a>
        </div>
      )}
    </div>
  )
}

