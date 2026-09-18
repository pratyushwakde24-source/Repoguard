export default function PlanStage() {
  const planNodes = [
    { id: 'failure', label: 'CI Failure', icon: 'cancel', color: 'bg-error/20 text-error border-error/40' },
    { id: 'file', label: 'paymentService.ts', icon: 'description', color: 'bg-secondary/20 text-secondary border-secondary/40' },
    { id: 'function', label: 'processPaymentAttempt()', icon: 'code', color: 'bg-primary/20 text-primary border-primary/40' },
    { id: 'test', label: 'Regression Test', icon: 'science', color: 'bg-tertiary/20 text-tertiary border-tertiary/40' },
    { id: 'patch', label: 'Null-Safe Patch', icon: 'build', color: 'bg-tertiary/20 text-tertiary border-tertiary/40' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-[20px] text-primary">account_tree</span>
        <span className="text-headline-sm text-on-surface">Repair Plan Graph</span>
        <span className="px-2 py-0.5 rounded bg-tertiary/10 text-tertiary text-code-sm font-medium">COMPLETED</span>
      </div>
      {/* Repair Graph */}
      <div className="bg-surface-container rounded-xl p-6">
        <div className="flex flex-col items-center gap-0">
          {planNodes.map((node, i) => (
            <div key={node.id} className="flex flex-col items-center">
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border ${node.color} min-w-[200px] justify-center`}>
                <span className="material-symbols-outlined text-[16px]">{node.icon}</span>
                <span className="text-code-sm font-medium">{node.label}</span>
              </div>
              {i < planNodes.length - 1 && (
                <div className="flex flex-col items-center py-1">
                  <div className="w-0.5 h-4 bg-surface-container-highest" />
                  <span className="material-symbols-outlined text-[14px] text-outline">arrow_downward</span>
                  <div className="w-0.5 h-4 bg-surface-container-highest" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {/* Plan Details */}
      <div className="bg-surface-container-low rounded-xl p-4 flex flex-col gap-3">
        <div className="text-label-md text-outline uppercase tracking-wider">Repair Strategy</div>
        <div className="flex flex-col gap-2 text-body-sm text-on-surface-variant">
          <div className="flex items-start gap-2 p-2 rounded bg-surface-container">
            <span className="material-symbols-outlined text-[14px] text-tertiary mt-0.5">check_circle</span>
            <span>Add null-safe guard around <code className="text-code-sm px-1 py-0.5 rounded bg-surface-container-lowest text-primary">paymentAttempt</code> before retryCount access</span>
          </div>
          <div className="flex items-start gap-2 p-2 rounded bg-surface-container">
            <span className="material-symbols-outlined text-[14px] text-tertiary mt-0.5">check_circle</span>
            <span>Preserve exponential backoff telemetry behavior</span>
          </div>
          <div className="flex items-start gap-2 p-2 rounded bg-surface-container">
            <span className="material-symbols-outlined text-[14px] text-tertiary mt-0.5">check_circle</span>
            <span>Generate regression test for undefined payment attempt scenario</span>
          </div>
          <div className="flex items-start gap-2 p-2 rounded bg-surface-container">
            <span className="material-symbols-outlined text-[14px] text-secondary mt-0.5">info</span>
            <span>Add defensive fallback for Stripe webhook variance edge case</span>
          </div>
        </div>
      </div>
    </div>
  )
}
