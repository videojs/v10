// Adapted from muxinc/elements playback-core `text-tracks.ts` (MIT).

import { listen } from '@videojs/utils/dom';
import { isUndefined } from '@videojs/utils/predicate';
import type { Component, HTMLMediaTargetLike } from '../media-host';

/** A timed marker carrying a JSON-serializable payload. `endTime` defaults to the next cue point's start (or media duration). */
export interface CuePoint<Value = unknown> {
  time: number;
  value: Value;
  endTime?: number;
}

export interface CuePointsProps<Value = unknown> {
  label: string;
  cuePoints: CuePoint<Value>[];
}

export const DEFAULT_CUEPOINTS_TRACK_LABEL = 'cuepoints';

declare module '../media-host' {
  interface MediaComponentConfig {
    cuePoints: Partial<CuePointsProps>;
  }
}

/**
 * Stores cue points as `VTTCue`s on a hidden `metadata` text track and dispatches a
 * `cuepointchange` CustomEvent (active {@link CuePoint} as `detail`) as the playhead enters each.
 */
export class CuePoints<Value = unknown> implements CuePointsProps<Value>, Component {
  static readonly configKey = 'cuePoints';

  #label = DEFAULT_CUEPOINTS_TRACK_LABEL;
  #cuePoints: CuePoint<Value>[] = [];
  #target: HTMLVideoElement | null = null;
  #disconnect: AbortController | null = null;
  #trackDisconnect: AbortController | null = null;

  constructor(props: Partial<CuePointsProps<Value>> = {}) {
    Object.assign(this, props);
  }

  get label() {
    return this.#label;
  }

  set label(value) {
    if (this.#label === value) return;
    this.#label = value;
    void this.#setup();
  }

  get cuePoints() {
    const target = this.#target;
    if (!target) return [...this.#cuePoints];
    const track = getCuePointsTrack(target, this.#label);
    return track?.cues ? Array.from(track.cues, (cue) => toCuePoint<Value>(cue as VTTCue)) : [];
  }

  set cuePoints(value) {
    this.#cuePoints = value ?? [];
    void this.#setup();
  }

  get activeCuePoint() {
    const target = this.#target;
    if (!target) return undefined;
    const activeCues = getCuePointsTrack(target, this.#label)?.activeCues;
    if (!activeCues?.length) return undefined;
    if (activeCues.length === 1) return toCuePoint<Value>(activeCues[0] as VTTCue);
    // Chromium can leave "lingering" activeCues outside [startTime, endTime); prefer the real one.
    const { currentTime } = target;
    const active = Array.prototype.find.call(
      activeCues,
      ({ startTime, endTime }: VTTCue) => startTime <= currentTime && endTime > currentTime
    ) as VTTCue | undefined;
    return toCuePoint<Value>((active ?? activeCues[0]) as VTTCue);
  }

  attach(target: HTMLMediaTargetLike) {
    this.#target = target as unknown as HTMLVideoElement;
    this.#disconnect = new AbortController();
    // The engine clears cues on (re)load, so re-populate on each `loadstart`.
    listen(this.#target, 'loadstart', () => this.#setup(), { signal: this.#disconnect.signal });
    void this.#setup();
  }

  detach() {
    this.#trackDisconnect?.abort();
    this.#disconnect?.abort();
    this.#trackDisconnect = null;
    this.#disconnect = null;
    this.#target = null;
  }

  destroy() {
    this.detach();
  }

  /** Append cue points, keeping any already present. */
  async addCuePoints(cuePoints: CuePoint<Value>[]) {
    this.#cuePoints = [...this.#cuePoints, ...cuePoints];
    const target = this.#target;
    if (!target) return;
    const track = await this.#ensureTrack(target);
    if (!track) return;
    writeCuePoints(target, track, cuePoints);
    notifyChange(target);
  }

  async #setup() {
    const target = this.#target;
    if (!target || !this.#disconnect) return;
    // Reset per-track listeners so a re-setup doesn't leave duplicate `cuechange` handlers.
    this.#trackDisconnect?.abort();
    this.#trackDisconnect = new AbortController();
    const { signal } = this.#trackDisconnect;
    const track = await this.#ensureTrack(target);
    if (signal.aborted || !track) return;
    clearCues(track);
    writeCuePoints(target, track, this.#cuePoints);
    notifyChange(target);
    listen(
      track,
      'cuechange',
      () => {
        const detail = this.activeCuePoint;
        if (detail) target.dispatchEvent(new CustomEvent('cuepointchange', { composed: true, bubbles: true, detail }));
      },
      { signal }
    );
  }

  async #ensureTrack(target: HTMLVideoElement) {
    let track: TextTrack | null | undefined = getCuePointsTrack(target, this.#label);
    if (!track) {
      track = createCuePointsTrack(target, this.#label);
      if (!track) return null;
      // Let a freshly created track settle before adding cues, or they can vanish.
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    if (track.mode !== 'hidden') track.mode = 'hidden';
    return track;
  }
}

function getCuePointsTrack(media: HTMLMediaElement, label: string) {
  return (
    Array.from(media.querySelectorAll('track')).find((el) => el.track?.label === label && el.track?.kind === 'metadata')
      ?.track ?? undefined
  );
}

function createCuePointsTrack(media: HTMLMediaElement, label: string): TextTrack | null {
  const trackEl = document.createElement('track');
  trackEl.kind = 'metadata';
  trackEl.label = label;
  trackEl.setAttribute('data-removeondestroy', '');
  media.append(trackEl);
  // `track` may be absent in environments with incomplete DOM support (e.g. jsdom).
  const { track } = trackEl;
  if (track) track.mode = 'hidden';
  return track ?? null;
}

function clearCues(track: TextTrack) {
  if (!track.cues) return;
  for (const cue of Array.from(track.cues)) track.removeCue(cue);
}

function writeCuePoints<Value>(media: HTMLMediaElement, track: TextTrack, cuePoints: CuePoint<Value>[]) {
  // Insert latest-first so each cue can derive its endTime from the following cue.
  [...cuePoints]
    .sort((a, b) => b.time - a.time)
    .forEach((cuePoint) => {
      const text = JSON.stringify(cuePoint.value ?? null);
      if (!isUndefined(cuePoint.endTime)) {
        track.addCue(new VTTCue(cuePoint.time, cuePoint.endTime, text));
        return;
      }
      const cues = track.cues;
      const afterIndex = cues ? Array.prototype.findIndex.call(cues, (c: VTTCue) => c.startTime >= cuePoint.time) : -1;
      const after = afterIndex >= 0 ? (cues?.[afterIndex] as VTTCue | undefined) : undefined;
      const previous = afterIndex > 0 ? (cues?.[afterIndex - 1] as VTTCue | undefined) : undefined;
      if (previous) previous.endTime = cuePoint.time;
      const endTime = after?.startTime ?? (Number.isFinite(media.duration) ? media.duration : Number.MAX_SAFE_INTEGER);
      track.addCue(new VTTCue(cuePoint.time, endTime, text));
    });
}

function notifyChange(media: HTMLMediaElement) {
  // `change` doesn't fire when the cue list changes without the active cue changing.
  media.textTracks.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
}

function toCuePoint<Value>(cue: VTTCue): CuePoint<Value> {
  return { time: cue.startTime, value: JSON.parse(cue.text) as Value };
}
