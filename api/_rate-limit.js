
// ── Rate Limiter Utility ──────────────────────────────────────────────────────
// Simple in-memory rate limiter for Vercel serverless functions
// Usage: import { checkRateLimit } from './rate-limit.js'
 
const requests = new Map();
 
export function checkRateLimit(ip, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const windowStart = now - windowMs;
 
  // Clean old entries
  if (requests.has(ip)) {
    const timestamps = requests.get(ip).filter(t => t > windowStart);
    requests.set(ip, timestamps);
    if (timestamps.length >= maxRequests) {
      return { limited: true, remaining: 0, resetIn: Math.ceil((timestamps[0] - windowStart) / 1000) };
    }
    timestamps.push(now);
    return { limited: false, remaining: maxRequests - timestamps.length };
  }
 
  requests.set(ip, [now]);
  return { limited: false, remaining: maxRequests - 1 };
}
