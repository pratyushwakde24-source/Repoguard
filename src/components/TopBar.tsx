import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { mockIncidents, mockPullRequests } from '../data/mockData'
import { useRepositories } from '../context/RepositoryContext'

export default function TopBar() {
  const { repositories } = useRepositories()
  const [searchValue, setSearchValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [repoDropdownOpen, setRepoDropdownOpen] = useState(false)
  const navigate = useNavigate()

  const activeRepoName = repositories[0]?.full_name || 'No repository connected'

  const searchResults = useMemo(() => {
    if (!searchValue.trim()) return []
    const q = searchValue.toLowerCase().trim()

    const repos = repositories
      .filter((r) => r.full_name.toLowerCase().includes(q) || r.name.toLowerCase().includes(q))
      .map((r) => ({ type: 'Repository', label: r.full_name, path: `/repositories/${r.id}` }))

    const incs = mockIncidents
      .filter((i) => i.id.toLowerCase().includes(q) || i.title.toLowerCase().includes(q))
      .map((i) => ({ type: 'Incident', label: `${i.id.toUpperCase()}: ${i.title}`, path: `/incidents/${i.id}` }))

    const prs = mockPullRequests
      .filter((p) => `#${p.pr_number}`.includes(q) || p.title.toLowerCase().includes(q))
      .map((p) => ({ type: 'Pull Request', label: `#${p.pr_number}: ${p.title}`, path: `/pull-requests` }))

    return [...repos, ...incs, ...prs]
  }, [searchValue, repositories])

  const handleSelectResult = (path: string) => {
    navigate(path)
    setSearchValue('')
    setIsOpen(false)
  }

  return (
    <header className="h-[44px] bg-surface-container-low/80 backdrop-blur-xl border-b border-surface-container-highest/30 flex items-center justify-between px-4 gap-4 z-30 relative">
      {/* Left: Repository Dropdown Selector & Incident Active indicator */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            onClick={() => setRepoDropdownOpen(!repoDropdownOpen)}
            className="h-7 px-2.5 rounded-md bg-surface-container flex items-center gap-1.5 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[14px] text-secondary">account_tree</span>
            <span className="text-xs text-on-surface font-medium truncate max-w-[180px]">{activeRepoName}</span>
            <span className="material-symbols-outlined text-[14px]">expand_more</span>
          </button>

          {repoDropdownOpen && (
            <div className="absolute left-0 top-8 w-64 bg-surface-container-high border border-outline-variant/30 rounded-lg p-2 shadow-xl z-50 font-mono text-xs flex flex-col gap-1 max-h-64 overflow-y-auto">
              <div className="text-[10px] text-on-surface-variant px-2 py-1 uppercase font-bold">Switch Repository</div>
              {repositories.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    navigate(`/repositories/${r.id}`)
                    setRepoDropdownOpen(false)
                  }}
                  className="text-left px-2 py-1.5 rounded hover:bg-surface-container text-on-surface flex items-center justify-between cursor-pointer"
                >
                  <span className="truncate">{r.full_name || r.name}</span>
                  <span className="text-[10px] text-tertiary">{r.health_score}%</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-surface-container-highest hidden sm:block" />
        <button
          onClick={() => navigate('/incidents/inc-9281')}
          className="h-7 px-2.5 rounded-md bg-surface-container/60 flex items-center gap-1.5 text-xs text-outline-variant hover:text-primary transition-colors cursor-pointer hidden sm:flex"
        >
          <span className="text-secondary font-semibold">INC-9281</span>
          <span className="text-[10px] bg-tertiary/20 text-tertiary px-1.5 py-0.5 rounded font-bold">ACTIVE</span>
        </button>
      </div>

      {/* Center: Global Search */}
      <div className="flex-1 max-w-[420px] relative">
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[16px] text-outline">search</span>
          <input
            type="text"
            value={searchValue}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setSearchValue(e.target.value)
              setIsOpen(true)
            }}
            placeholder="Search repositories, incidents, PRs..."
            className="w-full h-7 pl-8 pr-3 rounded-md bg-surface-container text-code-sm text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all font-mono"
          />
        </div>

        {/* Global Search Results Overlay */}
        {isOpen && searchResults.length > 0 && (
          <div className="absolute left-0 right-0 top-8 bg-surface-container-high border border-outline-variant/30 rounded-lg p-2 shadow-2xl z-50 font-mono text-xs flex flex-col gap-1 max-h-72 overflow-y-auto">
            {searchResults.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectResult(item.path)}
                className="text-left px-3 py-2 rounded hover:bg-surface-container text-on-surface flex items-center justify-between cursor-pointer"
              >
                <span className="truncate">{item.label}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 flex-shrink-0">
                  {item.type}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right: Status + Actions */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-tertiary/10 text-tertiary text-code-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse-dot" />
          <span className="font-medium hidden md:inline">LIVE</span>
        </div>
        <button
          onClick={() => navigate('/agent-runs')}
          className="flex items-center gap-1 px-2 py-1 rounded-full bg-primary-container/20 text-primary-fixed text-code-sm hover:bg-primary-container/30 transition-all cursor-pointer"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span>1 AGENT</span>
        </button>
        <button
          onClick={() => navigate('/activity')}
          className="relative w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors rounded-md hover:bg-surface-container cursor-pointer"
          aria-label="Notifications"
        >
          <span className="material-symbols-outlined text-[20px]">notifications</span>
          <span className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-error text-on-error text-[9px] font-bold flex items-center justify-center font-mono">3</span>
        </button>
        <button
          onClick={() => navigate('/settings')}
          className="w-7 h-7 rounded-full bg-primary flex items-center justify-center cursor-pointer"
          aria-label="Settings"
        >
          <span className="material-symbols-outlined text-on-primary text-[16px]">person</span>
        </button>
      </div>
    </header>
  )
}
