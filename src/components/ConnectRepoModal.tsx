import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getGitHubStatus, getGitHubRepos, connectRepository, initiateGitHubAppInstall } from '../services/githubApi'
import { useRepositories } from '../context/RepositoryContext'
import type { GitHubAuthStatus, GitHubRepoItem, Repository } from '../types'

interface ConnectRepoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (repo: Repository) => void
  onNavigateToRepo?: (repoId: string) => void
}

type ModalStep = 'auth' | 'select' | 'monitoring' | 'review' | 'connecting' | 'already_connected' | 'success' | 'error'

const DEMO_REPOSITORIES: GitHubRepoItem[] = [
  { id: 7492101, node_id: 'MDEwOlJlcG9zaXRvcnk3NDkyMTAx', name: 'payment-service', full_name: 'acme/payment-service', owner: { login: 'acme', avatar_url: 'https://avatars.githubusercontent.com/u/9919?v=4' }, private: true, html_url: 'https://github.com/acme/payment-service', description: 'Core payment processing and Stripe retry engine', default_branch: 'main', language: 'TypeScript', stargazers_count: 142, updated_at: new Date().toISOString() },
  { id: 7492102, node_id: 'MDEwOlJlcG9zaXRvcnk3NDkyMTAy', name: 'auth-service', full_name: 'acme/auth-service', owner: { login: 'acme', avatar_url: 'https://avatars.githubusercontent.com/u/9919?v=4' }, private: false, html_url: 'https://github.com/acme/auth-service', description: 'OAuth2 & JWT authentication microservice', default_branch: 'main', language: 'TypeScript', stargazers_count: 98, updated_at: new Date().toISOString() },
  { id: 7492103, node_id: 'MDEwOlJlcG9zaXRvcnk3NDkyMTAz', name: 'checkout-api', full_name: 'acme/checkout-api', owner: { login: 'acme', avatar_url: 'https://avatars.githubusercontent.com/u/9919?v=4' }, private: false, html_url: 'https://github.com/acme/checkout-api', description: 'E-commerce shopping cart & checkout REST API', default_branch: 'main', language: 'TypeScript', stargazers_count: 215, updated_at: new Date().toISOString() },
]

