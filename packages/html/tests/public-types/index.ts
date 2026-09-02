/**
 * Strict consumer of the emitted `@videojs/html` declarations.
 *
 * Resolves the package through its own `exports` map, so every import below lands on `dist/dev/**.d.ts` rather than
 * source. `skipLibCheck: false` makes the compiler check those declaration files themselves, which is what a strict
 * downstream project sees and what the source typecheck cannot observe.
 */
import type { PlayerStore, VideoPlayerStore } from '@videojs/html';
import {
  createPlayer,
  PlayerController,
  playerContext,
  selectPlayback,
  SliderThumbnailElement,
  ThumbnailElement,
  UIElement,
  videoFeatures,
} from '@videojs/html';
import { MuxDataElement } from '@videojs/html/extensions/mux-data';
import { createI18n, type Locale } from '@videojs/html/i18n';
import '@videojs/html/media/hls-video';
import '@videojs/html/media/mux-audio';
import '@videojs/html/media/mux-video';
import '@videojs/html/ui/play-button';
import '@videojs/html/ui/slider-thumbnail';
import '@videojs/html/ui/thumbnail';
import { PlayerController as VideoPlayerController, VideoPlayerElement, VideoSkinElement } from '@videojs/html/video';
import '@videojs/html/video/player';
import '@videojs/html/video/skin';

type Extends<A, B extends A> = B;

// createPlayer returns the element class, bound controller, and shared context.
const {
  PlayerElement,
  PlayerController: BoundController,
  playerContext: boundContext,
} = createPlayer({
  features: videoFeatures,
});

class CustomPlayerElement extends PlayerElement {}

class PlayButtonLike extends UIElement {
  readonly #playback = new BoundController(this, selectPlayback);
  readonly #generic = new PlayerController(this, playerContext, selectPlayback);

  get paused(): boolean {
    return Boolean(this.#playback.value?.paused && this.#generic.value?.paused);
  }
}

class SkinLike extends UIElement {
  readonly #player = new VideoPlayerController(this);

  get store(): VideoPlayerStore | undefined {
    return this.#player.value;
  }
}

// Preset exports keep their concrete element types.
const skin: VideoSkinElement = document.createElement('video-skin');
const player: VideoPlayerElement = document.createElement('video-player');
const hls: HTMLElementTagNameMap['hls-video'] = document.createElement('hls-video');

// The Mux entries resolve without `mux-embed`'s own types, which that package does not publish.
const muxVideo: HTMLElementTagNameMap['mux-video'] = document.createElement('mux-video');
const muxAudio: HTMLElementTagNameMap['mux-audio'] = document.createElement('mux-audio');
const muxData = new MuxDataElement();

muxData.metadata = { video_title: 'Title', view_session_id: 'session' };

// Define modules must register tag names for both the base and the derived thumbnail element.
const thumbnail: ThumbnailElement = document.createElement('media-thumbnail');
const sliderThumbnail: SliderThumbnailElement = document.createElement('media-slider-thumbnail');
const playButton = document.createElement('media-play-button');

// Relationships the declarations must preserve; a broken constraint is a compile error.
export type PublicTypeAssertions = [
  Extends<ThumbnailElement, SliderThumbnailElement>,
  Extends<typeof playerContext, typeof boundContext>,
  Extends<PlayerStore, VideoPlayerStore>,
];

const locale: Locale = 'en';
const i18n = createI18n();

void [
  CustomPlayerElement,
  PlayButtonLike,
  SkinLike,
  skin,
  player,
  hls,
  muxVideo,
  muxAudio,
  muxData,
  thumbnail,
  sliderThumbnail,
  playButton,
  locale,
  i18n,
];
