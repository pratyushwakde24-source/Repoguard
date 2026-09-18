import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { mockIncidents, mockActiveRun, mockSteps, mockActivityEvents, formatTime, getStageIndex } from '../data/mockData'
import { STAGES, STAGE_ICONS } from '../types'
import type { AgentStage } from '../types'
import DetectStage from '../components/stages/DetectStage'
import InspectStage from '../components/stages/InspectStage'
import PlanStage from '../components/stages/PlanStage'
import ReasonStage from '../components/stages/ReasonStage'
import PatchStage from '../components/stages/PatchStage'
import TestStage from '../components/stages/TestStage'
import VerifyStage from '../components/stages/VerifyStage'
import DeliverStage from '../components/stages/DeliverStage'

const stageComponents: Record<AgentStage, React.FC<{ incident?: any }>> = {
  DETECT: DetectStage as React.FC<{ incident?: any }>, INSPECT: InspectStage, PLAN: PlanStage, REASON: ReasonStage,
  PATCH: PatchStage, TEST: TestStage, VERIFY: VerifyStage, DELIVER: DeliverStage,
}

export default function MissionControl() {
  const incident = mockIncidents[0]
  const run = mockActiveRun
  const currentStageIdx = getStageIndex(run.current_stage)
  const [viewStage, setViewStage] = useState<AgentStage>(run.current_stage)
  const [elapsed, setElapsed] = useState(31)
  const [terminalOpen, setTerminalOpen] = useState(true)

  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const StageComponent = stageComponents[viewStage]
  const progressPct = `${Math.round(((currentStageIdx + 0.5) / 8) * 100)}%`

  return (
    <div className="flex flex-col h-full">
      {/* Incident HUD Header */}
      <div className="bg-surface-container-high border-b border-surface-container-highest/30 px-4 py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="px-2 py-0.5 rounded bg-error-container text-on-error-container text-label-sm tracking-widest font-semibold">{incident.id.toUpperCase()}</span>
            <span className="px-2 py-0.5 rounded bg-error/20 text-error text-label-sm uppercase tracking-wider font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping" />CRITICAL
            </span>
            <span className="px-2 py-0.5 rounded bg-tertiary-container text-on-tertiary text-label-sm uppercase font-semibold">LIVE HEALING</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container text-primary text-code-sm shrink-0">
            <span className="material-symbols-outlined text-[14px] text-primary animate-spin" style={{ animationDuration: '3s' }}>smart_toy</span>
            <span>Nemotron 3 Ultra</span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-headline-md text-on-surface tracking-tight">{incident.title.split(':')[0]}</h1>
            <div className="text-code-sm text-on-surface-variant flex items-center gap-1.5 mt-0.5">
              <span className="material-symbols-outlined text-[14px] text-secondary">commit</span>
              <span className="text-secondary font-medium">{incident.commit_sha}</span>
              <span>on</span><span className="text-on-surface">{incident.branch}</span>
              <span className="text-outline">●</span>
              <span>Build #{incident.build_number}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-code-sm">
            <div className="flex items-center gap-1 text-outline">
              <span className="material-symbols-outlined text-[14px]">timer</span>
              <span className="text-on-surface font-semibold font-mono">{String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}</span>
            </div>
            <span className="text-tertiary flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />Autonomous Run
            </span>
          </div>
        </div>
      </div>

      {/* 8-Stage Visual Pipeline */}
      <div className="bg-surface-container border-b border-surface-container-highest/30 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-label-md text-outline tracking-wider uppercase">Autonomous Workflow Pipeline</span>
          <span className="text-code-sm text-primary-fixed bg-primary-container/20 px-2 py-0.5 rounded">Stage {currentStageIdx + 1} / 8</span>
        </div>
        <div className="relative flex items-center justify-between py-2">
          {/* Background track */}
          <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-0.5 bg-surface-container-highest" />
          {/* Progress track */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-tertiary via-primary to-primary shadow-[0_0_8px_rgba(208,188,255,0.6)] transition-all duration-700" style={{ width: progressPct }} />
          {STAGES.map((stage, i) => {
            const isCompleted = i < currentStageIdx
            const isCurrent = i === currentStageIdx
            const isFuture = i > currentStageIdx
            return (
              <button key={stage} onClick={() => setViewStage(stage)} className={`relative z-10 flex flex-col items-center gap-1.5 group focus:outline-none ${isFuture ? 'opacity-60 hover:opacity-100' : ''}`}>
                {isCurrent ? (
                  <div className="relative">
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-[0_0_20px_rgba(208,188,255,0.7)]"
                    >
                      <span className="material-symbols-outlined text-[20px]">{STAGE_ICONS[stage]}</span>
                    </motion.div>
                    <span className="absolute -inset-1.5 rounded-full bg-primary/25 animate-ping" />
                  </div>
                ) : isCompleted ? (
                  <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-tertiary shadow-md">
                    <span className="material-symbols-outlined text-[16px]">check</span>
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-surface-container-high flex items-center justify-center text-outline">
                    <span className="material-symbols-outlined text-[14px]">{STAGE_ICONS[stage]}</span>
                  </div>
                )}
                <span className={`text-label-sm ${isCurrent ? 'text-primary font-bold' : isCompleted ? 'text-tertiary' : 'text-outline'}`}>{stage}</span>
              </button>
            )
          })}
        </div>
        {/* Stage Quick Switcher Pills */}
        <div className="flex items-center gap-1.5 mt-1 overflow-x-auto no-scrollbar">
          {STAGES.map(stage => (
            <button key={stage} onClick={() => setViewStage(stage)}
              className={`px-3 py-1 rounded-full text-code-sm shrink-0 transition-all ${viewStage === stage ? 'bg-primary text-on-primary font-semibold shadow-md' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container'}`}
            >
              {stage.charAt(0) + stage.slice(1).toLowerCase()} {viewStage === stage && stage === run.current_stage && '●'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content: Stage Workspace + Context Panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Stage Workspace */}
        <div className="flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="wait">
            <motion.div key={viewStage} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
              <StageComponent incident={incident} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Context Panel */}
        <div className="w-[280px] bg-surface-container-low border-l border-surface-container-highest/30 overflow-y-auto p-3 flex flex-col gap-3 shrink-0">
          <div className="text-label-md text-outline uppercase tracking-wider">Agent Context</div>
          {[
            { label: 'OBJECTIVE', value: 'Fix CI failure on payment-service:main', icon: 'target' },
            { label: 'CURRENT STAGE', value: run.current_stage, icon: 'psychology' },
            { label: 'MODEL', value: run.current_model, icon: 'memory' },
            { label: 'CONFIDENCE', value: `${Math.round(run.confidence * 100)}%`, icon: 'auto_awesome' },
            { label: 'EVIDENCE', value: `${mockSteps.reduce((s, st) => s + st.evidence_count, 0)} items collected`, icon: 'data_object' },
            { label: 'FILES TARGET', value: incident.affected_files.join(', '), icon: 'description' },
            { label: 'BLAST RADIUS', value: `${incident.blast_radius} services`, icon: 'radar' },
            { label: 'NEXT ACTION', value: 'Synthesize AST patch & regression tests', icon: 'arrow_forward' },
          ].map(ctx => (
            <div key={ctx.label} className="flex flex-col gap-1 p-2 rounded-lg bg-surface-container">
              <div className="flex items-center gap-1 text-outline">
                <span className="material-symbols-outlined text-[12px]">{ctx.icon}</span>
                <span className="text-label-sm uppercase tracking-wider">{ctx.label}</span>
              </div>
              <span className="text-code-sm text-on-surface">{ctx.value}</span>
            </div>
          ))}
          {/* Confidence Ring */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-container">
            <div className="relative w-12 h-12 shrink-0">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                <circle className="stroke-surface-container-highest" cx="24" cy="24" r="20" fill="none" strokeWidth="4" />
                <circle className="stroke-primary" cx="24" cy="24" r="20" fill="none" strokeWidth="4" strokeDasharray="125.6" strokeDashoffset={125.6 * (1 - run.confidence)} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-[16px]">auto_awesome</span>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-label-sm text-outline uppercase tracking-wider">Confidence</span>
              <span className="text-headline-sm text-primary font-bold">{Math.round(run.confidence * 100)}%</span>
              <span className="text-code-sm text-tertiary">High Precision</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Terminal Drawer */}
      <div className="bg-surface-container-lowest border-t border-surface-container-highest/30 flex flex-col">
        <button onClick={() => setTerminalOpen(o => !o)} className="flex items-center justify-between px-4 py-2 bg-surface-container-low hover:bg-surface-container transition-colors w-full text-left">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-tertiary">terminal</span>
            <span className="text-headline-sm text-[13px] text-on-surface">Live Agent Telemetry</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
            <span className="text-code-sm text-outline">{terminalOpen ? 'COLLAPSE' : 'EXPAND'}</span>
            <span className={`material-symbols-outlined text-[16px] text-outline transition-transform ${terminalOpen ? '' : 'rotate-180'}`}>expand_less</span>
          </div>
        </button>
        <AnimatePresence>
          {terminalOpen && (
            <motion.div initial={{ height: 0 }} animate={{ height: 140 }} exit={{ height: 0 }} className="overflow-hidden">
              <div className="p-3 flex flex-col gap-1 text-code-sm h-[140px] overflow-y-auto no-scrollbar">
                {mockActivityEvents.map(evt => (
                  <div key={evt.id} className={`flex items-start gap-2 ${evt.severity === 'success' ? 'text-primary font-semibold' : evt.severity === 'error' ? 'text-error' : 'text-on-surface-variant'}`}>
                    <span className="text-outline-variant shrink-0">{formatTime(evt.created_at)}</span>
                    <span className="flex items-center gap-1">
                      {evt.message}
                      {evt === mockActivityEvents[mockActivityEvents.length - 1] && <span className="inline-block w-1.5 h-3 bg-tertiary animate-terminal-cursor" />}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
