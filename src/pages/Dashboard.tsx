import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts'
import { mockIncidents, mockActiveRun, mockActivityEvents, mockPreviousEvents, pipelineRunData, formatTime, getStageIndex } from '../data/mockData'
import { STAGES } from '../types'

const fadeIn = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35 } }

export default function Dashboard() {
  const navigate = useNavigate()
  const activeIncident = mockIncidents[0]
  const run = mockActiveRun
  const stageIdx = getStageIndex(run.current_stage)
  const allEvents = [...mockActivityEvents, ...mockPreviousEvents].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Breadcrumb & Primary H1 Heading */}
      <nav aria-label="Breadcrumb" className="text-xs text-outline tracking-wider flex items-center gap-1.5">
        <span>Command Center</span> <span>&gt;</span>
        <h1 className="text-sm font-semibold text-primary inline">Engineering Dashboard</h1>
      </nav>

      {/* Top Row: Health Pulse + KPIs */}
      <div className="grid grid-cols-12 gap-4">
        {/* Health Pulse */}
        <motion.div {...fadeIn} className="col-span-5 bg-surface-container rounded-xl p-5 relative overflow-hidden shadow-lg flex flex-col justify-between">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-secondary-container/5 pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">analytics</span>
              <h2 className="text-base font-semibold text-on-surface">System Health Pulse</h2>
            </div>
            <span className="text-xs text-tertiary flex items-center gap-1 font-mono">
              <span className="material-symbols-outlined text-[14px]">bolt</span> AUTONOMOUS
            </span>
          </div>
          <div className="flex items-center gap-6">
            {/* SVG Dial */}
            <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
              <svg className="w-36 h-36 -rotate-90" viewBox="0 0 160 160">
                <circle className="text-surface-container-high" cx="80" cy="80" r="68" fill="transparent" stroke="currentColor" strokeWidth="8" />
                <circle className="text-secondary transition-all duration-1000" cx="80" cy="80" r="68" fill="transparent" stroke="currentColor" strokeWidth="8" strokeDasharray="427" strokeDashoffset="36" strokeLinecap="round" />
                <circle className="text-surface-container-highest" cx="80" cy="80" r="54" fill="transparent" stroke="currentColor" strokeWidth="6" />
                <circle className="text-primary transition-all duration-1000" cx="80" cy="80" r="54" fill="transparent" stroke="currentColor" strokeWidth="6" strokeDasharray="339" strokeDashoffset="48" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-outline tracking-wider uppercase font-semibold">HEALTH INDEX</span>
                <div className="flex items-baseline gap-0.5 my-0.5">
                  <span className="text-[28px] font-semibold text-on-surface font-sans tracking-tight">94.8</span>
                  <span className="text-xs text-tertiary font-semibold">%</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-tertiary-container/20 text-tertiary text-[10px] font-semibold">STABLE GRADE A</span>
              </div>
            </div>
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2.5 flex-1">
              {[
                { label: 'CI Stability', value: '94.8%', color: 'bg-tertiary', textColor: 'text-tertiary' },
                { label: 'Auto-Recovery', value: '87.0%', color: 'bg-primary', textColor: 'text-primary' },
                { label: 'Risk Control', value: '91.0%', color: 'bg-secondary', textColor: 'text-secondary' },
                { label: 'Active Incs', value: '3 OPEN', color: 'bg-error', textColor: 'text-error' },
              ].map((m) => (
                <div key={m.label} className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`w-2 h-2 rounded-full ${m.color}`} />
                    <span className="text-xs text-on-surface-variant truncate">{m.label}</span>
                  </div>
                  <span className={`text-xs ${m.textColor} font-semibold`}>{m.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <motion.div {...fadeIn} transition={{ delay: 0.05 }} className="col-span-7 grid grid-cols-4 gap-3">
          {[
            { label: 'CI SUCCESS', value: '94.8%', delta: '+1.4%', deltaLabel: '24h delta', icon: 'trending_up', iconColor: 'text-tertiary' },
            { label: 'INCIDENTS', value: '3', badge: '1 HEALING', delta: '2 ATTN', deltaLabel: 'in queue', icon: 'notification_important', iconColor: 'text-error' },
            { label: 'AUTO-FIX RATE', value: '82%', delta: 'Last 30d', deltaLabel: '41 resolved', icon: 'auto_fix_high', iconColor: 'text-primary' },
            { label: 'MTTR SPEED', value: '8m 42s', delta: '↓ 78%', deltaLabel: 'prev 46m', icon: 'timer', iconColor: 'text-secondary' },
          ].map((kpi, i) => (
            <motion.div key={kpi.label} {...fadeIn} transition={{ delay: 0.1 + i * 0.05 }} className="flex flex-col justify-between p-3.5 rounded-xl bg-surface-container-low shadow-sm">
              <div className="flex items-center justify-between text-outline">
                <span className="text-[10px] font-semibold uppercase tracking-wider">{kpi.label}</span>
                <span className={`material-symbols-outlined text-[16px] ${kpi.iconColor}`}>{kpi.icon}</span>
              </div>
              <div className="my-1.5 flex items-baseline gap-1.5">
                <span className="text-xl text-on-surface font-semibold">{kpi.value}</span>
                {kpi.badge && <span className="text-[10px] text-primary bg-primary/10 px-1.5 rounded font-semibold">{kpi.badge}</span>}
              </div>
              <div className="flex items-center gap-1">
                <span className={`text-xs ${kpi.delta?.startsWith('+') || kpi.delta?.startsWith('↓') ? 'text-tertiary' : kpi.delta?.includes('ATTN') ? 'text-error' : 'text-on-surface-variant'} font-medium`}>{kpi.delta}</span>
                <span className="text-[10px] text-outline">{kpi.deltaLabel}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Second Row: Active Agent + CI Pipeline + Live Activity */}
      <div className="grid grid-cols-12 gap-4">
        {/* Active Agent Card */}
        <motion.div {...fadeIn} transition={{ delay: 0.15 }} className="col-span-4 bg-surface-container rounded-xl p-4 relative overflow-hidden shadow-lg flex flex-col justify-between">
          <div className="absolute -right-6 -bottom-6 w-36 h-36 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[18px]">psychology</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-base font-semibold text-on-surface">RepoGuard Agent #1</h2>
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse" />
                </div>
                <span className="text-xs text-outline">acme/payment-service</span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-bold">
                REASONING {stageIdx + 1}/8
              </span>
              <span className="text-xs text-outline-variant mt-0.5">T+00:31</span>
            </div>
          </div>
          {/* Tags */}
          <div className="flex items-center gap-1.5 mb-3 overflow-x-auto no-scrollbar">
            <span className="px-2 py-0.5 rounded bg-surface-container-high text-secondary text-xs flex items-center gap-1 shrink-0">
              <span className="material-symbols-outlined text-[12px]">bug_report</span> INC-9281
            </span>
            <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant text-xs flex items-center gap-1 shrink-0">
              <span className="material-symbols-outlined text-[12px]">memory</span> Nemotron 3 Ultra
            </span>
            <span className="px-2 py-0.5 rounded bg-surface-container-high text-tertiary text-xs shrink-0 font-semibold">AUTONOMOUS</span>
          </div>
          {/* Pipeline Mini */}
          <div className="flex flex-col gap-1.5 mb-3">
            <div className="flex justify-between text-xs">
              <span className="text-on-surface">Synthesizing patch AST in memory</span>
              <span className="text-primary font-semibold">50%</span>
            </div>
            <div className="grid grid-cols-8 gap-1 w-full h-1.5">
              {STAGES.map((s, i) => (
                <div key={s} className={`rounded-full ${i < stageIdx ? 'bg-tertiary' : i === stageIdx ? 'bg-primary animate-pulse' : 'bg-surface-container-highest'}`} />
              ))}
            </div>
          </div>
          <button
            onClick={() => navigate(`/incidents/${activeIncident.id}`)}
            className="w-full h-8 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            WATCH IN MISSION CONTROL
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </button>
        </motion.div>

        {/* CI Pipeline Health */}
        <motion.div {...fadeIn} transition={{ delay: 0.2 }} className="col-span-4 bg-surface-container-low rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px] text-secondary">view_timeline</span>
              <h2 className="text-base font-semibold text-on-surface">Pipeline Run Matrix</h2>
            </div>
            <span className="text-xs text-outline font-mono">LAST 12 BUILDS</span>
          </div>
          <div className="h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineRunData} barSize={16}>
                <XAxis dataKey="run" tick={{ fontSize: 9, fill: '#958ea0', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Bar dataKey="duration" radius={[3, 3, 0, 0]}>
                  {pipelineRunData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.status === 'failed' ? '#ffb4ab' : entry.status === 'healed' ? '#a078ff' : entry.status === 'running' ? '#d0bcff' : '#67df70'}
                      opacity={entry.status === 'running' ? 0.7 : 0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-between items-center mt-1 text-xs text-outline border-t border-surface-variant/30 pt-1.5">
            <span>Run #4109</span>
            <span className="text-tertiary font-semibold">91.6% PASSED (11/12)</span>
            <span>Run #4120 (NOW)</span>
          </div>
        </motion.div>

        {/* Live Activity Stream */}
        <motion.div {...fadeIn} transition={{ delay: 0.25 }} className="col-span-4 bg-surface-container-low rounded-xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-on-surface">Live Activity Stream</h2>
            <span className="text-xs text-outline flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary" /> 100ms
            </span>
          </div>
          <div className="flex flex-col gap-2 flex-1 overflow-y-auto no-scrollbar">
            {allEvents.slice(0, 8).map((evt) => (
              <motion.div
                key={evt.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2.5 py-2 px-2.5 rounded-md bg-surface-container hover:bg-surface-container-high transition-colors border-b border-surface-container-high/40 last:border-0"
              >
                <span className="text-xs text-outline shrink-0 font-mono leading-relaxed">{formatTime(evt.created_at)}</span>
                <div className="flex flex-col min-w-0 flex-1">
                  <span
                    title={evt.message}
                    className={`text-xs break-words leading-relaxed ${
                      evt.severity === 'error' ? 'text-error' :
                      evt.severity === 'success' ? 'text-tertiary' :
                      evt.severity === 'warning' ? 'text-primary' :
                      'text-on-surface'
                    }`}
                  >
                    {evt.message}
                  </span>
                </div>
                <span className={`ml-auto px-1.5 py-0.5 rounded text-[9px] shrink-0 font-mono ${
                  evt.severity === 'error' ? 'bg-error-container/40 text-error' :
                  evt.severity === 'success' ? 'bg-tertiary/15 text-tertiary' :
                  evt.severity === 'warning' ? 'bg-primary/20 text-primary' :
                  'bg-surface-container-high text-on-surface-variant'
                }`}>
                  {evt.stage || 'SYS'}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Third Row: Recent Incidents */}
      <motion.div {...fadeIn} transition={{ delay: 0.3 }} className="bg-surface-container-low rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-error">warning</span>
            <h2 className="text-base font-semibold text-on-surface">Recent Incidents</h2>
            <span className="w-5 h-5 rounded-full bg-error/20 text-error text-[10px] font-bold flex items-center justify-center font-mono">3</span>
          </div>
          <button onClick={() => navigate('/incidents')} className="text-xs text-primary hover:underline flex items-center gap-1 font-medium leading-none">
            View All <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {mockIncidents.map((inc) => {
            const severityColors: Record<string, string> = { critical: 'text-error bg-error/20', high: 'text-secondary bg-secondary/20', medium: 'text-secondary bg-secondary/20' }
            return (
              <div key={inc.id} onClick={() => navigate(`/incidents/${inc.id}`)} className="bg-surface-container rounded-xl p-3 cursor-pointer hover:bg-surface-container-high transition-colors group">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wider ${severityColors[inc.severity]}`}>
                      {inc.severity.toUpperCase()}
                    </span>
                    <span className="text-xs font-semibold text-on-surface font-mono">{inc.id.toUpperCase()}</span>
                  </div>
                  {inc.status === 'healing' && (
                    <span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-semibold flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-primary animate-ping" />HEALING
                    </span>
                  )}
                </div>
                <div className="text-xs text-secondary truncate mb-1 font-mono">
                  {inc.repository_name}@{inc.commit_sha}
                </div>
                <h3 className="text-xs text-on-surface font-medium leading-tight mb-2 line-clamp-2">{inc.title}</h3>
                <div className="grid grid-cols-8 gap-0.5 h-1">
                  {STAGES.map((s, i) => {
                    const incStageIdx = inc.status === 'healing' ? 3 : inc.status === 'investigating' ? 1 : 0
                    return <div key={s} className={`rounded-full ${i < incStageIdx ? 'bg-tertiary' : i === incStageIdx ? 'bg-primary animate-pulse' : 'bg-surface-container-highest'}`} />
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}
