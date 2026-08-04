import { deepEqual } from '@videojs/utils/object';
import * as dashjs from 'dashjs';

import { MediaTracksMixin } from '../../core/media-tracks';
import type { MediaEngineHost } from '../../core/types';
import { HTMLVideoElementHost } from '../video-host';

/** Structured DASH source: which source to play, plus how to play it. */
export interface DashSource {
  /** MPD URL. Mirrors the host's `src` property. */
  src?: string | undefined;
  /**
   * dash.js's own settings, passed through untouched. Replacing them resets any
   * previously applied settings.
   */
  engine?: dashjs.MediaPlayerSettingClass | undefined;
}

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

  /** MPD URL. Setting it re-derives `source`, carrying its settings over. */
  set src(value) {
    const { engine } = this.#source ?? {};
    const next: DashSource = { ...(engine && { engine }), ...(value && { src: value }) };

    // Everything happens in the `source` setter, so there is one path for
    // storing it, telling the engine, and dispatching `sourcechange`.
    this.source = Object.keys(next).length > 0 ? next : null;
  }

  /**
   * Structured source: the MPD URL in `src`, plus dash.js settings in `engine`.
   * Replacing it re-derives `src`.
   *
   * dash.js takes settings on a live player, so changing `engine` re-applies
   * them in place instead of recreating the engine.
   */
  get source(): DashSource | null {
    return this.#source;
  }

  set source(value: DashSource | null) {
    const source = value ?? null;
    // Changing anything takes a new object, so handing the same one back costs
    // nothing.
    if (source === this.#source) return;

    const src = source?.src ?? '';

    // Assigning is always a source change, so it is always announced. Only the
    // engine calls are guarded, so re-assigning an equivalent source — an inline
    // React prop, say — never disturbs what is already playing.
    const configChanged = !deepEqual(this.#source?.engine ?? null, source?.engine ?? null);
    const srcChanged = this.#src !== src;

    this.#source = source;
    this.#src = src;

    if (configChanged) this.#applyEngineConfig(source?.engine);
    if (srcChanged) this.#engine.attachSource(src);

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
