import { deepEqual } from '@videojs/utils/object';
import * as dashjs from 'dashjs';
import { resolveSourceObject } from '../../core/media-source';
import { MediaTracksMixin } from '../../core/media-tracks';
import type { MediaEngineHost, MediaSourceObject } from '../../core/types';
import { HTMLVideoElementHost } from '../video-host';

/**
 * Structured DASH source: the MPD URL in `src`, dash.js's own settings in
 * `engine`. Replacing `engine` resets any previously applied settings.
 */
export interface DashSource extends MediaSourceObject<dashjs.MediaPlayerSettingClass> {}

export interface DashMediaProps {
  src: string;
  source: DashSource | null;
}

export const dashMediaDefaultProps: DashMediaProps = {
  src: '',
  source: null,
};

const DashMediaBase = MediaTracksMixin(HTMLVideoElementHost);

/**
 * @fires sourcechange - Fired when `source` changes, either directly or by resolving a new `src`. Read `source` for the new value.
 */
export class DashMedia
  extends DashMediaBase
  implements MediaEngineHost<dashjs.MediaPlayerClass, HTMLVideoElement>, DashMediaProps
{
  #engine: dashjs.MediaPlayerClass;
  #src = dashMediaDefaultProps.src;
  #source: DashSource | null = dashMediaDefaultProps.source;

  constructor() {
    super();
    this.#engine = dashjs.MediaPlayer().create();
    this.#engine.initialize(undefined, undefined, false);
  }

  attach(target: HTMLVideoElement) {
    super.attach(target);
    this.#engine.attachView(target);
  }

  detach() {
    super.detach();
    // dash.js types don't reflect null support, but null is valid for detaching
    this.#engine.attachView(null as unknown as HTMLVideoElement);
  }

  destroy() {
    this.detach();
    this.#engine.destroy();
    super.destroy();
  }

  /**
   * Underlying playback engine — the dash.js `MediaPlayerClass` instance. An
   * advanced escape hatch for direct engine access; normal playback is driven
   * through this element's own properties and methods.
   */
  get engine() {
    return this.#engine;
  }

  get src() {
    return this.#src;
  }

  /** MPD URL. Setting it re-derives `source`, carrying over its options. */
  set src(value) {
    const source = resolveSourceObject<DashSource>(value, this.#source);
    const changed = !deepEqual(this.#source, source);
    this.#src = value;
    this.#source = source;
    this.#engine.attachSource(value);
    if (changed) this.dispatchEvent(new Event('sourcechange'));
  }

  /**
   * Structured source: the MPD URL in `src`, plus dash.js settings in `engine`.
   * Replacing it re-derives `src`; assigning an equivalent source is a no-op.
   *
   * dash.js takes settings on a live player, so changing `engine` re-applies
   * them in place instead of recreating the engine.
   */
  get source(): DashSource | null {
    return this.#source;
  }

  set source(value: DashSource | null) {
    if (deepEqual(this.#source ?? null, value ?? null)) return;
    const configChanged = !deepEqual(this.#source?.engine ?? null, value?.engine ?? null);
    this.#source = value ?? null;
    if (configChanged) this.#applyEngineConfig(value?.engine);
    const src = value?.src ?? '';
    if (this.#src !== src) {
      this.#src = src;
      this.#engine.attachSource(src);
    }
    this.dispatchEvent(new Event('sourcechange'));
  }

  // `engine` is replaced, not merged, but dash.js merges every
  // `updateSettings()` call into the current settings — reset first so dropping
  // a key clears it instead of leaving the previous value behind.
  #applyEngineConfig(engine?: dashjs.MediaPlayerSettingClass) {
    this.#engine.resetSettings();
    if (engine) this.#engine.updateSettings(engine);
  }
}
