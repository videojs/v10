/**
 * **Bridge MSE playback to AirPlay on WebKit.**
 * MSE streams can't be handed to an AirPlay receiver directly.
 * The WebKit-recommended workaround is to append a fallback
 * `<source type="application/x-mpegURL">` carrying the original manifest URL:
 * Safari exposes the AirPlay picker and, when a wireless target is selected,
 * plays that native-HLS source on the receiver. The session state (WebKit's
 * wireless flag + the standard Remote Playback API, falling edge debounced —
 * see `REMOTE_INACTIVE_SETTLE_MS`) is a behavior-local fact; the engine sees
 * only its policy consequences, declared and written here so the cause→policy
 * mapping stays with the feature:
 *
 * - `state.loadingSuspended` — held while the session is live. Observed by
 *   the `loadXSegments` dispatchers (no fetching alongside the receiver) and
 *   by `setupMediaSource` (its post-close rebuild waits — attaching runs
 *   `element.load()` under the live receiver).
 * - `state.startPosition` — one-shot command snapshotted from the element at
 *   the session's settled end, before the suspension release lets the
 *   rebuild's `load()` reset the element, so `applyStartPosition` starts the
 *   rebuilt source where the receiver left off.
 * https://webkit.org/blog/15036/how-to-use-media-source-extensions-with-airplay/
 *
 * Single-positive-state reactor (`'preconditions-unmet'` ↔ `'airplay-capable'`):
 * gated on a WebKit-AirPlay-capable media element being in scope. The entry —
 * gated on `context.mediaSource` — appends the fallback `<source>` (kept
 * current from `state.presentation`) and enables the AirPlay picker once the
 * MediaSource is open, removing the source the moment the MediaSource detaches
 * so it never survives an MSE teardown. State-exit cleanup (author opt-out,
 * detach, source reset, behavior destroy) removes the source and restores the
 * element's `disableRemotePlayback` default. No-op on non-WebKit platforms
 * (Chromium, Firefox) — `deriveState` never leaves `'preconditions-unmet'`.
 *
 * MMS and AirPlay want *opposite* values of `disableRemotePlayback` on the same
 * element, so it is **sequenced**:
 *
 * - **MMS needs `true` to open.** `setupMediaSource` sets
 *   `disableRemotePlayback = true` when it attaches a ManagedMediaSource —
 *   Safari won't fire `sourceopen` (and MSE playback never starts) otherwise.
 * - **AirPlay needs `false` to offer the picker.** Flipping to `false` *before*
 *   the source opens would prevent `sourceopen`, so the flip is gated on
 *   `context.mediaSource` — which `setupMediaSource` publishes exactly once the
 *   MS is open. Re-fires per source (the slot clears + republishes on reset).
 * - **Author opt-out wins.** `state.disableRemotePlayback` is the author's
 *   intent, written only by the media adapter's IDL property; MMS/programmatic
 *   code touch the element's own `disableRemotePlayback` instead. A `true`
 *   there is unambiguously the author's choice to disable remote playback, so
 *   it holds the machine in `'preconditions-unmet'` and nothing is set up.
 */

import { isWebKitAirPlayCapable, listen, type WebKitVideoElement } from '@videojs/utils/dom';
import { defineBehavior } from '../../../core/composition/create-composition';
import type { Reactor } from '../../../core/reactors/create-machine-reactor';
import { createMachineReactor } from '../../../core/reactors/create-machine-reactor';
import { effect } from '../../../core/signals/effect';
import { computed, peek, type ReadonlySignal, type Signal, signal } from '../../../core/signals/primitives';
import type { MaybeResolvedPresentation } from '../../../media/types';
import type { StartPositionState } from './apply-start-position';
import type { SegmentLoadingState } from './load-segments';

/**
 * How long the platform's remote-playback signals must read *inactive*
 * before `state.remotePlaybackActive` clears.
 *
 * Measured on Safari 26.4 (macOS): when an AirPlay session engages, Safari
 * closes the ManagedMediaSource and — while its pipeline switches to the
 * native-HLS fallback source — transiently reports
 * `webkitCurrentPlaybackTargetIsWireless === false` (firing the changed
 * event) and flaps `remote.state` through `disconnected`/`connecting`.
 * Trusting an instantaneous inactive reading would release
 * `setupMediaSource`'s rebuild hold mid-handoff; its recovery `load()` then
 * destroys the very session being established. Rising edges apply
 * immediately; only the falling edge waits out this settle window.
 */
const REMOTE_INACTIVE_SETTLE_MS = 1000;

type AirPlayFsmState = 'preconditions-unmet' | 'airplay-capable';

function deriveState(
  mediaElement: HTMLMediaElement | undefined,
  authorDisabledRemotePlayback: boolean | undefined
): AirPlayFsmState {
  if (!mediaElement || !isWebKitAirPlayCapable(mediaElement)) return 'preconditions-unmet';
  if (authorDisabledRemotePlayback) return 'preconditions-unmet';
  return 'airplay-capable';
}

