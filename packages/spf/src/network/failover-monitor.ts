/**
 * Per-CDN failure monitor — the auto-detection behind multi-CDN failover. Tracks
 * consecutive fetch failures per CDN (origin) and trips a CDN into a timed
 * cooldown once it fails too often; `track-switching`'s `excludeFailedCdns`
 * constraint reads the cooled-down set and prunes that CDN's tracks.
 *
 * Pure and clock-free: callers pass `now` (ms) so the logic is deterministic and
 * unit-testable. The reactive wrapper (the failover monitor actor) supplies the real
 * clock + the timers that re-evaluate when a cooldown lapses.
 *
 * This is the minimal slice of the broader `network-resilience` failure-detection;
 * a fuller version (windowed counts, per-fetch-site policy, jitter) can replace
 * the internals without changing this contract.
 */

export interface FailoverMonitorConfig {
  /** Consecutive failures on one CDN before it trips into cooldown. */
  failureThreshold: number;
  /** How long a tripped CDN stays excluded, in milliseconds. */
  cooldownMs: number;
}

export const DEFAULT_FAILOVER_MONITOR_CONFIG: FailoverMonitorConfig = {
  failureThreshold: 3,
  cooldownMs: 30_000,
};

export interface FailoverMonitor {
  /** Record a failed fetch to `cdn` at time `now` (ms). */
  recordFailure(cdn: string, now: number): void;
  /** Record a successful fetch to `cdn` — resets its consecutive-failure count. */
  recordSuccess(cdn: string): void;
  /** The CDN ids currently in cooldown at `now`. Pure — no mutation. */
  failedCdns(now: number): string[];
}

export function createFailoverMonitor(config?: Partial<FailoverMonitorConfig>): FailoverMonitor {
  const { failureThreshold, cooldownMs } = { ...DEFAULT_FAILOVER_MONITOR_CONFIG, ...config };
  const failureCount = new Map<string, number>();
  const cooldownUntil = new Map<string, number>();

  return {
    recordFailure(cdn, now) {
      // If a prior cooldown has lapsed, the CDN starts fresh — a recovered CDN
      // must accrue a full threshold of new failures before tripping again.
      const until = cooldownUntil.get(cdn);
      if (until !== undefined && now >= until) {
        failureCount.delete(cdn);
        cooldownUntil.delete(cdn);
      }
      const count = (failureCount.get(cdn) ?? 0) + 1;
      failureCount.set(cdn, count);
      if (count >= failureThreshold) cooldownUntil.set(cdn, now + cooldownMs);
    },
    recordSuccess(cdn) {
      failureCount.delete(cdn);
      cooldownUntil.delete(cdn);
    },
    failedCdns(now) {
      const result: string[] = [];
      for (const [cdn, until] of cooldownUntil) {
        if (until > now) result.push(cdn);
      }
      return result;
    },
  };
}
