import type { GitHubAuthStatus, GitHubRepoItem, Repository } from '../types'

export function initiateGitHubAppInstall(): void {
  window.location.href = '/api/github/login'
}

export async function getGitHubStatus(): Promise<GitHubAuthStatus> {
  try {
    const res = await fetch('/api/github/status', {
      credentials: 'include',
    })
    if (!res.ok) {
      return { configured: false, authenticated: false, error: `HTTP ${res.status}` }
    }
    return await res.json()
  } catch (err: any) {
    return { configured: false, authenticated: false, error: err.message || 'Failed to fetch status' }
  }
}

export async function getGitHubUser(): Promise<{ login: string; name: string; avatar_url: string; html_url: string } | null> {
  try {
    const res = await fetch('/api/github/user', {
      credentials: 'include',
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.user || null
  } catch {
    return null
  }
}

export async function getGitHubRepos(): Promise<{ configured: boolean; repos: GitHubRepoItem[]; message?: string }> {
  try {
    const res = await fetch('/api/github/repos', {
      credentials: 'include',
    })
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      return { configured: false, repos: [], message: errData.error || `HTTP ${res.status}` }
    }
    return await res.json()
  } catch (err: any) {
    return { configured: false, repos: [], message: err.message || 'Network error fetching repositories' }
  }
}

export async function connectRepository(params: {
  github_repository_id?: number
  full_name: string
  owner: string
  name: string
  default_branch: string
  language: string
  visibility: string
  html_url?: string
  ci_monitoring_enabled: boolean
  security_monitoring_enabled: boolean
  pr_monitoring_enabled: boolean
  auto_fix_enabled: boolean
  is_demo?: boolean
}): Promise<{ success: boolean; repository?: Repository; webhook_configured?: boolean; webhook_error?: string; error?: string }> {
  try {
    const res = await fetch('/api/github/connect-repo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(params),
    })
    const data = await res.json()
    if (!res.ok) {
      return { success: false, error: data.error || data.message || 'Failed to connect repository' }
    }
    return data
  } catch (err: any) {
    return { success: false, error: err.message || 'Network request failed' }
  }
}