function setupAirPlaySetup({
  state,
  context,
}: {
  state: {
    presentation: ReadonlySignal<MaybeResolvedPresentation | undefined>;
    disableRemotePlayback: ReadonlySignal<boolean | undefined>;
    loadingSuspended: Signal<SegmentLoadingState['loadingSuspended']>;
    startPosition: Signal<StartPositionState['startPosition']>;
  };
  context: {
    mediaElement: ReadonlySignal<HTMLMediaElement | undefined>;
    mediaSource: ReadonlySignal<MediaSource | undefined>;
  };
}): Reactor<AirPlayFsmState | 'destroying' | 'destroyed'> {
  const derivedStateSignal = computed(() => deriveState(context.mediaElement.get(), state.disableRemotePlayback.get()));

  return createMachineReactor<AirPlayFsmState>({
    initial: 'preconditions-unmet',
    monitor: () => derivedStateSignal.get(),
    states: {
      'preconditions-unmet': {},

      'airplay-capable': {
        entry: () => {
          const mediaElement = context.mediaElement.get() as WebKitVideoElement;

          // The settled session fact — behavior-local; the engine only sees
          // the policy writes in `setSessionActive` and the session-end
          // snapshot below.
          //
          // Two platform signals feed the fact, because neither is reliable
          // alone (see `REMOTE_INACTIVE_SETTLE_MS`): the standard Remote
          // Playback API's `remote.state` leads the engage (`'connecting'`
          // fires when the user picks a receiver, before Safari closes the
          // MMS), and WebKit's wireless flag covers sessions the Remote
          // Playback API doesn't surface. Active from either wins instantly;
          // inactive from both must settle.
          const remotePlaybackActive = signal(false);
          const remote = mediaElement.remote as RemotePlayback | undefined;
          const isSessionActive = () =>
            !!mediaElement.webkitCurrentPlaybackTargetIsWireless ||
            remote?.state === 'connecting' ||
            remote?.state === 'connected';

          const setSessionActive = (active: boolean) => {
            remotePlaybackActive.set(active);
            state.loadingSuspended.set(active);
          };

          let settleTimer: ReturnType<typeof setTimeout> | undefined;
          const sync = () => {
            if (isSessionActive()) {
              clearTimeout(settleTimer);
              settleTimer = undefined;
              setSessionActive(true);
            } else if (peek(remotePlaybackActive)) {
              // Falling edge: don't trust an instantaneous inactive reading —
              // re-check once the platform signals have settled.
              settleTimer ??= setTimeout(() => {
                settleTimer = undefined;
                const stillActive = isSessionActive();
                if (!stillActive) {
                  // Session over. The element still carries the
                  // receiver-mirrored position, and nothing has `load()`ed
                  // it yet — `setupMediaSource`'s rebuild only proceeds once
                  // the suspension release below lets it. Snapshot into the
                  // one-shot command first, so `applyStartPosition` starts
                  // the rebuilt source where the receiver left off.
                  state.startPosition.set(mediaElement.currentTime);
                }
                setSessionActive(stillActive);
              }, REMOTE_INACTIVE_SETTLE_MS);
            } else {
              setSessionActive(false);
            }
          };
          const listenerCleanup = new AbortController();
          listen(mediaElement, 'webkitcurrentplaybacktargetiswirelesschanged', sync, {
            signal: listenerCleanup.signal,
          });
          for (const eventType of ['connecting', 'connect', 'disconnect'] as const) {
            remote?.addEventListener(eventType, sync, { signal: listenerCleanup.signal });
          }

          const sourceUrl = computed(() => state.presentation.get()?.url ?? '');

          // This effect combines:
          // - adding a native HLS fallback source when the mediaSource is
          //   attached / removing it when it's detached — UNLESS a session is
          //   live: during an AirPlay session the engine detaches its dead
          //   MediaSource (see setupMediaSource's liveness recovery) while
          //   the receiver is playing exactly this fallback source, so it
          //   must survive until the session's falling edge (the rebuild's
          //   republish then adopts it again).
          // - keeping this sourceEl's src in sync with the current presentation.
          // The created source is also cleaned on state exit.
          // The dependence on context.mediaSource means the source is appended
          // only after the MMS has been attached and opened (therefore we can
          // flip disableRemotePlayback). Being in this state also implies
          // that the author has not disabled remote playback.
          let sourceEl: HTMLSourceElement | null = null;
          const disposeSource = effect(() => {
            const hasMediaSource = !!context.mediaSource.get();
            const sessionActive = !!remotePlaybackActive.get();
            const url = sourceUrl.get();

            if (!hasMediaSource && !sessionActive) {
              sourceEl?.remove();
              sourceEl = null;
            } else if (hasMediaSource && (!sourceEl || sourceEl.parentNode !== mediaElement)) {
              sourceEl = document.createElement('source');
              sourceEl.type = 'application/x-mpegURL';
              mediaElement.append(sourceEl);
              mediaElement.disableRemotePlayback = false;
            }
            if (sourceEl) sourceEl.src = url;
          });

          // AirPlay may already be active at (re)attach.
          sync();

          return () => {
            disposeSource();
            listenerCleanup.abort();
            clearTimeout(settleTimer);
            sourceEl?.remove();
            sourceEl = null;
            // Undo the picker enable: hand the element back to its MMS-default
            // `disableRemotePlayback = true`.
            mediaElement.disableRemotePlayback = true;
            // Don't strand the engine held/suspended if we tear down
            // mid-session (author opt-out, detach, destroy).
            setSessionActive(false);
          };
        },
      },
    },
  });
}

export const setupAirPlay = defineBehavior({
  stateKeys: ['presentation', 'disableRemotePlayback', 'loadingSuspended', 'startPosition'],
  contextKeys: ['mediaElement', 'mediaSource'],
  setup: setupAirPlaySetup,
});
