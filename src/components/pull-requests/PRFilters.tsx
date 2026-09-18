interface PRFiltersProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  selectedRepo: string
  setSelectedRepo: (repo: string) => void
  repositories: string[]
}

export default function PRFilters({
  searchQuery,
  setSearchQuery,
  selectedRepo,
  setSelectedRepo,
  repositories,
}: PRFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full bg-surface-container-high border border-outline-variant/30 rounded-xl p-3">
      {/* Search Input */}
      <div className="relative flex-1 w-full">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
          search
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search PRs by title, branch, PR number, repository..."
          className="w-full pl-9 pr-4 py-2 rounded-lg bg-surface-container border border-outline-variant/20 text-xs font-mono text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary/50 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface text-xs font-mono"
          >
            ✕
          </button>
        )}
      </div>

      {/* Repository Filter Selector */}
      <div className="flex items-center gap-2 w-full sm:w-auto font-mono text-xs flex-shrink-0">
        <span className="text-on-surface-variant text-xs whitespace-nowrap hidden md:inline">Repository:</span>
        <select
          value={selectedRepo}
          onChange={(e) => setSelectedRepo(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/30 text-on-surface text-xs font-mono focus:outline-none focus:border-primary/50 cursor-pointer"
        >
          <option value="all">All Repositories</option>
          {repositories.map((repo) => (
            <option key={repo} value={repo}>
              {repo}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
