import { useState } from 'react'

export default function Settings() {
  const [autonomyMode, setAutonomyMode] = useState<'autonomous' | 'pr_review' | 'strict'>('pr_review')
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(90)
  const [selectedModel, setSelectedModel] = useState<string>('Nemotron 3 Ultra')
  const [slackWebhook, setSlackWebhook] = useState('https://hooks.slack.com/services/T00/B00/XXXX')
  const [githubAppId, setGithubAppId] = useState('891240')
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="p-6 flex flex-col gap-6 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between bg-surface-container-high border border-outline-variant/30 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-outline-variant/30 border border-outline-variant/40 flex items-center justify-center text-on-surface">
            <span className="material-symbols-outlined text-[32px]">settings</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold font-mono tracking-tight text-on-surface">System & Agent Settings</h1>
            <p className="text-sm text-on-surface-variant mt-0.5">
              Configure autonomous patch confidence gates, AI model routing, and notification channels.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-tertiary-container text-on-tertiary-container font-mono text-sm font-semibold hover:bg-tertiary-container/80 transition-all border border-tertiary/30 cursor-pointer shadow-md shadow-tertiary/20"
        >
          <span className="material-symbols-outlined text-[18px]">{saved ? 'check_circle' : 'save'}</span>
          {saved ? 'Settings Saved' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Autonomy & Trust Gate */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-surface-container-high border border-outline-variant/30 rounded-xl p-6 flex flex-col gap-5">
            <div className="flex items-center gap-2 text-primary font-mono font-bold">
              <span className="material-symbols-outlined">smart_toy</span>
              <h2 className="text-on-surface">Agent Autonomy Level</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { id: 'autonomous', title: 'Full Autonomy', desc: 'Auto-fixes bugs, passes verification & merges PRs directly' },
                { id: 'pr_review', title: 'PR Approval', desc: 'Creates pull requests & requests team review (Recommended)' },
                { id: 'strict', title: 'Strict Review', desc: 'Generates patch recommendations in HUD only' }
              ].map(item => (
                <div
                  key={item.id}
                  onClick={() => setAutonomyMode(item.id as any)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 font-mono ${
                    autonomyMode === item.id
                      ? 'bg-primary-container/30 border-primary text-on-surface shadow-md'
                      : 'bg-surface-container border-outline-variant/20 text-on-surface-variant hover:border-outline-variant/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-on-surface">{item.title}</span>
                    {autonomyMode === item.id && (
                      <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
                    )}
                  </div>
                  <p className="text-xs text-on-surface-variant leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Trust Gate Threshold */}
          <div className="bg-surface-container-high border border-outline-variant/30 rounded-xl p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-tertiary font-mono font-bold">
                <span className="material-symbols-outlined">verified</span>
                <h2 className="text-on-surface">Trust Gate Confidence Threshold</h2>
              </div>
              <span className="text-xl font-mono font-bold text-tertiary">{confidenceThreshold}%</span>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed font-mono">
              Patches with confidence score below this threshold will require manual human intervention before delivery.
            </p>

            <input
              type="range"
              min="70"
              max="99"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(Number(e.target.value))}
              className="w-full accent-tertiary cursor-pointer"
            />
            <div className="flex justify-between font-mono text-[11px] text-on-surface-variant">
              <span>70% (Relaxed)</span>
              <span>85% (Balanced)</span>
              <span>95% (Strict / Production)</span>
            </div>
          </div>

          {/* Model Selection */}
          <div className="bg-surface-container-high border border-outline-variant/30 rounded-xl p-6 flex flex-col gap-5">
            <div className="flex items-center gap-2 text-secondary font-mono font-bold">
              <span className="material-symbols-outlined">psychology</span>
              <h2 className="text-on-surface font-bold">Primary Reasoning Model</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono">
              {['Nemotron 3 Ultra', 'Claude 3.5 Sonnet', 'GPT-4o'].map(model => (
                <button
                  key={model}
                  onClick={() => setSelectedModel(model)}
                  className={`p-3.5 rounded-lg border text-left text-xs transition-all cursor-pointer ${
                    selectedModel === model
                      ? 'bg-secondary-container/40 border-secondary text-on-surface font-bold'
                      : 'bg-surface-container border-outline-variant/20 text-on-surface-variant hover:border-outline-variant/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{model}</span>
                    {selectedModel === model && <span className="material-symbols-outlined text-secondary text-[16px]">check</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Integration & Notification Panel */}
        <div className="flex flex-col gap-6">
          <div className="bg-surface-container-high border border-outline-variant/30 rounded-xl p-6 flex flex-col gap-4 font-mono">
            <div className="flex items-center gap-2 text-on-surface font-bold">
              <span className="material-symbols-outlined text-primary">hub</span>
              <h3>GitHub Integration</h3>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-on-surface-variant">GitHub App ID</label>
              <input
                type="text"
                value={githubAppId}
                onChange={(e) => setGithubAppId(e.target.value)}
                className="px-3 py-2 rounded bg-surface-container border border-outline-variant/30 text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-on-surface-variant">Webhook Secret</label>
              <input
                type="password"
                value="••••••••••••••••••••"
                readOnly
                className="px-3 py-2 rounded bg-surface-container border border-outline-variant/30 text-xs text-on-surface-variant focus:outline-none"
              />
            </div>
          </div>

          <div className="bg-surface-container-high border border-outline-variant/30 rounded-xl p-6 flex flex-col gap-4 font-mono">
            <div className="flex items-center gap-2 text-on-surface font-bold">
              <span className="material-symbols-outlined text-tertiary">notifications</span>
              <h3>Notifications</h3>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-on-surface-variant">Slack Webhook URL</label>
              <input
                type="text"
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
                className="px-3 py-2 rounded bg-surface-container border border-outline-variant/30 text-xs text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
