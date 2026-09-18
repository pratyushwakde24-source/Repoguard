import fs from 'fs'
import path from 'path'
import os from 'os'
import { exec } from 'child_process'
import { sanitizeLogContent } from './nebius.js'

export interface TestExecutionParams {
  incidentId: string
  repository: string
  commitSha: string
  rootCauseStatus: string
  requiresHumanReview?: boolean
  repairPlan: any
  patchData: any
  inspectedFiles: Record<string, string>
  configContext?: Record<string, string>
  originalFailureSignature?: string
  workflowRunId?: string
}

const COMMAND_ALLOWLIST = [
  'npm run build',
  'npm test',
  'npm run test',
  'npm run lint',
  'npm run check',
  'npm run type-check',
  'npx tsc',
]

const MAX_COMMAND_TIMEOUT_MS = 300000 // 5 minutes
const MAX_TEST_OUTPUT_BYTES = 100000

function isCommandAllowed(cmd: string): boolean {
  const trimmed = cmd.trim().toLowerCase()
  return COMMAND_ALLOWLIST.some(allowed => trimmed === allowed || trimmed.startsWith(allowed + ' '))
}

function runCommandInWorkspace(
  cmd: string,
  cwd: string,
  timeoutMs: number = MAX_COMMAND_TIMEOUT_MS
): Promise<{ exitCode: number; stdout: string; stderr: string; durationMs: number; timedOut: boolean }> {
  return new Promise(resolve => {
    const startTime = Date.now()
    let _childProc: any = null

    try {
      _childProc = exec(
        cmd,
        {
          cwd,
          timeout: timeoutMs,
          maxBuffer: 10 * 1024 * 1024,
          env: { ...process.env, NODE_ENV: 'test', CI: 'true' },
        },
        (error, stdout, stderr) => {
          const durationMs = Date.now() - startTime
          const timedOut = Boolean(error && error.killed)
          const exitCode = error ? (typeof error.code === 'number' ? error.code : 1) : 0

          let cleanStdout = sanitizeLogContent(stdout || '')
          let cleanStderr = sanitizeLogContent(stderr || '')

          if (cleanStdout.length > MAX_TEST_OUTPUT_BYTES) {
            cleanStdout = cleanStdout.slice(0, 50000) + '\n\n... [OUTPUT TRUNCATED] ...\n\n' + cleanStdout.slice(-50000)
          }
          if (cleanStderr.length > MAX_TEST_OUTPUT_BYTES) {
            cleanStderr = cleanStderr.slice(0, 50000) + '\n\n... [OUTPUT TRUNCATED] ...\n\n' + cleanStderr.slice(-50000)
          }

          resolve({
            exitCode,
            stdout: cleanStdout,
            stderr: cleanStderr,
            durationMs,
            timedOut,
          })
        }
      )
    } catch (err: any) {
      const durationMs = Date.now() - startTime
      resolve({
        exitCode: 1,
        stdout: '',
        stderr: sanitizeLogContent(err.message || 'Execution exception'),
        durationMs,
        timedOut: false,
      })
    }
  })
}

