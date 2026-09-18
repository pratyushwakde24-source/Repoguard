interface PRPageHeaderProps {
  filter: 'all' | 'open' | 'merged'
  setFilter: (filter: 'all' | 'open' | 'merged') => void
  totalCount: number
  openCount: number
  mergedCount: number
}

export default function PRPageHeader({ filter, setFilter, totalCount, openCount, mergedCount }: PRPageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-surface-container-high border border-outline-variant/30 rounded-xl p-5 md:p-6 relative min-w-0 w-full shadow-sm">
      {/* Left Title Block */}
      <div className="flex items-center gap-4 min-w-0 flex-1">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-primary-container/30 border border-primary/40 flex items-center justify-center text-primary shadow-md shadow-primary/10 flex-shrink-0">
          <span className="material-symbols-outlined text-[28px] md:text-[32px]">call_merge</span>
        </div>
        
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[24px] md:text-[28px] lg:text-[32px] font-bold font-sans tracking-tight text-on-surface leading-tight truncate">
              AI Pull Requests
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-primary/15 text-primary border border-primary/30 whitespace-nowrap flex-shrink-0">
              AUTONOMOUS DELIVERIES
            </span>
          </div>
          <p className="text-xs md:text-sm font-sans text-on-surface-variant mt-0.5 truncate">
            Review and manage self-healing pull requests created by RepoGuard agent runs.
          </p>
        </div>
      </div>

      {/* Right Filter Tabs */}
      <div className="flex items-center gap-1.5 font-mono text-xs flex-shrink-0 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap cursor-pointer ${
            filter === 'all'
              ? 'bg-primary-container/40 text-primary border-primary/50 font-bold shadow-sm'
              : 'bg-surface-container text-on-surface-variant border-outline-variant/20 hover:text-on-surface hover:border-outline-variant/40'
          }`}
        >
          All ({totalCount})
        </button>
        <button
          onClick={() => setFilter('open')}
          className={`px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap cursor-pointer ${
            filter === 'open'
              ? 'bg-primary-container/40 text-primary border-primary/50 font-bold shadow-sm'
              : 'bg-surface-container text-on-surface-variant border-outline-variant/20 hover:text-on-surface hover:border-outline-variant/40'
          }`}
        >
          Open ({openCount})
        </button>
        <button
          onClick={() => setFilter('merged')}
          className={`px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap cursor-pointer ${
            filter === 'merged'
              ? 'bg-tertiary-container/30 text-tertiary border-tertiary/50 font-bold shadow-sm'
              : 'bg-surface-container text-on-surface-variant border-outline-variant/20 hover:text-on-surface hover:border-outline-variant/40'
          }`}
        >
          Merged ({mergedCount})
        </button>
      </div>
    </div>
  )
}
