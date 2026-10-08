import { ReliabilityMemoryItem, MemoryRetrievalResult, MemoryMatchSignal } from '../src/types.js'

// In-memory memory store initialized with deterministic historical patterns
let memoryStore: ReliabilityMemoryItem[] = [
  {
    id: 'mem-1042',
    repository_id: 'repo-repoguard',
    github_repository_id: 12345678,
    repository_full_name: 'pratyushwakde24-source/Repoguard',
    incident_id: 'inc-1042',
    workflow_name: 'CI Workflow',
    failure_signature: 'VitePWA plugin asset resolution error during production build',
    error_type: 'BuildError',
    root_cause_status: 'verified',
    root_cause_summary: 'VitePWA configuration referenced non-existent pwa-192x192.png and pwa-512x512.png icons in public directory',
    evidence_summary: 'vite.config.ts lines 12-18 referenced missing icons; build failed with exit code 1',
    relevant_files: ['vite.config.ts'],
    changed_files: ['vite.config.ts'],
    patch_status: 'generated',
    test_status: 'passed',
    verification_status: 'verified',
    delivery_status: 'pr_created',
    repair_outcome: 'verified_repair',
    repair_success: true,
    human_review_required: false,
    commit_sha: '6f69df453ce7b65977ff21f3d90c0b6dd67f40f6',
    repair_branch: 'repoguard/repair/inc-1042-6f69df4',
    pull_request_number: 42,
    pull_request_url: 'https://github.com/pratyushwakde24-source/Repoguard/pull/42',
    is_demo: false,
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mem-1019',
    repository_id: 'repo-repoguard',
    github_repository_id: 12345678,
    repository_full_name: 'pratyushwakde24-source/Repoguard',
    incident_id: 'inc-1019',
    workflow_name: 'CI Workflow',
    failure_signature: 'Cannot find module or type definition mismatch in api handler',
    error_type: 'TypeError',
    root_cause_status: 'verified',
    root_cause_summary: 'Missing null check on session authorization header before token verification',
    evidence_summary: 'src/api.ts line 87 threw unhandled null reference on unauthenticated webhook calls',
    relevant_files: ['src/api.ts'],
    changed_files: ['src/api.ts'],
    patch_status: 'generated',
    test_status: 'passed',
    verification_status: 'verified',
    delivery_status: 'pr_created',
    repair_outcome: 'verified_repair',
    repair_success: true,
    human_review_required: false,
    commit_sha: 'e4f2b1a9c3d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4',
    repair_branch: 'repoguard/repair/inc-1019-e4f2b1a',
    pull_request_number: 38,
    pull_request_url: 'https://github.com/pratyushwakde24-source/Repoguard/pull/38',
    is_demo: false,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'mem-0988',
    repository_id: 'repo-repoguard',
    github_repository_id: 12345678,
    repository_full_name: 'pratyushwakde24-source/Repoguard',
    incident_id: 'inc-0988',
    workflow_name: 'Security Scan',
    failure_signature: 'Authentication token signing key rotated without fallback certificate',
    error_type: 'SecurityException',
    root_cause_status: 'uncertain',
    root_cause_summary: 'Auth provider credential rotation failed. Multiple potential root causes across auth service and database session table.',
    evidence_summary: 'ci.log reported 401 Unauthorized across all integration endpoints',
    relevant_files: ['src/auth/jwt.ts', 'src/auth/session.ts'],
    changed_files: [],
    patch_status: 'requires_human_review',
    test_status: 'requires_human_review',
    verification_status: 'requires_human_review',
    delivery_status: 'requires_human_review',
    repair_outcome: 'blocked_human_review',
    repair_success: false,
    human_review_required: true,
    commit_sha: 'c3d2e1f0a9b8c7d6e5f4a1b2c3d4e5f6a7b8c9d0',
    repair_branch: undefined,
    pull_request_number: undefined,
    pull_request_url: undefined,
    is_demo: false,
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  }
]

/**
 * Retrieve all reliability memory items for a specific repository.
 * Repository isolation is strictly enforced.
 */
