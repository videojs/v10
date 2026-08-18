/**
 * **Player-size measurement.** Mirrors the rendered box of the attached media
 * element into `state.playerWidth` / `playerHeight` (CSS pixels), and the ratio
 * that converts it to device pixels into `state.playerScale`, over
 * `@videojs/utils/dom`'s size observers. Measurement is the whole job — the
 * policy built on it is `track-switching`'s `capToPlayerSize` rule.
 *
 * Box and scale stay distinct values rather than a single pre-multiplied area,
 * so nothing here assumes what the measurement will be used for.
 */

import { type ElementSize, observeElementSize, observeRenderedSize } from '@videojs/utils/dom';
import { defineBehavior } from '../../../core/composition/create-composition';
import { effect } from '../../../core/signals/effect';
import type { ReadonlySignal, Signal } from '../../../core/signals/primitives';

export interface PlayerSizeState {
  /** Rendered width of the media element, in CSS pixels. */
  playerWidth?: number;
  /** Rendered height of the media element, in CSS pixels. */
  playerHeight?: number;
  /**
   * `devicePixelRatio` at measurement time — CSS pixels × scale per axis. Unset
   * when `useDevicePixelRatio` is off, which readers take as CSS pixels (`1`).
   */
  playerScale?: number;
}

export interface PlayerSizeContext {
  mediaElement?: HTMLMediaElement | undefined;
}

/** Player-size cap policy. Supplied via engine config. */
export interface PlayerSizeCapConfig {
  /** Measure at all. `false` leaves the player slots unset, so the cap is inert. */
  enabled: boolean;
  /**
   * Track `devicePixelRatio` alongside the box, so the cap compares in device
   * pixels. A 640-CSS-px player on a 2x display is really 1280 device pixels;
   * comparing in CSS pixels would cap it to 720p and under-serve the display.
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

function observePlayerSizeSetup({
  state,
  context,
  config = {},
}: {
  state: {
    playerWidth: Signal<PlayerSizeState['playerWidth']>;
    playerHeight: Signal<PlayerSizeState['playerHeight']>;
    playerScale: Signal<PlayerSizeState['playerScale']>;
  };
  context: { mediaElement: ReadonlySignal<PlayerSizeContext['mediaElement']> };
  config?: ObservePlayerSizeConfig;
}): () => void {
  const { enabled, useDevicePixelRatio } = { ...DEFAULT_PLAYER_SIZE_CAP_CONFIG, ...config.playerSizeCap };

  // A zero axis is "not measurable", not a measurement of zero, so it clears the
  // whole triple — a consumer never sees a scale without a box to apply it to.
  const write = (size?: ElementSize & { scale?: number }) => {
    const measured = size && size.width > 0 && size.height > 0 ? size : undefined;
    state.playerWidth.set(measured?.width);
    state.playerHeight.set(measured?.height);
    state.playerScale.set(measured?.scale);
  };

  return effect(() => {
    const mediaElement = context.mediaElement.get();
    // Clear before (re-)observing so the previous element's measurement can't
    // stand while the new one's first observation is in flight.
    write(undefined);
    if (!enabled || !mediaElement) return;

    // No throttling: the slots compare by `Object.is`, so a resize that doesn't
    // change a value notifies nothing, and one that does costs a re-run of the
    // selection rule chain.
    return useDevicePixelRatio ? observeRenderedSize(mediaElement, write) : observeElementSize(mediaElement, write);
  });
}

/**
 * Track the rendered box of the attached media element in `playerWidth`,
 * `playerHeight`, and `playerScale`.
 *
 * @example
 * const cleanup = observePlayerSize.setup({ state, context });
 */
export const observePlayerSize = defineBehavior({
  stateKeys: ['playerWidth', 'playerHeight', 'playerScale'],
  contextKeys: ['mediaElement'],
  setup: observePlayerSizeSetup,
});
