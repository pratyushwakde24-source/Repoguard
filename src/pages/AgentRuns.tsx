import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { mockIncidents, mockSteps } from '../data/mockData'
import { STAGES, STAGE_ICONS } from '../types'
import type { Incident } from '../types'

export default function AgentRuns() {
  const navigate = useNavigate()

  const [incidents, setIncidents] = useState<Incident[]>(mockIncidents)
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>(mockIncidents[0].id)
  const [selectedStage, setSelectedStage] = useState<string>('REASON')
  const [filterModel, setFilterModel] = useState<string>('all')

  useEffect(() => {
    fetch('http://localhost:3001/api/incidents')
      .then(r => r.json())
      .then(data => {
        if (data.incidents && data.incidents.length > 0) {
          setIncidents(data.incidents)
        }
      })
      .catch(() => {})
  }, [])

  const selectedIncident = incidents.find(i => i.id === selectedIncidentId) || incidents[0]
  const isWaitingHumanReview = selectedIncident.human_review_status === 'PENDING' || 
    (selectedIncident.status === 'investigating' && selectedIncident.id === 'inc-9281' && selectedIncident.human_review_status !== 'APPROVED')

  const riskScore = selectedIncident.risk_score ?? 15
  const rootCauseStatus = selectedIncident.root_cause_status ?? 'VERIFIED'
  const confidence = selectedIncident.confidence ?? 94
  const evidenceCount = selectedIncident.evidence_count ?? 8

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

            {incidents.map((inc) => {
              const isSelected = inc.id === selectedIncidentId
              const isReviewReq = inc.human_review_status === 'PENDING' || (inc.id === 'inc-9281' && inc.human_review_status !== 'APPROVED')
              return (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncidentId(inc.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-surface-container border-primary/50 shadow-md ring-1 ring-primary/30'
                      : 'bg-surface-container/50 border-outline-variant/20 hover:border-outline-variant/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-secondary font-bold">{inc.id.toUpperCase()}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                      isReviewReq 
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' 
                        : (inc.status as string) === 'resolved' || (inc.status as string) === 'healing'
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : 'bg-tertiary/20 text-tertiary border-tertiary/30'
                    }`}>
                      {isReviewReq ? 'WAITING REVIEW' : inc.status}
                    </span>
                  </div>
                  <h3 className="font-sans font-semibold text-on-surface text-xs mt-1.5">{inc.title}</h3>
                  <div className="flex items-center justify-between text-[11px] text-on-surface-variant mt-2 pt-2 border-t border-outline-variant/10">
                    <span>Repo: {inc.repository_name}</span>
                    <span className="text-primary font-bold">Nemotron 3 Ultra</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right 2 Columns: Replay Pipeline & Human Review Card */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Prominent Human Verification Card if Waiting for Review */}
          {isWaitingHumanReview && (
            <div className="bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-surface-container-high border-2 border-amber-500/50 rounded-xl p-6 shadow-xl relative overflow-hidden font-mono">
              <div className="absolute top-0 right-0 px-3 py-1 bg-amber-500/20 text-amber-400 border-b border-l border-amber-500/40 text-[10px] font-bold rounded-bl uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                AUTONOMOUS PIPELINE PAUSED
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-amber-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                    <span className="material-symbols-outlined text-[28px]">gavel</span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-amber-300 flex items-center gap-2">
                      🛡 HUMAN VERIFICATION REQUIRED
                    </h3>
                    <p className="text-xs text-amber-200/70 mt-0.5">
                      Deterministic safety gates require human authorization before executing code mutations.
                    </p>
                  </div>
                </div>

                <button
                  id="btn-open-incident-review"
                  onClick={() => navigate(`/incidents/${selectedIncident.id}`)}
                  className="px-4 py-2.5 rounded-lg bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 active:scale-95 transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined text-[18px]">launch</span>
                  <span>OPEN INCIDENT REVIEW</span>
                </button>
              </div>

              {/* Status Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4 text-xs">
                <div className="bg-surface-container/80 border border-amber-500/20 rounded-lg p-3">
                  <span className="text-[10px] text-on-surface-variant block">STATUS</span>
                  <span className="font-bold text-amber-400 text-xs">WAITING FOR REVIEW</span>
                </div>
                <div className="bg-surface-container/80 border border-amber-500/20 rounded-lg p-3">
                  <span className="text-[10px] text-on-surface-variant block">RISK SCORE</span>
                  <span className="font-bold text-on-surface text-xs">{riskScore} / 100 (LOW)</span>
                </div>
                <div className="bg-surface-container/80 border border-amber-500/20 rounded-lg p-3">
                  <span className="text-[10px] text-on-surface-variant block">ROOT CAUSE</span>
                  <span className="font-bold text-emerald-400 text-xs">{rootCauseStatus} ({confidence}%)</span>
                </div>
                <div className="bg-surface-container/80 border border-amber-500/20 rounded-lg p-3">
                  <span className="text-[10px] text-on-surface-variant block">EVIDENCE</span>
                  <span className="font-bold text-tertiary text-xs">{evidenceCount} Facts</span>
                </div>
                <div className="bg-surface-container/80 border border-amber-500/20 rounded-lg p-3">
                  <span className="text-[10px] text-on-surface-variant block">FILE SCOPE</span>
                  <span className="font-bold text-on-surface text-xs">3 Authorized</span>
                </div>
                <div className="bg-surface-container/80 border border-amber-500/20 rounded-lg p-3">
                  <span className="text-[10px] text-on-surface-variant block">SAFETY GATE</span>
                  <span className="font-bold text-amber-400 text-xs">HOLDING</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-surface-container-high border border-outline-variant/30 rounded-xl p-6 flex flex-col gap-5 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
              <div>
                <h2 className="text-base font-bold text-on-surface">Run #{selectedIncident.id.toUpperCase()} — Replay Inspector</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">Target: {selectedIncident.repository_name} ({selectedIncident.id.toUpperCase()})</p>
              </div>
              <button
                onClick={() => navigate(`/incidents/${selectedIncident.id}`)}
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
                <span className={`${isWaitingHumanReview && selectedStage === 'PATCH' ? 'text-amber-400' : 'text-tertiary'} font-bold`}>
                  {isWaitingHumanReview && selectedStage === 'PATCH' ? 'STATUS: PAUSED / REVIEW REQUIRED' : 'STATUS: COMPLETED'}
                </span>
              </div>
              <p className="text-on-surface leading-relaxed text-xs">
                {isWaitingHumanReview && selectedStage === 'PATCH'
                  ? 'Patch stage halted by deterministic Risk Gate. Waiting for human approval before mutating repository files.'
                  : `Execution phase ${selectedStage} completed successfully for repository ${selectedIncident.repository_name}. AST call graphs and verification models validated.`}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2 pt-2 border-t border-outline-variant/10 text-[11px] text-on-surface-variant">
                <div>Model: <strong className="text-on-surface">Nemotron 3 Ultra</strong></div>
                <div>Risk Gate: <strong className={isWaitingHumanReview ? "text-amber-400" : "text-emerald-400"}>{isWaitingHumanReview ? "Review Required" : "Authorized"}</strong></div>
                <div>Evidence Count: <strong className="text-tertiary">{evidenceCount} facts</strong></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