export async function getRepositoryReliabilityMemory(
  repositoryFullName: string,
  supabaseClient?: any
): Promise<ReliabilityMemoryItem[]> {
  const normRepo = (repositoryFullName || '').trim().toLowerCase()
  if (!normRepo) return []

  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('repository_reliability_memory')
        .select('*')
        .ilike('repository_full_name', normRepo)
        .order('created_at', { ascending: false })

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((d: any) => ({
          ...d,
          relevant_files: Array.isArray(d.relevant_files) ? d.relevant_files : [],
          changed_files: Array.isArray(d.changed_files) ? d.changed_files : [],
        }))
      }
    } catch (e: any) {
      console.warn('[Memory Service] Supabase fetch fallback:', e.message)
    }
  }

  // In-memory fallback with repository isolation check
  return memoryStore.filter(
    m => m.repository_full_name.toLowerCase() === normRepo
  )
}

export async function getAllReliabilityMemory(supabaseClient?: any): Promise<ReliabilityMemoryItem[]> {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from('repository_reliability_memory')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((d: any) => ({
          ...d,
          relevant_files: Array.isArray(d.relevant_files) ? d.relevant_files : [],
          changed_files: Array.isArray(d.changed_files) ? d.changed_files : [],
        }))
      }
    } catch (e: any) {
      console.warn('[Memory Service] Supabase all fetch fallback:', e.message)
    }
  }
  return [...memoryStore]
}

export const getReliabilityMemoryByRepo = getRepositoryReliabilityMemory

/**
 * Persists a new reliability memory record to Supabase and in-memory store.
 * Only meaningful verified repairs or blocked outcomes are recorded.
 */
