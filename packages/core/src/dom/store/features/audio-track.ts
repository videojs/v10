import { listen } from '@videojs/utils/dom';
import { isMediaAudioTrackCapable } from '../../../core/media/predicate';
import type { MediaAudioTrack, MediaAudioTrackState } from '../../../core/media/state';
import type { AudioTrackLike, AudioTrackListLike } from '../../../core/media/types';
import { definePlayerFeature } from '../../feature';

function getTrackValue(track: AudioTrackLike, index: number): string {
  return track.id || String(index);
}

function toMediaTrack(track: AudioTrackLike): MediaAudioTrack {
  return {
    ...(track.id !== undefined && { id: track.id }),
    ...(track.kind !== undefined && { kind: track.kind }),
    label: track.label,
    language: track.language,
    enabled: track.enabled,
  };
}

export const audioTrackFeature = definePlayerFeature({
  name: 'audioTrack',
  state: ({ target }): MediaAudioTrackState => ({
    audioTrackList: [],
    selectAudioTrack(value: string) {
      const { media } = target();
      if (!isMediaAudioTrackCapable(media)) return;

      const tracks = [...media.audioTracks];
      const track = tracks.find((candidate, index) => getTrackValue(candidate, index) === value);
      if (!track) return;

      for (const candidate of tracks) {
        candidate.enabled = candidate === track;
      }
    },
  }),

  attach({ target, signal, set }) {
    const { media } = target;
    let audioTracks: AudioTrackListLike | null = null;
    let cleanup: AbortController | null = null;

    const getAudioTracks = () => (isMediaAudioTrackCapable(media) ? media.audioTracks : null);
    const sync = (list = getAudioTracks()) => {
      set({ audioTrackList: list ? [...list].map(toMediaTrack) : [] });
    };

    const bind = () => {
      const nextAudioTracks = getAudioTracks();

      if (nextAudioTracks === audioTracks) {
        sync(nextAudioTracks);
        return;
      }

      cleanup?.abort();
      cleanup = new AbortController();
      audioTracks = nextAudioTracks;

      if (audioTracks) {
        listen(audioTracks, 'addtrack', () => sync(audioTracks), { signal: cleanup.signal });
        listen(audioTracks, 'removetrack', () => sync(audioTracks), { signal: cleanup.signal });
        listen(audioTracks, 'change', () => sync(audioTracks), { signal: cleanup.signal });
      }

      sync(audioTracks);
    };

    bind();

    listen(media, 'loadstart', bind, { signal });
    signal.addEventListener('abort', () => cleanup?.abort(), { once: true });
  },
});
