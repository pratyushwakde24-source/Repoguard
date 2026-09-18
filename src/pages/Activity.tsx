import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mockActivityEvents, formatTimeAgo } from '../data/mockData'

export default function Activity() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')

  const filteredEvents = mockActivityEvents.filter((evt) => {
    if (severityFilter !== 'all' && evt.severity !== severityFilter) return false
    if (search.trim()) {
      return (
        evt.message.toLowerCase().includes(search.toLowerCase()) ||
        evt.event_type.toLowerCase().includes(search.toLowerCase()) ||
        (evt.stage && evt.stage.toLowerCase().includes(search.toLowerCase()))
      )
    }
    return true
  })

  return (
    <div className="p-6 flex flex-col gap-6 max-w-[1600px] mx-auto min-w-0 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-surface-container-high border border-outline-variant/30 rounded-xl p-6 relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-tertiary-container/30 border border-tertiary/40 flex items-center justify-center text-tertiary shadow-lg">
            <span className="material-symbols-outlined text-[32px]">reorder</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-mono text-on-surface">System Audit Activity Log</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-tertiary/20 text-tertiary border border-tertiary/30">
                REALTIME EVENT STREAM
              </span>
            </div>
            <p className="text-sm text-on-surface-variant mt-0.5">
              Comprehensive immutable audit stream of webhooks, agent decisions, PR creations, and test runs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <input
            type="text"
            placeholder="Search activity events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3.5 py-2 rounded-lg bg-surface-container border border-outline-variant/30 text-on-surface text-xs font-mono focus:outline-none focus:border-primary w-full md:w-64"
          />
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3.5 py-2 rounded-lg bg-surface-container border border-outline-variant/30 text-on-surface text-xs font-mono focus:outline-none cursor-pointer"
          >
            <option value="all">All Severities</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
          </select>
        </div>
      </div>

      {/* Activity Log Feed */}
      <div className="bg-surface-container-high border border-outline-variant/30 rounded-xl p-5 flex flex-col gap-3 font-mono text-xs">
        <h2 className="font-bold text-on-surface text-sm border-b border-outline-variant/20 pb-3">
          Activity Timeline ({filteredEvents.length} events)
        </h2>

        <div className="divide-y divide-outline-variant/15">
          {filteredEvents.map((evt) => (
            <div key={evt.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-container/40 px-2 rounded transition-colors">
              <div className="flex items-start gap-3">
                <span className={`material-symbols-outlined mt-0.5 ${
                  evt.severity === 'success'
                    ? 'text-tertiary'
                    : evt.severity === 'warning'
                    ? 'text-warning'
                    : evt.severity === 'error'
                    ? 'text-error'
                    : 'text-primary'
                }`}>
                  {evt.severity === 'success' ? 'check_circle' : evt.severity === 'warning' ? 'warning' : 'info'}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-on-surface">{evt.event_type}</span>
                    {evt.stage && (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-primary/10 text-primary border border-primary/20 font-bold">
                        {evt.stage}
                      </span>
                    )}
                  </div>
                  <p className="text-on-surface-variant mt-1">{evt.message}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <span className="text-on-surface-variant text-[11px] whitespace-nowrap">{formatTimeAgo(evt.created_at)}</span>
                {evt.incident_id && (
                  <button
                    onClick={() => navigate(`/incidents/${evt.incident_id}`)}
                    className="px-2.5 py-1 rounded bg-surface-container border border-outline-variant/30 text-primary hover:border-primary/40 text-[11px] cursor-pointer"
                  >
                    View Incident
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
