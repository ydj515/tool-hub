/**
 * 메모리 기반 고정 윈도우 레이트 리미터를 제공한다.
 */
type Bucket = {
  count: number;
  resetAt: number;
};

const WINDOW_MS = 60 * 1000;
const LIMIT_PER_WINDOW = 20;
const buckets = new Map<string, Bucket>();

/**
 * 키별 요청 횟수를 고정 윈도우 방식으로 검사한다.
 */
export function checkRateLimit(key: string): { ok: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || now >= current.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, remaining: LIMIT_PER_WINDOW - 1, retryAfterMs: WINDOW_MS };
  }

  if (current.count >= LIMIT_PER_WINDOW) {
    return { ok: false, remaining: 0, retryAfterMs: Math.max(0, current.resetAt - now) };
  }

  current.count += 1;
  buckets.set(key, current);
  return { ok: true, remaining: LIMIT_PER_WINDOW - current.count, retryAfterMs: Math.max(0, current.resetAt - now) };
}
