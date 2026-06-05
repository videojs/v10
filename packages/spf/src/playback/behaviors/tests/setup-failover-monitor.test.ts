import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { signal } from '../../../core/signals/primitives';
import type { MaybeResolvedPresentation, Presentation } from '../../../media/types';
import { type FailoverReporter, setupFailoverMonitor } from '../setup-failover-monitor';

const resolved = (): Presentation =>
  ({ id: 'pres-1', url: 'https://cdn-a.example.com/master.m3u8', startTime: 0, selectionSets: [] }) as Presentation;

const makeState = (presentation?: MaybeResolvedPresentation) => ({
  presentation: signal<MaybeResolvedPresentation | undefined>(presentation),
  failedCdns: signal<string[] | undefined>(undefined),
});
const makeContext = () => ({ failoverReporter: signal<FailoverReporter | undefined>(undefined) });

const flush = () => Promise.resolve().then(() => Promise.resolve());

const A = 'https://cdn-a.example.com';

describe('setupFailoverMonitor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('publishes a reporter while resolved', async () => {
    const state = makeState(resolved());
    const context = makeContext();
    const reactor = setupFailoverMonitor.setup({ state, context });
    await flush();
    expect(context.failoverReporter.get()).toBeDefined();
    reactor.destroy();
  });

  it('trips a CDN into failedCdns at the failure threshold', async () => {
    const state = makeState(resolved());
    const context = makeContext();
    const reactor = setupFailoverMonitor.setup({
      state,
      context,
      config: { failover: { failureThreshold: 2, cooldownMs: 1000 } },
    });
    await flush();
    const reporter = context.failoverReporter.get()!;

    reporter.recordResult(`${A}/720p.m3u8`, false);
    expect(state.failedCdns.get() ?? []).toEqual([]); // 1 < 2
    reporter.recordResult(`${A}/seg-1.mp4`, false);
    expect(state.failedCdns.get()).toEqual([A]); // tripped

    reactor.destroy();
  });

  it('resets a CDN on a successful result', async () => {
    const state = makeState(resolved());
    const context = makeContext();
    const reactor = setupFailoverMonitor.setup({
      state,
      context,
      config: { failover: { failureThreshold: 2, cooldownMs: 1000 } },
    });
    await flush();
    const reporter = context.failoverReporter.get()!;

    reporter.recordResult(`${A}/a.m3u8`, false);
    reporter.recordResult(`${A}/a.m3u8`, true); // resets the count
    reporter.recordResult(`${A}/a.m3u8`, false);
    expect(state.failedCdns.get() ?? []).toEqual([]); // only 1 since reset

    reactor.destroy();
  });

  it('removes a CDN from failedCdns once its cooldown lapses', async () => {
    const state = makeState(resolved());
    const context = makeContext();
    const reactor = setupFailoverMonitor.setup({
      state,
      context,
      config: { failover: { failureThreshold: 1, cooldownMs: 1000 } },
    });
    await flush();
    const reporter = context.failoverReporter.get()!;

    reporter.recordResult(`${A}/seg.mp4`, false); // trips (threshold 1), cooldown until 1000
    expect(state.failedCdns.get()).toEqual([A]);

    await vi.advanceTimersByTimeAsync(1000); // re-sync timer fires at the boundary
    expect(state.failedCdns.get()).toEqual([]);

    reactor.destroy();
  });

  it('clears the reporter and failedCdns on src unload', async () => {
    const state = makeState(resolved());
    const context = makeContext();
    const reactor = setupFailoverMonitor.setup({
      state,
      context,
      config: { failover: { failureThreshold: 1, cooldownMs: 1000 } },
    });
    await flush();
    context.failoverReporter.get()!.recordResult(`${A}/seg.mp4`, false);
    expect(state.failedCdns.get()).toEqual([A]);

    state.presentation.set(undefined);
    await flush();
    expect(context.failoverReporter.get()).toBeUndefined();
    expect(state.failedCdns.get()).toBeUndefined();

    reactor.destroy();
  });
});
