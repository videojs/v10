import { MediaError } from '@videojs/media';
import { HTMLVideoAdapter } from '@videojs/media/dom';
import Hls from 'hls.js';
import { describe, expect, it, vi } from 'vite-plus/test';

import { HlsJsErrorsMixin } from '../errors';

class FakeHost extends HTMLVideoAdapter {
  engine: Hls | null;

  constructor(engine: Hls | null = null) {
    super();
    this.engine = engine;
  }
}

const HlsJsErrors = HlsJsErrorsMixin(FakeHost);

function createEngine(): Hls {
  const listeners = new Map<string, Set<(...args: any[]) => void>>();

  return {
    on(event: string, fn: (...args: any[]) => void) {
      if (!listeners.has(event)) listeners.set(event, new Set());

      listeners.get(event)!.add(fn);
    },
    off(event: string, fn: (...args: any[]) => void) {
      listeners.get(event)?.delete(fn);
    },
    emit(event: string, ...args: any[]) {
      for (const fn of listeners.get(event) ?? []) fn(event, ...args);
    },
    startLoad: vi.fn(),
    swapAudioCodec: vi.fn(),
    // Faithful to hls.js: recoverMediaError() is detachMedia() then attachMedia(), so it fires both events back at
    // the listener that called it. A bare mock would hide every consequence of that re-entry.
    recoverMediaError: vi.fn(function (this: any) {
      this.emit(Hls.Events.MEDIA_DETACHED);
      this.emit(Hls.Events.MEDIA_ATTACHED);
    }),
  } as unknown as Hls;
}

/** Consecutive failures the mixin rides out before treating the condition as terminal. */
const MAX_CONSECUTIVE = 3;

/** A network detail a reload can resume, unlike the manifest-level ones. */
const RELOADABLE = {
  type: Hls.ErrorTypes.NETWORK_ERROR,
  details: Hls.ErrorDetails.FRAG_LOAD_TIMEOUT,
  fatal: true,
  error: new Error('Timeout after 10000ms'),
};

/** A media detail a detach and re-attach can clear. */
const RECOVERABLE = {
  type: Hls.ErrorTypes.MEDIA_ERROR,
  details: Hls.ErrorDetails.BUFFER_APPEND_ERROR,
  fatal: true,
  error: new Error('decode'),
};

function setup() {
  const engine = createEngine();
  const host = new HlsJsErrors(engine);
  const video = document.createElement('video');

  host.attach(video);
  (engine as any).emit(Hls.Events.MEDIA_ATTACHED);
  return { engine, host, video };
}