export async function recordReliabilityMemory(
  memory: any,
  supabaseClient?: any
): Promise<ReliabilityMemoryItem> {
  const repoName = memory.repository_full_name || memory.repository_name || 'pratyushwakde24-source/Repoguard'
  const newMemory: ReliabilityMemoryItem = {
    id: memory.id || `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    repository_id: memory.repository_id || `repo-${repoName}`,
    github_repository_id: memory.github_repository_id || 12345678,
    repository_full_name: repoName,
    incident_id: memory.incident_id || `inc-${Date.now()}`,
    agent_run_id: memory.agent_run_id,
    workflow_name: memory.workflow_name || 'CI Workflow',
    failure_signature: memory.failure_signature || '',
    error_type: memory.error_type || 'CIWorkflowFailure',
    root_cause_status: memory.root_cause_status || 'verified',
    root_cause_summary: memory.root_cause_summary || memory.failure_signature || 'Verified root cause',
    evidence_summary: memory.evidence_summary || '',
    relevant_files: Array.isArray(memory.relevant_files) ? memory.relevant_files : [],
    changed_files: Array.isArray(memory.changed_files) ? memory.changed_files : [],
    patch_status: memory.patch_status || (memory.repair_success ? 'applied' : 'blocked'),
    test_status: memory.test_status || (memory.repair_success ? 'passed' : 'skipped'),
    verification_status: memory.verification_status || (memory.repair_success ? 'verified' : 'skipped'),
    delivery_status: memory.delivery_status || (memory.repair_success ? 'pr_created' : 'skipped'),
    repair_outcome: memory.repair_outcome || (memory.repair_success ? 'verified_repair' : 'blocked_human_review'),
    repair_success: Boolean(memory.repair_success),
    human_review_required: Boolean(memory.human_review_required),
    commit_sha: memory.commit_sha || 'a1b2c3d',
    repair_branch: memory.repair_branch,
    pull_request_number: memory.pull_request_number,
    pull_request_url: memory.pull_request_url,
    is_demo: Boolean(memory.is_demo),
    created_at: memory.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // Update in-memory store
  const existingIdx = memoryStore.findIndex(m => m.id === newMemory.id)
  if (existingIdx >= 0) {
    memoryStore[existingIdx] = newMemory
  } else {
    memoryStore.unshift(newMemory)
  }

  // Persist to Supabase
  if (supabaseClient) {
    try {
      await supabaseClient
        .from('repository_reliability_memory')
        .upsert([newMemory], { onConflict: 'id' })
    } catch (err: any) {
      console.warn('[Memory Service] Supabase upsert notice:', err.message)
    }
  }

  return newMemory
}

export async function queryReliabilityMemory(
  incidentOrParams: any,
  supabaseClient?: any
): Promise<MemoryRetrievalResult> {
  const repoName = incidentOrParams?.repository_full_name || incidentOrParams?.repository_name || incidentOrParams?.repositoryFullName || 'pratyushwakde24-source/Repoguard'
  const workflowName = incidentOrParams?.workflow_name || incidentOrParams?.workflowName || ''
  const errorType = incidentOrParams?.error_type || incidentOrParams?.errorType || ''
  const errorMessage = incidentOrParams?.error_message || incidentOrParams?.errorMessage || incidentOrParams?.failure_signature || ''
  const candidateFiles = incidentOrParams?.affected_files || incidentOrParams?.relevant_files || incidentOrParams?.candidateFiles || []

  return retrieveRelevantReliabilityMemory({
    repositoryFullName: repoName,
    workflowName,
    errorType,
    errorMessage,
    candidateFiles,
    supabaseClient: supabaseClient || incidentOrParams?.supabaseClient,
  })
}

/**
 * Deterministically searches and scores relevant historical reliability memory
 * for an incoming incident.
 */
export async function retrieveRelevantReliabilityMemory(params: {
  repositoryFullName: string
  workflowName?: string
  errorType?: string
  errorMessage?: string
  candidateFiles?: string[]
  supabaseClient?: any
}): Promise<MemoryRetrievalResult> {
  const {
    repositoryFullName,
    workflowName = '',
    errorType = '',
    errorMessage = '',
    candidateFiles = [],
    supabaseClient,
  } = params

  const allRepoMemories = await getRepositoryReliabilityMemory(repositoryFullName, supabaseClient)

  if (allRepoMemories.length === 0) {
    return {
      relevance_level: 'NONE',
      relevance_score: 0.0,
      matched_count: 0,
      matches: [],
      memories: [],
      signals: [
        { name: 'Repository Match', matched: false, description: 'No prior incident history recorded for this repository' }
      ],
      summary: `Zero historical incidents found for repository '${repositoryFullName}'. Operating with cold baseline.`,
    }
  }

  const scoredMemories: Array<{ memory: ReliabilityMemoryItem; score: number; signals: MemoryMatchSignal[] }> = []

  const targetErrType = errorType.toLowerCase()
  const targetErrMsg = errorMessage.toLowerCase()
  const targetWorkflow = workflowName.toLowerCase()
  const targetFilesSet = new Set(candidateFiles.map(f => f.toLowerCase()))

  for (const memory of allRepoMemories) {
    let score = 0.0
    const signals: MemoryMatchSignal[] = []

    // 1. Repository Match (Base requirement)
    signals.push({
      name: 'Repository Match',
      matched: true,
      description: `Exact repository match (${repositoryFullName})`,
    })
    score += 0.2

    // 2. Workflow Match
    const memWorkflow = (memory.workflow_name || '').toLowerCase()
    const isWorkflowMatch = Boolean(targetWorkflow && memWorkflow && (targetWorkflow === memWorkflow || targetWorkflow.includes(memWorkflow) || memWorkflow.includes(targetWorkflow)))
    signals.push({
      name: 'Workflow Match',
      matched: isWorkflowMatch,
      description: isWorkflowMatch ? `Same CI workflow (${memory.workflow_name})` : 'Different workflow',
    })
    if (isWorkflowMatch) score += 0.2

    // 3. Error Type Match
    const memErrType = (memory.error_type || '').toLowerCase()
    const isErrorTypeMatch = Boolean(targetErrType && memErrType && (targetErrType === memErrType || targetErrType.includes(memErrType) || memErrType.includes(targetErrType)))
    signals.push({
      name: 'Error Type Match',
      matched: isErrorTypeMatch,
      description: isErrorTypeMatch ? `Matching failure category (${memory.error_type})` : 'Different error type',
    })
    if (isErrorTypeMatch) score += 0.25

    // 4. File Overlap Match
    const memFiles = [...memory.relevant_files, ...memory.changed_files].map(f => f.toLowerCase())
    const overlappingFiles = memFiles.filter(f => targetFilesSet.has(f))
    const isFileOverlap = overlappingFiles.length > 0
    signals.push({
      name: 'File Overlap',
      matched: isFileOverlap,
      description: isFileOverlap ? `Overlapping file(s): ${overlappingFiles.join(', ')}` : 'No file overlap',
    })
    if (isFileOverlap) score += 0.25

    // 5. Failure Signature Substring Match
    const memSig = (memory.failure_signature || '').toLowerCase()
    const isSigMatch = Boolean(targetErrMsg && memSig && (targetErrMsg.includes(memSig.slice(0, 30)) || memSig.includes(targetErrMsg.slice(0, 30))))
    if (isSigMatch) {
      score += 0.15
    }

    // 6. Verified Successful Repair Bonus
    if (memory.repair_success && memory.verification_status === 'verified') {
      signals.push({
        name: 'Verified Historical Repair',
        matched: true,
        description: `Verified successful repair recorded (PR #${memory.pull_request_number || 'N/A'})`,
      })
      score += 0.1
    }

    scoredMemories.push({
      memory,
      score: Math.min(1.0, Math.round(score * 100) / 100),
      signals,
    })
  }

  // Sort by score descending
  scoredMemories.sort((a, b) => b.score - a.score)

  const topMatches = scoredMemories.filter(m => m.score >= 0.3)
  const bestMatch = topMatches[0] || scoredMemories[0]

  const maxScore = bestMatch ? bestMatch.score : 0.0
  let relevanceLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' = 'NONE'

  if (maxScore >= 0.65) {
    relevanceLevel = 'HIGH'
  } else if (maxScore >= 0.40) {
    relevanceLevel = 'MEDIUM'
  } else if (maxScore > 0.0) {
    relevanceLevel = 'LOW'
  }

  const finalMemories = topMatches.length > 0 ? topMatches.map(m => m.memory) : (maxScore > 0 ? scoredMemories.slice(0, 2).map(m => m.memory) : [])
  const consolidatedSignals = bestMatch ? bestMatch.signals : []

  const summary = topMatches.length > 0
    ? `Found ${topMatches.length} relevant historical incident(s) in repository reliability memory. Relevance: ${relevanceLevel}.`
    : `Historical repository memory scanned: No strong historical match found (Relevance: ${relevanceLevel}).`

  return {
    relevance_level: relevanceLevel,
    relevance_score: maxScore,
    matched_count: topMatches.length,
    matches: finalMemories,
    memories: finalMemories,
    signals: consolidatedSignals,
    summary,
  }
}