export default function ConnectRepoModal({ isOpen, onClose, onSuccess, onNavigateToRepo }: ConnectRepoModalProps) {
  const { addRepository, isRepoConnected, refreshRepositories } = useRepositories()

  const [step, setStep] = useState<ModalStep>('auth')
  const [ghStatus, setGhStatus] = useState<GitHubAuthStatus>({ configured: false, authenticated: false })
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)
  const [isDemoMode, setIsDemoMode] = useState(false)

  const [repos, setRepos] = useState<GitHubRepoItem[]>([])
  const [isLoadingRepos, setIsLoadingRepos] = useState(false)
  const [reposMessage, setReposMessage] = useState<string>('')
  const [search, setSearch] = useState('')
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepoItem | null>(null)

  // Monitoring preferences
  const [ciMonitoring, setCiMonitoring] = useState(true)
  const [securityMonitoring, setSecurityMonitoring] = useState(true)
  const [prMonitoring, setPrMonitoring] = useState(true)
  const [autonomousInvestigation, setAutonomousInvestigation] = useState(true)
  const [autoFixMode, setAutoFixMode] = useState<'pr' | 'suggest'>('pr')

  // Connection progress state
  const [progressStep, setProgressStep] = useState<number>(0)
  const [connectedRepoResult, setConnectedRepoResult] = useState<Repository | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [webhookConfigured, setWebhookConfigured] = useState<boolean>(false)

  // Check URL parameters for callback status (e.g. ?github_connected=true)
  useEffect(() => {
    if (!isOpen) return
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('github_connected') === 'true') {
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [isOpen])

  // Fetch GitHub server status on open
  useEffect(() => {
    if (!isOpen) return

    setIsLoadingStatus(true)
    getGitHubStatus()
      .then((status) => {
        setGhStatus(status)
        setStep('auth')
      })
      .catch((err) => {
        setGhStatus({ configured: false, authenticated: false, error: err.message })
        setStep('auth')
      })
      .finally(() => setIsLoadingStatus(false))
  }, [isOpen])

  // Reset modal on close
  const handleClose = useCallback(() => {
    setStep('auth')
    setSelectedRepo(null)
    setSearch('')
    setErrorMessage('')
    setReposMessage('')
    setIsDemoMode(false)
    onClose()
  }, [onClose])

  // Keyboard accessibility: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleClose])

  // Fetch GitHub repositories for real mode or demo mode
  const fetchReposList = async (demo = false) => {
    setIsLoadingRepos(true)
    setReposMessage('')

    if (demo) {
      setIsDemoMode(true)
      setRepos(DEMO_REPOSITORIES)
      setIsLoadingRepos(false)
      setStep('select')
      return
    }

    setIsDemoMode(false)
    const result = await getGitHubRepos()
    if (result.configured && result.repos) {
      setRepos(result.repos)
      if (result.repos.length === 0) {
        setReposMessage(result.message || 'No repositories found for this GitHub App installation.')
      }
      setStep('select')
    } else {
      setRepos([])
      setReposMessage(result.message || 'GitHub App integration is not configured or accessible.')
      setStep('select')
    }
    setIsLoadingRepos(false)
  }

  // Filtered repositories for repository selection
  const filteredRepos = useMemo(() => {
    if (!search.trim()) return repos
    const q = search.toLowerCase().trim()
    return repos.filter(
      (r) =>
        r.full_name.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.language && r.language.toLowerCase().includes(q))
    )
  }, [repos, search])

  // Handle repository selection
  const handleSelectRepo = (repo: GitHubRepoItem) => {
    setSelectedRepo(repo)
    if (isRepoConnected(repo.id) || isRepoConnected(repo.full_name)) {
      setStep('already_connected')
    } else {
      setStep('monitoring')
    }
  }

  // Trigger actual connection flow with multi-step progress indicator
  const handlePerformConnection = async () => {
    if (!selectedRepo) return
    setStep('connecting')
    setProgressStep(1) // 1. Validating GitHub App Authorization

    await new Promise((r) => setTimeout(r, 400))
    setProgressStep(2) // 2. Verifying installation access

    await new Promise((r) => setTimeout(r, 400))
    setProgressStep(3) // 3. Storing repository in Supabase

    try {
      const result = await connectRepository({
        github_repository_id: selectedRepo.id,
        full_name: selectedRepo.full_name,
        owner: selectedRepo.owner.login,
        name: selectedRepo.name,
        default_branch: selectedRepo.default_branch || 'main',
        language: selectedRepo.language || 'TypeScript',
        visibility: selectedRepo.private ? 'private' : 'public',
        html_url: selectedRepo.html_url,
        ci_monitoring_enabled: ciMonitoring,
        security_monitoring_enabled: securityMonitoring,
        pr_monitoring_enabled: prMonitoring,
        auto_fix_enabled: autoFixMode === 'pr',
        is_demo: isDemoMode,
      })

      setProgressStep(4) // 4. Verifying webhook readiness

      await new Promise((r) => setTimeout(r, 500))
      setProgressStep(5) // 5. Activating RepoGuard monitoring

      if (result.success && result.repository) {
        addRepository(result.repository)
        await refreshRepositories()
        setConnectedRepoResult(result.repository)
        setWebhookConfigured(Boolean(result.webhook_configured))
        setStep('success')
        if (onSuccess) onSuccess(result.repository)
      } else if (result.error === 'ALREADY_CONNECTED') {
        setStep('already_connected')
      } else {
        setErrorMessage(result.error || 'Failed to connect repository to RepoGuard.')
        setStep('error')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during connection.')
      setStep('error')
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-[680px] bg-surface-container-high border border-outline-variant/30 rounded-2xl shadow-2xl overflow-hidden font-mono flex flex-col text-on-surface"
        >
          {/* Header */}
          <div className="flex items-start justify-between p-6 border-b border-outline-variant/20 bg-surface-container/50 relative">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">hub</span>
                <h2 className="text-xl font-bold tracking-tight text-on-surface uppercase">Connect Repository</h2>
                {isDemoMode && (
                  <span className="px-2 py-0.5 rounded bg-warning/20 text-warning border border-warning/30 text-[10px] font-bold tracking-wider">
                    DEMO MODE
                  </span>
                )}
              </div>
              <p className="text-xs text-on-surface-variant mt-1">
                Connect a GitHub App installed repository for autonomous monitoring and self-healing.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer"
              aria-label="Close modal"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto max-h-[75vh]">
            {/* STEP 1: AUTH STATUS */}
            {step === 'auth' && (
              <div className="flex flex-col gap-6">
                {isLoadingStatus ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3">
                    <span className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <span className="text-xs text-on-surface-variant">Checking GitHub App integration status...</span>
                  </div>
                ) : ghStatus.configured ? (
                  <div className="flex flex-col gap-5">
                    {/* Active Configuration Box */}
                    <div className="bg-surface-container border border-success/30 rounded-xl p-5 flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        {ghStatus.user?.avatar_url ? (
                          <div className="w-12 h-12 rounded-full overflow-hidden border border-success/40 bg-surface-container-highest">
                            <img src={ghStatus.user.avatar_url} alt={ghStatus.user.login} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-success/10 border border-success/30 flex items-center justify-center text-success">
                            <span className="material-symbols-outlined text-[28px]">verified_user</span>
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                            <span className="font-bold text-sm text-on-surface">
                              {ghStatus.user?.name || ghStatus.user?.login || 'RepoGuard-Pratyush GitHub App'}
                            </span>
                          </div>
                          <span className="text-xs text-success font-semibold">GitHub App Integration Active</span>
                        </div>
                      </div>

                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        Server-side GitHub App authorization is active. Proceed to select repositories accessible to the App installation.
                      </p>

                      <div className="flex flex-col sm:flex-row gap-3 pt-1">
                        <button
                          onClick={() => fetchReposList(false)}
                          className="flex-1 py-2.5 rounded-lg bg-primary text-on-primary font-bold text-xs hover:bg-primary/90 transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <span>Select GitHub Repository</span>
                          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </button>

                        <button
                          onClick={initiateGitHubAppInstall}
                          className="py-2.5 px-4 rounded-lg bg-surface-container-highest border border-outline-variant/30 text-on-surface font-semibold text-xs hover:bg-surface-container-highest/80 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-[16px]">add_moderator</span>
                          <span>Re-install / Manage App</span>
                        </button>
                      </div>
                    </div>

                    {/* Separate Demo Option */}
                    <div className="bg-surface-container/60 border border-outline-variant/20 rounded-xl p-5 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-on-surface uppercase">Or Test with Demo Mode</span>
                        <span className="px-2 py-0.5 rounded bg-warning/20 text-warning text-[10px] font-bold">DEMO MODE</span>
                      </div>
                      <p className="text-xs text-on-surface-variant">
                        Explore RepoGuard with sample microservice repositories. Demo data is never mixed with Real Mode.
                      </p>
                      <button
                        onClick={() => fetchReposList(true)}
                        className="w-full py-2 rounded-lg bg-surface-container-highest border border-outline-variant/30 text-on-surface font-semibold text-xs hover:bg-surface-container-highest/80 transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[16px]">play_circle</span>
                        <span>[ RUN DEMO ]</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-5">
                    {/* Integration Not Configured Error */}
                    <div className="bg-surface-container border border-error/30 rounded-xl p-5 flex flex-col gap-4">
                      <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-error text-[24px]">key_off</span>
                        <div>
                          <h3 className="font-bold text-sm text-error uppercase">GITHUB INTEGRATION NOT CONFIGURED</h3>
                          <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                            Connect Repo requires GitHub App authorization. Please configure <code className="text-secondary">GITHUB_APP_ID</code> and <code className="text-secondary">GITHUB_PRIVATE_KEY</code> in your server environment (<code className="text-secondary">.env</code>).
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-outline-variant/10">
                        <button
                          onClick={initiateGitHubAppInstall}
                          className="w-full py-2.5 rounded-lg bg-primary text-on-primary font-bold text-xs hover:bg-primary/90 transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[16px]">launch</span>
                          <span>Install GitHub App & Authorize</span>
                        </button>
                      </div>
                    </div>

                    {/* Explicit Demo Option */}
                    <div className="bg-surface-container/60 border border-outline-variant/20 rounded-xl p-5 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-on-surface uppercase">Or Test with Demo Mode</span>
                        <span className="px-2 py-0.5 rounded bg-warning/20 text-warning text-[10px] font-bold">DEMO MODE</span>
                      </div>
                      <p className="text-xs text-on-surface-variant">
                        Test connection workflow using simulated microservice repositories.
                      </p>
                      <button
                        onClick={() => fetchReposList(true)}
                        className="w-full py-2 rounded-lg bg-surface-container-highest border border-outline-variant/30 text-on-surface font-semibold text-xs hover:bg-surface-container-highest/80 transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined text-[16px]">play_circle</span>
                        <span>[ RUN DEMO ]</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: SELECT REPOSITORY */}
            {step === 'select' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-on-surface uppercase">Repository</span>
                  <span className="text-[11px] text-on-surface-variant">
                    {filteredRepos.length} repositories available
                  </span>
                </div>

                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[16px] text-on-surface-variant">
                    search
                  </span>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search repositories..."
                    className="w-full py-2 pl-9 pr-3 rounded-lg bg-surface-container border border-outline-variant/30 text-xs text-on-surface focus:outline-none focus:border-primary font-mono"
                  />
                </div>

                {isLoadingRepos ? (
                  <div className="py-12 flex items-center justify-center gap-2 text-xs text-on-surface-variant">
                    <span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <span>Fetching accessible repositories from GitHub App installation...</span>
                  </div>
                ) : filteredRepos.length === 0 ? (
                  <div className="py-10 border border-dashed border-outline-variant/30 rounded-xl text-center flex flex-col items-center gap-2 p-4">
                    <span className="material-symbols-outlined text-on-surface-variant text-[32px]">folder_off</span>
                    <span className="text-xs font-bold text-on-surface-variant">No repositories found.</span>
                    <span className="text-[11px] text-on-surface-variant/70 max-w-md">
                      {reposMessage || 'Ensure RepoGuard-Pratyush GitHub App is installed on your target GitHub repository.'}
                    </span>
                    {!isDemoMode && (
                      <button
                        onClick={initiateGitHubAppInstall}
                        className="mt-2 px-3.5 py-1.5 rounded-lg bg-primary/20 text-primary border border-primary/30 text-xs font-bold hover:bg-primary/30 cursor-pointer"
                      >
                        Install / Update App Permissions
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-80 overflow-y-auto pr-1">
                    {filteredRepos.map((repo) => {
                      const connected = isRepoConnected(repo.id) || isRepoConnected(repo.full_name) || repo.is_connected
                      return (
                        <div
                          key={repo.id}
                          className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                            selectedRepo?.id === repo.id
                              ? 'bg-primary-container/30 border-primary text-on-surface'
                              : 'bg-surface-container border-outline-variant/20 hover:border-outline-variant/40'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-surface-container-highest flex items-center justify-center text-secondary">
                              <span className="material-symbols-outlined text-[18px]">dataset</span>
                            </div>
                            <div className="truncate">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-on-surface truncate">{repo.full_name}</span>
                                <span className="px-1.5 py-0.5 rounded bg-surface-container-highest text-[10px] text-on-surface-variant border border-outline-variant/10">
                                  {repo.private ? 'Private' : 'Public'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-on-surface-variant mt-0.5">
                                <span>{repo.language || 'TypeScript'}</span>
                                <span>•</span>
                                <span>branch: <code className="text-secondary">{repo.default_branch || 'main'}</code></span>
                              </div>
                            </div>
                          </div>

                          {connected ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-success/15 text-success border border-success/30">
                              Monitored
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSelectRepo(repo)}
                              className="px-3.5 py-1.5 rounded-lg bg-primary-container text-on-primary-container text-xs font-bold hover:bg-primary-container/80 transition-all cursor-pointer"
                            >
                              Select
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: MONITORING OPTIONS */}
            {step === 'monitoring' && selectedRepo && (
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container border border-outline-variant/20">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-[20px]">dataset</span>
                    <span className="font-bold text-xs text-on-surface">{selectedRepo.full_name}</span>
                  </div>
                  <button
                    onClick={() => setStep('select')}
                    className="text-xs text-primary hover:underline cursor-pointer"
                  >
                    Change
                  </button>
                </div>

                {/* Checkboxes */}
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-bold text-on-surface uppercase tracking-wider">MONITORING PREFERENCES</span>

                  {[
                    { id: 'ci', label: 'GitHub Actions / CI failures', checked: ciMonitoring, set: setCiMonitoring },
                    { id: 'security', label: 'Dependabot security alerts', checked: securityMonitoring, set: setSecurityMonitoring },
                    { id: 'pr', label: 'Pull request monitoring', checked: prMonitoring, set: setPrMonitoring },
                    { id: 'autonomous', label: 'Autonomous investigation', checked: autonomousInvestigation, set: setAutonomousInvestigation },
                  ].map((item) => (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-surface-container border border-outline-variant/20 cursor-pointer hover:border-outline-variant/40"
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) => item.set(e.target.checked)}
                        className="w-4 h-4 accent-primary rounded cursor-pointer"
                      />
                      <span className="text-xs text-on-surface font-semibold">{item.label}</span>
                    </label>
                  ))}
                </div>

                {/* Agent Policy */}
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-bold text-on-surface uppercase tracking-wider">AUTO-FIX MODE</span>

                  <div className="grid grid-cols-2 gap-3">
                    <div
                      onClick={() => setAutoFixMode('suggest')}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col gap-1 ${
                        autoFixMode === 'suggest'
                          ? 'bg-primary-container/30 border-primary text-on-surface'
                          : 'bg-surface-container border-outline-variant/20 text-on-surface-variant'
                      }`}
                    >
                      <span className="font-bold text-xs text-on-surface">Suggest fixes only</span>
                      <span className="text-[10px] leading-tight">Generates HUD recommendations without creating PRs</span>
                    </div>

                    <div
                      onClick={() => setAutoFixMode('pr')}
                      className={`p-3 rounded-lg border cursor-pointer transition-all flex flex-col gap-1 ${
                        autoFixMode === 'pr'
                          ? 'bg-primary-container/30 border-primary text-on-surface'
                          : 'bg-surface-container border-outline-variant/20 text-on-surface-variant'
                      }`}
                    >
                      <span className="font-bold text-xs text-on-surface">Create verified PRs automatically</span>
                      <span className="text-[10px] leading-tight">Opens PR with test-verified patches (Never auto-merges)</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    onClick={() => setStep('select')}
                    className="px-4 py-2 rounded-lg bg-surface-container border border-outline-variant/30 text-xs font-semibold hover:bg-surface-container-highest cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setStep('review')}
                    className="px-5 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer"
                  >
                    Continue to Review
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: REVIEW & CONFIRM */}
            {step === 'review' && selectedRepo && (
              <div className="flex flex-col gap-6">
                <span className="text-xs font-bold text-on-surface uppercase tracking-wider">CONNECTION SUMMARY</span>

                <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-4 flex flex-col gap-3 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-outline-variant/10">
                    <span className="text-on-surface-variant uppercase">REPOSITORY</span>
                    <span className="font-bold text-on-surface">{selectedRepo.full_name}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-outline-variant/10">
                    <span className="text-on-surface-variant uppercase">BRANCH</span>
                    <span className="text-secondary font-bold">{selectedRepo.default_branch || 'main'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-outline-variant/10">
                    <span className="text-on-surface-variant uppercase">LANGUAGE</span>
                    <span className="text-on-surface font-semibold">{selectedRepo.language || 'TypeScript'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-outline-variant/10">
                    <span className="text-on-surface-variant uppercase">GITHUB REPO ID</span>
                    <span className="text-tertiary font-mono">{selectedRepo.id}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-outline-variant/10">
                    <span className="text-on-surface-variant uppercase">MONITORING</span>
                    <span className="text-on-surface">
                      {[
                        ciMonitoring && 'CI failures',
                        securityMonitoring && 'Security alerts',
                        prMonitoring && 'Pull requests',
                        autonomousInvestigation && 'Autonomous repair',
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-on-surface-variant uppercase">AGENT POLICY</span>
                    <span className="text-primary font-bold">
                      {autoFixMode === 'pr' ? 'Create verified PRs automatically' : 'Suggest fixes only'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    onClick={() => setStep('monitoring')}
                    className="px-4 py-2 rounded-lg bg-surface-container border border-outline-variant/30 text-xs font-semibold hover:bg-surface-container-highest cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    onClick={handlePerformConnection}
                    className="px-6 py-2.5 rounded-lg bg-primary text-on-primary font-bold text-xs hover:bg-primary/90 transition-all cursor-pointer shadow-lg shadow-primary/20 flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_link</span>
                    <span>CONNECT REPOSITORY</span>
                  </button>
                </div>
              </div>
            )}

            {/* STEP 5: CONNECTING PROGRESS */}
            {step === 'connecting' && (
              <div className="py-8 flex flex-col items-center justify-center gap-6 text-center">
                <span className="w-10 h-10 rounded-full border-3 border-primary border-t-transparent animate-spin" />
                <div>
                  <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">CONNECTING REPOSITORY...</h3>
                  <p className="text-xs text-on-surface-variant mt-1">{selectedRepo?.full_name}</p>
                </div>

                <div className="w-full max-w-sm flex flex-col gap-3 text-left font-mono text-xs bg-surface-container p-4 rounded-xl border border-outline-variant/20">
                  {[
                    { step: 1, text: 'Validating GitHub App authorization' },
                    { step: 2, text: 'Verifying installation access' },
                    { step: 3, text: 'Storing repository in Supabase' },
                    { step: 4, text: 'Verifying webhook readiness' },
                    { step: 5, text: 'Activating RepoGuard monitoring' },
                  ].map((s) => (
                    <div key={s.step} className="flex items-center justify-between">
                      <span className={progressStep >= s.step ? 'text-on-surface font-semibold' : 'text-on-surface-variant/50'}>
                        {s.step}. {s.text}
                      </span>
                      {progressStep > s.step ? (
                        <span className="material-symbols-outlined text-success text-[16px]">check_circle</span>
                      ) : progressStep === s.step ? (
                        <span className="w-3 h-3 rounded-full bg-primary animate-ping" />
                      ) : (
                        <span className="w-3 h-3 rounded-full border border-outline-variant/30" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ALREADY CONNECTED VIEW */}
            {step === 'already_connected' && selectedRepo && (
              <div className="py-6 flex flex-col items-center gap-5 text-center">
                <div className="w-12 h-12 rounded-full bg-warning/20 border border-warning/40 flex items-center justify-center text-warning">
                  <span className="material-symbols-outlined text-[28px]">warning</span>
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface uppercase">ALREADY CONNECTED</h3>
                  <p className="text-xs text-on-surface-variant mt-1">{selectedRepo.full_name}</p>
                  <p className="text-xs text-on-surface-variant/70 mt-2 max-w-md">
                    RepoGuard is already monitoring this repository in Supabase. Duplicate connections are prevented.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      handleClose()
                      if (onNavigateToRepo) onNavigateToRepo(selectedRepo.id.toString())
                    }}
                    className="px-4 py-2 rounded-lg bg-surface-container border border-outline-variant/30 text-xs font-semibold text-on-surface hover:bg-surface-container-highest cursor-pointer"
                  >
                    View Repository
                  </button>
                  <button
                    onClick={() => setStep('monitoring')}
                    className="px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 cursor-pointer"
                  >
                    Update Preferences
                  </button>
                </div>
              </div>
            )}

            {/* SUCCESS VIEW */}
            {step === 'success' && connectedRepoResult && (
              <div className="py-6 flex flex-col items-center gap-5 text-center">
                <div className="w-14 h-14 rounded-full bg-success/20 border border-success/40 flex items-center justify-center text-success shadow-lg shadow-success/20">
                  <span className="material-symbols-outlined text-[32px]">check_circle</span>
                </div>

                <div>
                  <span className="text-xs font-bold text-success uppercase tracking-widest">✓ REPOSITORY CONNECTED</span>
                  <h3 className="text-lg font-bold text-on-surface mt-1">{connectedRepoResult.full_name}</h3>
                  <p className="text-xs text-on-surface-variant mt-1">Monitoring is active in Supabase.</p>
                </div>

                <div className="w-full max-w-md bg-surface-container border border-outline-variant/20 rounded-xl p-4 flex flex-col gap-2 font-mono text-xs text-left">
                  <div className="flex justify-between py-1 border-b border-outline-variant/10">
                    <span className="text-on-surface-variant">GitHub App Access</span>
                    <span className="text-success font-bold">Verified</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-outline-variant/10">
                    <span className="text-on-surface-variant">Supabase Record</span>
                    <span className="text-success font-bold">Saved</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-on-surface-variant">Webhook Status</span>
                    <span className={webhookConfigured ? 'text-success font-bold' : 'text-warning font-bold'}>
                      {webhookConfigured ? 'Configured & Verified' : 'Pending Server Secret'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      handleClose()
                      if (onNavigateToRepo) onNavigateToRepo(connectedRepoResult.id)
                    }}
                    className="px-4 py-2 rounded-lg bg-surface-container border border-outline-variant/30 text-xs font-semibold text-on-surface hover:bg-surface-container-highest cursor-pointer"
                  >
                    View Repository
                  </button>
                  <button
                    onClick={handleClose}
                    className="px-6 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            {/* ERROR VIEW */}
            {step === 'error' && (
              <div className="py-6 flex flex-col items-center gap-5 text-center">
                <div className="w-12 h-12 rounded-full bg-error/20 border border-error/40 flex items-center justify-center text-error">
                  <span className="material-symbols-outlined text-[28px]">error</span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-error uppercase">Unable to connect repository</h3>
                  <p className="text-xs text-on-surface-variant mt-2 max-w-md bg-surface-container p-3 rounded-lg border border-error/30 font-mono">
                    {errorMessage || 'Connection request failed.'}
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setStep('review')}
                    className="px-5 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary/90 cursor-pointer"
                  >
                    Retry
                  </button>
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 rounded-lg bg-surface-container border border-outline-variant/30 text-xs text-on-surface hover:bg-surface-container-highest cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
