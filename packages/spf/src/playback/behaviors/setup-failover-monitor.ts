/**
 * **CDN failure monitor.** Auto-detection behind multi-CDN failover: while a
 * presentation is resolved, owns `failedCdns` and publishes a `failoverReporter`
 * reporter to context. Fetch sites (segment loading, media-playlist resolution)
 * call `reporter.recordResult(url, ok)`; the monitor counts per-CDN failures and,
 * once a CDN trips, writes it into `failedCdns` for a cooldown window.
 * `track-switching`'s `excludeFailedCdns` constraint then prunes that CDN's
 * tracks and the active-CDN scope falls to the next one — and back, once the
 * cooldown lapses.
 *
 * The pure counting/cooldown logic lives in `network/failover-monitor`; this behavior
 * supplies the real clock (`Date.now`) and the timers that re-sync `failedCdns`
 * when a cooldown lapses (so a recovered CDN leaves the set even with no new
 * fetch activity). Lifecycle is per-source: a fresh monitor on each resolve, all
 * timers + state cleared on exit.
 *
 * This is the minimal `network-resilience` failure-detection slice; policy
 * (threshold / cooldown) is engine config.
 */

import { defineBehavior } from '../../core/composition/create-composition';
import { createMachineReactor } from '../../core/reactors/create-machine-reactor';
import { computed, peek, type ReadonlySignal, type Signal } from '../../core/signals/primitives';
import { isResolvedPresentation, type MaybeResolvedPresentation } from '../../media/types';
import { getCdnId } from '../../media/utils/cdn';
import {
  createFailoverMonitor,
  DEFAULT_FAILOVER_MONITOR_CONFIG,
  type FailoverMonitorConfig,
} from '../../network/failover-monitor';
import type { FetchBytes } from '../../network/fetch';

/** Imperative reporter published to context for fetch sites to report results. */
export interface FailoverReporter {
  /** Report the outcome of a fetch to `url` — `ok: false` counts a failure. */
  recordResult(url: string, ok: boolean): void;
}

/**
 * Wrap a `FetchBytes` so each request reports its outcome to the failover monitor.
 * A thrown error counts as a failure (a down CDN rejects the request); a
 * resolved request counts as a success. Aborts (track switch / teardown) are
 * not failures. The reporter is read lazily so it can be published after the
 * fetch is constructed.
 *
 * (HTTP error *statuses* that still resolve with a body — e.g. 5xx — aren't
 * distinguished here; that's a network-resilience error-classification refinement.)
 */
export function reportFetchBytes(fetch: FetchBytes, getReporter: () => FailoverReporter | undefined): FetchBytes {
  return async (addressable, options) => {
    try {
      const result = await fetch(addressable, options);
      getReporter()?.recordResult(addressable.url, true);
      return result;
    } catch (error) {
      if (!options?.signal?.aborted) getReporter()?.recordResult(addressable.url, false);
      throw error;
    }
  };
}

export interface SetupFailoverMonitorState {
  presentation?: MaybeResolvedPresentation;
  failedCdns?: string[];
}

export interface SetupFailoverMonitorContext {
  failoverReporter?: FailoverReporter;
}

export interface SetupFailoverMonitorConfig {
  /** Per-failover monitor policy (threshold / cooldown); defaults to `DEFAULT_FAILOVER_MONITOR_CONFIG`. */
  failover?: Partial<FailoverMonitorConfig>;
}

const sameSet = (a: string[] | undefined, b: readonly string[]): boolean =>
  !!a && a.length === b.length && a.every((cdn) => b.includes(cdn));

/**
 * Manage `failedCdns` + the `failoverReporter` reporter for the resolved source.
 *
 * @example
 * const reactor = setupFailoverMonitor.setup({ state, context });
 */
export const setupFailoverMonitor = defineBehavior({
  stateKeys: ['presentation', 'failedCdns'],
  contextKeys: ['failoverReporter'],
  setup: ({
    state,
    context,
    config = {},
  }: {
    state: {
      presentation: ReadonlySignal<SetupFailoverMonitorState['presentation']>;
      failedCdns: Signal<SetupFailoverMonitorState['failedCdns']>;
    };
    context: { failoverReporter: Signal<FailoverReporter | undefined> };
    config?: SetupFailoverMonitorConfig;
  }) => {
    const cooldownMs = config.failover?.cooldownMs ?? DEFAULT_FAILOVER_MONITOR_CONFIG.cooldownMs;
    const derivedStateSignal = computed(() =>
      isResolvedPresentation(state.presentation.get())
        ? ('presentation-resolved' as const)
        : ('presentation-unresolved' as const)
    );

    return createMachineReactor({
      initial: 'presentation-unresolved',
      monitor: () => derivedStateSignal.get(),
      states: {
        'presentation-unresolved': {},
        'presentation-resolved': {
          entry: () => {
            // Fresh monitor per source — CDN identities and health are
            // per-presentation.
            const monitor = createFailoverMonitor(config.failover);
            const timers = new Set<ReturnType<typeof setTimeout>>();

            // Recompute the cooled-down set at `now` and publish if it changed.
            const sync = (now: number): readonly string[] => {
              const failed = monitor.failedCdns(now);
              if (!sameSet(peek(state.failedCdns), failed)) state.failedCdns.set(failed);
              return failed;
            };

            const reporter: FailoverReporter = {
              recordResult(url, ok) {
                const cdn = getCdnId(url);
                const now = Date.now();
                if (ok) monitor.recordSuccess(cdn);
                else monitor.recordFailure(cdn, now);
                const failed = sync(now);
                // While any CDN is cooling, schedule a re-sync at the cooldown
                // boundary so a recovered CDN leaves `failedCdns` without needing
                // a new fetch to nudge it.
                if (failed.length) {
                  const timer = setTimeout(() => {
                    timers.delete(timer);
                    sync(Date.now());
                  }, cooldownMs);
                  timers.add(timer);
                }
              },
            };

            context.failoverReporter.set(reporter);

            return () => {
              for (const timer of timers) clearTimeout(timer);
              timers.clear();
              context.failoverReporter.set(undefined);
              state.failedCdns.set(undefined);
            };
          },
        },
      },
    });
  },
});
