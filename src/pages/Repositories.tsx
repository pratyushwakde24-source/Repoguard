import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useRepositories } from '../context/RepositoryContext'
import ConnectRepoModal from '../components/ConnectRepoModal'

export default function Repositories() {
  const { repositories, isLoading } = useRepositories()
  const [search, setSearch] = useState('')
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false)
  const navigate = useNavigate()

  const filteredRepos = repositories.filter(
    (r) =>
      r.full_name.toLowerCase().includes(search.toLowerCase()) ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.language.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 flex flex-col gap-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-surface-container-high border border-outline-variant/30 rounded-xl p-6 relative overflow-hidden">
        <div className="flex items-center gap-4 z-10">
          <div className="w-14 h-14 rounded-xl bg-secondary-container/30 border border-secondary/40 flex items-center justify-center text-secondary shadow-lg shadow-secondary/10">
            <span className="material-symbols-outlined text-[32px]">folder_code</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-mono tracking-tight text-on-surface">Connected Repositories</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-secondary/20 text-secondary border border-secondary/30 font-bold">
                {repositories.length} MONITORED
              </span>
            </div>
            <p className="text-sm text-on-surface-variant mt-0.5">
              GitHub App integration active. Monitored for CI workflow runs, AST call graphs, and Dependabot events.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto z-10">
          <input
            type="text"
            placeholder="Search repositories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3.5 py-2 rounded-lg bg-surface-container border border-outline-variant/30 text-on-surface text-xs font-mono focus:outline-none focus:border-primary w-full md:w-64"
          />
          <button
            onClick={() => setIsConnectModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-mono text-xs font-semibold hover:bg-primary-container/80 transition-all cursor-pointer whitespace-nowrap shadow-md shadow-primary/10"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            + Connect Repo
          </button>
        </div>
      </div>

      {/* Loading state or Empty State */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-3">
          <span className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-xs font-mono text-on-surface-variant">Loading monitored repositories...</span>
        </div>
      ) : filteredRepos.length === 0 ? (
        <div className="py-16 bg-surface-container-high border border-dashed border-outline-variant/30 rounded-xl flex flex-col items-center justify-center gap-3 text-center">
          <span className="material-symbols-outlined text-[36px] text-on-surface-variant">folder_off</span>
          <span className="text-sm font-mono font-bold text-on-surface">No matching repositories found</span>
          <span className="text-xs font-mono text-on-surface-variant">
            Connect a GitHub repository to begin monitoring or adjust your search filter.
          </span>
          <button
            onClick={() => setIsConnectModalOpen(true)}
            className="mt-2 px-4 py-2 rounded-lg bg-primary text-on-primary font-mono text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer"
          >
            + Connect Repository Now
          </button>
        </div>
      ) : (
        /* Grid of Repositories */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRepos.map((repo) => (
            <motion.div
              key={repo.id}
              whileHover={{ y: -2 }}
              onClick={() => navigate(`/repositories/${repo.id}`)}
              className="bg-surface-container-high border border-outline-variant/30 rounded-xl p-5 flex flex-col justify-between gap-4 relative overflow-hidden cursor-pointer hover:border-primary/40 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="material-symbols-outlined text-secondary text-[24px] flex-shrink-0">dataset</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="font-mono font-bold text-on-surface text-base truncate">{repo.full_name}</h2>
                      {repo.is_demo && (
                        <span className="px-1.5 py-0.5 rounded bg-warning/20 text-warning text-[9px] font-mono font-bold flex-shrink-0">
                          DEMO
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 font-mono text-xs text-on-surface-variant">
                      <span className="px-2 py-0.5 rounded bg-surface-container border border-outline-variant/20 text-[10px]">
                        {repo.language}
                      </span>
                      <span>
                        branch: <code className="text-secondary">{repo.default_branch}</code>
                      </span>
                    </div>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full font-mono text-[11px] font-bold border flex-shrink-0 ${
                    repo.last_ci_status === 'passing'
                      ? 'bg-success/15 text-success border-success/30'
                      : repo.last_ci_status === 'unknown'
                      ? 'bg-outline-variant/20 text-on-surface-variant border-outline-variant/30'
                      : 'bg-error/15 text-error border-error/30 animate-pulse'
                  }`}
                >
                  {repo.last_ci_status.toUpperCase()}
                </span>
              </div>

              {/* Health Score Progress */}
              <div className="bg-surface-container rounded-lg p-3 border border-outline-variant/20 flex flex-col gap-2">
                <div className="flex justify-between items-center font-mono text-xs">
                  <span className="text-on-surface-variant">Health Score</span>
                  <span className={`font-bold ${repo.health_score < 80 ? 'text-error' : 'text-tertiary'}`}>
                    {repo.health_score}%
                  </span>
                </div>
                <div className="w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${repo.health_score < 80 ? 'bg-error' : 'bg-tertiary'}`}
                    style={{ width: `${repo.health_score}%` }}
                  />
                </div>
              </div>

              {/* Repository Stats */}
              <div className="grid grid-cols-2 gap-2 font-mono text-xs text-on-surface-variant">
                <div className="bg-surface-container/50 p-2.5 rounded border border-outline-variant/10">
                  <div className="text-[10px] text-on-surface-variant uppercase">Total CI Runs</div>
                  <div className="text-on-surface font-bold mt-0.5">
                    {repo.total_runs ? repo.total_runs.toLocaleString() : 'No data yet'}
                  </div>
                </div>
                <div className="bg-surface-container/50 p-2.5 rounded border border-outline-variant/10">
                  <div className="text-[10px] text-on-surface-variant uppercase">CI Success Rate</div>
                  <div className="text-tertiary font-bold mt-0.5">
                    {repo.success_rate ? `${repo.success_rate}%` : '100%'}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div
                className="flex items-center gap-2 pt-2 border-t border-outline-variant/10 font-mono text-xs z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => navigate('/topology')}
                  className="flex-1 py-1.5 px-3 rounded bg-surface-container text-on-surface hover:bg-surface-container-highest transition-all text-center border border-outline-variant/20 cursor-pointer"
                >
                  View Topology
                </button>
                <button
                  onClick={() => navigate('/incidents')}
                  className="flex-1 py-1.5 px-3 rounded bg-primary-container/30 text-primary hover:bg-primary-container/50 transition-all text-center border border-primary/30 cursor-pointer font-bold"
                >
                  View Incidents
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Connect Repo Modal */}
      <ConnectRepoModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onNavigateToRepo={(id) => navigate(`/repositories/${id}`)}
      />
    </div>
  )
}
