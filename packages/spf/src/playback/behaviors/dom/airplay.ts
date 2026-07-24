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
 * appends the fallback `<source>`, wires the wireless-target listener, keeps
 * the source URL current from `state.presentation`, and enables the AirPlay
 * picker once the MediaSource is open; state-exit cleanup (detach, source
 * reset, behavior destroy) removes the source, drops the listener, and releases
 * any active suspend. No-op on non-WebKit platforms (Chromium, Firefox) —
 * `deriveState` never leaves `'preconditions-unmet'`.
 * *
 * MMS and AirPlay want *opposite* values of `disableRemotePlayback` on the same
 * element, so they must be **sequenced**:
 *
 * - **MMS needs `true` to open.** `setupMediaSource` sets
 *   `disableRemotePlayback = true` when it attaches a ManagedMediaSource —
 *   Safari won't fire `sourceopen` (and MSE playback never starts) otherwise.
 * - **AirPlay needs `false` to offer the picker.** Flipping to `false` *before*
 *   the source opens would prevent `sourceopen`. So we wait: `setupMediaSource`
 *   publishes `context.mediaSource` exactly once the MS is open, and we flip
 *   `disableRemotePlayback = false` gated on that.
 *   The gate re-fires per source (the slot clears + republishes on reset).
 * - **Author opt-out wins.** `state.disableRemotePlayback` (written only by the
 *   media adapter's IDL property, never by MMS/programmatic code) is the
 *   author's intent. A `true` read at entry is unambiguously the author's choice
 *   to disable remote playback, so we set nothing up. Because the intent lives
 *   on its own signal rather than the shared DOM property, this no longer
 *   depends on reading before MMS's programmatic write — folds in #1800.
 */

import { isWebKitAirPlayCapable, listen, type WebKitVideoElement } from '@videojs/utils/dom';
import { defineBehavior } from '../../../core/composition/create-composition';
import type { Reactor } from '../../../core/reactors/create-machine-reactor';
import { createMachineReactor } from '../../../core/reactors/create-machine-reactor';
import { effect } from '../../../core/signals/effect';
import { computed, type ReadonlySignal, type Signal } from '../../../core/signals/primitives';
import type { MaybeResolvedPresentation } from '../../../media/types';

type AirPlayFsmState = 'preconditions-unmet' | 'airplay-capable';

function deriveState(mediaElement: HTMLMediaElement | undefined): AirPlayFsmState {
  if (!mediaElement || !isWebKitAirPlayCapable(mediaElement)) return 'preconditions-unmet';
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
  const derivedStateSignal = computed(() => deriveState(context.mediaElement.get()));

  return createMachineReactor<AirPlayFsmState>({
    initial: 'preconditions-unmet',
    monitor: () => derivedStateSignal.get(),
    states: {
      'preconditions-unmet': {},

      'airplay-capable': {
        entry: () => {
          const mediaElement = context.mediaElement.get() as WebKitVideoElement;

          // Author opt-out: `state.disableRemotePlayback` is the author's
          // intent, written only by the media adapter's IDL property — never by
          // MMS/programmatic code. So a `true` here is unambiguously the author's
          // choice to disable remote playback: set nothing up, leaving the
          // element's remote playback disabled.
          if (state.disableRemotePlayback.get()) return;

          const sourceEl = document.createElement('source');
          sourceEl.type = 'application/x-mpegURL';
          mediaElement.append(sourceEl);

          // Reflect the wireless target on `state.loadSuspended`: suspend engine
          // loading while active so we don't double-fetch alongside the receiver,
          // resume when it turns off.
          //
          // NOTE: on disengage Safari has already closed our MMS and doesn't
          // re-select the MSE `<source>`, so local MSE playback can't actually
          // resume — see the AirPlay feature doc's known-limitation on
          // MMS/AirPlay return.
          const sync = () => {
            const isWireless = !!mediaElement.webkitCurrentPlaybackTargetIsWireless;
            state.loadSuspended.set(isWireless);
          };
          const controller = new AbortController();
          listen(mediaElement, 'webkitcurrentplaybacktargetiswirelesschanged', sync, {
            signal: controller.signal,
          });

          // Keep the fallback source URL in sync with the presentation.
          const sourceUrl = computed(() => state.presentation.get()?.url ?? '');
          const disposeSrc = effect(() => {
            sourceEl.src = sourceUrl.get();
          });

          // Enable the AirPlay picker only once the (Managed)MediaSource is open
          const disposeEnablePicker = effect(() => {
            if (context.mediaSource.get()) mediaElement.disableRemotePlayback = false;
          });

          // AirPlay may already be active at (re)attach.
          sync();

          return () => {
            disposeSrc();
            disposeEnablePicker();
            controller.abort();
            sourceEl.remove();
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
