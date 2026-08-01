/**
 * **Player-size measurement.** Mirrors the rendered area of the attached media
 * element into `state.playerPixelArea`, in device pixels. `track-switching`'s
 * `capToPlayerSize` rule reads it to keep ABR from selecting a rendition
 * materially larger than what is actually on screen.
 *
 * Measurement is the whole job — this behavior holds no cap policy. It writes a
 * fact (how big the video is being drawn); the rule decides what that means for
 * the candidate set.
 *
 * Two things move the number, and both are watched:
 * - the element's box, via `ResizeObserver`
 * - `devicePixelRatio`, via a `(resolution: …dppx)` media query. A DPR change
 *   (browser zoom, dragging the window to a different display) does not
 *   necessarily resize the element, so the observer alone would miss it.
 *
 * The area is `cssWidth × dpr × cssHeight × dpr` — dpr enters squared because
 * both axes scale. Set `playerSizeCap.useDevicePixelRatio` to `false` for
 * CSS-pixel semantics (VHS's default), or `playerSizeCap.enabled` to `false` to
 * stop measuring entirely.
 *
 * An unmeasurable element — detached, `display: none`, not yet laid out —
 * reports a `0` box. That writes `undefined`, not `0`, so the cap goes inert
 * rather than pinning playback to the smallest rendition on a hidden player.
 */

import { listen } from '@videojs/utils/dom';
import { defineBehavior } from '../../../core/composition/create-composition';
import { effect } from '../../../core/signals/effect';
import type { ReadonlySignal, Signal } from '../../../core/signals/primitives';

export interface PlayerSizeState {
  playerPixelArea?: number;
}

export interface PlayerSizeContext {
  mediaElement?: HTMLMediaElement | undefined;
}

/** Player-size cap policy. Supplied via engine config. */
export interface PlayerSizeCapConfig {
  /** Measure at all. `false` leaves `playerPixelArea` unset, so the cap is inert. */
  enabled: boolean;
  /**
   * Scale the measurement by `devicePixelRatio`. On by default, matching
   * hls.js (`ignoreDevicePixelRatio: false`) and Mux Player: a 640-CSS-px
   * player on a 2x display is really 1280 device pixels, and capping it to
   * 720p would under-serve the display it's on.
   */
  useDevicePixelRatio: boolean;
}

export const DEFAULT_PLAYER_SIZE_CAP_CONFIG: PlayerSizeCapConfig = {
  enabled: true,
  useDevicePixelRatio: true,
};

export interface ObservePlayerSizeConfig {
  /** Player-size cap policy; defaults to `DEFAULT_PLAYER_SIZE_CAP_CONFIG`. */
  playerSizeCap?: Partial<PlayerSizeCapConfig>;
}

/**
 * Call `onChange` whenever `devicePixelRatio` changes. A resolution media query
 * only ever matches the ratio it was built with, so each change detaches the
 * current query and arms a fresh one against the new ratio.
 */
function watchDevicePixelRatio(onChange: () => void): () => void {
  if (typeof globalThis.matchMedia !== 'function') return () => {};

  let removeListener = () => {};

  const arm = () => {
    const query = globalThis.matchMedia(`(resolution: ${globalThis.devicePixelRatio}dppx)`);
    removeListener = listen(query, 'change', handleChange);
  };

  const handleChange = () => {
    removeListener();
    arm();
    onChange();
  };

  arm();
  return () => removeListener();
}

function observePlayerSizeSetup({
  state,
  context,
  config = {},
}: {
  state: { playerPixelArea: Signal<PlayerSizeState['playerPixelArea']> };
  context: { mediaElement: ReadonlySignal<PlayerSizeContext['mediaElement']> };
  config?: ObservePlayerSizeConfig;
}): () => void {
  const { enabled, useDevicePixelRatio } = { ...DEFAULT_PLAYER_SIZE_CAP_CONFIG, ...config.playerSizeCap };

  return effect(() => {
    const mediaElement = context.mediaElement.get();
    if (!enabled || !mediaElement) {
      state.playerPixelArea.set(undefined);
      return;
    }

    const measure = () => {
      const scale = useDevicePixelRatio ? globalThis.devicePixelRatio || 1 : 1;
      const area = mediaElement.clientWidth * scale * (mediaElement.clientHeight * scale);
      state.playerPixelArea.set(area > 0 ? area : undefined);
    };

    measure();

    // No throttling: the slot compares by `Object.is`, so a resize that doesn't
    // change the area notifies nothing, and one that does costs a re-run of the
    // selection rule chain.
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : undefined;
    observer?.observe(mediaElement);
    const stopWatchingDevicePixelRatio = useDevicePixelRatio ? watchDevicePixelRatio(measure) : undefined;

    return () => {
      observer?.disconnect();
      stopWatchingDevicePixelRatio?.();
    };
  });
}

/**
 * Track the rendered area of the attached media element in `playerPixelArea`.
 *
 * @example
 * const cleanup = observePlayerSize.setup({ state, context });
 */
export const observePlayerSize = defineBehavior({
  stateKeys: ['playerPixelArea'],
  contextKeys: ['mediaElement'],
  setup: observePlayerSizeSetup,
});
