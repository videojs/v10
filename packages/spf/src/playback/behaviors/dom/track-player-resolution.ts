/**
 * Mirror the player element's rendered pixel dimensions into reactive state, so
 * a rendition cap can narrow candidates to what the element can actually show
 * without reading the DOM at pick time — which would make the picker impure, and
 * would never re-pick when the element resized.
 *
 * The player-element half of the caps in
 * `internal/design/spf/features/rendition-selection-caps.md`, and the tighter
 * half: a small embed on a large display is capped by its own box rather than by
 * the screen behind it (`trackScreenResolution`).
 *
 * Reported as a width and a height in device pixels — the same units, and for the
 * same reason, as `media/dom/screen`'s reading: the cap compares against real
 * track dimensions, and a `"720p"`-style tier only describes a track once you
 * assume its aspect ratio.
 *
 * `undefined` where there is nothing to measure — no element attached, or one
 * that isn't being rendered (detached, `display: none`, not yet laid out) — which
 * is the value the cap reads as "don't cap".
 */

import { type ElementSize, observeElementSize, observeRenderedSize } from '@videojs/utils/dom';
import { shallowEqual } from '@videojs/utils/object';
import { defineBehavior } from '../../../core/composition/create-composition';
import { effect } from '../../../core/signals/effect';
import type { ReadonlySignal, Signal } from '../../../core/signals/primitives';

/** A player element's rendered pixel dimensions. */
export interface PlayerResolution {
  readonly width: number;
  readonly height: number;
}

export interface PlayerResolutionState {
  playerResolution?: PlayerResolution;
}

export interface PlayerResolutionContext {
  mediaElement?: HTMLMediaElement | undefined;
}

export interface TrackPlayerResolutionConfig {
  /**
   * Whether to cap renditions to the player's rendered size at all. `false`
   * measures nothing, which leaves `state.playerResolution` unset and the cap
   * inert. Defaults to `true`.
   *
   * Named for the policy rather than the measurement because it is the public
   * switch for the feature — the same one hls.js spells `capLevelToPlayerSize`
   * and the Mux Video element spells `cap-rendition-to-player-size`.
   */
  capRenditionToPlayerSize?: boolean;
  /**
   * Whether the reading is scaled into device pixels. Defaults to `true` — see
   * `ScreenResolutionOptions.useDevicePixelRatio` in `media/dom/screen.ts`,
   * including its note on page zoom being folded into the ratio outside WebKit.
   */
  useDevicePixelRatio?: boolean;
}

/**
 * Project an observed CSS box into device pixels, or `undefined` when there is no
 * measurement in it.
 *
 * Rounded because device pixels are whole and a fractional ratio doesn't divide a
 * box evenly, the same as `getScreenResolution`. A zero axis is "not measurable"
 * rather than a measurement of zero: an element that isn't being rendered reports
 * a `0 × 0` box, and capping to an area of zero would pin every source to its
 * smallest rendition.
 */
function toPlayerResolution(size: ElementSize & { scale?: number }): PlayerResolution | undefined {
  const scale = size.scale ?? 1;
  const width = Math.round(size.width * scale);
  const height = Math.round(size.height * scale);

  return width > 0 && height > 0 ? { width, height } : undefined;
}

function trackPlayerResolutionSetup({
  state,
  context,
  config = {},
}: {
  state: { playerResolution: Signal<PlayerResolutionState['playerResolution']> };
  context: { mediaElement: ReadonlySignal<PlayerResolutionContext['mediaElement']> };
  config?: TrackPlayerResolutionConfig;
}): () => void {
  const { capRenditionToPlayerSize = true, useDevicePixelRatio = true } = config;

  return effect(() => {
    const mediaElement = context.mediaElement.get();
    // Clear before (re-)observing so the previous element's measurement can't
    // stand while the new one's first observation is in flight.
    let current: PlayerResolution | undefined;
    state.playerResolution.set(current);
    if (!capRenditionToPlayerSize || !mediaElement) return;

    // Compared rather than written straight through, since the slot holds an
    // object and would otherwise notify on identity alone: a resize that rounds
    // to the same device pixels is not a change worth re-running selection for.
    // Same reason `watchScreenResolution` compares its readings.
    const write = (size: ElementSize & { scale?: number }) => {
      const next = toPlayerResolution(size);
      if (shallowEqual(current, next)) return;

      current = next;
      state.playerResolution.set(next);
    };

    return useDevicePixelRatio ? observeRenderedSize(mediaElement, write) : observeElementSize(mediaElement, write);
  });
}

/**
 * Track the player element's rendered resolution in `state.playerResolution`.
 *
 * @example
 * const cleanup = trackPlayerResolution.setup({ state, context });
 */
export const trackPlayerResolution = defineBehavior({
  stateKeys: ['playerResolution'],
  contextKeys: ['mediaElement'],
  setup: trackPlayerResolutionSetup,
});
