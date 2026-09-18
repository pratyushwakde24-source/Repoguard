import { useState } from 'react'
import { motion } from 'framer-motion'
import { mockSecurityAlerts, formatTimeAgo } from '../data/mockData'

export default function SecurityCenter() {
  const [alerts, setAlerts] = useState(mockSecurityAlerts)
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all')
  const [isScanning, setIsScanning] = useState(false)

  const filteredAlerts = alerts.filter(a => selectedSeverity === 'all' || a.severity === selectedSeverity)

  const handleScan = () => {
    setIsScanning(true)
    setTimeout(() => {
      setIsScanning(false)
    }, 2500)
  }

  const handleTriggerFix = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'patching' } : a))
  }

  return (
    <div className="p-6 flex flex-col gap-6 max-w-[1600px] mx-auto">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-surface-container-high border border-outline-variant/30 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-tertiary-container/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-4 z-10">
          <div className="w-14 h-14 rounded-xl bg-tertiary-container/30 border border-tertiary/40 flex items-center justify-center text-tertiary shadow-lg shadow-tertiary/10">
            <span className="material-symbols-outlined text-[32px]">shield_lock</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-mono tracking-tight text-on-surface">Security Command Center</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono bg-tertiary/20 text-tertiary border border-tertiary/30">
                ACTIVE SHIELD
              </span>
            </div>
            <p className="text-sm text-on-surface-variant mt-0.5">
              Automated Dependabot patcher, CVE vulnerability scanner & zero-day remediation pipeline.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 z-10 w-full md:w-auto">
          <button
            onClick={handleScan}
            disabled={isScanning}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-tertiary-container text-on-tertiary-container hover:bg-tertiary-container/80 transition-all font-mono text-sm font-semibold border border-tertiary/30 shadow-md shadow-tertiary/20 disabled:opacity-50 cursor-pointer"
          >
            <span className={`material-symbols-outlined text-[18px] ${isScanning ? 'animate-spin' : ''}`}>
              {isScanning ? 'sync' : 'security_update_good'}
            </span>
            {isScanning ? 'Scanning Repositories...' : 'Run CVE Audit'}
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-surface-container-high border border-outline-variant/30 flex flex-col justify-between relative">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-mono uppercase tracking-wider">Security Posture</span>
            <span className="material-symbols-outlined text-tertiary text-[20px]">verified_user</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-on-surface">94.2</span>
            <span className="text-xs text-on-surface-variant font-mono">/ 100</span>
            <span className="ml-auto text-xs font-mono text-tertiary bg-tertiary/10 px-2 py-0.5 rounded border border-tertiary/20">+1.4% this week</span>
          </div>
          <div className="w-full bg-surface-container-highest rounded-full h-1.5 mt-3 overflow-hidden">
            <div className="bg-tertiary h-full rounded-full" style={{ width: '94.2%' }} />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-surface-container-high border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-mono uppercase tracking-wider">Critical Unpatched</span>
            <span className="material-symbols-outlined text-error text-[20px]">error</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-error">1</span>
            <span className="text-xs font-mono text-error/80 bg-error/10 px-2 py-0.5 rounded border border-error/20">CVE-2024-21538</span>
          </div>
          <p className="text-xs text-on-surface-variant mt-2 font-mono">Auto-patch in progress by RepoGuard</p>
        </div>

        <div className="p-5 rounded-xl bg-surface-container-high border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-mono uppercase tracking-wider">Packages Scanned</span>
            <span className="material-symbols-outlined text-primary text-[20px]">inventory_2</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-on-surface">1,482</span>
            <span className="text-xs text-on-surface-variant font-mono">across 5 repos</span>
          </div>
          <p className="text-xs text-on-surface-variant mt-2 font-mono">0 unknown vulnerabilities</p>
        </div>

        <div className="p-5 rounded-xl bg-surface-container-high border border-outline-variant/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-xs font-mono uppercase tracking-wider">Auto-Remediated</span>
            <span className="material-symbols-outlined text-tertiary text-[20px]">auto_fix_high</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-tertiary">38</span>
            <span className="text-xs text-on-surface-variant font-mono">CVEs fixed</span>
          </div>
          <p className="text-xs text-on-surface-variant mt-2 font-mono">Avg remediation: 4m 12s</p>
        </div>
      </div>

      {/* Main Grid: CVE Table + Remediation Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CVE Table (2 cols) */}
        <div className="lg:col-span-2 bg-surface-container-high border border-outline-variant/30 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary">gavel</span>
              <h2 className="font-mono font-bold text-on-surface">Detected Vulnerabilities (CVE)</h2>
            </div>
            
            <div className="flex items-center gap-2 font-mono text-xs">
              {['all', 'critical', 'high', 'medium'].map(sev => (
                <button
                  key={sev}
                  onClick={() => setSelectedSeverity(sev)}
                  className={`px-3 py-1 rounded-md capitalize transition-all border ${
                    selectedSeverity === sev
                      ? 'bg-tertiary-container/30 text-tertiary border-tertiary/40 font-bold'
                      : 'bg-surface-container text-on-surface-variant border-outline-variant/20 hover:text-on-surface'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-outline-variant/20 overflow-x-auto">
            {filteredAlerts.map(alert => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-container/50 px-2 rounded-lg transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className={`material-symbols-outlined mt-0.5 ${
                    alert.severity === 'critical' ? 'text-error' : alert.severity === 'high' ? 'text-warning' : 'text-primary'
                  }`}>
                    {alert.severity === 'critical' ? 'dangerous' : 'warning'}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-bold text-on-surface text-sm">{alert.cve_id}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                        alert.severity === 'critical' ? 'bg-error/20 text-error border border-error/30' : 'bg-warning/20 text-warning border border-warning/30'
                      }`}>
                        {alert.severity} (CVSS {alert.cvss_score})
                      </span>
                      <span className="text-xs text-on-surface-variant">in {alert.repository_name}</span>
                    </div>
                    <p className="text-xs font-semibold text-on-surface mt-1">{alert.title}</p>
                    <div className="flex items-center gap-3 font-mono text-[11px] text-on-surface-variant mt-1">
                      <span>Pkg: <code className="text-secondary">{alert.package_name}</code> ({alert.current_version} → <span className="text-tertiary font-bold">{alert.patched_version}</span>)</span>
                      <span>• {formatTimeAgo(alert.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span className={`px-2.5 py-1 rounded-full font-mono text-xs font-semibold border ${
                    alert.status === 'patching'
                      ? 'bg-tertiary/15 text-tertiary border-tertiary/40 animate-pulse'
                      : alert.status === 'patched'
                      ? 'bg-success/15 text-success border-success/40'
                      : 'bg-error/15 text-error border-error/40'
                  }`}>
                    {alert.status === 'patching' ? 'Auto-Patching' : alert.status === 'patched' ? 'Patched' : 'Unpatched'}
                  </span>

                  {alert.status !== 'patched' && (
                    <button
                      onClick={() => handleTriggerFix(alert.id)}
                      disabled={alert.status === 'patching'}
                      className="px-3 py-1.5 rounded bg-tertiary/20 text-tertiary border border-tertiary/40 font-mono text-xs font-semibold hover:bg-tertiary/30 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {alert.status === 'patching' ? 'Patching...' : 'Dispatch Agent'}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Security Auto-Patch Pipeline Side Card */}
        <div className="flex flex-col gap-4">
          <div className="bg-surface-container-high border border-outline-variant/30 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-tertiary">
              <span className="material-symbols-outlined">auto_fix_high</span>
              <h2 className="font-mono font-bold text-on-surface">Auto-Patch Guard</h2>
            </div>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              RepoGuard automatically generates PRs for vulnerable dependencies by testing updated lockfiles against regression test suites.
            </p>

            <div className="bg-surface-container rounded-lg p-4 border border-outline-variant/20 flex flex-col gap-3 font-mono text-xs">
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">Auto-Fix Dependabot</span>
                <span className="px-2 py-0.5 rounded bg-tertiary/20 text-tertiary font-bold">ENABLED</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">CVSS Threshold</span>
                <span className="text-on-surface font-bold">&gt;= 7.0 (High/Crit)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">Sandbox Test Matrix</span>
                <span className="text-tertiary font-bold">Passed (8/8)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">PR Auto-Merge</span>
                <span className="text-secondary font-bold">Req. Approval</span>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-high border border-outline-variant/30 rounded-xl p-5 flex flex-col gap-3">
            <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-on-surface-variant">
              Risk Matrix Summary
            </h3>
            <div className="grid grid-cols-2 gap-2 text-center font-mono text-xs">
              <div className="p-3 rounded bg-error/10 border border-error/20">
                <div className="text-lg font-bold text-error">1</div>
                <div className="text-[10px] text-error/80 uppercase">Critical CVE</div>
              </div>
              <div className="p-3 rounded bg-warning/10 border border-warning/20">
                <div className="text-lg font-bold text-warning">1</div>
                <div className="text-[10px] text-warning/80 uppercase">High Risk</div>
              </div>
              <div className="p-3 rounded bg-surface-container border border-outline-variant/20">
                <div className="text-lg font-bold text-on-surface">0</div>
                <div className="text-[10px] text-on-surface-variant uppercase">Medium</div>
              </div>
              <div className="p-3 rounded bg-surface-container border border-outline-variant/20">
                <div className="text-lg font-bold text-tertiary">14</div>
                <div className="text-[10px] text-on-surface-variant uppercase">Zero Vuln Pkgs</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
