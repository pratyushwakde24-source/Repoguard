import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mockIncidents, mockSteps } from '../data/mockData'
import { STAGES, STAGE_ICONS } from '../types'

export default function AgentRuns() {
  const navigate = useNavigate()

  const [selectedStage, setSelectedStage] = useState<string>('REASON')
  const [filterModel, setFilterModel] = useState<string>('all')

  return (
    <div className="p-6 flex flex-col gap-6 max-w-[1600px] mx-auto min-w-0 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-surface-container-high border border-outline-variant/30 rounded-xl p-6 relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary-container/30 border border-primary/40 flex items-center justify-center text-primary shadow-lg shadow-primary/10">
            <span className="material-symbols-outlined text-[32px]">smart_toy</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-mono text-on-surface">Agent Runs & Replay</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-primary/20 text-primary border border-primary/30">
                STAGED EXECUTION AUDIT
              </span>
            </div>
            <p className="text-sm text-on-surface-variant mt-0.5">
              Inspect step-by-step reasoning trajectories, execution logs, and stage transitions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-on-surface-variant">Model Filter:</span>
          <select
            value={filterModel}
            onChange={(e) => setFilterModel(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-surface-container border border-outline-variant/30 text-on-surface focus:outline-none"
          >
            <option value="all">All AI Models</option>
            <option value="Nemotron 3 Ultra">Nemotron 3 Ultra</option>
            <option value="Nemotron Fast">Nemotron Fast</option>
            <option value="Nemotron Reasoning">Nemotron Reasoning</option>
          </select>
        </div>
      </div>

      {/* Main Grid: Runs List + Run Replay HUD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Active & Past Runs */}
        <div className="flex flex-col gap-4">
          <div className="bg-surface-container-high border border-outline-variant/30 rounded-xl p-5 flex flex-col gap-4 font-mono text-xs">
            <h2 className="font-bold text-on-surface text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary">history</span>
              <span>Execution Runs History</span>
            </h2>

            {mockIncidents.map((inc) => (
              <div
                key={inc.id}
                onClick={() => navigate(`/incidents/${inc.id}`)}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  inc.id === 'inc-9281'
                    ? 'bg-surface-container border-primary/50 shadow-md'
                    : 'bg-surface-container/50 border-outline-variant/20 hover:border-outline-variant/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-secondary font-bold">{inc.id.toUpperCase()}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-tertiary/20 text-tertiary border border-tertiary/30">
                    {inc.status}
                  </span>
                </div>
                <h3 className="font-sans font-semibold text-on-surface text-xs mt-1.5">{inc.title}</h3>
                <div className="flex items-center justify-between text-[11px] text-on-surface-variant mt-2 pt-2 border-t border-outline-variant/10">
                  <span>Repo: {inc.repository_name}</span>
                  <span className="text-primary font-bold">Nemotron 3 Ultra</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 2 Columns: 8-Stage Replay Pipeline */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-surface-container-high border border-outline-variant/30 rounded-xl p-6 flex flex-col gap-5 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div>
                <h2 className="text-base font-bold text-on-surface">Run #RUN-001 — Replay Inspector</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">Target: acme/payment-service (INC-9281)</p>
              </div>
              <button
                onClick={() => navigate('/incidents/inc-9281')}
                className="px-3.5 py-2 rounded-lg bg-primary-container text-on-primary-container font-semibold hover:bg-primary-container/80 transition-all cursor-pointer"
              >
                Open Mission Control HUD
              </button>
            </div>

            {/* 8 Stage Stepper */}
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
              {STAGES.map((stage) => {
                const step = mockSteps.find((s) => s.stage === stage)
                const isSelected = selectedStage === stage
                return (
                  <button
                    key={stage}
                    onClick={() => setSelectedStage(stage)}
                    className={`p-2.5 rounded-lg border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary-container/40 border-primary text-primary font-bold shadow-md'
                        : step?.status === 'completed'
                        ? 'bg-tertiary/10 border-tertiary/30 text-tertiary'
                        : 'bg-surface-container border-outline-variant/20 text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{STAGE_ICONS[stage]}</span>
                    <span className="text-[10px] font-bold">{stage}</span>
                  </button>
                )
              })}
            </div>

            {/* Stage Detail Inspector Box */}
            <div className="bg-surface-container rounded-xl p-5 border border-outline-variant/20 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-outline-variant/15 pb-2">
                <span className="font-bold text-sm text-primary">Stage: {selectedStage}</span>
                <span className="text-tertiary font-bold">STATUS: COMPLETED</span>
              </div>
              <p className="text-on-surface leading-relaxed text-xs">
                Execution phase {selectedStage} completed successfully for payment retry handler. Generated AST call graphs and validated test suite.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 pt-2 border-t border-outline-variant/10 text-[11px] text-on-surface-variant">
                <div>Model: <strong className="text-on-surface">Nemotron 3 Ultra</strong></div>
                <div>Duration: <strong className="text-on-surface">5,100 ms</strong></div>
                <div>Evidence Count: <strong className="text-tertiary">8 facts</strong></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
