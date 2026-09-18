import { motion } from 'framer-motion'
import type { PullRequest } from '../../types'
import { formatTimeAgo } from '../../data/mockData'

interface PRListItemProps {
  pr: PullRequest
  isSelected: boolean
  onSelect: (pr: PullRequest) => void
  onMerge: (id: string, e: React.MouseEvent) => void
}

export default function PRListItem({ pr, isSelected, onSelect, onMerge }: PRListItemProps) {
  const isMerged = pr.status === 'merged'

  return (
    <motion.div
      onClick={() => onSelect(pr)}
      whileHover={{ y: -1 }}
      className={`p-4 md:p-5 rounded-xl border transition-all cursor-pointer min-w-0 w-full ${
        isSelected
          ? 'bg-surface-container-high border-primary/50 shadow-lg shadow-primary/5'
          : 'bg-surface-container-high/60 border-outline-variant/30 hover:border-outline-variant/60 hover:bg-surface-container-high/90'
      }`}
    >
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 min-w-0 w-full">
        {/* Left + Center Block */}
        <div className="flex items-start gap-3 min-w-0 flex-1 w-full">
          {/* PR Icon + Number */}
          <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
            <span className={`material-symbols-outlined text-[20px] flex-shrink-0 ${
              isMerged ? 'text-tertiary' : 'text-primary'
            }`}>
              {isMerged ? 'merge' : 'call_merge'}
            </span>
            <span className="font-mono font-bold text-on-surface text-sm flex-shrink-0">
              #{pr.pr_number}
            </span>
          </div>

          {/* Center Info: Title, Repo, Branch */}
          <div className="min-w-0 flex-1 overflow-hidden">
            <h3 className="font-sans font-semibold text-on-surface text-sm md:text-base leading-snug break-words group-hover:text-primary transition-colors">
              {pr.title}
            </h3>

            <div className="flex items-center gap-2 flex-wrap font-mono text-xs text-on-surface-variant mt-1.5 min-w-0">
              <span className="text-on-surface-variant font-medium flex-shrink-0">
                {pr.repository_name}
              </span>
              <span className="text-outline-variant flex-shrink-0">•</span>
              <div className="flex items-center gap-1 min-w-0 max-w-[240px] md:max-w-[320px] text-secondary">
                <span className="text-on-surface-variant flex-shrink-0 text-[11px]">branch:</span>
                <code className="bg-surface-container px-1.5 py-0.5 rounded border border-outline-variant/20 truncate text-[11px]">
                  {pr.branch}
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Right Metadata & Action Block */}
        <div className="flex items-center justify-between lg:justify-end gap-3 md:gap-4 flex-shrink-0 w-full lg:w-auto pt-2 lg:pt-0 border-t lg:border-t-0 border-outline-variant/15">
          {/* Metadata Stack */}
          <div className="flex items-center gap-3 md:gap-4 font-mono text-xs flex-shrink-0">
            {/* Status Badge */}
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold uppercase whitespace-nowrap flex-shrink-0 border ${
              isMerged
                ? 'bg-tertiary/15 text-tertiary border-tertiary/30'
                : 'bg-primary/15 text-primary border-primary/30'
            }`}>
              {pr.status}
            </span>

            {/* Confidence Score */}
            <div className="flex items-center gap-1 whitespace-nowrap flex-shrink-0">
              <span className="text-on-surface-variant text-[11px] hidden sm:inline">Score:</span>
              <span className="font-bold text-tertiary text-xs">{Math.round(pr.confidence * 100)}%</span>
            </div>

            {/* Line Diffs */}
            <div className="flex items-center gap-1 text-[11px] whitespace-nowrap flex-shrink-0">
              <span className="text-tertiary font-bold">+{pr.lines_added}</span>
              <span className="text-error font-bold">-{pr.lines_removed}</span>
              <span className="text-on-surface-variant text-[10px] hidden sm:inline">({pr.files_changed} files)</span>
            </div>

            {/* Timestamp */}
            <span className="text-on-surface-variant text-[11px] whitespace-nowrap flex-shrink-0">
              {formatTimeAgo(pr.created_at)}
            </span>
          </div>

          {/* Inline Action Button if open */}
          {!isMerged && (
            <button
              onClick={(e) => onMerge(pr.id, e)}
              className="px-3 py-1.5 rounded-lg bg-tertiary/20 text-tertiary border border-tertiary/40 font-mono text-xs font-semibold hover:bg-tertiary/30 transition-all whitespace-nowrap flex-shrink-0 cursor-pointer shadow-sm"
            >
              Merge PR
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
