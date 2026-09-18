import { useState } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts'
import { pipelineRunData } from '../data/mockData'

export default function Analytics() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')

  const mttrData = [
    { day: 'Mon', mttr: 4.2 },
    { day: 'Tue', mttr: 3.8 },
    { day: 'Wed', mttr: 5.1 },
    { day: 'Thu', mttr: 2.9 },
    { day: 'Fri', mttr: 3.4 },
    { day: 'Sat', mttr: 2.1 },
    { day: 'Sun', mttr: 2.5 },
  ]

  return (
    <div className="p-6 flex flex-col gap-6 max-w-[1600px] mx-auto min-w-0 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-surface-container-high border border-outline-variant/30 rounded-xl p-6 relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary-container/30 border border-primary/40 flex items-center justify-center text-primary shadow-lg">
            <span className="material-symbols-outlined text-[32px]">equalizer</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-mono text-on-surface">Engineering Observability & Analytics</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-primary/20 text-primary border border-primary/30">
                AI MTTR REDUCTION
              </span>
            </div>
            <p className="text-sm text-on-surface-variant mt-0.5">
              Track mean time to recovery, automated resolution rate, model accuracy, and CI reliability trends.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          {(['7d', '30d', '90d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                timeRange === r
                  ? 'bg-primary-container/40 text-primary border-primary/40'
                  : 'bg-surface-container text-on-surface-variant border-outline-variant/20 hover:text-on-surface'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface-container-high border border-outline-variant/30">
          <span className="text-xs font-mono uppercase text-on-surface-variant">Mean Time to Repair (MTTR)</span>
          <div className="text-3xl font-bold font-mono text-tertiary mt-2">3m 42s</div>
          <span className="text-[11px] font-mono text-tertiary mt-1 block">-84% vs manual triage</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-high border border-outline-variant/30">
          <span className="text-xs font-mono uppercase text-on-surface-variant">Autonomous Fix Rate</span>
          <div className="text-3xl font-bold font-mono text-primary mt-2">96.8%</div>
          <span className="text-[11px] font-mono text-primary mt-1 block">38 / 39 incidents healed</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-high border border-outline-variant/30">
          <span className="text-xs font-mono uppercase text-on-surface-variant">First-Try Verification Pass</span>
          <div className="text-3xl font-bold font-mono text-on-surface mt-2">94.2%</div>
          <span className="text-[11px] font-mono text-on-surface-variant mt-1 block">Trust Gate threshold &gt;= 90%</span>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-high border border-outline-variant/30">
          <span className="text-xs font-mono uppercase text-on-surface-variant">Engineer Hours Saved</span>
          <div className="text-3xl font-bold font-mono text-tertiary mt-2">184 hrs</div>
          <span className="text-[11px] font-mono text-tertiary mt-1 block">This month</span>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface-container-high border border-outline-variant/30 rounded-xl p-5 flex flex-col gap-4 font-mono text-xs">
          <h2 className="font-bold text-on-surface text-sm">MTTR Trend (Minutes)</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mttrData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#31353c" />
                <XAxis dataKey="day" stroke="#cbc3d7" fontSize={11} />
                <YAxis stroke="#cbc3d7" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#1c2026', borderColor: '#494454', color: '#dfe2eb' }} />
                <Area type="monotone" dataKey="mttr" stroke="#67df70" fill="#67df70" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface-container-high border border-outline-variant/30 rounded-xl p-5 flex flex-col gap-4 font-mono text-xs">
          <h2 className="font-bold text-on-surface text-sm">CI Pipeline Build Duration (Seconds)</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineRunData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#31353c" />
                <XAxis dataKey="run" stroke="#cbc3d7" fontSize={11} />
                <YAxis stroke="#cbc3d7" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#1c2026', borderColor: '#494454', color: '#dfe2eb' }} />
                <Bar dataKey="duration" fill="#aac7ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
