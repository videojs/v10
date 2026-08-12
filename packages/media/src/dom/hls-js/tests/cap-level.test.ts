import Hls, { type Level } from 'hls.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MediaResolution } from '../../../core/types';
import {
  createCapLevelController,
  levelIndexAtOrBelow,
  type RenditionCapPolicy,
  resolutionToPixelArea,
} from '../cap-level';

type FakeLevel = { width: number; height: number; bitrate: number };

const level = (width: number, height: number, bitrate: number): FakeLevel => ({ width, height, bitrate });

/** 16:9 ladder, ascending — the shape hls.js hands to `getMaxLevel`. */
const LADDER: FakeLevel[] = [
  level(640, 360, 800_000),
  level(854, 480, 1_400_000),
  level(1280, 720, 2_800_000),
  level(1920, 1080, 5_000_000),
  level(2560, 1440, 9_000_000),
];

const asLevels = (levels: FakeLevel[]) => levels as unknown as Level[];

function createEngine(levels: FakeLevel[], config: Record<string, unknown> = {}) {
  const listeners = new Map<string, Set<{ fn: (...args: any[]) => void; ctx: unknown }>>();

  return {
    levels,
    autoLevelCapping: -1,
    autoLevelEnabled: true,
    logger: { log: () => {} },
    config: {
      capLevelToPlayerSize: true,
      capLevelOnFPSDrop: true,
      // Pin the scale factor so a retina host does not change the arithmetic.
      ignoreDevicePixelRatio: true,
      maxDevicePixelRatio: Number.POSITIVE_INFINITY,
      ...config,
    },
    on(event: string, fn: (...args: any[]) => void, ctx?: unknown) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add({ fn, ctx });
    },
    off(event: string, fn: (...args: any[]) => void) {
      for (const entry of listeners.get(event) ?? []) {
        if (entry.fn === fn) listeners.get(event)!.delete(entry);
      }
    },
    emit(event: string, data: unknown) {
      for (const { fn, ctx } of [...(listeners.get(event) ?? [])]) fn.call(ctx, event, data);
    },
  } as unknown as Hls;
}

const emit = (engine: Hls, event: string, data: unknown) => (engine as any).emit(event, data);

const controllers: Array<{ destroy(): void }> = [];

