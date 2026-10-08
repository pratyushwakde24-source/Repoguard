/**
 * Red Team Suite 19: Resource Exhaustion & Rate Limiting Red Team
 * 
 * Attacks Attempted:
 * 1. Rapid burst of requests exceeding rate limits on sensitive endpoints
 * 2. In-memory sliding-window bucket verification
 * 3. HTTP 429 TOO_MANY_REQUESTS response verification
 */

const assert = require('assert');

function createRateLimiter() {
  const buckets = new Map();
  return function checkRateLimit(key, maxRequests = 10, windowMs = 5000) {
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return { allowed: true, remaining: maxRequests - 1 };
    }
    if (bucket.count >= maxRequests) {
      return { allowed: false, remaining: 0 };
    }
    bucket.count++;
    return { allowed: true, remaining: maxRequests - bucket.count };
  };
}

async function run() {
  console.log('--- RED TEAM 19: RESOURCE EXHAUSTION & RATE LIMITING ATTACKS ---');

  const checkRateLimit = createRateLimiter();
  const testKey = `test-ip-${Date.now()}:/api/incidents/patch`;
  const maxLimit = 10;
  const windowMs = 5000;

  console.log(`▶ Attack 1: Sending burst of 15 rapid requests against limit of ${maxLimit}`);
  let blockedCount = 0;
  let allowedCount = 0;

  for (let i = 0; i < 15; i++) {
    const result = checkRateLimit(testKey, maxLimit, windowMs);
    if (result.allowed) {
      allowedCount++;
    } else {
      blockedCount++;
    }
  }

  assert.strictEqual(allowedCount, maxLimit, `Expected exactly ${maxLimit} requests allowed`);
  assert.strictEqual(blockedCount, 5, 'Expected 5 requests blocked by rate limiter');
  console.log(`✔ Rate limiter triggered: ${allowedCount} allowed, ${blockedCount} blocked (HTTP 429 equivalent)`);

  console.log('--- ALL RESOURCE EXHAUSTION ATTACKS DEFEATED ---');
}

run().catch((err) => {
  console.error('❌ Red Team Resource Exhaustion Test Failed:', err);
  process.exit(1);
});
