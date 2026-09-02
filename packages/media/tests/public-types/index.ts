/**
 * Strict consumer of the emitted `@videojs/media` declarations.
 *
 * Resolves the package through its own `exports` map, so every import below lands on `dist/dev/**.d.ts` rather than
 * source. `skipLibCheck: false` makes the compiler check those declaration files themselves, which is what a strict
 * downstream project sees and what the source typecheck cannot observe. `@videojs/html` and `@videojs/react` build on
 * these declarations, so a leak here reaches every player.
 *
 * `dom/vimeo` and `dom/wistia` stay out: their declarations reach into `@vimeo/player` and `@wistia/wistia-player`,
 * whose published types import modules they do not ship (`timing-object`, `@wistia/type-guards`), which a strict
 * consumer sees as errors of its own.
 */
import { type MediaStreamType, MediaStreamTypes } from '@videojs/media';
import { KeySystems } from '@videojs/media/dom';
import { HTMLAudioElementHost } from '@videojs/media/dom/audio-host';
import { CloudflareMedia } from '@videojs/media/dom/cloudflare';
import { CustomMediaElement } from '@videojs/media/dom/custom-media-element';
import { DashMedia } from '@videojs/media/dom/dash';
import { GoogleCast } from '@videojs/media/dom/google-cast';
import { HlsJsMedia } from '@videojs/media/dom/hls-js';
import { HTMLMediaElementHost } from '@videojs/media/dom/media-host';
import { MediaPlayedRangesMixin } from '@videojs/media/dom/media-played-ranges';
import {
  MuxData,
  type MuxDataMetadata,
  type MuxDataProps,
  type MuxDataSdk,
  MuxMedia,
  type MuxSource,
} from '@videojs/media/dom/mux';
import { createMuxVideoURL, parseMuxVideoURL } from '@videojs/media/dom/mux/source';
import { NativeHlsMedia } from '@videojs/media/dom/native-hls';
import { ShakaMedia } from '@videojs/media/dom/shaka';
import { SpotifyMedia } from '@videojs/media/dom/spotify';
import { TikTokMedia } from '@videojs/media/dom/tiktok';
import { TwitchMedia } from '@videojs/media/dom/twitch';
import { HTMLVideoElementHost } from '@videojs/media/dom/video-host';
import { YouTubeMedia } from '@videojs/media/dom/youtube';
import { MediaTracksMixin } from '@videojs/media/media-tracks';

type Extends<A, B extends A> = B;

// Mux Data's SDK contract is implementable without `mux-embed`, which publishes no types of its own.
const sdk: MuxDataSdk = {
  monitor(target, options) {
    void [target.currentSrc, options?.data?.video_id, options?.hlsjs];
  },
  utils: { generateUUID: () => 'uuid', now: () => Date.now() },
};
const metadata: MuxDataMetadata = { video_id: 'abc123', video_title: 'Title', player_init_time: 0 };
const muxData = new MuxData({ MuxDataSdk: sdk, metadata, playerSoftwareName: 'mux-video' });

// The Mux source layer round-trips between structured sources and stream URLs.
const muxSource: MuxSource = { playbackId: 'abc123' };
const muxURL: string | undefined =
  createMuxVideoURL(muxSource) ?? parseMuxVideoURL('https://stream.mux.com/abc123.m3u8')?.playbackId;

// Relationships the declarations must preserve; a broken constraint is a compile error.
export type PublicTypeAssertions = [
  Extends<MuxDataProps['metadata'], MuxDataMetadata | undefined>,
  Extends<MediaStreamType, typeof MediaStreamTypes.LIVE>,
];

const streamType: MediaStreamType = MediaStreamTypes.LIVE;

void [
  KeySystems,
  HTMLAudioElementHost,
  CloudflareMedia,
  CustomMediaElement,
  DashMedia,
  GoogleCast,
  HlsJsMedia,
  HTMLMediaElementHost,
  MediaPlayedRangesMixin,
  MuxMedia,
  muxData,
  muxURL,
  NativeHlsMedia,
  ShakaMedia,
  SpotifyMedia,
  TikTokMedia,
  TwitchMedia,
  HTMLVideoElementHost,
  YouTubeMedia,
  MediaTracksMixin,
  streamType,
];
