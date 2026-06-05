import type { Constructor } from '@videojs/utils/types';
import Hls from 'hls.js';
import type {
  MediaAudioTrackCapability,
  MediaVideoRenditionCapability,
  MediaVideoTrackCapability,
  VideoTrackLike,
} from '../../../core/media/types';
import type { HlsEngineHost } from './types';

type MediaTracksHost = HlsEngineHost &
  MediaVideoTrackCapability &
  MediaAudioTrackCapability &
  MediaVideoRenditionCapability;

type HlsJsMediaTrackLevel = {
  url: string[];
  width?: number | undefined;
  height?: number | undefined;
  videoCodec?: string | undefined;
  bitrate?: number | undefined;
};

type HlsJsMediaAudioTrack = {
  id: number;
  default?: boolean | undefined;
  name?: string | undefined;
  lang?: string | undefined;
};

/**
 * Mirrors hls.js manifest levels and alternate audio into the media element's
 * `videoRenditions` / `audioTracks` lists, and wires user selection back to
 * `engine.nextLevel` and `engine.audioTrack`.
 *
 * Requires the media-tracks mixin (track-list infrastructure) to be applied
 * earlier in the chain so the host exposes `addVideoTrack`, `videoRenditions`,
 * and friends.
 */
export function HlsJsMediaMediaTracksMixin<Base extends Constructor<MediaTracksHost>>(BaseClass: Base) {
  class HlsJsMediaMediaTracks extends (BaseClass as Constructor<MediaTracksHost>) {
    #levelIdMap = new WeakMap<HlsJsMediaTrackLevel, string>();
    #currentVideoTrack: VideoTrackLike | null = null;

    constructor(...args: any[]) {
      super(...args);

      const { engine } = this;
      if (!engine) return;

      engine.on(Hls.Events.MANIFEST_PARSED, this.#onManifestParsed);
      engine.on(Hls.Events.AUDIO_TRACKS_UPDATED, this.#onAudioTracksUpdated);
      engine.on(Hls.Events.LEVELS_UPDATED, this.#onLevelsUpdated);
      engine.once(Hls.Events.DESTROYING, this.#teardown);

      this.audioTracks.addEventListener('change', this.#switchAudioTrack);
      this.videoRenditions.addEventListener('change', this.#switchRendition);
    }

    #onManifestParsed = (_event: string, data: { levels: HlsJsMediaTrackLevel[] }) => {
      this.#removeAllMediaTracks();

      const videoTrack = this.addVideoTrack('main');
      this.#currentVideoTrack = videoTrack;
      videoTrack.selected = true;

      for (const [id, level] of data.levels.entries()) {
        const rendition = videoTrack.addRendition(
          level.url[0] ?? '',
          level.width,
          level.height,
          level.videoCodec,
          level.bitrate
        );

        this.#levelIdMap.set(level, `${id}`);
        rendition.id = `${id}`;
      }
    };

    #onAudioTracksUpdated = (_event: string, data: { audioTracks: HlsJsMediaAudioTrack[] }) => {
      this.#removeAudioTracks();

      for (const hlsAudioTrack of data.audioTracks) {
        const kind = hlsAudioTrack.default ? 'main' : 'alternative';
        const audioTrack = this.addAudioTrack(kind, hlsAudioTrack.name, hlsAudioTrack.lang);
        audioTrack.id = `${hlsAudioTrack.id}`;
        audioTrack.enabled = Boolean(hlsAudioTrack.default);
      }
    };

    #switchAudioTrack = () => {
      const { engine } = this;
      if (!engine) return;

      const selectedTrackId = [...this.audioTracks].find((track) => track.enabled)?.id;
      if (!selectedTrackId) return;

      const audioTrackId = Number(selectedTrackId);
      const availableIds = engine.audioTracks.map((track) => track.id);

      if (audioTrackId !== engine.audioTrack && availableIds.includes(audioTrackId)) {
        engine.audioTrack = audioTrackId;
      }
    };

    #onLevelsUpdated = (_event: string, data: { levels: HlsJsMediaTrackLevel[] }) => {
      if (!this.#currentVideoTrack) return;

      const levelIds = data.levels.map((level) => this.#levelIdMap.get(level));

      for (const rendition of this.videoRenditions) {
        if (rendition.id && !levelIds.includes(rendition.id)) {
          this.#currentVideoTrack.removeRendition(rendition);
        }
      }
    };

    #switchRendition = () => {
      const { engine } = this;
      if (!engine) return;

      const level = this.videoRenditions.selectedIndex;
      if (level !== engine.nextLevel) engine.nextLevel = level;
    };

    #teardown = () => {
      const { engine } = this;

      engine?.off(Hls.Events.MANIFEST_PARSED, this.#onManifestParsed);
      engine?.off(Hls.Events.AUDIO_TRACKS_UPDATED, this.#onAudioTracksUpdated);
      engine?.off(Hls.Events.LEVELS_UPDATED, this.#onLevelsUpdated);
      engine?.off(Hls.Events.DESTROYING, this.#teardown);

      this.audioTracks.removeEventListener('change', this.#switchAudioTrack);
      this.videoRenditions.removeEventListener('change', this.#switchRendition);

      this.#removeAllMediaTracks();
      this.#currentVideoTrack = null;
    };

    #removeAllMediaTracks() {
      this.#removeVideoTracks();
      this.#removeAudioTracks();
    }

    #removeVideoTracks() {
      for (const videoTrack of this.videoTracks) {
        this.removeVideoTrack(videoTrack);
      }
    }

    #removeAudioTracks() {
      for (const audioTrack of this.audioTracks) {
        this.removeAudioTrack(audioTrack);
      }
    }
  }

  return HlsJsMediaMediaTracks as unknown as Base;
}