afterEach(() => {
  // `startCapping()` opens a one-second interval; destroying clears it.
  while (controllers.length) controllers.pop()!.destroy();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

interface SetupOptions {
  maxAutoResolution?: MediaResolution | undefined;
  levels?: FakeLevel[];
  config?: Record<string, unknown>;
  /** Rendered size of the video element; omit to leave it unmeasurable. */
  playerSize?: { width: number; height: number };
}

function setup({ maxAutoResolution, levels = LADDER, config, playerSize }: SetupOptions = {}) {
  const policy: RenditionCapPolicy = { maxAutoResolution };
  const engine = createEngine(levels, config);
  const Controller = createCapLevelController(policy);
  const controller = new Controller(engine) as InstanceType<typeof Controller> & { destroy(): void };
  controllers.push(controller);

  // hls.js starts its capping loop from here when the manifest signals video.
  emit(engine, Hls.Events.MANIFEST_PARSED, { levels, firstLevel: 0, video: true });

  if (playerSize) {
    const video = document.createElement('video');
    // jsdom reports an empty bounding rect, and hls.js falls back to the
    // element's width/height attributes when it does.
    video.width = playerSize.width;
    video.height = playerSize.height;
    document.body.appendChild(video);
    emit(engine, Hls.Events.MEDIA_ATTACHING, { media: video });
  }

  return { policy, engine, controller, topIndex: levels.length - 1 };
}

describe('resolutionToPixelArea', () => {
  it('reads a resolution as its 16:9 pixel area', () => {
    expect(resolutionToPixelArea('720p')).toBe(1280 * 720);
    expect(resolutionToPixelArea('1080p')).toBe(1920 * 1080);
  });

  it('treats an absent cap as unbounded', () => {
    expect(resolutionToPixelArea(undefined)).toBe(Number.POSITIVE_INFINITY);
  });

  it('matches the areas `maxResolutionToPixelArea` produces in @videojs/spf', () => {
    // Pinned rather than imported: the packages do not depend on each other,
    // and the two ladders have to agree for a cap to mean the same thing across
    // the hls.js and SPF engines. `'480p'` is excluded here and covered below.
    const spfArea = (height: number) => (height * height * 16) / 9;
    const exact: MediaResolution[] = ['270p', '360p', '540p', '720p', '1080p', '1440p', '2160p'];

    for (const resolution of exact) {
      expect(resolutionToPixelArea(resolution)).toBe(spfArea(Number.parseInt(resolution, 10)));
    }
  });

  it('rounds 480p up so the standard 854×480 rendition fits its own cap', () => {
    // 16:9 at 480 tall is 853.33 wide. SPF's exact area (409_600) sits just
    // under the 854×480 (409_920) every real ladder ships, which would push
    // a '480p' cap down to 360p.
    expect(resolutionToPixelArea('480p')).toBe(854 * 480);
    expect(resolutionToPixelArea('480p')).toBeGreaterThan((480 * 480 * 16) / 9);
  });
});

describe('levelIndexAtOrBelow', () => {
  it('picks the largest level at or below the cap', () => {
    expect(levelIndexAtOrBelow(asLevels(LADDER), '720p')).toBe(2);
    expect(levelIndexAtOrBelow(asLevels(LADDER), '1080p')).toBe(3);
  });

  it('admits the rendition a cap is named after', () => {
    // Each rung should select itself rather than the one below it — 854×480 is
    // the case that a strict 16:9 area would get wrong.
    expect(levelIndexAtOrBelow(asLevels(LADDER), '360p')).toBe(0);
    expect(levelIndexAtOrBelow(asLevels(LADDER), '480p')).toBe(1);
    expect(levelIndexAtOrBelow(asLevels(LADDER), '1440p')).toBe(4);
  });

  it('has nothing to cap without a resolution', () => {
    expect(levelIndexAtOrBelow(asLevels(LADDER), undefined)).toBeUndefined();
  });

  it('has nothing to cap without levels', () => {
    expect(levelIndexAtOrBelow(asLevels([]), '720p')).toBeUndefined();
  });

  it('falls back to the smallest level when every rendition is above the cap', () => {
    // Nothing satisfies a 270p cap here; playing over-spec beats not adapting.
    expect(levelIndexAtOrBelow(asLevels(LADDER), '270p')).toBe(0);
  });

  it('measures area rather than height, so an ultrawide rendition counts its full pixels', () => {
    // 2560×1080 carries more pixels than 16:9 1080p despite being 1080 tall,
    // so a 1080p cap excludes it and lands on the 16:9 rendition below.
    const anamorphic = [level(1280, 720, 2_800_000), level(2560, 1080, 8_000_000)];

    expect(levelIndexAtOrBelow(asLevels(anamorphic), '1080p')).toBe(0);
  });

  it('reaches the top of a run of equally sized levels', () => {
    const sameSize = [level(1280, 720, 2_000_000), level(1280, 720, 3_500_000)];

    expect(levelIndexAtOrBelow(asLevels(sameSize), '720p')).toBe(1);
  });

  it('stops below an over-budget level even when a later one fits', () => {
    // hls.js orders levels by height, so a much wider rendition can blow the
    // pixel budget from a lower index. `autoLevelCapping` is an index ceiling,
    // so stopping at the later match would leave index 0 selectable.
    const mixedAspect = [
      level(3840, 720, 6_000_000), // 2_764_800 — over a 1080p budget
      level(1280, 1080, 4_000_000), // 1_382_400 — under it
    ];

    expect(levelIndexAtOrBelow(asLevels(mixedAspect), '1080p')).toBe(0);
  });

  it('ignores levels reported without dimensions', () => {
    const partial = [level(0, 0, 500_000), level(1280, 720, 2_800_000)];

    expect(levelIndexAtOrBelow(asLevels(partial), '720p')).toBe(1);
  });
});

describe('createCapLevelController', () => {
  it('leaves the player-size result alone when no cap is set', () => {
    const { controller, topIndex } = setup({ playerSize: { width: 1920, height: 1080 } });

    // A 1920-wide player admits the 1080p rendition but not 1440p.
    expect(controller.getMaxLevel(topIndex)).toBe(3);
  });

  it('lowers the ceiling to the requested resolution', () => {
    const { controller, topIndex } = setup({
      maxAutoResolution: '720p',
      playerSize: { width: 1920, height: 1080 },
    });

    expect(controller.getMaxLevel(topIndex)).toBe(2);
  });

  it('keeps the player-size ceiling when it is the stricter of the two', () => {
    const { controller, topIndex } = setup({
      maxAutoResolution: '1440p',
      playerSize: { width: 1920, height: 1080 },
    });

    // The caps intersect: 1440p asks for level 4, the player size allows 3.
    expect(controller.getMaxLevel(topIndex)).toBe(3);
  });

  it('writes the intersected ceiling to autoLevelCapping', () => {
    const { engine } = setup({
      maxAutoResolution: '720p',
      playerSize: { width: 1920, height: 1080 },
    });

    expect(engine.autoLevelCapping).toBe(2);
  });

  it('applies a policy change without waiting for the next tick', () => {
    const { engine, policy } = setup({ playerSize: { width: 1920, height: 1080 } });

    expect(engine.autoLevelCapping).toBe(3);

    policy.maxAutoResolution = '480p';
    policy.controller!.apply();

    expect(engine.autoLevelCapping).toBe(1);
  });

  it('returns to the uncapped ceiling when the policy is cleared', () => {
    const { engine, policy } = setup({
      maxAutoResolution: '360p',
      playerSize: { width: 1920, height: 1080 },
    });

    expect(engine.autoLevelCapping).toBe(0);

    policy.maxAutoResolution = undefined;
    policy.controller!.apply();

    expect(engine.autoLevelCapping).toBe(3);
  });

  it('re-resolves the cap after levels are updated', () => {
    const { engine } = setup({
      maxAutoResolution: '720p',
      playerSize: { width: 1920, height: 1080 },
    });

    expect(engine.autoLevelCapping).toBe(2);

    // hls.js drops the two lowest renditions; 720p is now index 0.
    const trimmed = LADDER.slice(2);
    (engine as any).levels = trimmed;
    emit(engine, Hls.Events.LEVELS_UPDATED, { levels: trimmed });

    expect(engine.autoLevelCapping).toBe(0);
  });

  it('registers itself on the policy and steps down on destroy', () => {
    const { controller, policy } = setup({ playerSize: { width: 1920, height: 1080 } });

    expect(policy.controller).toBe(controller);

    controller.destroy();

    expect(policy.controller).toBeUndefined();
  });

  it('keeps FPS-drop restrictions, which live behind the base controller', () => {
    const { engine, controller, topIndex } = setup({
      maxAutoResolution: '1440p',
      playerSize: { width: 4096, height: 2160 },
    });

    // A player this large admits the whole ladder; only the cap holds it to 4.
    expect(controller.getMaxLevel(topIndex)).toBe(4);

    // hls.js restricts a level after dropped frames. The restriction is applied
    // inside `super.getMaxLevel()`, so it only survives while we defer to it.
    emit(engine, Hls.Events.FPS_DROP_LEVEL_CAPPING, { droppedLevel: 4, level: 4 });

    expect(controller.getMaxLevel(topIndex)).toBe(3);
  });

  it('still caps while the element has no measurable size', () => {
    // hls.js abandons capping on an unmeasurable element. A requested ceiling
    // does not depend on layout, so a hidden or not-yet-laid-out player still
    // gets it — otherwise ABR would climb past the cap until layout settles.
    const { engine } = setup({ maxAutoResolution: '720p' });

    expect(engine.autoLevelCapping).toBe(2);
  });

  it('reports uncapped on an unmeasurable element when no resolution is requested', () => {
    const { engine } = setup();

    expect(engine.autoLevelCapping).toBe(-1);
  });

  it('hands the slot back to the size measurement once the element can be measured', () => {
    const { engine, controller } = setup({ maxAutoResolution: '1440p' });

    // Unmeasurable: only the resolution ceiling applies.
    expect(engine.autoLevelCapping).toBe(4);

    const video = document.createElement('video');
    video.width = 1920;
    video.height = 1080;
    document.body.appendChild(video);
    emit(engine, Hls.Events.MEDIA_ATTACHING, { media: video });
    controller.detectPlayerSize();

    // Measurable: the stricter player-size ceiling takes over.
    expect(engine.autoLevelCapping).toBe(3);
  });

  describe('with the player-size loop switched off', () => {
    const noSizeCapping = { config: { capLevelToPlayerSize: false } };

    it('still applies the resolution cap', () => {
      // hls.js never starts its capping loop here, so nothing else writes the
      // slot — and a naive implementation would leave the cap inert.
      const { engine } = setup({ maxAutoResolution: '720p', ...noSizeCapping });

      expect(engine.autoLevelCapping).toBe(2);
    });

    it('caps without regard to the player size', () => {
      const { engine } = setup({
        maxAutoResolution: '1440p',
        playerSize: { width: 320, height: 180 },
        ...noSizeCapping,
      });

      expect(engine.autoLevelCapping).toBe(4);
    });

    it('reports uncapped when no resolution is requested', () => {
      const { engine } = setup(noSizeCapping);

      expect(engine.autoLevelCapping).toBe(-1);
    });

    it('re-resolves the cap after levels are updated', () => {
      const { engine } = setup({ maxAutoResolution: '720p', ...noSizeCapping });

      const trimmed = LADDER.slice(2);
      (engine as any).levels = trimmed;
      emit(engine, Hls.Events.LEVELS_UPDATED, { levels: trimmed });

      expect(engine.autoLevelCapping).toBe(0);
    });
  });

  it('layers over a controller supplied through the engine config', () => {
    const policy: RenditionCapPolicy = { maxAutoResolution: '720p' };
    const engine = createEngine(LADDER);
    const seen: number[] = [];

    class CustomController extends Hls.DefaultConfig.capLevelController {
      getMaxLevel(capLevelIndex: number): number {
        seen.push(capLevelIndex);
        // Ignore the player size entirely; allow everything.
        return capLevelIndex;
      }
    }

    const Controller = createCapLevelController(policy, CustomController);
    const controller = new Controller(engine) as InstanceType<typeof Controller> & { destroy(): void };
    controllers.push(controller);

    expect(controller.getMaxLevel(4)).toBe(2);
    expect(seen).toEqual([4]);
  });

  it('never caps an audio-only stream, whose capping loop never starts', () => {
    const policy: RenditionCapPolicy = { maxAutoResolution: '720p' };
    const engine = createEngine([]);
    const Controller = createCapLevelController(policy);
    const controller = new Controller(engine) as InstanceType<typeof Controller> & { destroy(): void };
    controllers.push(controller);

    // No video codec in the manifest, so hls.js defers capping indefinitely.
    emit(engine, Hls.Events.MANIFEST_PARSED, { levels: [], firstLevel: 0, video: false });

    expect(engine.autoLevelCapping).toBe(-1);
  });
});
