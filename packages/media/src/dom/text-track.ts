import { findTrackElement, listen } from '@videojs/utils/dom';

import type { Media, MediaTextTrackCapability, TextCueLike, TextTrackKind, TextTrackLike } from '../core/types';

export type TextTrackKindFilter = TextTrackKind | readonly TextTrackKind[];

export interface CreateTextTrackOptions {
  /** The kind of timed text represented by the track. */
  kind: TextTrackKind;
  /** Human-readable track label. */
  label?: string | undefined;
  /** BCP 47 language tag. */
  language?: string | undefined;
  /** Initial track mode. Defaults to `hidden`, matching `HTMLMediaElement.addTextTrack()`. */
  mode?: TextTrackLike['mode'] | undefined;
}

export interface TextTrackHandle {
  readonly track: TextTrackLike;
  destroy(): void;
}

/**
 * Create a removable native text track on a media element.
 *
 * @param media - Media element that will own the track.
 * @param options - Track metadata and initial mode.
 */
export function createTextTrack(
  media: MediaTextTrackCapability,
  options: CreateTextTrackOptions
): TextTrackHandle | null {
  const element = isNativeMediaElement(media)
    ? createTextTrackElement(media, options.kind, options.label, options.language)
    : null;
  const track = element ? element.track : media.addTextTrack(options.kind, options.label, options.language);

  if (!track) {
    element?.remove();
    return null;
  }

  track.mode = options.mode ?? 'hidden';

  let destroyed = false;

  return {
    track,
    destroy() {
      if (destroyed) return;

      destroyed = true;
      track.mode = 'disabled';

      if (element) element.remove();
      else media.removeTextTrack?.(track);
    },
  };
}

/** Create the `<track>` backing a programmatically managed native text track. */
export function createTextTrackElement(
  media: HTMLMediaElement,
  kind: TextTrackKind,
  label?: string,
  language?: string
): HTMLTrackElement {
  const element = media.ownerDocument.createElement('track');

  element.kind = kind;
  element.label = label ?? '';
  element.srclang = language ?? '';
  media.append(element);

  return element;
}

/** Return the first enabled text track matching the requested kind. */
export function getActiveTextTrack(media: MediaTextTrackCapability, kind: TextTrackKindFilter): TextTrackLike | null {
  const kinds = Array.isArray(kind) ? kind : [kind];
  const matches = Array.from(media.textTracks).filter((track) => kinds.some((kind) => kind === track.kind));

  return matches.find((track) => track.mode === 'showing') ?? matches.find((track) => track.mode === 'hidden') ?? null;
}

/**
 * Observe the enabled text track matching the requested kind.
 *
 * Native `hidden` tracks are active: their cues load and update without being rendered. This is the normal mode for
 * chapters and metadata tracks.
 */
export function watchActiveTextTrack(
  media: MediaTextTrackCapability,
  kind: TextTrackKindFilter,
  onChange: (track: TextTrackLike | null) => void
): () => void {
  let current: TextTrackLike | null | undefined;

  const sync = () => {
    const next = getActiveTextTrack(media, kind);
    if (next === current) return;

    current = next;
    onChange(next);
  };

  sync();
  media.textTracks.addEventListener('addtrack', sync);
  media.textTracks.addEventListener('removetrack', sync);
  media.textTracks.addEventListener('change', sync);

  return () => {
    media.textTracks.removeEventListener('addtrack', sync);
    media.textTracks.removeEventListener('removetrack', sync);
    media.textTracks.removeEventListener('change', sync);
  };
}

/** Read either all cues or the currently active cues from a text track. */
export function getTextTrackCues(track: TextTrackLike | null, active = false): TextCueLike[] {
  const cues = active ? track?.activeCues : track?.cues;

  return cues ? Array.from(cues) : [];
}

/**
 * Observe cue snapshots for a text track.
 *
 * @param media - Media element that owns the track, used to observe source and `<track>` load events.
 * @param track - Text track to observe.
 * @param active - Whether to observe active cues instead of the complete cue list.
 * @param onChange - Receives a fresh cue array whenever the observable native state changes.
 */
export function watchTextTrackCues(
  media: Media | null,
  track: TextTrackLike,
  active: boolean,
  onChange: (cues: TextCueLike[]) => void
): () => void {
  const cleanups: (() => void)[] = [];
  const sync = () => onChange(getTextTrackCues(track, active));

  if (track instanceof EventTarget) cleanups.push(listen(track, 'cuechange', sync));

  if (media instanceof EventTarget) {
    const trackElement = findTrackElement(media, track);

    if (trackElement) cleanups.push(listen(trackElement, 'load', sync));

    cleanups.push(listen(media, 'loadstart', sync));
  }

  sync();

  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}

function isNativeMediaElement(media: MediaTextTrackCapability): media is MediaTextTrackCapability & HTMLMediaElement {
  const MediaElement = globalThis.HTMLMediaElement;

  return Boolean(MediaElement && media instanceof MediaElement);
}
