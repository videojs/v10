import { findTrackElement, listen } from '@videojs/utils/dom';
import { noop } from '@videojs/utils/function';

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
  /** Add a cue and notify cue observers. Waits for the backing `<track>` to finish loading when there is one. */
  addCue(cue: TextCueLike): void;
  /** Remove a cue and notify cue observers. Drops the cue if it is still waiting to be added. */
  removeCue(cue: TextCueLike): void;
  /** Disable the track and remove it from the media. Safe to call more than once. */
  destroy(): void;
}

const cueListeners = new WeakMap<TextTrackLike, Set<() => void>>();

/**
 * Create a removable native text track on a media element.
 *
 * Element-backed tracks start loading as soon as they leave `disabled` mode, and browsers discard every cue added
 * before that load settles. The returned handle queues `addCue()` and `removeCue()` until the backing `<track>` reports
 * `load` or `error`, so callers can write cues immediately.
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

  // Wrapped media create the backing element for us; find it so cue writes wait for its load as well.
  const backing = element ?? (media instanceof EventTarget ? findTrackElement(media, track) : null);
  const mode = options.mode ?? 'hidden';
  const writer = createDeferredCueWriter(track, backing);

  // Leaving `disabled` starts the element load. Apply a requested `disabled` mode once that load has settled so the
  // track does not stay unloaded and wipe cues on a later mode change.
  track.mode = 'hidden';

  if (mode !== 'disabled') track.mode = mode;
  else writer.whenSettled(() => (track.mode = 'disabled'));

  let destroyed = false;

  return {
    track,
    addCue: writer.addCue,
    removeCue: writer.removeCue,
    destroy() {
      if (destroyed) return;

      destroyed = true;
      writer.dispose();
      track.mode = 'disabled';

      if (element) element.remove();
      else media.removeTextTrack?.(track);
    },
  };
}

interface DeferredCueWriter {
  addCue(cue: TextCueLike): void;
  removeCue(cue: TextCueLike): void;
  whenSettled(callback: () => void): void;
  dispose(): void;
}

const TRACK_READY_STATE_LOADED = 2;

function createDeferredCueWriter(track: TextTrackLike, element: HTMLTrackElement | null): DeferredCueWriter {
  const pending: TextCueLike[] = [];
  const callbacks: (() => void)[] = [];
  let settled = !element || element.readyState >= TRACK_READY_STATE_LOADED;
  let stop = noop;

  const settle = () => {
    stop();
    stop = noop;
    settled = true;

    for (const cue of pending.splice(0)) addTextTrackCue(track, cue);

    for (const callback of callbacks.splice(0)) callback();
  };

  if (!settled && element) {
    const stopLoad = listen(element, 'load', settle);
    const stopError = listen(element, 'error', settle);

    stop = () => {
      stopLoad();
      stopError();
    };
  }

  return {
    addCue(cue) {
      if (settled) addTextTrackCue(track, cue);
      else pending.push(cue);
    },
    removeCue(cue) {
      const index = pending.indexOf(cue);

      if (index >= 0) pending.splice(index, 1);
      else removeTextTrackCue(track, cue);
    },
    whenSettled(callback) {
      if (settled) callback();
      else callbacks.push(callback);
    },
    dispose() {
      stop();
      stop = noop;
      pending.length = 0;
      callbacks.length = 0;
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

/**
 * Add a cue to a text track and notify `watchTextTrackCues` observers.
 *
 * Native `TextTrack.addCue()` fires no event, so observers only learn about programmatic cue changes made through this
 * helper or a `TextTrackHandle`.
 */
export function addTextTrackCue(track: TextTrackLike, cue: TextCueLike): void {
  track.addCue?.(cue);
  notifyCueListeners(track);
}

/** Remove a cue from a text track and notify `watchTextTrackCues` observers. */
export function removeTextTrackCue(track: TextTrackLike, cue: TextCueLike): void {
  track.removeCue?.(cue);
  notifyCueListeners(track);
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
 * Snapshots refresh on native `cuechange`, when the backing `<track>` loads, when the media starts loading a new
 * source, and after cues are added or removed through `addTextTrackCue()`, `removeTextTrackCue()`, or a
 * `TextTrackHandle`.
 *
 * @param media - Media element that owns the track, used to observe source and `<track>` load events.
 * @param track - Text track to observe.
 * @param active - Whether to observe active cues instead of the complete cue list.
 * @param onChange - Receives a fresh cue array whenever the observable state changes.
 */
export function watchTextTrackCues(
  media: Media | null,
  track: TextTrackLike,
  active: boolean,
  onChange: (cues: TextCueLike[]) => void
): () => void {
  const cleanups: (() => void)[] = [];
  const sync = () => onChange(getTextTrackCues(track, active));

  cleanups.push(listenCueChanges(track, sync));

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

function listenCueChanges(track: TextTrackLike, listener: () => void): () => void {
  let listeners = cueListeners.get(track);

  if (!listeners) {
    listeners = new Set();
    cueListeners.set(track, listeners);
  }

  listeners.add(listener);

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) cueListeners.delete(track);
  };
}

function notifyCueListeners(track: TextTrackLike): void {
  const listeners = cueListeners.get(track);
  if (!listeners) return;

  for (const listener of [...listeners]) listener();
}

function isNativeMediaElement(media: MediaTextTrackCapability): media is MediaTextTrackCapability & HTMLMediaElement {
  const MediaElement = globalThis.HTMLMediaElement;

  return Boolean(MediaElement && media instanceof MediaElement);
}
