import { isCaptionOrSubtitleTrack, listen } from '@videojs/utils/dom';
import type { CuesParsedData, NonNativeTextTracksData } from 'hls.js';
import Hls from 'hls.js';
import { defineExtension } from '../../../core/media/media-extension';
import type { HTMLVideoElementHost } from '../html-video-element-host';

/**
 * Bridges hls.js non-native text tracks to native `<track>` elements so the
 * rest of the player can treat them like any other text track.
 *
 * When `renderTextTracksNatively: false`, hls.js fires
 * `NON_NATIVE_TEXT_TRACKS_FOUND` with track metadata and `CUES_PARSED` with
 * VTTCues. This extension creates `<track>` elements on the media target and
 * forwards cues into them. It also syncs user track-mode changes back to
 * hls.js via `engine.subtitleTrack`.
 *
 * @example hlsJsTextTracks().install(media);
 */
export class HlsJsTextTracks {
  readonly name = 'hls-js-text-tracks';

  install(media: HTMLVideoElementHost<Hls>) {
    const { engine } = media;
    if (!engine) return;

    let sessionAbort: AbortController | null = null;

    const init = () => {
      sessionAbort?.abort();
      sessionAbort = new AbortController();

      const target = media.target;
      if (!target) return;

      const { signal } = sessionAbort;

      const onTracksFound = (_event: string, data: NonNativeTextTracksData) => {
        clearTracks(target);

        for (const trackObj of data.tracks) {
          const baseTrackObj = trackObj.subtitleTrack ?? trackObj.closedCaptions;
          const idx = engine.subtitleTracks.findIndex(({ lang, name, type }) => {
            return lang === baseTrackObj?.lang && name === trackObj.label && type.toLowerCase() === trackObj.kind;
          });

          // NOTE: Undocumented method for determining identifier by hls.js. Relied on for
          // ensuring CUES_PARSED events can identify and apply cues to the appropriate track (CJP).
          // See: https://github.com/video-dev/hls.js/blob/master/src/controller/timeline-controller.ts#L640
          const id = (trackObj._id ?? trackObj.default) ? 'default' : `${trackObj.kind}${idx}`;

          addTextTrack(
            target,
            trackObj.kind as TextTrackKind,
            trackObj.label,
            baseTrackObj?.lang,
            id,
            trackObj.default
          );
        }
      };

      const onCuesParsed = (_event: string, { track, cues }: CuesParsedData) => {
        const textTrack = target.textTracks.getTrackById(track);
        if (!textTrack) return;

        const disabled = textTrack.mode === 'disabled';
        if (disabled) textTrack.mode = 'hidden';

        cues.forEach((cue: VTTCue) => {
          if (textTrack.cues?.getCueById(cue.id)) return;
          textTrack.addCue(cue);
        });

        if (disabled) textTrack.mode = 'disabled';
      };

      const onTextTrackChange = () => {
        if (!engine.subtitleTracks.length) return;

        const showingTrack = Array.from(target.textTracks).find((textTrack) => {
          return textTrack.id && textTrack.mode === 'showing' && isCaptionOrSubtitleTrack(textTrack);
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

        if (showingTrack?.id === hlsTrackId && showingTrack.cues) {
          // Refresh the cues after a texttrack mode change to fix a Chrome bug causing the captions not to render.
          Array.from(showingTrack.cues).forEach((cue) => showingTrack.addCue(cue));
        }
      };

      engine.on(Hls.Events.NON_NATIVE_TEXT_TRACKS_FOUND, onTracksFound);
      engine.on(Hls.Events.CUES_PARSED, onCuesParsed);
      listen(target.textTracks, 'change', onTextTrackChange, { signal });

      signal.addEventListener(
        'abort',
        () => {
          engine.off(Hls.Events.NON_NATIVE_TEXT_TRACKS_FOUND, onTracksFound);
          engine.off(Hls.Events.CUES_PARSED, onCuesParsed);
          clearTracks(target);
        },
        { once: true }
      );
    };

    const reset = () => {
      sessionAbort?.abort();
      sessionAbort = null;
    };

    engine.on(Hls.Events.MANIFEST_LOADING, init);
    engine.on(Hls.Events.MEDIA_ATTACHED, init);
    engine.on(Hls.Events.MEDIA_DETACHED, reset);
    engine.on(Hls.Events.DESTROYING, reset);

    return () => {
      reset();
      engine.off(Hls.Events.MANIFEST_LOADING, init);
      engine.off(Hls.Events.MEDIA_ATTACHED, init);
      engine.off(Hls.Events.MEDIA_DETACHED, reset);
      engine.off(Hls.Events.DESTROYING, reset);
    };
  }
}

export const hlsJsTextTracks = defineExtension<void, HTMLVideoElementHost<Hls>, HlsJsTextTracks>(
  () => new HlsJsTextTracks()
);

function clearTracks(target: HTMLMediaElement) {
  const trackEls = target.querySelectorAll('track[data-removeondestroy]');
  trackEls.forEach((trackEl) => trackEl.remove());
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
  // This attribute must be present if the element's kind attribute is in the subtitles state.
  if (lang) trackEl.srclang = lang;
  if (id) trackEl.id = id;
  if (defaultTrack) trackEl.default = true;
  trackEl.track.mode = isCaptionOrSubtitleTrack({ kind }) ? 'disabled' : 'hidden';

  // Identify tracks that should be removed when switching sources / destroying the hls.js instance.
  trackEl.setAttribute('data-removeondestroy', '');
  mediaEl.append(trackEl);

  return trackEl.track as TextTrack;
}
