import { useState, useMemo } from 'react'
import { mockPullRequests } from '../data/mockData'
import type { PullRequest } from '../types'
import PRPageHeader from '../components/pull-requests/PRPageHeader'
import PRStats from '../components/pull-requests/PRStats'
import PRFilters from '../components/pull-requests/PRFilters'
import PRListItem from '../components/pull-requests/PRListItem'
import PRInspector from '../components/pull-requests/PRInspector'

export default function PullRequests() {
  const [prs, setPrs] = useState<PullRequest[]>(mockPullRequests)
  const [selectedPr, setSelectedPr] = useState<PullRequest>(mockPullRequests[0])
  const [filter, setFilter] = useState<'all' | 'open' | 'merged'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRepo, setSelectedRepo] = useState('all')

  // Extract unique repository names
  const repositories = useMemo(() => {
    const repos = new Set(prs.map((p) => p.repository_name))
    return Array.from(repos)
  }, [prs])

  // Filtered PR list
  const filteredPrs = useMemo(() => {
    return prs.filter((pr) => {
      // Status filter
      if (filter !== 'all' && pr.status !== filter) return false
      // Repository filter
      if (selectedRepo !== 'all' && pr.repository_name !== selectedRepo) return false
      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const matchesTitle = pr.title.toLowerCase().includes(query)
        const matchesRepo = pr.repository_name.toLowerCase().includes(query)
        const matchesBranch = pr.branch.toLowerCase().includes(query)
        const matchesNumber = `#${pr.pr_number}`.includes(query) || `${pr.pr_number}` === query
        return matchesTitle || matchesRepo || matchesBranch || matchesNumber
      }
      return true
    })
  }, [prs, filter, selectedRepo, searchQuery])

  // KPI Metrics
  const openCount = prs.filter((p) => p.status === 'open').length
  const mergedCount = prs.filter((p) => p.status === 'merged').length
  const avgConfidence = prs.length > 0 ? prs.reduce((acc, p) => acc + p.confidence, 0) / prs.length : 0

  const handleMerge = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setPrs((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'merged' } : p)))
    if (selectedPr.id === id) {
      setSelectedPr((prev) => ({ ...prev, status: 'merged' }))
    }
  }

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6 max-w-[1600px] mx-auto w-full min-w-0">
      {/* 1. Page Header */}
      <PRPageHeader
        filter={filter}
        setFilter={setFilter}
        totalCount={prs.length}
        openCount={openCount}
        mergedCount={mergedCount}
      />

      {/* 2. KPI Summary Stats */}
      <PRStats
        totalPrs={prs.length}
        openPrs={openCount}
        mergedPrs={mergedCount}
        avgConfidence={avgConfidence}
      />

      {/* 3. Main Split Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start min-w-0 w-full">
        {/* Left Main Column: Search + PR List (min-width: 0 prevents flex overflow) */}
        <div className="flex flex-col gap-4 min-w-0 w-full">
          {/* Search & Repo Filter Bar */}
          <PRFilters
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedRepo={selectedRepo}
            setSelectedRepo={setSelectedRepo}
            repositories={repositories}
          />

          {/* PR List */}
          <div className="flex flex-col gap-3 min-w-0 w-full">
            {filteredPrs.length > 0 ? (
              filteredPrs.map((pr) => (
                <PRListItem
                  key={pr.id}
                  pr={pr}
                  isSelected={selectedPr.id === pr.id}
                  onSelect={setSelectedPr}
                  onMerge={handleMerge}
                />
              ))
            ) : (
              <div className="bg-surface-container-high border border-outline-variant/30 rounded-xl p-8 text-center flex flex-col items-center justify-center gap-2">
                <span className="material-symbols-outlined text-outline text-[32px]">find_in_page</span>
                <p className="font-mono text-sm text-on-surface">No pull requests match your search criteria</p>
                <button
                  onClick={() => {
                    setFilter('all')
                    setSearchQuery('')
                    setSelectedRepo('all')
                  }}
                  className="mt-2 text-xs font-mono text-primary underline hover:text-primary-fixed cursor-pointer"
                >
                  Reset filters
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Inspector Column (380px fixed width on desktop) */}
        <PRInspector pr={selectedPr} onMerge={handleMerge} />
      </div>
    </div>
  )
}
