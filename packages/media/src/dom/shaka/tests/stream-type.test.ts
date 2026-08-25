import { describe, expect, it, vi } from 'vite-plus/test';

import { MediaStreamTypes } from '../../../core/types';
import { HTMLVideoElementHost } from '../../video-host';
import { ShakaMediaStreamTypeMixin } from '../stream-type';

function createEngine({ live = false, inProgress = false } = {}) {
  const listeners = new Map<string, Set<(event: unknown) => void>>();

  const engine = {
    live,
    inProgress,
    isLive: vi.fn(() => engine.live),
    isInProgress: vi.fn(() => engine.inProgress),
    addEventListener(type: string, listener: (event: unknown) => void) {
      const typeListeners = listeners.get(type) ?? new Set();

      typeListeners.add(listener);
      listeners.set(type, typeListeners);
    },
    removeEventListener(type: string, listener: (event: unknown) => void) {
      listeners.get(type)?.delete(listener);
    },
    emit(type: string) {
      for (const listener of [...(listeners.get(type) ?? [])]) listener({ type });
    },
  };

  return engine;
}

class FakeHost extends HTMLVideoElementHost {
  engine: ReturnType<typeof createEngine> | null;

  constructor(engine: ReturnType<typeof createEngine> | null = null) {
    super();
    this.engine = engine;
  }
}

const ShakaMediaStreamType = ShakaMediaStreamTypeMixin(FakeHost as any) as unknown as new (
  engine?: ReturnType<typeof createEngine> | null
) => FakeHost & { streamType: string };

describe('ShakaMediaStreamTypeMixin', () => {
  it('starts unknown', () => {
    const media = new ShakaMediaStreamType(createEngine());

    expect(media.streamType).toBe(MediaStreamTypes.UNKNOWN);
  });

  it('detects live once the source is loaded', () => {
    const engine = createEngine({ live: true });
    const media = new ShakaMediaStreamType(engine);
    const onChange = vi.fn();

    media.addEventListener('streamtypechange', onChange);

    engine.emit('loaded');

    expect(media.streamType).toBe(MediaStreamTypes.LIVE);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('detects on-demand from a parsed manifest', () => {
    const engine = createEngine();
    const media = new ShakaMediaStreamType(engine);

    engine.emit('manifestparsed');

    expect(media.streamType).toBe(MediaStreamTypes.ON_DEMAND);
  });

  it('treats an in-progress recording as live', () => {
    const engine = createEngine({ live: false, inProgress: true });
    const media = new ShakaMediaStreamType(engine);

    engine.emit('manifestparsed');

    expect(media.streamType).toBe(MediaStreamTypes.LIVE);
  });

  it('forgets the detection when a new load starts', () => {
    const engine = createEngine({ live: true });
    const media = new ShakaMediaStreamType(engine);

    engine.emit('loaded');

    engine.emit('loading');

    expect(media.streamType).toBe(MediaStreamTypes.UNKNOWN);
  });

  it('lets a user value win over detection until cleared', () => {
    const engine = createEngine({ live: true });
    const media = new ShakaMediaStreamType(engine);

    media.streamType = MediaStreamTypes.ON_DEMAND;
    engine.emit('loaded');
    expect(media.streamType).toBe(MediaStreamTypes.ON_DEMAND);

    media.streamType = MediaStreamTypes.UNKNOWN;
    engine.emit('manifestupdated');
    expect(media.streamType).toBe(MediaStreamTypes.LIVE);
  });

  it('stops detecting once destroyed', () => {
    const engine = createEngine({ live: true });
    const media = new ShakaMediaStreamType(engine);

    media.destroy();
    engine.emit('loaded');

    expect(media.streamType).toBe(MediaStreamTypes.UNKNOWN);
  });
});
