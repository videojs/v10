import HlsJs from 'hls.js';
import { installExtension, type MediaExtension } from '../../../core/media/media-extension';
import type { VideoTrackLike } from '../../../core/media/types';
import type { HTMLVideoElementHost } from '../html-video-element-host';

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

export class HlsJsMediaTracks implements MediaExtension {
  #destroy: (() => void) | null = null;
  readonly name = 'hls-js-media-tracks';

  install(media: HTMLVideoElementHost<HlsJs>) {
    const { engine } = media;
    if (!engine) return;

    const uninstall = installExtension(hlsJsMediaTracks, media, this);

    const levelIdMap = new WeakMap<HlsJsMediaTrackLevel, string>();
    let currentVideoTrack: VideoTrackLike | null = null;

    const onManifestParsed = (_event: string, data: { levels: HlsJsMediaTrackLevel[] }) => {
      removeAllMediaTracks(media);

      const videoTrack = media.addVideoTrack('main');
      currentVideoTrack = videoTrack;
      videoTrack.selected = true;

      for (const [id, level] of data.levels.entries()) {
        const rendition = videoTrack.addRendition(
          level.url[0] ?? '',
          level.width,
          level.height,
          level.videoCodec,
          level.bitrate
        );

        levelIdMap.set(level, `${id}`);
        rendition.id = `${id}`;
      }
    };

    const onAudioTracksUpdated = (_event: string, data: { audioTracks: HlsJsMediaAudioTrack[] }) => {
      removeAudioTracks(media);

      for (const hlsAudioTrack of data.audioTracks) {
        const kind = hlsAudioTrack.default ? 'main' : 'alternative';
        const audioTrack = media.addAudioTrack(kind, hlsAudioTrack.name, hlsAudioTrack.lang);
        audioTrack.id = `${hlsAudioTrack.id}`;
        audioTrack.enabled = Boolean(hlsAudioTrack.default);
      }
    };

    const switchAudioTrack = () => {
      const selectedTrackId = [...media.audioTracks].find((track) => track.enabled)?.id;
      if (!selectedTrackId) return;

      const audioTrackId = Number(selectedTrackId);
      const availableIds = engine.audioTracks.map((track) => track.id);

      if (audioTrackId !== engine.audioTrack && availableIds.includes(audioTrackId)) {
        engine.audioTrack = audioTrackId;
      }
    };

    const onLevelsUpdated = (_event: string, data: { levels: HlsJsMediaTrackLevel[] }) => {
      if (!currentVideoTrack) return;

      const levelIds = data.levels.map((level) => levelIdMap.get(level));

      for (const rendition of media.videoRenditions) {
        if (rendition.id && !levelIds.includes(rendition.id)) {
          currentVideoTrack.removeRendition(rendition);
        }
      }
    };

    const switchRendition = () => {
      const level = media.videoRenditions.selectedIndex;
      if (level !== engine.nextLevel) engine.nextLevel = level;
    };

    const onDestroying = () => {
      removeAllMediaTracks(media);
      media.audioTracks.removeEventListener('change', switchAudioTrack);
      media.videoRenditions.removeEventListener('change', switchRendition);
    };

    engine.on(HlsJs.Events.MANIFEST_PARSED, onManifestParsed);
    engine.on(HlsJs.Events.AUDIO_TRACKS_UPDATED, onAudioTracksUpdated);
    engine.on(HlsJs.Events.LEVELS_UPDATED, onLevelsUpdated);
    engine.once(HlsJs.Events.DESTROYING, onDestroying);
    media.audioTracks.addEventListener('change', switchAudioTrack);
    media.videoRenditions.addEventListener('change', switchRendition);

    this.#destroy = () => {
      uninstall();
      onDestroying();
      engine.off(HlsJs.Events.MANIFEST_PARSED, onManifestParsed);
      engine.off(HlsJs.Events.AUDIO_TRACKS_UPDATED, onAudioTracksUpdated);
      engine.off(HlsJs.Events.LEVELS_UPDATED, onLevelsUpdated);
      engine.off(HlsJs.Events.DESTROYING, onDestroying);
    };
  }

  destroy() {
    this.#destroy?.();
    this.#destroy = null;
  }
}

export function hlsJsMediaTracks() {
  return new HlsJsMediaTracks();
}

function removeAllMediaTracks(media: HTMLVideoElementHost<HlsJs>) {
  removeVideoTracks(media);
  removeAudioTracks(media);
}

function removeVideoTracks(media: HTMLVideoElementHost<HlsJs>) {
  for (const videoTrack of media.videoTracks) {
    media.removeVideoTrack(videoTrack);
  }
}

function removeAudioTracks(media: HTMLVideoElementHost<HlsJs>) {
  for (const audioTrack of media.audioTracks) {
    media.removeAudioTrack(audioTrack);
  }
}
