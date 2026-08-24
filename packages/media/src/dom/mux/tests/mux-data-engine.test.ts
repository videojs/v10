import * as dashjs from 'dashjs';
import Hls from 'hls.js';
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest';
import { DASH_MEDIA } from '../../dash/predicate';
import { HLS_JS_MEDIA } from '../../hls-js/predicate';
import { toMuxDataEngineOptions } from '../mux-data-engine';

/** Shaped like an hls.js instance, class statics included. */
class FakeHlsJsEngine {
  static Events = { MANIFEST_LOADED: 'hlsManifestLoaded' };
  static ErrorDetails = { MANIFEST_LOAD_ERROR: 'manifestLoadError' };
  static version = '1.6.15';
  levels: unknown[] = [];
  on() {}
  off() {}
}

/** Shaped like a dash.js v5 `MediaPlayerClass`. */
class FakeDashJsEngine {
  getCurrentTrackFor() {
    return null;
  }
  getRepresentationsByType() {
    return [];
  }
  on() {}
  off() {}
}

class FakeHlsJsMedia {
  readonly [HLS_JS_MEDIA] = true;
  engine: unknown = new FakeHlsJsEngine();
}

class FakeDashMedia {
  readonly [DASH_MEDIA] = true;
  engine: unknown = new FakeDashJsEngine();
}

let warn: MockInstance<typeof console.warn>;

beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('toMuxDataEngineOptions', () => {
  it('wires an hls.js engine and its class into the hls.js integration', () => {
    const media = new FakeHlsJsMedia();

    expect(toMuxDataEngineOptions(media)).toEqual({ hlsjs: media.engine, Hls: FakeHlsJsEngine });
  });

  it('wires a dash.js player into the dash.js integration', () => {
    const media = new FakeDashMedia();

    expect(toMuxDataEngineOptions(media)).toEqual({ dashjs: media.engine });
  });

  it('does not infer a Media type from its engine shape', () => {
    const hlsjs = new FakeHlsJsEngine();
    const dashEngine = new FakeDashJsEngine();

    expect(toMuxDataEngineOptions({ engine: hlsjs })).toEqual({});
    expect(toMuxDataEngineOptions({ engine: dashEngine })).toEqual({});
  });

  it('sends no engine options for media with no engine', () => {
    expect(toMuxDataEngineOptions(null)).toEqual({});
    expect(toMuxDataEngineOptions(undefined)).toEqual({});
  });

  it('sends no engine options for an engine it has no integration for', () => {
    // An SPF playback engine: a composition, not a handle `mux-embed` can hook.
    const engine = { state: {}, context: {}, destroy: () => Promise.resolve() };

    expect(toMuxDataEngineOptions({ engine })).toEqual({});
  });

  it('skips the hls.js integration when the engine class publishes no events', () => {
    // `mux-embed` needs the class to hook hls.js events, and reaches for
    // `window.Hls` when it isn't given one — better to monitor the element alone
    // than to let it pick up an unrelated global.
    const media = new FakeHlsJsMedia();
    media.engine = { levels: [], on() {}, off() {} } as FakeHlsJsEngine;

    expect(toMuxDataEngineOptions(media)).toEqual({});
  });

  // Real instances keep the values handed to mux-embed honest as its engine
  // integrations and their upstream libraries evolve.
  it('recognizes a real hls.js instance', () => {
    const media = new FakeHlsJsMedia();
    const engine = new Hls();
    media.engine = engine;

    expect(toMuxDataEngineOptions(media)).toEqual({ hlsjs: engine, Hls });

    engine.destroy();
  });

  it('recognizes a real dash.js player', () => {
    const engine = dashjs.MediaPlayer().create();
    const media = new FakeDashMedia();
    media.engine = engine;

    expect(toMuxDataEngineOptions(media)).toEqual({ dashjs: engine });
  });

  it('warns once per unrecognized engine in development', () => {
    const engine = { destroy: () => {} };

    toMuxDataEngineOptions({ engine });
    toMuxDataEngineOptions({ engine });

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('could not hook this playback engine'), engine);
  });
});