describe('HlsJsErrorsMixin', () => {
  it('dispatches an error event on the host for fatal errors', () => {
    const { engine, host } = setup();

    const handler = vi.fn();

    host.addEventListener('error', handler);

    (engine as any).emit(Hls.Events.ERROR, {
      type: Hls.ErrorTypes.NETWORK_ERROR,
      details: Hls.ErrorDetails.MANIFEST_LOAD_ERROR,
      fatal: true,
      error: new Error('network failure'),
    });

    expect(handler).toHaveBeenCalledOnce();

    const event = handler.mock.calls[0]![0] as ErrorEvent;

    expect(event.error).toBeInstanceOf(MediaError);
    expect(event.error.code).toBe(MediaError.MEDIA_ERR_NETWORK);
    expect(event.error.fatal).toBe(true);
    expect(event.error.context).toBe(Hls.ErrorDetails.MANIFEST_LOAD_ERROR);
    expect(event.error.data).toBeDefined();
  });

  it('exposes the error via the error getter', () => {
    const { engine, host } = setup();

    expect(host.error).toBeNull();

    (engine as any).emit(Hls.Events.ERROR, {
      type: Hls.ErrorTypes.NETWORK_ERROR,
      details: Hls.ErrorDetails.MANIFEST_LOAD_ERROR,
      fatal: true,
      error: new Error('network failure'),
    });

    expect(host.error).toBeInstanceOf(MediaError);
    expect(host.error!.code).toBe(MediaError.MEDIA_ERR_NETWORK);
  });

  it('ignores non-fatal errors', () => {
    const { engine, host } = setup();

    const handler = vi.fn();

    host.addEventListener('error', handler);

    (engine as any).emit(Hls.Events.ERROR, {
      type: Hls.ErrorTypes.NETWORK_ERROR,
      details: Hls.ErrorDetails.FRAG_LOAD_ERROR,
      fatal: false,
      error: new Error('transient'),
    });

    expect(handler).not.toHaveBeenCalled();
    expect(host.error).toBeNull();
  });

  it('maps media errors to MEDIA_ERR_DECODE', () => {
    const { engine, host } = setup();

    const handler = vi.fn();

    host.addEventListener('error', handler);

    // A buffer append error is recoverable, so it only surfaces once the mixin has tried and failed.
    for (let attempt = 0; attempt <= MAX_CONSECUTIVE; attempt += 1) (engine as any).emit(Hls.Events.ERROR, RECOVERABLE);

    const event = handler.mock.calls[0]![0] as ErrorEvent;

    expect(event.error.code).toBe(MediaError.MEDIA_ERR_DECODE);
  });

  it('maps key system errors to MEDIA_ERR_ENCRYPTED', () => {
    const { engine, host } = setup();

    const handler = vi.fn();

    host.addEventListener('error', handler);

    (engine as any).emit(Hls.Events.ERROR, {
      type: Hls.ErrorTypes.KEY_SYSTEM_ERROR,
      details: Hls.ErrorDetails.KEY_SYSTEM_NO_KEYS,
      fatal: true,
      error: new Error('drm'),
    });

    const event = handler.mock.calls[0]![0] as ErrorEvent;

    expect(event.error.code).toBe(MediaError.MEDIA_ERR_ENCRYPTED);
  });

  it('stops listening after MEDIA_DETACHED', () => {
    const { engine, host } = setup();

    const handler = vi.fn();

    host.addEventListener('error', handler);

    (engine as any).emit(Hls.Events.MEDIA_DETACHED);

    (engine as any).emit(Hls.Events.ERROR, {
      type: Hls.ErrorTypes.NETWORK_ERROR,
      details: Hls.ErrorDetails.MANIFEST_LOAD_ERROR,
      fatal: true,
      error: new Error('after detach'),
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it('resets error after MEDIA_DETACHED', () => {
    const { engine, host } = setup();

    (engine as any).emit(Hls.Events.ERROR, {
      type: Hls.ErrorTypes.NETWORK_ERROR,
      details: Hls.ErrorDetails.MANIFEST_LOAD_ERROR,
      fatal: true,
      error: new Error('failure'),
    });

    expect(host.error).not.toBeNull();

    (engine as any).emit(Hls.Events.MEDIA_DETACHED);

    expect(host.error).toBeNull();
  });

  it('preserves the original hls.js error as the message source', () => {
    const { engine, host } = setup();

    const handler = vi.fn();

    host.addEventListener('error', handler);

    (engine as any).emit(Hls.Events.ERROR, {
      type: Hls.ErrorTypes.OTHER_ERROR,
      details: Hls.ErrorDetails.INTERNAL_EXCEPTION,
      fatal: true,
      error: new Error('something broke'),
    });

    const event = handler.mock.calls[0]![0] as ErrorEvent;

    expect(event.error.code).toBe(MediaError.MEDIA_ERR_CUSTOM);
    expect(event.error.message).toContain('something broke');
  });
  it('reloads instead of surfacing a network error a reload can resume', () => {
    vi.useFakeTimers();

    try {
      const { engine, host } = setup();
      const handler = vi.fn();

      host.addEventListener('error', handler);
      (engine as any).emit(Hls.Events.ERROR, RELOADABLE);

      expect(handler).not.toHaveBeenCalled();
      expect(host.error).toBeNull();

      vi.runAllTimers();

      expect((engine as any).startLoad).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it('surfaces a manifest error at once, since a reload cannot re-fetch a manifest', () => {
    const { engine, host } = setup();
    const handler = vi.fn();

    host.addEventListener('error', handler);

    (engine as any).emit(Hls.Events.ERROR, {
      type: Hls.ErrorTypes.NETWORK_ERROR,
      details: Hls.ErrorDetails.MANIFEST_LOAD_ERROR,
      fatal: true,
      error: new Error('manifest'),
    });

    expect(handler).toHaveBeenCalledOnce();
    expect((engine as any).startLoad).not.toHaveBeenCalled();
  });

  it('surfaces incompatible codecs at once, since a re-attach cannot clear them', () => {
    const { engine, host } = setup();
    const handler = vi.fn();

    host.addEventListener('error', handler);

    (engine as any).emit(Hls.Events.ERROR, {
      type: Hls.ErrorTypes.MEDIA_ERROR,
      details: Hls.ErrorDetails.MANIFEST_INCOMPATIBLE_CODECS_ERROR,
      fatal: true,
      error: new Error('codecs'),
    });

    expect(handler).toHaveBeenCalledOnce();
    expect((engine as any).recoverMediaError).not.toHaveBeenCalled();
  });

  it('keeps its budget across the re-attach its own recovery causes', () => {
    const { engine, host } = setup();
    const handler = vi.fn();

    host.addEventListener('error', handler);

    // recoverMediaError re-fires MEDIA_ATTACHED, which must not read as a fresh load and refill the budget.
    for (let attempt = 0; attempt < MAX_CONSECUTIVE; attempt += 1) (engine as any).emit(Hls.Events.ERROR, RECOVERABLE);

    expect((engine as any).recoverMediaError).toHaveBeenCalledTimes(MAX_CONSECUTIVE);
    expect((engine as any).swapAudioCodec).toHaveBeenCalledTimes(MAX_CONSECUTIVE - 1);
    expect(handler).not.toHaveBeenCalled();

    (engine as any).emit(Hls.Events.ERROR, RECOVERABLE);

    expect(handler).toHaveBeenCalledOnce();
    expect((engine as any).recoverMediaError).toHaveBeenCalledTimes(MAX_CONSECUTIVE);
  });

  it('keeps listening through the re-attach its own recovery causes', () => {
    const { engine, host } = setup();
    const handler = vi.fn();

    host.addEventListener('error', handler);

    (engine as any).emit(Hls.Events.ERROR, RECOVERABLE);

    // The detach and re-attach must not tear the ERROR listener down, or the next fatal error is lost.
    (engine as any).emit(Hls.Events.ERROR, {
      type: Hls.ErrorTypes.KEY_SYSTEM_ERROR,
      details: Hls.ErrorDetails.KEY_SYSTEM_NO_KEYS,
      fatal: true,
      error: new Error('drm'),
    });

    expect(handler).toHaveBeenCalledOnce();
  });

  it('stops retrying a stream that keeps failing after it recovers', () => {
    vi.useFakeTimers();

    try {
      const { engine, host } = setup();
      const handler = vi.fn();

      host.addEventListener('error', handler);

      // Progress between failures clears the consecutive run, but the per-source budget still has to run out.
      for (let round = 0; round < 12; round += 1) {
        (engine as any).emit(Hls.Events.ERROR, RELOADABLE);
        vi.runAllTimers();
        (engine as any).emit(Hls.Events.FRAG_BUFFERED, {});

        if (handler.mock.calls.length > 0) break;
      }

      expect(handler).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it('drops a pending reload when the error turns out to be terminal', () => {
    vi.useFakeTimers();

    try {
      const { engine, host } = setup();
      const handler = vi.fn();

      host.addEventListener('error', handler);
      (engine as any).emit(Hls.Events.ERROR, RELOADABLE);

      // A different fatal error lands inside the backoff window and is terminal.
      (engine as any).emit(Hls.Events.ERROR, {
        type: Hls.ErrorTypes.KEY_SYSTEM_ERROR,
        details: Hls.ErrorDetails.KEY_SYSTEM_NO_KEYS,
        fatal: true,
        error: new Error('drm'),
      });

      expect(handler).toHaveBeenCalledOnce();

      vi.runAllTimers();

      // Reloading behind the error the viewer is being shown would restart playback under the dialog.
      expect((engine as any).startLoad).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('drops a pending reload when the media detaches', () => {
    vi.useFakeTimers();

    try {
      const { engine } = setup();

      (engine as any).emit(Hls.Events.ERROR, RELOADABLE);
      (engine as any).emit(Hls.Events.MEDIA_DETACHED);
      vi.runAllTimers();

      expect((engine as any).startLoad).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
