/**
 * **Player-size measurement.** Mirrors the rendered box of the attached media
 * element into `state.playerWidth` / `playerHeight` (CSS pixels) and
 * `state.playerScale` (`devicePixelRatio`), over `@videojs/utils/dom`'s
 * `observeRenderedSize`. Measurement is the whole job — the policy built on it is
 * `track-switching`'s `capToPlayerSize` rule, which is what decides whether the
 * scale applies.
 */
import { defineBehavior } from '../../../core/composition/create-composition';
import { effect } from '../../../core/signals/effect';
import type { ReadonlySignal, Signal } from '../../../core/signals/primitives';
import { observeRenderedSize, type RenderedSize } from '../../../media/dom/element-size';
import { DEFAULT_PLAYER_SIZE_CAP_CONFIG, type PlayerSizeCapConfig } from '../track-switching';

export interface PlayerSizeState {
  /** Rendered width of the media element, in CSS pixels. */
  playerWidth?: number;
  /** Rendered height of the media element, in CSS pixels. */
  playerHeight?: number;
  /** `devicePixelRatio` at measurement time — CSS pixels × scale per axis. */
  playerScale?: number;
}

export interface PlayerSizeContext {
  mediaElement?: HTMLMediaElement | undefined;
}

export interface ObservePlayerSizeConfig {
  /** Player-size cap policy; only `enabled` is read here. */
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
  const { enabled } = { ...DEFAULT_PLAYER_SIZE_CAP_CONFIG, ...config.playerSizeCap };

  // A zero axis is "not measurable", not a measurement of zero, so it clears the
  // whole triple — a consumer never sees a scale without a box to apply it to.
  const write = (size?: RenderedSize) => {
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
    return observeRenderedSize(mediaElement, write);
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