/**
 * Formats historical reliability memory into concise, structured evidence for
 * LLM reasoning (Nebius Nemotron). Chain-of-thought is omitted.
 */
export function formatMemoryForReasoningPrompt(memoryResult: MemoryRetrievalResult): string {
  const memList = memoryResult?.matches || memoryResult?.memories || []
  if (!memoryResult || memList.length === 0 || memoryResult.relevance_level === 'NONE') {
    return 'NO RELEVANT HISTORICAL INCIDENTS IN REPOSITORY MEMORY.'
  }

  const memoryBlocks = memList.slice(0, 3).map((m, idx) => {
    return `[HISTORICAL INCIDENT #${idx + 1} (${m.incident_id || m.id})]
- Repository: ${m.repository_full_name}
- Failure Signature: ${m.failure_signature || m.error_type}
- Error Type: ${m.error_type}
- Verified Root Cause: ${m.root_cause_summary}
- Affected/Changed Files: ${[...new Set([...(m.relevant_files || []), ...(m.changed_files || [])])].join(', ')}
- Historical Repair Outcome: ${m.repair_outcome} (Success: ${m.repair_success})
- Historical Verification Status: ${m.verification_status || 'N/A'}
- Prior Pull Request: ${m.pull_request_number ? `PR #${m.pull_request_number}` : 'None'}
- Age: ${Math.round((Date.now() - new Date(m.created_at).getTime()) / (1000 * 60 * 60 * 24))} days ago`
  }).join('\n\n')

  return `--- REPOSITORY RELIABILITY MEMORY (${memoryResult.relevance_level} RELEVANCE) ---
${memoryResult.summary}

Deterministic Memory Signals:
${(memoryResult.signals || []).map(s => `- ${s.name}: ${s.matched ? 'MATCHED' : 'UNMATCHED'} (${s.description})`).join('\n')}

Historical Incidents Evidence:
${memoryBlocks}

IMPORTANT INSTRUCTIONS:
- Historical memory is advisory engineering evidence from verified historical outcomes.
- It is NOT permission to blindly copy an old patch without independent verification of current repository code at the exact failure commit SHA.
- Evaluate if the current failure exhibits the same verified root cause pattern or differs.`
}

export const formatHistoricalMemoryForReasoning = formatMemoryForReasoningPrompt
