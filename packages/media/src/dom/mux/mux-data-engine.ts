import { isFunction, isObject, isString } from '@videojs/utils/predicate';
import { getMediaEngine } from '../../core/predicate';
import { isDashMedia } from '../dash/predicate';
import { isHlsJsMedia } from '../hls-js/predicate';
import type { MuxDataOptions } from './types';

/** The `mux-embed` monitor options that hook a playback engine's own telemetry. */
export type MuxDataEngineOptions = Partial<Pick<MuxDataOptions, 'Hls' | 'hlsjs' | 'dashjs'>>;

type MuxDataHlsJsClass = NonNullable<MuxDataOptions['Hls']>;

const warnedEngines = new WeakSet<object>();

/**
 * Pick the `mux-embed` integration for a Media's playback engine.
 *
 * `mux-embed` monitors the media element on its own, and an engine integration
 * is what adds engine-level data on top: rendition switches, request timing and
 * throughput, and engine errors. It ships two — hls.js and dash.js — and each
 * one is wired through a different option, so handing a dash.js player to the
 * hls.js option leaves the view with element-level data only.
 *
 * Media are identified by their symbol-backed type guards, so this module
 * imports neither hls.js nor dash.js. Mux Data can be registered with any media
 * without pulling an engine it will never touch into the bundle (dash.js in
 * particular reads `window` on import), and a media whose engine has no
 * integration — a raw `<video>`, native HLS, or an SPF playback engine — is
 * monitored from the element alone instead of through the wrong integration.
 *
 * @returns Options to spread into a `Mux.monitor()` call. Empty when the engine
 *   has no integration, which leaves element-level monitoring intact.
 */
export function toMuxDataEngineOptions(media: unknown): MuxDataEngineOptions {
  if (isDashMedia(media)) return { dashjs: media.engine };

  if (isHlsJsMedia(media) && media.engine) {
    // `mux-embed` reads hls.js's event names and error details off the class,
    // falling back to `window.Hls` when it isn't given one. Take it from the
    // instance so a bundled hls.js is always found, without importing it here.
    const Hls = toHlsJsClass(media.engine);
    if (Hls) return { hlsjs: media.engine, Hls };
  }

  const engine = getMediaEngine(media);
  if (__DEV__ && isObject(engine) && !warnedEngines.has(engine)) {
    warnedEngines.add(engine);
    console.warn(
      '[vjs-mux] Mux Data could not hook this playback engine, so the view is monitored from the media element alone. Engine-level data (rendition switches, request timing, engine errors) will be missing.',
      engine
    );
  }

  return {};
}

/** hls.js's own class, the only place its event names and error details are published. */
function toHlsJsClass(engine: object): MuxDataHlsJsClass | undefined {
  const engineClass: unknown = engine.constructor;
  if (!isFunction(engineClass)) return undefined;
  const statics = engineClass as unknown as MuxDataHlsJsClass;
  return isObject(statics.Events) && isObject(statics.ErrorDetails) && isString(statics.version) ? statics : undefined;
}
