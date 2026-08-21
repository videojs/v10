import {
  type AnyPlayerFeature,
  type AudioFeatures,
  type AudioPlayerStore,
  combinePlayerFeatureConfigs,
  type PlayerStore,
  type PlayerTarget,
  type VideoFeatures,
  type VideoPlayerStore,
} from '@videojs/core/dom';
import { combine, createStore } from '@videojs/store';

import type { PlayerElementConstructor } from '../store/types';
import { containerContext, mediaContext, type PlayerContext, playerContext } from './context';
import { createPlayerController, type PlayerController } from './player-controller';
import { createPlayerElement } from './player-element';

export interface CreatePlayerConfig<Features extends AnyPlayerFeature[]> {
  features: Features;
}

export interface CreatePlayerResult<Store extends PlayerStore> {
  /** Configured player element class that owns the store and attachment lifecycle. */
  PlayerElement: PlayerElementConstructor<Store>;

  /** Player controller bound to this player's context. */
  PlayerController: PlayerController.ConfiguredConstructor<Store>;

  /** Context that carries the player store to descendant elements. */
  playerContext: PlayerContext<Store>;
}

/**
 * Creates a typed HTML player class and bound controller.
 *
 * @example
 * ```ts
 * import { createPlayer, MediaElement, selectPlayback } from '@videojs/html';
 * import { videoFeatures } from '@videojs/html/video';
 *
 * const { PlayerElement: VideoPlayerElement, PlayerController } = createPlayer({
 *   features: videoFeatures,
 * });
 *
 * customElements.define('video-player', VideoPlayerElement);
 *
 * // Control element with selector
 * class PlayButton extends MediaElement {
 *   #playback = new PlayerController(this, selectPlayback);
 * }
 * ```
 *
 * @label Video
 * @param config - Player configuration with features.
 */
export function createPlayer(config: CreatePlayerConfig<VideoFeatures>): CreatePlayerResult<VideoPlayerStore>;

/**
 * Creates a typed HTML audio player class and bound controller.
 *
 * @label Audio
 * @param config - Player configuration with features.
 */
export function createPlayer(config: CreatePlayerConfig<AudioFeatures>): CreatePlayerResult<AudioPlayerStore>;

/**
 * Creates a typed HTML player class with custom features.
 *
 * @label Generic
 * @param config - Player configuration with features.
 */
export function createPlayer<const Features extends AnyPlayerFeature[]>(
  config: CreatePlayerConfig<Features>
): CreatePlayerResult<PlayerStore<Features>>;

export function createPlayer(config: CreatePlayerConfig<AnyPlayerFeature[]>): CreatePlayerResult<PlayerStore> {
  const slice = combine(...config.features);
  const featureConfig = combinePlayerFeatureConfigs(config.features);

  const ConfiguredPlayerElement = createPlayerElement<PlayerStore>({
    playerContext,
    mediaContext,
    containerContext,
    factory: () => createStore<PlayerTarget>()(slice),
    config: featureConfig,
  });

  return {
    PlayerElement: ConfiguredPlayerElement,
    PlayerController: createPlayerController(playerContext),
    playerContext,
  };
}
