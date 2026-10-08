/**
 * Red Team Suite 8: Canonical Path Traversal & Sensitive File Defense
 * 
 * Attacks Attempted:
 * 1. Directory traversal via ../ and ..\
 * 2. URL-encoded traversal (%2e%2e%2f)
 * 3. Null-byte injection (%00, \0)
 * 4. Absolute POSIX paths (/etc/passwd) and Windows drive letters (C:\Windows)
 * 5. Protected file patterns (.env, id_rsa, .github/workflows, auth configs)
 */

const assert = require('assert');
const path = require('path');

function isProtectedPath(filePath) {
  if (!filePath || typeof filePath !== 'string') return { protected: true, reason: 'Invalid or empty path' };
  const clean = filePath.trim().replace(/\\/g, '/').replace(/^\/+/, '');
  const protectedPatterns = [
    '\\.env($|\\..+)',
    '\\.(pem|key|pkcs\\d*|pfx|p12|crt|cer)$',
    '(^|[\\\\/])id_rsa($|\\..+)',
    '(^|[\\\\/])id_ed25519($|\\..+)',
    '(^|[\\\\/])(credentials|secrets|token|passwords?)(\\..+)?$',
    '^\\.github[\\\\/]workflows[\\\\/].+',
    '(^|[\\\\/])(auth|authorization|oauth|session|security-policy)\\.(ts|js|py|go|rb|json)$',
  ];

  for (const pat of protectedPatterns) {
    const regex = new RegExp(pat, 'i');
    if (regex.test(clean)) {
      return { protected: true, reason: `Matches protected security pattern: ${pat}` };
    }
  }
  return { protected: false };
}

function normalizeAndVerifyPath(baseDir, targetRelativePath) {
  if (!targetRelativePath || typeof targetRelativePath !== 'string') {
    return { safe: false, violation: 'Empty path' };
  }
  let decoded = targetRelativePath;
  try {
    decoded = decodeURIComponent(targetRelativePath);
  } catch {
    return { safe: false, violation: 'Malformed URL encoding' };
  }
  decoded = decoded.normalize('NFKC');
  if (decoded.includes('\0')) {
    return { safe: false, violation: 'Null byte injection' };
  }
  const normalizedSeparators = decoded.replace(/\\/g, '/');
  if (path.isAbsolute(normalizedSeparators) || /^[a-zA-Z]:[\\/]/.test(normalizedSeparators)) {
    return { safe: false, violation: 'Absolute paths strictly prohibited' };
  }
  const resolvedBase = path.resolve(baseDir);
  const resolvedTarget = path.resolve(resolvedBase, normalizedSeparators);
  const relativeFromBase = path.relative(resolvedBase, resolvedTarget);
  if (relativeFromBase.startsWith('..') || path.isAbsolute(relativeFromBase)) {
    return { safe: false, violation: 'Path traversal attempt detected' };
  }
  return { safe: true, canonicalPath: resolvedTarget };
}

async function run() {
  console.log('--- RED TEAM 8: CANONICAL PATH TRAVERSAL ATTACKS ---');

  const baseDir = path.resolve(process.cwd(), 'sandbox-test-dir');

  const hostilePaths = [
    '../../etc/passwd',
    '..\\..\\windows\\system32\\cmd.exe',
    '%2e%2e%2f%2e%2e%2fsecrets.json',
    'src/../../../root/.ssh/id_rsa',
    '/etc/shadow',
    'C:\\Windows\\System32\\drivers\\etc\\hosts',
    'subfolder/\0malicious.js',
    'nested/..//..//..//etc/hosts',
  ];

  for (const hostile of hostilePaths) {
    console.log(`▶ Attack: Traversal attempt with: "${hostile}"`);
    const check = normalizeAndVerifyPath(baseDir, hostile);
    assert.strictEqual(
      check.safe,
      false,
      `Hostile path "${hostile}" must be rejected as unsafe`
    );
    console.log(`✔ Blocked: ${check.violation}`);
  }

  console.log('\n▶ Testing Sensitive & Protected File Patterns:');
  const sensitiveFiles = [
    '.env',
    '.env.production',
    '.env.local',
    'id_rsa',
    'id_rsa.pub',
    'id_ed25519',
    'server/credentials.json',
    'config/secret.key',
    'certs/server.pem',
    '.github/workflows/deploy.yml',
    '.github/workflows/ci.yaml',
    'src/auth.ts',
    'server/session.js',
  ];

  for (const sensitive of sensitiveFiles) {
    const prot = isProtectedPath(sensitive);
    assert.strictEqual(
      prot.protected,
      true,
      `Sensitive file "${sensitive}" must be classified as protected`
    );
    console.log(`✔ Protected: ${sensitive} -> ${prot.reason}`);
  }

  console.log('--- ALL PATH TRAVERSAL & SENSITIVE FILE ATTACKS DEFEATED ---');
}

run().catch((err) => {
  console.error('❌ Red Team Path Traversal Test Failed:', err);
  process.exit(1);
});
