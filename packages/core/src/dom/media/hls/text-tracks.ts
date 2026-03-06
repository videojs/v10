import { listen } from '@videojs/utils/dom';
import type { Constructor } from '@videojs/utils/types';
import type { CuesParsedData, NonNativeTextTracksData } from 'hls.js';
import Hls from 'hls.js';

interface HlsEngineHost {
  readonly engine: Hls;
  attach?(target: EventTarget): void;
  detach?(): void;
}

/**
 * Bridges hls.js non-native text tracks to native `<track>` elements so the
 * rest of the player can treat them like any other text track.
 *
 * When `renderTextTracksNatively: false`, hls.js fires
 * `NON_NATIVE_TEXT_TRACKS_FOUND` with track metadata and `CUES_PARSED` with
 * VTTCues. This mixin creates `<track>` elements on the media target and
 * forwards cues into them. It also syncs user track-mode changes back to
 * hls.js via `engine.subtitleTrack`.
 */
export function HlsMediaTextTracksMixin<Base extends Constructor<HlsEngineHost>>(BaseClass: Base) {
  class HlsMediaTextTracks extends (BaseClass as Constructor<HlsEngineHost>) {
    #disconnect: AbortController | null = null;
    #target: HTMLMediaElement | null = null;

    attach(target: EventTarget): void {
      super.attach?.(target);
      this.#target = target as HTMLMediaElement;
      this.#connect();
    }

    detach(): void {
      this.#disconnect?.abort();
      this.#disconnect = null;
      this.#target = null;
      super.detach?.();
    }

    #connect(): void {
      this.#disconnect?.abort();
      this.#disconnect = new AbortController();

      const { signal } = this.#disconnect;
      const { engine } = this;
      const media = this.#target!;

      const onTracksFound = (_event: string, data: NonNativeTextTracksData) => {
        this.#clearTracks();

        for (const trackObj of data.tracks) {
          const baseTrackObj = trackObj.subtitleTrack ?? trackObj.closedCaptions;
          const idx = engine.subtitleTracks.findIndex(({ lang, name, type }) => {
            return lang === baseTrackObj?.lang && name === trackObj.label && type.toLowerCase() === trackObj.kind;
          });

          // NOTE: Undocumented method for determining identifier by hls.js. Relied on for
          // ensuring CUES_PARSED events can identify and apply cues to the appropriate track (CJP).
          // See: https://github.com/video-dev/hls.js/blob/master/src/controller/timeline-controller.ts#L640
          const id = (trackObj._id ?? trackObj.default) ? 'default' : `${trackObj.kind}${idx}`;

          addTextTrack(media, trackObj.kind as TextTrackKind, trackObj.label, baseTrackObj?.lang, id, trackObj.default);
        }
      };

      const onCuesParsed = (_event: string, { track, cues }: CuesParsedData) => {
        const textTrack = media.textTracks.getTrackById(track);
        if (!textTrack) return;

        const disabled = textTrack.mode === 'disabled';
        if (disabled) {
          textTrack.mode = 'hidden';
        }

        cues.forEach((cue: VTTCue) => {
          if (textTrack.cues?.getCueById(cue.id)) return;
          textTrack.addCue(cue);
        });

        if (disabled) {
          textTrack.mode = 'disabled';
        }
      };

      const onTextTrackChange = () => {
        if (!engine.subtitleTracks.length) return;

        const showingTrack = Array.from(media.textTracks).find((textTrack) => {
          return textTrack.id && textTrack.mode === 'showing' && ['subtitles', 'captions'].includes(textTrack.kind);
        });

        if (!showingTrack) return;

        const currentHlsTrack = engine.subtitleTracks[engine.subtitleTrack];

        // If hls.subtitleTrack is -1 or its id changed compared to the one that is showing load the new subtitle track.
        const hlsTrackId = !currentHlsTrack
          ? undefined
          : currentHlsTrack.default
            ? 'default'
            : `${engine.subtitleTracks[engine.subtitleTrack]?.type.toLowerCase()}${engine.subtitleTrack}`;

        if (engine.subtitleTrack < 0 || showingTrack?.id !== hlsTrackId) {
          const idx = engine.subtitleTracks.findIndex(({ lang, name, type, default: defaultTrack }) => {
            return (
              (showingTrack.id === 'default' && defaultTrack) ||
              (lang === showingTrack.language &&
                name === showingTrack.label &&
                type.toLowerCase() === showingTrack.kind)
            );
          });
          // After the subtitleTrack is set here, hls.js will load the playlist and CUES_PARSED events will be fired below.
          engine.subtitleTrack = idx;
        }

        if (showingTrack?.id === hlsTrackId) {
          // Refresh the cues after a texttrack mode change to fix a Chrome bug causing the captions not to render.
          if (showingTrack.cues) {
            Array.from(showingTrack.cues).forEach((cue) => {
              showingTrack.addCue(cue);
            });
          }
        }
      };

      engine.on(Hls.Events.NON_NATIVE_TEXT_TRACKS_FOUND, onTracksFound);
      engine.on(Hls.Events.CUES_PARSED, onCuesParsed);
      listen(media.textTracks, 'change', onTextTrackChange, { signal });

      signal.addEventListener(
        'abort',
        () => {
          engine.off(Hls.Events.NON_NATIVE_TEXT_TRACKS_FOUND, onTracksFound);
          engine.off(Hls.Events.CUES_PARSED, onCuesParsed);
          this.#clearTracks();
        },
        { once: true }
      );
    }

    #clearTracks(): void {
      const trackEls = this.#target!.querySelectorAll('track[data-removeondestroy]');
      trackEls.forEach((trackEl) => trackEl.remove());
    }
  }

  return HlsMediaTextTracks as unknown as Base;
}

function addTextTrack(
  mediaEl: HTMLMediaElement,
  kind: TextTrackKind,
  label: string,
  lang?: string,
  id?: string,
  defaultTrack?: boolean
): TextTrack {
  const trackEl = document.createElement('track');
  trackEl.kind = kind;
  trackEl.label = label;
  if (lang) {
    // This attribute must be present if the element's kind attribute is in the subtitles state.
    trackEl.srclang = lang;
  }
  if (id) {
    trackEl.id = id;
  }
  if (defaultTrack) {
    trackEl.default = true;
  }
  trackEl.track.mode = ['subtitles', 'captions'].includes(kind) ? 'disabled' : 'hidden';

  // Add data attribute to identify tracks that should be removed when switching sources/destroying hls.js instance.
  trackEl.setAttribute('data-removeondestroy', '');
  mediaEl.append(trackEl);

  return trackEl.track as TextTrack;
}