export async function executeIsolatedPatchTest(params: TestExecutionParams) {
  const {
    incidentId,
    repository: _repository,
    commitSha,
    rootCauseStatus,
    requiresHumanReview = false,
    repairPlan,
    patchData,
    inspectedFiles,
    configContext = {},
    originalFailureSignature = 'CI Failure in workflow execution',
    workflowRunId = 'unknown',
  } = params

  const failureSig = originalFailureSignature || 'CI Failure in workflow execution'

  // Entry Gate 1: Check Step 5 patch artifact status
  if (!patchData || patchData.patch_status !== 'generated') {
    return {
      test_status: 'requires_human_review' as const,
      base_sha: commitSha || 'unknown',
      patched_sha: commitSha || 'unknown',
      commands: [],
      original_failure: { workflow_run_id: workflowRunId, failure_signature: failureSig },
      patch_application: { status: 'rejected', files_changed: [] },
      comparison_result: 'COMPARISON INCONCLUSIVE' as const,
      new_failures: [],
      summary: `Step 6 refused execution: Patch status is '${patchData?.patch_status || 'missing'}'. Only generated patches may enter test execution.`,
      rejection_reason: `Entry gate failed: patch_status is '${patchData?.patch_status || 'missing'}'`,
      created_at: new Date().toISOString(),
    }
  }

  // Entry Gate 2: Check root cause status and human review flag
  if (rootCauseStatus !== 'verified' || requiresHumanReview) {
    return {
      test_status: 'requires_human_review' as const,
      base_sha: commitSha || 'unknown',
      patched_sha: commitSha || 'unknown',
      commands: [],
      original_failure: { workflow_run_id: workflowRunId, failure_signature: failureSig },
      patch_application: { status: 'rejected', files_changed: [] },
      comparison_result: 'COMPARISON INCONCLUSIVE' as const,
      new_failures: [],
      summary: `Step 6 refused execution: root_cause_status is '${rootCauseStatus}' and requires_human_review is ${requiresHumanReview}.`,
      rejection_reason: `Entry gate failed: root_cause_status=${rootCauseStatus}`,
      created_at: new Date().toISOString(),
    }
  }

  // Entry Gate 3: Check base SHA
  if (!commitSha || commitSha === 'unknown') {
    return {
      test_status: 'setup_failed' as const,
      base_sha: 'unknown',
      patched_sha: 'unknown',
      commands: [],
      original_failure: { workflow_run_id: workflowRunId, failure_signature: failureSig },
      patch_application: { status: 'rejected', files_changed: [] },
      comparison_result: 'COMPARISON INCONCLUSIVE' as const,
      new_failures: [],
      summary: 'Step 6 refused execution: Exact commit SHA is missing or invalid.',
      rejection_reason: 'BASE_SHA_MISMATCH',
      created_at: new Date().toISOString(),
    }
  }

  const filesToModify: string[] = repairPlan?.files_to_modify || patchData.files_changed || []
  const patchFiles: Array<{ path: string; proposed_content: string }> = patchData.files || []

  // Create isolated temporary workspace on OS temp disk
  const workspaceRunId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const workspaceDir = path.join(os.tmpdir(), 'repoguard-isolated', incidentId || 'inc-test', workspaceRunId)

  console.log(`[Isolated Workspace Created] ${workspaceDir} for commit @${commitSha}`)

  try {
    fs.mkdirSync(workspaceDir, { recursive: true })

    // Populating base workspace files from GitHub inspection data at exact SHA
    const baseFilesMap: Record<string, string> = { ...configContext, ...inspectedFiles }

    for (const [relPath, content] of Object.entries(baseFilesMap)) {
      if (!relPath || typeof content !== 'string') continue
      const targetPath = path.join(workspaceDir, relPath)
      fs.mkdirSync(path.dirname(targetPath), { recursive: true })
      fs.writeFileSync(targetPath, content, 'utf-8')
    }

    // Verify checked out base files exist
    const missingBaseFiles = filesToModify.filter(f => !fs.existsSync(path.join(workspaceDir, f)))
    if (missingBaseFiles.length > 0) {
      console.warn(`[Workspace Base Error] Missing base files at SHA @${commitSha}: ${missingBaseFiles.join(', ')}`)
      return {
        test_status: 'setup_failed' as const,
        base_sha: commitSha,
        patched_sha: commitSha,
        commands: [],
        original_failure: { workflow_run_id: workflowRunId, failure_signature: failureSig },
        patch_application: { status: 'failed', files_changed: [] },
        comparison_result: 'COMPARISON INCONCLUSIVE' as const,
        new_failures: [],
        summary: `Base SHA verification failed: Missing base file(s) ${missingBaseFiles.join(', ')} at SHA @${commitSha}`,
        rejection_reason: 'BASE_SHA_MISMATCH',
        created_at: new Date().toISOString(),
      }
    }

    // Apply validated Step 5 patch to isolated workspace
    const appliedFiles: string[] = []
    for (const patchFile of patchFiles) {
      const relPath = patchFile.path
      // Verify authorized file list
      if (!filesToModify.includes(relPath)) {
        console.error(`[UNAUTHORIZED WORKSPACE MUTATION] Patch attempts to write to '${relPath}' which is not in files_to_modify`)
        return {
          test_status: 'failed' as const,
          base_sha: commitSha,
          patched_sha: commitSha,
          commands: [],
          original_failure: { workflow_run_id: workflowRunId, failure_signature: failureSig },
          patch_application: { status: 'unauthorized_mutation', files_changed: [] },
          comparison_result: 'COMPARISON INCONCLUSIVE' as const,
          new_failures: [`Unauthorized file mutation attempt: ${relPath}`],
          summary: `Patch application rejected: Attempted unauthorized mutation to '${relPath}' outside declared boundaries`,
          rejection_reason: 'UNAUTHORIZED_WORKSPACE_CHANGE',
          created_at: new Date().toISOString(),
        }
      }

      const targetPath = path.join(workspaceDir, relPath)
      fs.mkdirSync(path.dirname(targetPath), { recursive: true })
      fs.writeFileSync(targetPath, patchFile.proposed_content, 'utf-8')
      appliedFiles.push(relPath)
    }

    // Verify workspace changes: Ensure no unauthorized files were written outside patch scope
    const allFilesOnDisk: string[] = []
    function scanFiles(dir: string, base: string = '') {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        const rel = base ? `${base}/${entry.name}` : entry.name
        if (entry.isDirectory()) {
          scanFiles(fullPath, rel)
        } else {
          allFilesOnDisk.push(rel)
        }
      }
    }
    scanFiles(workspaceDir)

    // Check for unexpected extra files created outside authorized base + patch
    const expectedSet = new Set([...Object.keys(baseFilesMap), ...appliedFiles])
    const unexpectedFiles = allFilesOnDisk.filter(f => !expectedSet.has(f))

    if (unexpectedFiles.length > 0) {
      console.error(`[UNAUTHORIZED WORKSPACE CHANGE] Unexpected files created: ${unexpectedFiles.join(', ')}`)
      return {
        test_status: 'failed' as const,
        base_sha: commitSha,
        patched_sha: commitSha,
        commands: [],
        original_failure: { workflow_run_id: workflowRunId, failure_signature: failureSig },
        patch_application: { status: 'unauthorized_mutation', files_changed: appliedFiles },
        comparison_result: 'COMPARISON INCONCLUSIVE' as const,
        new_failures: [`Unexpected files created on workspace disk: ${unexpectedFiles.join(', ')}`],
        summary: `Workspace validation failed: Unexpected file mutation detected (${unexpectedFiles.join(', ')})`,
        rejection_reason: 'UNAUTHORIZED_WORKSPACE_CHANGE',
        created_at: new Date().toISOString(),
      }
    }

    // Command Discovery & Allowlist Safety
    const discoveredCommands: string[] = Array.isArray(repairPlan?.test_commands) ? [...repairPlan.test_commands] : []
    if (discoveredCommands.length === 0) {
      discoveredCommands.push('npm run build')
    }

    // Filter discovered commands through safety allowlist
    const safeCommands = discoveredCommands.filter(isCommandAllowed)
    if (safeCommands.length === 0) {
      safeCommands.push('npm run build')
    }

    // Check workspace prerequisite: package.json must exist to run npm scripts
    const hasPkgJson = fs.existsSync(path.join(workspaceDir, 'package.json'))
    if (!hasPkgJson) {
      console.warn(`[Workspace Setup Notice] package.json is missing in isolated workspace ${workspaceDir}`)
      return {
        test_status: 'setup_failed' as const,
        base_sha: commitSha,
        patched_sha: `${commitSha.slice(0, 7)}-patched`,
        commands: [
          {
            command: safeCommands[0] || 'npm run build',
            exit_code: 1,
            status: 'failed' as const,
            duration_ms: 0,
            stdout: '',
            stderr: 'npm error enoent Could not read package.json: Error: ENOENT: no such file or directory',
          }
        ],
        original_failure: {
          workflow_run_id: workflowRunId,
          failure_signature: failureSig,
        },
        patch_application: {
          status: 'applied',
          files_changed: appliedFiles,
        },
        comparison_result: 'COMPARISON INCONCLUSIVE' as const,
        new_failures: [],
        summary: `Workspace setup failure: package.json missing at base SHA @${commitSha}`,
        rejection_reason: 'DEPENDENCY_SETUP_FAILURE',
        created_at: new Date().toISOString(),
      }
    }

    const commandResults: Array<{
      command: string
      exit_code: number
      status: 'passed' | 'failed' | 'timed_out'
      duration_ms: number
      stdout: string
      stderr: string
    }> = []

    let allPassed = true
    let timedOutAny = false
    let newFailures: string[] = []

    // Execute safe test commands inside isolated workspace
    for (const cmd of safeCommands) {
      console.log(`[Executing Command in Sandbox] '${cmd}' (CWD: ${workspaceDir})`)
      const res = await runCommandInWorkspace(cmd, workspaceDir, MAX_COMMAND_TIMEOUT_MS)

      const statusVal = res.timedOut ? 'timed_out' : res.exitCode === 0 ? 'passed' : 'failed'

      if (statusVal !== 'passed') {
        allPassed = false
      }
      if (res.timedOut) {
        timedOutAny = true
      }

      commandResults.push({
        command: cmd,
        exit_code: res.exitCode,
        status: statusVal,
        duration_ms: res.durationMs,
        stdout: res.stdout,
        stderr: res.stderr,
      })

      if (res.exitCode !== 0 && !res.timedOut) {
        const errorLines = (res.stderr || res.stdout).split('\n').filter(l => l.toLowerCase().includes('error') || l.toLowerCase().includes('fail'))
        if (errorLines.length > 0) {
          newFailures.push(errorLines[0].trim())
        }
      }
    }

    // Deterministic Failure Comparison Logic
    let comparisonResult: 'ORIGINAL FAILURE CLEARED' | 'FAILURE PERSISTS' | 'NEW FAILURE INTRODUCED' | 'COMPARISON INCONCLUSIVE' = 'COMPARISON INCONCLUSIVE'
    let finalTestStatus: 'passed' | 'failed' | 'setup_failed' | 'timed_out' | 'requires_human_review' = 'failed'

    if (timedOutAny) {
      finalTestStatus = 'timed_out'
      comparisonResult = 'COMPARISON INCONCLUSIVE'
    } else if (allPassed) {
      finalTestStatus = 'passed'
      comparisonResult = 'ORIGINAL FAILURE CLEARED'
    } else {
      const combinedOutput = commandResults.map(r => r.stdout + '\n' + r.stderr).join('\n')
      const isSetupOrEnoentErr = combinedOutput.includes('ENOENT') ||
        combinedOutput.includes('Could not read package.json') ||
        combinedOutput.includes('command not found') ||
        combinedOutput.includes('missing script')

      if (isSetupOrEnoentErr) {
        finalTestStatus = 'setup_failed'
        comparisonResult = 'COMPARISON INCONCLUSIVE'
      } else {
        finalTestStatus = 'failed'
        const containsOriginalSig = failureSig && combinedOutput.toLowerCase().includes(failureSig.toLowerCase())

        if (containsOriginalSig) {
          comparisonResult = 'FAILURE PERSISTS'
        } else {
          comparisonResult = 'NEW FAILURE INTRODUCED'
        }
      }
    }

    return {
      test_status: finalTestStatus,
      base_sha: commitSha,
      patched_sha: `${commitSha.slice(0, 7)}-patched`,
      commands: commandResults,
      original_failure: {
        workflow_run_id: workflowRunId,
        failure_signature: failureSig,
      },
      patch_application: {
        status: 'applied',
        files_changed: appliedFiles,
      },
      comparison_result: comparisonResult,
      new_failures: newFailures,
      summary: finalTestStatus === 'passed'
        ? `Isolated patch test execution PASSED cleanly. Original failure cleared.`
        : `Isolated patch test execution ${finalTestStatus.toUpperCase()}. Comparison: ${comparisonResult}.`,
      created_at: new Date().toISOString(),
    }
  } catch (err: any) {
    console.error(`[Step 6 Isolated Execution Exception] ${err.message}`)
    return {
      test_status: 'setup_failed' as const,
      base_sha: commitSha,
      patched_sha: commitSha,
      commands: [],
      original_failure: { workflow_run_id: workflowRunId, failure_signature: failureSig },
      patch_application: { status: 'failed', files_changed: [] },
      comparison_result: 'COMPARISON INCONCLUSIVE' as const,
      new_failures: [err.message],
      summary: `Isolated workspace setup or execution exception: ${err.message}`,
      rejection_reason: 'DEPENDENCY_SETUP_FAILURE',
      created_at: new Date().toISOString(),
    }
  } finally {
    // Automatic Isolated Workspace Cleanup (guaranteed in finally block)
    try {
      if (fs.existsSync(workspaceDir)) {
        fs.rmSync(workspaceDir, { recursive: true, force: true })
        console.log(`[Isolated Workspace Cleanup] Automatically cleaned workspace directory: ${workspaceDir}`)
      }
    } catch (cleanErr: any) {
      console.warn(`[Workspace Cleanup Notice] Failed to clean ${workspaceDir}: ${cleanErr.message}`)
    }
  }
}
