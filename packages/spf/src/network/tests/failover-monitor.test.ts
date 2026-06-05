import { describe, expect, it } from 'vitest';
import { createFailoverMonitor, DEFAULT_FAILOVER_MONITOR_CONFIG } from '../failover-monitor';

describe('createFailoverMonitor', () => {
  it('does not trip below the failure threshold', () => {
    const monitor = createFailoverMonitor({ failureThreshold: 3, cooldownMs: 1000 });
    monitor.recordFailure('cdn-a', 0);
    monitor.recordFailure('cdn-a', 10);
    expect(monitor.failedCdns(20)).toEqual([]);
  });

  it('trips into cooldown at the threshold', () => {
    const monitor = createFailoverMonitor({ failureThreshold: 3, cooldownMs: 1000 });
    monitor.recordFailure('cdn-a', 0);
    monitor.recordFailure('cdn-a', 1);
    monitor.recordFailure('cdn-a', 2);
    expect(monitor.failedCdns(2)).toEqual(['cdn-a']);
  });

  it('tracks CDNs independently', () => {
    const monitor = createFailoverMonitor({ failureThreshold: 2, cooldownMs: 1000 });
    monitor.recordFailure('cdn-a', 0);
    monitor.recordFailure('cdn-a', 1);
    monitor.recordFailure('cdn-b', 1);
    expect(monitor.failedCdns(1)).toEqual(['cdn-a']);
  });

  it('resets the failure count on success', () => {
    const monitor = createFailoverMonitor({ failureThreshold: 3, cooldownMs: 1000 });
    monitor.recordFailure('cdn-a', 0);
    monitor.recordFailure('cdn-a', 1);
    monitor.recordSuccess('cdn-a');
    monitor.recordFailure('cdn-a', 2);
    monitor.recordFailure('cdn-a', 3);
    // Only 2 consecutive failures after the reset → still under threshold.
    expect(monitor.failedCdns(3)).toEqual([]);
  });

  it('leaves cooldown once it lapses', () => {
    const monitor = createFailoverMonitor({ failureThreshold: 1, cooldownMs: 1000 });
    monitor.recordFailure('cdn-a', 0);
    expect(monitor.failedCdns(500)).toEqual(['cdn-a']);
    expect(monitor.failedCdns(1000)).toEqual([]); // until is exclusive: 1000 is no longer < 1000
    expect(monitor.failedCdns(2000)).toEqual([]);
  });

  it('gives a recovered CDN fresh chances (needs a full threshold again)', () => {
    const monitor = createFailoverMonitor({ failureThreshold: 2, cooldownMs: 1000 });
    monitor.recordFailure('cdn-a', 0);
    monitor.recordFailure('cdn-a', 1); // trips: cooldown until 1001
    expect(monitor.failedCdns(1)).toEqual(['cdn-a']);

    // After cooldown lapses, a single failure must NOT immediately re-trip.
    monitor.recordFailure('cdn-a', 2000);
    expect(monitor.failedCdns(2000)).toEqual([]);
    monitor.recordFailure('cdn-a', 2001); // second post-recovery failure → trips again
    expect(monitor.failedCdns(2001)).toEqual(['cdn-a']);
  });

  it('exposes sensible defaults', () => {
    expect(DEFAULT_FAILOVER_MONITOR_CONFIG.failureThreshold).toBeGreaterThan(1);
    expect(DEFAULT_FAILOVER_MONITOR_CONFIG.cooldownMs).toBeGreaterThan(0);
  });
});
