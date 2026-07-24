/**
 * **Bridge MSE playback to AirPlay on WebKit.**
 * MSE streams can't be handed to an AirPlay receiver directly.
 * The WebKit-recommended workaround is to append a fallback
 * `<source type="application/x-mpegURL">` carrying the original manifest URL:
 * Safari exposes the AirPlay picker and, when a wireless target is selected,
 * plays that native-HLS source on the receiver. When the wireless target engages
 * this behavior suspends engine loading (`state.loadSuspended`) so we don't
 * double-fetch alongside the receiver.
 * https://webkit.org/blog/15036/how-to-use-media-source-extensions-with-airplay/
 *
 * Single-positive-state reactor (`'preconditions-unmet'` ↔ `'airplay-capable'`):
 * gated on a WebKit-AirPlay-capable media element being in scope. The entry
 * wires the wireless-target listener, then — gated on `context.mediaSource` —
 * appends the fallback `<source>` (kept current from `state.presentation`) and
 * enables the AirPlay picker once the MediaSource is open, removing the source
 * the moment the MediaSource detaches so it never survives an MSE teardown.
 * State-exit cleanup (author opt-out, detach, source reset, behavior destroy)
 * removes the source, drops the listener, restores the element's
 * `disableRemotePlayback` default, and releases any active suspend. No-op on
 * non-WebKit platforms (Chromium, Firefox) — `deriveState` never leaves
 * `'preconditions-unmet'`.
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
import { computed, type ReadonlySignal, type Signal } from '../../../core/signals/primitives';
import type { MaybeResolvedPresentation } from '../../../media/types';

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
    loadSuspended: Signal<boolean | undefined>;
    disableRemotePlayback: ReadonlySignal<boolean | undefined>;
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

          // Reflect the wireless target on `state.loadSuspended`: suspend engine
          // loading while active so we don't double-fetch alongside the receiver,
          // resume when it turns off.
          //
          // NOTE: on disengage Safari has already closed our MMS and doesn't
          // re-select the MSE `<source>`, so local MSE playback can't actually
          // resume until the source is reloaded.
          const sync = () => {
            const isWireless = !!mediaElement.webkitCurrentPlaybackTargetIsWireless;
            state.loadSuspended.set(isWireless);
          };
          const controller = new AbortController();
          listen(mediaElement, 'webkitcurrentplaybacktargetiswirelesschanged', sync, {
            signal: controller.signal,
          });

          const sourceUrl = computed(() => state.presentation.get()?.url ?? '');

          // This effect combines:
          // - adding a native HLS fallback source when the
          // mediaSource is attached/destroying it when its detached.
          // - keeping this sourceEl's src in sync with the current presentation.
          // The created source is also cleaned on state exit.
          // The dependence on context.mediaSource helps us append the source after the
          // MMS has been attached and opened (therefore we can flip disableRemotePlayback).
          // Being in this state also implies that the author has not disabled remote playback
          let sourceEl: HTMLSourceElement | null = null;
          const disposeSource = effect(() => {
            const hasMediaSource = !!context.mediaSource.get();
            const url = sourceUrl.get();

            if (!hasMediaSource) {
              sourceEl?.remove();
              sourceEl = null;
            } else {
              if (!sourceEl || sourceEl.parentNode !== mediaElement) {
                sourceEl = document.createElement('source');
                sourceEl.type = 'application/x-mpegURL';
                mediaElement.append(sourceEl);
                mediaElement.disableRemotePlayback = false;
              }
              sourceEl.src = url;
            }
          });

          // AirPlay may already be active at (re)attach.
          sync();

          return () => {
            disposeSource();
            controller.abort();
            sourceEl?.remove();
            sourceEl = null;
            // Undo the picker enable: hand the element back to its MMS-default
            // `disableRemotePlayback = true`.
            mediaElement.disableRemotePlayback = true;
            // Don't strand loading suspended if we detach mid-wireless.
            state.loadSuspended.set(false);
          };
        },
      },
    },
  });
}

export const setupAirPlay = defineBehavior({
  stateKeys: ['presentation', 'loadSuspended', 'disableRemotePlayback'],
  contextKeys: ['mediaElement', 'mediaSource'],
  setup: setupAirPlaySetup,
});
