import { isFunction, isObject } from '@videojs/utils/predicate';
import type { MuxDataOptions } from './types';

/** The `mux-embed` monitor options that hook a playback engine's own telemetry. */
export type MuxDataEngineOptions = Partial<Pick<MuxDataOptions, 'Hls' | 'hlsjs' | 'dashjs'>>;

type MuxDataHlsJsEngine = NonNullable<MuxDataOptions['hlsjs']>;
type MuxDataHlsJsClass = NonNullable<MuxDataOptions['Hls']>;
type MuxDataDashJsEngine = NonNullable<MuxDataOptions['dashjs']>;

const warnedEngines = new WeakSet<object>();

/**
 * Pick the `mux-embed` integration for a media's playback engine.
 *
 * `mux-embed` monitors the media element on its own, and an engine integration
 * is what adds engine-level data on top: rendition switches, request timing and
 * throughput, and engine errors. It ships two — hls.js and dash.js — and each
 * one is wired through a different option, so handing a dash.js player to the
 * hls.js option leaves the view with element-level data only.
 *
 * Engines are matched by shape rather than by class so this module imports
 * neither hls.js nor dash.js. Mux Data can be registered with any media without
 * pulling an engine it will never touch into the bundle (dash.js in particular
 * reads `window` on import), and a media whose engine has no integration — a
 * raw `<video>`, native HLS, or an SPF playback engine — is monitored from the
 * element alone instead of through the wrong integration.
 *
 * @returns Options to spread into a `Mux.monitor()` call. Empty when the engine
 *   has no integration, which leaves element-level monitoring intact.
 */
export function toMuxDataEngineOptions(engine: unknown): MuxDataEngineOptions {
  if (isDashJsEngine(engine)) return { dashjs: engine };

  if (isHlsJsEngine(engine)) {
    // `mux-embed` reads hls.js's event names off the class, falling back to
    // `window.Hls` when it isn't given one. Take it from the instance so a
    // bundled hls.js is always found, without importing hls.js here.
    const Hls = toHlsJsClass(engine);
    if (Hls) return { hlsjs: engine, Hls };
  }

  if (__DEV__ && isObject(engine) && !warnedEngines.has(engine)) {
    warnedEngines.add(engine);
    console.warn(
      '[vjs-mux] Mux Data could not hook this playback engine, so the view is monitored from the media element alone. Engine-level data (rendition switches, request timing, engine errors) will be missing.',
      engine
    );
  }

  return {};
}

/** hls.js: loads a source into a media element and emits its own events. */
function isHlsJsEngine(engine: unknown): engine is MuxDataHlsJsEngine {
  return hasMethods(engine, ['loadSource', 'attachMedia', 'on', 'off']);
}

/** dash.js: attaches a source and a view, and exposes the metrics `mux-embed` reads. */
function isDashJsEngine(engine: unknown): engine is MuxDataDashJsEngine {
  return hasMethods(engine, ['attachSource', 'attachView', 'getDashMetrics', 'on', 'off']);
}

function hasMethods(value: unknown, methods: string[]): boolean {
  if (!isObject(value)) return false;
  return methods.every((method) => isFunction((value as Record<string, unknown>)[method]));
}

/** hls.js's own class, the only place its event names are published. */
function toHlsJsClass(engine: object): MuxDataHlsJsClass | undefined {
  const engineClass: unknown = engine.constructor;
  if (!isFunction(engineClass)) return undefined;
  const statics = engineClass as unknown as MuxDataHlsJsClass;
  return isObject(statics.Events) ? statics : undefined;
}
