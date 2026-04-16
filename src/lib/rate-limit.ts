/**
 * Tiny in-memory rate limiter (per-user, per-key, sliding 24h window).
 *
 * Good enough for low-volume endpoints like voice/TTS where the risk is a runaway
 * client loop quietly burning ElevenLabs/WaveSpeed credit. For anything user-facing
 * at scale, move this to Redis/Upstash or Vercel KV.
 *
 * Note: in-memory means limits reset on cold start (serverless) and are not shared
 * across Vercel instances. Acceptable as a baseline ceiling, not a precise quota.
 */

const buckets = new Map<string, number[]>()

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

export function checkRateLimit(
  userId: string,
  key: string,
  maxPerDay: number,
): RateLimitResult {
  const now = Date.now()
  const windowStart = now - 24 * 60 * 60 * 1000
  const bucketKey = `${userId}:${key}`
  const history = buckets.get(bucketKey) ?? []
  const recent = history.filter(ts => ts > windowStart)

  if (recent.length >= maxPerDay) {
    const oldestInWindow = recent[0]
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((oldestInWindow + 24 * 60 * 60 * 1000 - now) / 1000),
    }
  }

  recent.push(now)
  buckets.set(bucketKey, recent)
  return { allowed: true, remaining: maxPerDay - recent.length, retryAfterSeconds: 0 }
}
