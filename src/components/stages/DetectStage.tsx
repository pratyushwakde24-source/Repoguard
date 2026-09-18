import type { Incident } from '../../types'

interface DetectStageProps {
  incident?: Incident
}

export default function DetectStage({ incident }: DetectStageProps) {
  const repoName = incident?.repository_name || 'pratyushwakde24-source/snowrush-ai'
  const workflowName = incident?.workflow_name || 'ci-pipeline'
  const runId = incident?.workflow_run_id || incident?.id?.replace('inc-', '') || '9281'
  const commitSha = incident?.commit_sha || 'a1b2c3d'
  const branch = incident?.branch || 'main'
  const isVerified = Boolean(incident?.github_verified)
  const workflowUrl = incident?.workflow_url || `https://github.com/${repoName}/actions/runs/${runId}`

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-tertiary">sensors</span>
          <span className="text-headline-sm text-on-surface">Failure Detection</span>
          <span className="px-2 py-0.5 rounded bg-tertiary/10 text-tertiary text-code-sm font-medium">COMPLETED</span>
        </div>
        {isVerified ? (
          <span className="px-2.5 py-1 rounded bg-primary-container/20 text-primary-fixed text-label-sm font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">verified</span> GITHUB VERIFIED
          </span>
        ) : (
          <span className="px-2.5 py-1 rounded bg-surface-container-high text-on-surface-variant text-label-sm font-medium flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">webhook</span> WEBHOOK INGESTED
          </span>
        )}
      </div>

      <div className="bg-surface-container rounded-xl p-4 flex flex-col gap-3">
        <div className="text-label-md text-outline uppercase tracking-wider">GitHub Failure Event Details</div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Repository', value: repoName, icon: 'folder' },
            { label: 'Workflow', value: workflowName, icon: 'play_circle' },
            { label: 'Run ID', value: `#${runId}`, icon: 'tag' },
            { label: 'Status / Conclusion', value: 'FAILURE', icon: 'cancel', color: 'text-error' },
            { label: 'Commit SHA', value: `@${commitSha.slice(0, 7)}`, icon: 'commit' },
            { label: 'Branch', value: branch, icon: 'account_tree' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-container-low">
              <span className="material-symbols-outlined text-[16px] text-outline">{item.icon}</span>
              <div className="flex flex-col truncate">
                <span className="text-label-sm text-outline uppercase">{item.label}</span>
                <span className={`text-code-sm ${item.color || 'text-on-surface'} font-medium truncate`}>{item.value}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="text-label-md text-outline uppercase tracking-wider">Authoritative GitHub Workflow Run</div>
          <a
            href={workflowUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-code-sm text-primary hover:underline flex items-center gap-1"
          >
            <span>View on GitHub</span>
            <span className="material-symbols-outlined text-[14px]">open_in_new</span>
          </a>
        </div>
        <pre className="text-code-sm text-on-surface-variant overflow-x-auto no-scrollbar p-2 bg-surface-container-low rounded-lg">
{JSON.stringify(
  {
    event: "workflow_run.completed",
    repository: repoName,
    workflow_run: {
      id: runId,
      name: workflowName,
      conclusion: "failure",
      head_sha: commitSha,
      head_branch: branch,
      html_url: workflowUrl,
    },
    github_verified: isVerified,
  },
  null,
  2
)}
        </pre>
      </div>
    </div>
  )
}
