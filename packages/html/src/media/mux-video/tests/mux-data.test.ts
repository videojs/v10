import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock mux-embed before importing mux-data
const mockMonitor = vi.fn();
const mockDestroyMonitor = vi.fn();
const mockAddHLSJS = vi.fn();
const mockRemoveHLSJS = vi.fn();
const mockEmit = vi.fn();

vi.mock('mux-embed', () => ({
  default: {
    monitor: mockMonitor,
    destroyMonitor: mockDestroyMonitor,
    addHLSJS: mockAddHLSJS,
    removeHLSJS: mockRemoveHLSJS,
    emit: mockEmit,
  },
}));

// Import after mock is set up
const { setupMuxData, updateMuxHlsEngine, emitMuxError, emitMuxHeartbeat } = await import('../mux-data');

function makeMediaEl(): HTMLMediaElement {
  return document.createElement('video');
}

function makeEngine(): any {
  return { url: 'https://stream.mux.com/test.m3u8' };
}

describe('setupMuxData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls mux.monitor with the media element and engine', () => {
    const el = makeMediaEl();
    const engine = makeEngine();
    setupMuxData(el, engine, { envKey: null, metadata: {} });

    expect(mockMonitor).toHaveBeenCalledOnce();
    expect(mockMonitor.mock.calls[0]![0]).toBe(el);
    const opts = mockMonitor.mock.calls[0]![1];
    expect(opts.hlsjs).toBe(engine);
  });

  it('sets automaticErrorTracking to false', () => {
    const el = makeMediaEl();
    setupMuxData(el, makeEngine(), { envKey: null, metadata: {} });
    const opts = mockMonitor.mock.calls[0]![1];
    expect(opts.automaticErrorTracking).toBe(false);
  });

  it('passes env_key when provided', () => {
    const el = makeMediaEl();
    setupMuxData(el, makeEngine(), { envKey: 'abc123', metadata: {} });
    const opts = mockMonitor.mock.calls[0]![1];
    expect(opts.data?.env_key).toBe('abc123');
  });

  it('omits env_key when null', () => {
    const el = makeMediaEl();
    setupMuxData(el, makeEngine(), { envKey: null, metadata: {} });
    const opts = mockMonitor.mock.calls[0]![1];
    expect(opts.data?.env_key).toBeUndefined();
  });

  it('merges metadata into data', () => {
    const el = makeMediaEl();
    setupMuxData(el, makeEngine(), {
      envKey: null,
      metadata: { video_id: 'vid-1', video_title: 'My Video' },
    });
    const opts = mockMonitor.mock.calls[0]![1];
    expect(opts.data?.video_id).toBe('vid-1');
    expect(opts.data?.video_title).toBe('My Video');
  });

  it('sets player_software_name to Video.js', () => {
    setupMuxData(makeMediaEl(), makeEngine(), { envKey: null, metadata: {} });
    const opts = mockMonitor.mock.calls[0]![1];
    expect(opts.data?.player_software_name).toBe('Video.js');
  });

  it('returns a cleanup function that calls destroyMonitor', () => {
    const el = makeMediaEl();
    const cleanup = setupMuxData(el, makeEngine(), { envKey: null, metadata: {} });
    cleanup();
    expect(mockDestroyMonitor).toHaveBeenCalledWith(el);
  });

  describe('errorTranslator', () => {
    it('suppresses errors with no player_error_code', () => {
      setupMuxData(makeMediaEl(), makeEngine(), { envKey: null, metadata: {} });
      const translator = mockMonitor.mock.calls[0]![1].errorTranslator;
      expect(translator({})).toBe(false);
    });

    it('passes through errors that have a player_error_code', () => {
      setupMuxData(makeMediaEl(), makeEngine(), { envKey: null, metadata: {} });
      const translator = mockMonitor.mock.calls[0]![1].errorTranslator;
      const error = { player_error_code: 2404000 };
      expect(translator(error)).toBe(error);
    });
  });
});

describe('updateMuxHlsEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('removes old HLS instance then adds new one', () => {
    const el = makeMediaEl();
    const engine = makeEngine();
    updateMuxHlsEngine(el, engine);
    expect(mockRemoveHLSJS).toHaveBeenCalledWith(el);
    expect(mockAddHLSJS).toHaveBeenCalledWith(el, { hlsjs: engine });
  });
});

describe('emitMuxError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('emits an error event with muxCode, message, and context', () => {
    const el = makeMediaEl();
    const error = Object.assign(new Error('test error'), {
      code: 2,
      fatal: true,
      muxCode: 2404000,
      context: 'url: https://example.com',
    }) as any;
    emitMuxError(el, error);
    expect(mockEmit).toHaveBeenCalledWith(el, 'error', {
      player_error_code: 2404000,
      player_error_message: 'test error',
      player_error_context: 'url: https://example.com',
    });
  });

  it('falls back to error.code when muxCode is absent', () => {
    const el = makeMediaEl();
    const error = Object.assign(new Error('decode error'), {
      code: 3,
      fatal: true,
    }) as any;
    emitMuxError(el, error);
    expect(mockEmit.mock.calls[0]![2]).toMatchObject({ player_error_code: 3 });
  });
});

describe('emitMuxHeartbeat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('emits a heartbeat with the provided metadata', () => {
    const el = makeMediaEl();
    const data = { view_drm_type: 'fairplay', video_id: 'v123' };
    emitMuxHeartbeat(el, data);
    expect(mockEmit).toHaveBeenCalledWith(el, 'hb', data);
  });
});
