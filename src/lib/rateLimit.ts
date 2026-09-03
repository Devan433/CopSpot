/**
 * In-memory sliding-window rate limiter.
 *
 * Stores request timestamps per key (IP + action) and enforces
 * configurable limits within a time window. Automatically prunes
 * expired entries to prevent memory leaks.
 */

type RateLimitEntry = {
  timestamps: number[];
};

const store = new Map<string, RateLimitEntry>();

// Prune expired entries every 5 minutes to prevent unbounded growth
const PRUNE_INTERVAL_MS = 5 * 60 * 1000;
let lastPrune = Date.now();

function pruneExpired(windowMs: number): void {
  const now = Date.now();
  if (now - lastPrune < PRUNE_INTERVAL_MS) return;
  lastPrune = now;

  const cutoff = now - windowMs;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Maximum number of requests allowed within the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** How many requests remain in the current window */
  remaining: number;
  /** Unix timestamp (ms) when the window resets */
  resetAt: number;
}

/**
 * Check and consume a rate limit slot for the given key.
 *
 * @param key - Unique identifier, typically `${ip}:${action}`
 * @param config - Rate limit configuration
 * @returns Whether the request is allowed, remaining quota, and reset time
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - config.windowMs;

  // Lazily prune stale entries
  pruneExpired(config.windowMs);

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  // Remove timestamps outside the current window
  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= config.maxRequests) {
    // Rate limited — find when the earliest request in the window expires
    const oldestInWindow = entry.timestamps[0];
    return {
      allowed: false,
      remaining: 0,
      resetAt: oldestInWindow + config.windowMs,
    };
  }

  // Allow and record
  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: config.maxRequests - entry.timestamps.length,
    resetAt: now + config.windowMs,
  };
}

// Pre-configured limits
export const REPORT_LIMIT: RateLimitConfig = {
  maxRequests: 5,
  windowMs: 10 * 60 * 1000, // 5 reports per 10 minutes
};

export const MESSAGE_LIMIT: RateLimitConfig = {
  maxRequests: 5,
  windowMs: 20 * 60 * 1000, // 5 messages per 20 minutes
};

export const VOTE_LIMIT: RateLimitConfig = {
  maxRequests: 30,
  windowMs: 5 * 60 * 1000, // 30 votes per 5 minutes
};
