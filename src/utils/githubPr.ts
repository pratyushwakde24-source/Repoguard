/**
 * Defensive client-side validation for genuine HTTPS GitHub Pull Request URLs.
 */
export function isValidGitHubPrUrl(url?: string): boolean {
  if (!url || typeof url !== 'string') return false
  try {
    const parsed = new URL(url)
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'github.com' &&
      /^\/[^/]+\/[^/]+\/pull\/\d+$/.test(parsed.pathname)
    )
  } catch {
    return false
  }
}
