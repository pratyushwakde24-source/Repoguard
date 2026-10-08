# RepoGuard Fail-Closed Failure State Matrix

**Principle:** When anything is unclear, unavailable, corrupted, or missing: **FAIL CLOSED. STOP. NEVER PERMIT UNVERIFIED EXECUTION.**

---

| Subsystem / Dependency | Failure Mode | Trigger Condition | Deterministic Safe Behavior | Expected Result |
|---|---|---|---|:---:|
| **GitHub API** | API Outage / Network Timeout / 5xx | GitHub REST/GraphQL API unresponsive during inspection or delivery | Abort workflow step; do not assume repository state or synthesize branch | **STOP / BLOCK** |
| **GitHub Authentication** | App Token Expired / Unconfigured | `GITHUB_APP_ID` or `GITHUB_PRIVATE_KEY` missing or invalid | Reject mutation; return explicit HTTP 401/400; zero simulated GitHub mutation | **STOP / BLOCK** |
| **Commit SHA Integrity** | SHA Mismatch / Race Condition | Remote HEAD SHA differs from incident base SHA during inspection/patch/delivery | Reject approval / patch with `STALE_APPROVAL` or `REMOTE_BASE_MISMATCH` (HTTP 409) | **STOP / BLOCK** |
| **Supabase / PostgreSQL** | Database Outage / Connection Lost | DB unreachable during memory lookup or incident update | Fallback to in-memory safety state; refuse autonomous external PR delivery | **STOP / BLOCK** |
| **Nebius AI Provider** | Model Error / Bad JSON / Malformed | AI inference returns invalid JSON, empty changes, or network error | Set status to `requires_human_review` / `AI_PROVIDER_ERROR`; do not apply partial patch | **STOP / BLOCK** |
| **Root Cause Confidence** | Uncertain or Disproven Root Cause | Reasoning model output is `uncertain`, `disproven`, or lacks log evidence | Block patch generation gate; require explicit authenticated human review | **STOP / BLOCK** |
| **Human Review** | Missing Approval / Expired TTL | Approval timestamp > 30 minutes old or human review status is `PENDING`/`REJECTED` | Block patch generation and GitHub delivery; return HTTP 403 / 401 | **STOP / BLOCK** |
| **Approval Context Hash** | State Mismatch / Tampered Plan | Incident SHA, risk score, repair plan, or files changed after human approved | Invalidate approval; return `APPROVAL_CONTEXT_MISMATCH`; require re-review | **STOP / BLOCK** |
| **Deterministic Risk Gate** | Risk Assessment Missing or High | Risk score >= 70, security-sensitive file touched, or scope > 5 files | Enforce `requires_human_review = true`; autonomous patch authorization refused | **STOP / BLOCK** |
| **AST Patch Scope** | Overscoped Files (>5 files) | Target patch modifies > 5 files or unauthorized files | Refuse patch application with `SAFETY_GATE_FAILED` (HTTP 422) | **STOP / BLOCK** |
| **Protected Sensitive Paths** | Protected File Modification | Patch attempts to write to `.env`, `*.key`, `id_rsa`, `.github/workflows/*` | Abort patch generation with `SENSITIVE_FILE_PROTECTION` (HTTP 422) | **STOP / BLOCK** |
| **Path Traversal** | Path Escapes Sandbox Root | Patch path contains `../`, `..\`, `%2e%2e`, null bytes, or symlinks | Abort workspace write with `PATH_TRAVERSAL_DETECTED`; purge temporary directory | **STOP / BLOCK** |
| **Sandbox Execution** | Command Timeout / Host Mutation | Test command exceeds 5m timeout or writes unauthorized files outside scope | Terminate process with `UNAUTHORIZED_WORKSPACE_CHANGE` or `TIMEOUT`; fail test stage | **STOP / BLOCK** |
| **Deterministic Verification** | Any Verification Check Fails (<14/14) | Any of the 14 independent deterministic checks fail | Halt delivery pipeline at `VERIFY`; do not create GitHub PR branch | **STOP / BLOCK** |
| **Security Policy** | Policy Missing / Hash Tampered | Security policy configuration missing or startup hash mismatch | Halt autonomous engine; log `SECURITY_CONFIGURATION_ERROR` | **STOP / BLOCK** |
| **Webhook Signature** | Missing or Invalid HMAC | Webhook payload missing `X-Hub-Signature-256` or signature mismatch | Reject with HTTP 401 / 403; do not ingest or process event | **STOP / BLOCK** |
| **Session Authentication** | Expired or Missing Session | Request to mutation route lacks valid session cookie | Reject with HTTP 401 `AUTHENTICATION_REQUIRED` | **STOP / BLOCK** |
| **Role Authorization** | Insufficient Role Privileges | User role (`VIEWER`) attempts `APPROVE`, `PATCH`, or `DELIVER` | Reject with HTTP 403 `FORBIDDEN_INSUFFICIENT_PERMISSIONS` | **STOP / BLOCK** |
| **Demo Mode** | Live Mutation in Demo Mode | Repository marked `is_demo = true` or `mode = 'demo'` attempts Git push/PR | Structurally block external mutation with `DEMO_MODE_MUTATION_BLOCKED` | **STOP / BLOCK** |
