import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { mockIncidents } from '../data/mockData'
import { STAGES } from '../types'
import type { IncidentSeverity } from '../types'

type Filter = 'all' | IncidentSeverity | 'resolved'

export default function Incidents() {
  const [filter, setFilter] = useState<Filter>('all')
  const navigate = useNavigate()
  const filters: { key: Filter; label: string; count: number; color: string }[] = [
    { key: 'all', label: 'ALL', count: 3, color: 'text-primary' },
    { key: 'critical', label: 'CRITICAL', count: 1, color: 'text-error' },
    { key: 'high', label: 'HIGH', count: 1, color: 'text-secondary-fixed' },
    { key: 'medium', label: 'MEDIUM', count: 1, color: 'text-secondary' },
    { key: 'resolved', label: 'RESOLVED', count: 42, color: 'text-tertiary' },
  ]
  const filtered = filter === 'all' ? mockIncidents : filter === 'resolved' ? [] : mockIncidents.filter(i => i.severity === filter)
  const severityColors: Record<string, string> = { critical: 'text-error bg-error/20', high: 'text-secondary-fixed bg-secondary-fixed/20', medium: 'text-secondary bg-secondary/20', low: 'text-outline bg-surface-container-high' }

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="text-code-sm text-outline uppercase tracking-wider">
        Engineering {'>'} <span className="text-primary-fixed">Incident Center</span>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-md text-on-surface flex items-center gap-2">
            Incident Center
            <span className="w-5 h-5 rounded-full bg-error/20 text-error text-[10px] font-bold flex items-center justify-center font-mono">3</span>
          </h1>
          <p className="text-body-sm text-on-surface-variant mt-0.5">Autonomous triage, blast radius isolation, and self-healing queue.</p>
        </div>
      </div>
      {/* Status HUD */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-surface-container-low rounded-lg p-3">
          <div className="flex items-center gap-1 text-label-sm text-outline uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" /> Active
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-code-lg text-on-surface font-semibold">3</span>
            <span className="text-code-sm text-on-surface-variant">(1 HEALING)</span>
          </div>
        </div>
        <div className="bg-surface-container-low rounded-lg p-3">
          <div className="flex items-center gap-1 text-label-sm text-outline uppercase tracking-wider">
            <span className="material-symbols-outlined text-[12px] text-secondary">timer</span> Auto-MTTR
          </div>
          <div className="mt-1"><span className="text-code-lg text-secondary font-semibold">8m 42s</span></div>
        </div>
        <div className="bg-surface-container-low rounded-lg p-3 relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-12 h-12 bg-tertiary/10 rounded-full blur-md pointer-events-none" />
          <div className="flex items-center gap-1 text-label-sm text-outline uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse-dot" /> Triage
          </div>
          <div className="mt-1"><span className="text-code-sm text-tertiary font-medium">AUTONOMOUS</span></div>
        </div>
      </div>
      {/* Search + Filters */}
      <div className="flex flex-col gap-2">
        <div className="relative max-w-md">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline text-[16px]">search</span>
          <input className="w-full h-8 pl-8 pr-3 rounded-lg bg-surface-container-lowest text-code-sm text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-1 focus:ring-primary/40" placeholder="Filter by repository, error, or INC-ID..." />
        </div>
        <div className="flex items-center gap-1.5">
          {filters.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} className={`px-2.5 py-1 rounded-full text-label-sm flex items-center gap-1 transition-colors ${filter === f.key ? 'bg-primary-container/25 text-primary' : 'bg-surface-container-high ' + f.color}`}>
              {f.label}
              <span className={`px-1 rounded text-[9px] font-bold ${filter === f.key ? 'bg-primary text-on-primary' : 'text-on-surface-variant'}`}>{f.count}</span>
            </button>
          ))}
        </div>
      </div>
      {/* Incident List */}
      <div className="flex flex-col gap-3">
        {filtered.map((inc, i) => {
          const stageIdx = inc.status === 'healing' ? 3 : inc.status === 'investigating' ? 1 : 0
          return (
            <motion.div key={inc.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => navigate(`/incidents/${inc.id}`)}
              className="bg-surface-container rounded-xl overflow-hidden shadow-lg cursor-pointer hover:bg-surface-container-high transition-colors group"
            >
              {inc.severity === 'critical' && <div className="h-1 w-full bg-gradient-to-r from-error via-primary-container to-secondary" />}
              <div className="p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-label-sm font-semibold tracking-wider flex items-center gap-1 ${severityColors[inc.severity]}`}>
                      {inc.severity === 'critical' && <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse" />}
                      {inc.severity.toUpperCase()}
                    </span>
                    <span className="text-code-sm font-semibold text-on-surface">{inc.id.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {inc.status === 'healing' && (
                      <span className="px-1.5 py-0.5 rounded bg-primary-container/25 text-primary-fixed text-label-sm flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-primary animate-ping" />REASON {stageIdx + 1}/8
                      </span>
                    )}
                    <span className="text-code-sm text-tertiary font-semibold">94% CONF</span>
                  </div>
                </div>
                <div>
                  <div className="text-code-sm text-secondary truncate flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">terminal</span>
                    {inc.repository_name}:main <span className="text-outline-variant font-mono">@{inc.commit_sha}</span>
                  </div>
                  <h2 className="text-headline-sm text-on-surface mt-1 leading-tight">{inc.title}</h2>
                </div>
                <div className="bg-surface-container-low rounded-lg p-2.5 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-code-sm">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded bg-primary flex items-center justify-center text-on-primary">
                        <span className="material-symbols-outlined text-[13px]">smart_toy</span>
                      </div>
                      <span className="text-on-surface font-medium">Agent #1 (Nemotron 3 Ultra)</span>
                    </div>
                    <span className="text-tertiary font-semibold tracking-wider text-label-sm">{Math.round((stageIdx + 1) / 8 * 100)}% SOLVED</span>
                  </div>
                  <div className="grid grid-cols-8 gap-1 h-1.5">
                    {STAGES.map((s, si) => (
                      <div key={s} className={`rounded-full ${si < stageIdx ? 'bg-tertiary' : si === stageIdx ? 'bg-primary animate-pulse' : 'bg-surface-container-highest'}`} />
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
