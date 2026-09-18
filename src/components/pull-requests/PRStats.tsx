interface PRStatsProps {
  totalPrs: number
  openPrs: number
  mergedPrs: number
  avgConfidence: number
}

export default function PRStats({ totalPrs, openPrs, mergedPrs, avgConfidence }: PRStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 w-full">
      <div className="p-4 rounded-xl bg-surface-container-high border border-outline-variant/30 flex flex-col justify-between">
        <div className="flex items-center justify-between text-on-surface-variant font-mono text-[11px] uppercase tracking-wider">
          <span>Total PRs</span>
          <span className="material-symbols-outlined text-primary text-[18px]">call_merge</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl md:text-3xl font-bold font-mono text-on-surface">{totalPrs}</span>
          <span className="text-xs text-on-surface-variant font-mono">delivered</span>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-surface-container-high border border-outline-variant/30 flex flex-col justify-between">
        <div className="flex items-center justify-between text-on-surface-variant font-mono text-[11px] uppercase tracking-wider">
          <span>Active Open PRs</span>
          <span className="material-symbols-outlined text-primary text-[18px]">pending</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl md:text-3xl font-bold font-mono text-primary">{openPrs}</span>
          <span className="text-xs text-primary/80 font-mono bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">Needs Merge</span>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-surface-container-high border border-outline-variant/30 flex flex-col justify-between">
        <div className="flex items-center justify-between text-on-surface-variant font-mono text-[11px] uppercase tracking-wider">
          <span>Merged PRs</span>
          <span className="material-symbols-outlined text-tertiary text-[18px]">merge</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl md:text-3xl font-bold font-mono text-tertiary">{mergedPrs}</span>
          <span className="text-xs text-tertiary/80 font-mono bg-tertiary/10 px-1.5 py-0.5 rounded border border-tertiary/20">100% verified</span>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-surface-container-high border border-outline-variant/30 flex flex-col justify-between">
        <div className="flex items-center justify-between text-on-surface-variant font-mono text-[11px] uppercase tracking-wider">
          <span>Avg Confidence</span>
          <span className="material-symbols-outlined text-tertiary text-[18px]">verified</span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl md:text-3xl font-bold font-mono text-on-surface">{Math.round(avgConfidence * 100)}%</span>
          <span className="text-xs text-tertiary font-mono">Trust Gate</span>
        </div>
      </div>
    </div>
  )
}
