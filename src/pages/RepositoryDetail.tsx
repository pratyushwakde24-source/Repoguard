import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { mockIncidents, mockPullRequests } from '../data/mockData'
import { useRepositories } from '../context/RepositoryContext'

export default function RepositoryDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getRepoById, repositories } = useRepositories()

  const repo = (id ? getRepoById(id) : undefined) || repositories[0] || {
    id: 'repo-1', name: 'payment-service', full_name: 'acme/payment-service', default_branch: 'main', language: 'TypeScript', ci_provider: 'GitHub Actions', health_score: 71.4, last_ci_status: 'failing', total_runs: 4120, success_rate: 94.8, created_at: '2024-01-15'
  }
  const repoIncidents = mockIncidents.filter((i) => i.repository_id === repo.id || i.repository_name === repo.full_name)
  const repoPrs = mockPullRequests.filter((p) => p.repository_name === repo.full_name)

  const [activeTab, setActiveTab] = useState<'overview' | 'workflows' | 'incidents' | 'prs'>('overview')

  return (
    <div className="p-6 flex flex-col gap-6 max-w-[1600px] mx-auto min-w-0 w-full">
      {/* Back button + Header */}
      <div className="flex flex-col gap-4 bg-surface-container-high border border-outline-variant/30 rounded-xl p-6 relative overflow-hidden">
        <div className="flex items-center gap-2 text-xs font-mono text-on-surface-variant">
          <button
            onClick={() => navigate('/repositories')}
            className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Repositories</span>
          </button>
          <span>/</span>
          <span className="text-on-surface font-bold">{repo.full_name}</span>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-secondary-container/30 border border-secondary/40 flex items-center justify-center text-secondary shadow-lg">
              <span className="material-symbols-outlined text-[32px]">folder_code</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold font-mono text-on-surface">{repo.full_name}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase border ${
                  repo.last_ci_status === 'passing'
                    ? 'bg-success/15 text-success border-success/30'
                    : 'bg-error/15 text-error border-error/30 animate-pulse'
                }`}>
                  {repo.last_ci_status}
                </span>
              </div>
              <p className="text-xs font-mono text-on-surface-variant mt-1">
                Default branch: <code className="text-secondary">{repo.default_branch}</code> • Language: <strong className="text-on-surface">{repo.language}</strong> • Provider: {repo.ci_provider}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/topology')}
              className="px-3.5 py-2 rounded-lg bg-surface-container border border-outline-variant/30 text-on-surface hover:border-primary/40 font-mono text-xs font-semibold transition-all cursor-pointer"
            >
              View Call Graph
            </button>
            <button
              onClick={() => navigate('/incidents')}
              className="px-3.5 py-2 rounded-lg bg-primary-container text-on-primary-container font-mono text-xs font-semibold hover:bg-primary-container/80 transition-all cursor-pointer"
            >
              View Incidents ({repoIncidents.length})
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center gap-2 border-t border-outline-variant/20 pt-4 font-mono text-xs">
          {(['overview', 'workflows', 'incidents', 'prs'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg capitalize transition-all cursor-pointer ${
                activeTab === tab
                  ? 'bg-primary-container/30 text-primary border border-primary/40 font-bold'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface-container-high border border-outline-variant/30 flex flex-col justify-between">
          <span className="text-xs font-mono uppercase text-on-surface-variant">Health Score</span>
          <div className="text-3xl font-bold font-mono text-tertiary mt-2">{repo.health_score}%</div>
          <div className="w-full bg-surface-container-highest rounded-full h-1.5 mt-2">
            <div className="bg-tertiary h-full rounded-full" style={{ width: `${repo.health_score}%` }} />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-high border border-outline-variant/30 flex flex-col justify-between">
          <span className="text-xs font-mono uppercase text-on-surface-variant">Total Workflow Runs</span>
          <div className="text-3xl font-bold font-mono text-on-surface mt-2">{repo.total_runs.toLocaleString()}</div>
          <span className="text-[11px] font-mono text-on-surface-variant mt-1">Across 12 workflows</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-high border border-outline-variant/30 flex flex-col justify-between">
          <span className="text-xs font-mono uppercase text-on-surface-variant">CI Success Rate</span>
          <div className="text-3xl font-bold font-mono text-tertiary mt-2">{repo.success_rate}%</div>
          <span className="text-[11px] font-mono text-tertiary mt-1">+0.8% this month</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-high border border-outline-variant/30 flex flex-col justify-between">
          <span className="text-xs font-mono uppercase text-on-surface-variant">Active Agent Runs</span>
          <div className="text-3xl font-bold font-mono text-primary mt-2">{repoIncidents.length}</div>
          <span className="text-[11px] font-mono text-primary mt-1">Self-healing active</span>
        </div>
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-surface-container-high border border-outline-variant/30 rounded-xl p-5 flex flex-col gap-4">
            <h2 className="font-mono font-bold text-on-surface text-sm">Recent Incidents & Agent Interventions</h2>
            <div className="divide-y divide-outline-variant/20">
              {repoIncidents.map((inc) => (
                <div key={inc.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-secondary font-bold">{inc.id.toUpperCase()}</span>
                      <span className="text-on-surface font-semibold">{inc.title}</span>
                    </div>
                    <p className="text-xs font-mono text-on-surface-variant mt-1">{inc.error_message}</p>
                  </div>
                  <button
                    onClick={() => navigate(`/incidents/${inc.id}`)}
                    className="px-3 py-1.5 rounded bg-primary/20 text-primary border border-primary/30 font-mono text-xs font-semibold hover:bg-primary/30 transition-all cursor-pointer whitespace-nowrap"
                  >
                    Open Mission Control
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-high border border-outline-variant/30 rounded-xl p-5 flex flex-col gap-4 font-mono text-xs">
            <h2 className="font-bold text-on-surface text-sm">Repository Metadata</h2>
            <div className="flex justify-between py-2 border-b border-outline-variant/10">
              <span className="text-on-surface-variant">Repository ID</span>
              <span className="text-on-surface">{repo.id}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-outline-variant/10">
              <span className="text-on-surface-variant">Default Branch</span>
              <span className="text-secondary">{repo.default_branch}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-outline-variant/10">
              <span className="text-on-surface-variant">Primary Language</span>
              <span className="text-on-surface">{repo.language}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-outline-variant/10">
              <span className="text-on-surface-variant">CI Provider</span>
              <span className="text-on-surface">{repo.ci_provider}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-outline-variant/10">
              <span className="text-on-surface-variant">Connected Since</span>
              <span className="text-on-surface">{repo.created_at}</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'workflows' && (
        <div className="bg-surface-container-high border border-outline-variant/30 rounded-xl p-5 flex flex-col gap-4 font-mono text-xs">
          <h2 className="font-bold text-on-surface text-sm">Configured GitHub Workflows</h2>
          <div className="space-y-3">
            {['payment-ci.yml', 'deploy-staging.yml', 'security-audit.yml', 'release.yml'].map((wf) => (
              <div key={wf} className="p-3 bg-surface-container rounded-lg border border-outline-variant/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-tertiary">check_circle</span>
                  <span className="text-on-surface font-bold">{wf}</span>
                </div>
                <span className="text-tertiary bg-tertiary/10 px-2 py-0.5 rounded border border-tertiary/20">Monitored by RepoGuard</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'incidents' && (
        <div className="bg-surface-container-high border border-outline-variant/30 rounded-xl p-5 flex flex-col gap-3 font-mono text-xs">
          <h2 className="font-bold text-on-surface text-sm">All Incident Records</h2>
          {repoIncidents.map((inc) => (
            <div key={inc.id} className="p-3 bg-surface-container rounded-lg border border-outline-variant/20 flex items-center justify-between">
              <div>
                <span className="font-bold text-on-surface">{inc.id.toUpperCase()} - {inc.title}</span>
                <p className="text-on-surface-variant text-[11px] mt-1">{inc.description}</p>
              </div>
              <button
                onClick={() => navigate(`/incidents/${inc.id}`)}
                className="px-3 py-1 rounded bg-primary/20 text-primary border border-primary/30 font-semibold cursor-pointer"
              >
                Inspect Run
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'prs' && (
        <div className="bg-surface-container-high border border-outline-variant/30 rounded-xl p-5 flex flex-col gap-3 font-mono text-xs">
          <h2 className="font-bold text-on-surface text-sm">Automated Pull Requests</h2>
          {repoPrs.map((pr) => (
            <div key={pr.id} className="p-3 bg-surface-container rounded-lg border border-outline-variant/20 flex items-center justify-between">
              <div>
                <span className="font-bold text-on-surface">#{pr.pr_number} - {pr.title}</span>
                <p className="text-on-surface-variant text-[11px] mt-1">Branch: {pr.branch}</p>
              </div>
              <span className="text-tertiary font-bold">{Math.round(pr.confidence * 100)}% Confidence</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
