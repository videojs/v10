import type shaka from 'shaka-player/dist/shaka-player.compiled-es2021';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RenditionCapController } from '../rendition-cap';

type FakeTrack = { width: number; height: number };

const track = (width: number, height: number): FakeTrack => ({ width, height });

/** 16:9 ladder, ascending, the shape `getVideoTracks()` reports. */
const LADDER: FakeTrack[] = [track(640, 360), track(854, 480), track(1280, 720), track(1920, 1080), track(2560, 1440)];

function createEngine(videoTracks: FakeTrack[] = LADDER) {
  const listeners = new Map<string, Set<(event: unknown) => void>>();

  const engine = {
    videoTracks,
    configure: vi.fn(),
    getVideoTracks: () => engine.videoTracks,
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

type FakeEngine = ReturnType<typeof createEngine>;

const asPlayer = (engine: FakeEngine) => engine as unknown as shaka.Player;

/** The `abr.restrictions` of the last `configure()` call. */
function restrictions(engine: FakeEngine) {
  return engine.configure.mock.lastCall?.[0].abr.restrictions;
}

/** jsdom lays nothing out, so the rendered size is stated instead. */
function createTarget(width: number, height: number) {
  const target = document.createElement('video');
  Object.defineProperty(target, 'clientWidth', { value: width, configurable: true, writable: true });
  Object.defineProperty(target, 'clientHeight', { value: height, configurable: true, writable: true });
  return target;
}

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = [];
  observed: Element[] = [];

  constructor(private callback: () => void) {
    FakeResizeObserver.instances.push(this);
  }

  observe(element: Element) {
    this.observed.push(element);
  }

  disconnect() {
    this.observed = [];
  }

  resize() {
    this.callback();
  }
}

beforeEach(() => {
  FakeResizeObserver.instances = [];
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('RenditionCapController', () => {
  it('translates maxAutoResolution into a pixel-area ceiling', () => {
    const engine = createEngine();
    const controller = new RenditionCapController(asPlayer(engine));

    controller.update({ maxAutoResolution: '720p' });

    expect(restrictions(engine)).toEqual({ maxPixels: 1280 * 720, maxWidth: Infinity, maxHeight: Infinity });
  });

  it('lifts every ceiling when no cap is asked for', () => {
    const engine = createEngine();
    const controller = new RenditionCapController(asPlayer(engine));

    controller.update({ maxAutoResolution: '720p' });
    controller.update({});

    expect(restrictions(engine)).toEqual({ maxPixels: Infinity, maxWidth: Infinity, maxHeight: Infinity });
  });

  it('caps to the smallest rendition that covers the element', () => {
    const engine = createEngine();
    const controller = new RenditionCapController(asPlayer(engine));

    // Wider and taller than the 720p floor, between the 1080p rung and the one
    // below: the covering rung is what the cap admits.
    controller.observe(createTarget(1500, 844));

    expect(restrictions(engine)).toEqual({ maxPixels: Infinity, maxWidth: 1920, maxHeight: 1080 });
  });

  it('never caps a small element below the default floor', () => {
    const engine = createEngine();
    const controller = new RenditionCapController(asPlayer(engine));

    controller.observe(createTarget(320, 180));

    expect(restrictions(engine)).toEqual({ maxPixels: Infinity, maxWidth: 1280, maxHeight: 720 });
  });

  it('caps further down when the source names a lower floor', () => {
    const engine = createEngine();
    const controller = new RenditionCapController(asPlayer(engine));

    controller.observe(createTarget(320, 180));
    controller.update({ minAutoResolution: '360p' });

    expect(restrictions(engine)).toEqual({ maxPixels: Infinity, maxWidth: 640, maxHeight: 360 });
  });

  it('keeps the floor subordinate to an explicit maxAutoResolution', () => {
    const engine = createEngine();
    const controller = new RenditionCapController(asPlayer(engine));

    controller.observe(createTarget(320, 180));
    controller.update({ maxAutoResolution: '360p' });

    // The restrictions AND together, so the tighter `maxPixels` rules however
    // high the floor holds the size-derived dimensions.
    expect(restrictions(engine)).toEqual({ maxPixels: 640 * 360, maxWidth: 1280, maxHeight: 720 });
  });

  it('measures the element in device pixels', () => {
    vi.stubGlobal('devicePixelRatio', 2);
    const engine = createEngine();
    const controller = new RenditionCapController(asPlayer(engine));

    controller.observe(createTarget(960, 540));

    expect(restrictions(engine)).toEqual({ maxPixels: Infinity, maxWidth: 1920, maxHeight: 1080 });
  });

  it('derives no size cap from an element with no measurable size', () => {
    const engine = createEngine();
    const controller = new RenditionCapController(asPlayer(engine));

    controller.observe(createTarget(0, 0));

    expect(restrictions(engine)).toEqual({ maxPixels: Infinity, maxWidth: Infinity, maxHeight: Infinity });
  });

  it('derives no size cap when capToPlayerSize is off', () => {
    const engine = createEngine();
    const controller = new RenditionCapController(asPlayer(engine));

    controller.observe(createTarget(320, 180));
    controller.update({ capToPlayerSize: false });

    expect(restrictions(engine)).toEqual({ maxPixels: Infinity, maxWidth: Infinity, maxHeight: Infinity });
  });

  it('leaves the whole ladder eligible when nothing covers the element', () => {
    const engine = createEngine([track(640, 360)]);
    const controller = new RenditionCapController(asPlayer(engine));

    controller.observe(createTarget(320, 180));

    // The floor lifts the measurement past the ladder's top: nothing to cap.
    expect(restrictions(engine)).toEqual({ maxPixels: Infinity, maxWidth: Infinity, maxHeight: Infinity });
  });

  it('caps at the floored measurement until the ladder arrives', () => {
    const engine = createEngine([]);
    const controller = new RenditionCapController(asPlayer(engine));

    controller.observe(createTarget(320, 180));
    expect(restrictions(engine)).toEqual({ maxPixels: Infinity, maxWidth: 1280, maxHeight: 720 });

    engine.videoTracks = LADDER;
    engine.emit('trackschanged');

    expect(restrictions(engine)).toEqual({ maxPixels: Infinity, maxWidth: 1280, maxHeight: 720 });
  });

  it('follows the element as it resizes', () => {
    const engine = createEngine();
    const controller = new RenditionCapController(asPlayer(engine));
    const target = createTarget(320, 180);

    controller.observe(target);
    expect(restrictions(engine)).toEqual({ maxPixels: Infinity, maxWidth: 1280, maxHeight: 720 });

    Object.defineProperty(target, 'clientWidth', { value: 1920, configurable: true });
    Object.defineProperty(target, 'clientHeight', { value: 1080, configurable: true });
    FakeResizeObserver.instances[0]!.resize();

    expect(restrictions(engine)).toEqual({ maxPixels: Infinity, maxWidth: 1920, maxHeight: 1080 });
  });

  it('keeps a stricter caller-configured restriction in force', () => {
    const engine = createEngine();
    const controller = new RenditionCapController(asPlayer(engine));

    controller.observe(createTarget(320, 180));
    controller.update({
      maxAutoResolution: '2160p',
      baseRestrictions: { maxPixels: 1_000, maxWidth: 100 },
    });

    expect(restrictions(engine)).toEqual({ maxPixels: 1_000, maxWidth: 100, maxHeight: 720 });
  });

  it('lifts the size cap when it stops observing', () => {
    const engine = createEngine();
    const controller = new RenditionCapController(asPlayer(engine));

    controller.observe(createTarget(320, 180));
    controller.observe(null);

    expect(restrictions(engine)).toEqual({ maxPixels: Infinity, maxWidth: Infinity, maxHeight: Infinity });
    expect(FakeResizeObserver.instances[0]!.observed).toEqual([]);
  });

  it('stops evaluating once destroyed', () => {
    const engine = createEngine();
    const controller = new RenditionCapController(asPlayer(engine));

    controller.observe(createTarget(320, 180));
    controller.destroy();
    engine.configure.mockClear();

    engine.emit('trackschanged');

    expect(engine.configure).not.toHaveBeenCalled();
    expect(FakeResizeObserver.instances[0]!.observed).toEqual([]);
  });
});
