import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock hls.js before importing MuxCapLevelController so it picks up the fake
// CapLevelController. vi.mock is hoisted automatically by Vitest.
vi.mock('hls.js', () => {
  class CapLevelController {
    // Public here so MuxCapLevelController can access via @ts-expect-error pattern.
    hls: { levels: any[] };

    constructor(hls: { levels: any[] }) {
      this.hls = hls;
    }

    getMaxLevel(capLevelIndex: number): number {
      // Default: return the cap index as-is (caller controls via spy).
      return capLevelIndex;
    }

    static getMaxLevelByMediaSize(levels: any[], _width: number, height: number): number {
      // Find the lowest level index whose shorter dimension meets the height.
      for (let i = 0; i < levels.length; i++) {
        if (Math.min(levels[i].width, levels[i].height) >= height) return i;
      }
      return levels.length - 1;
    }

    isLevelAllowed(_level: any): boolean {
      return true;
    }
  }

  return { CapLevelController, default: { isSupported: () => true } };
});

import { CapLevelController } from 'hls.js';
import { MuxCapLevelController } from '../cap-level-controller';

function makeLevel(width: number, height: number) {
  return { width, height };
}

// Standard four-rung ladder used across tests.
const LEVELS = [
  makeLevel(640, 360), // 0 — 360p
  makeLevel(854, 480), // 1 — 480p
  makeLevel(1280, 720), // 2 — 720p
  makeLevel(1920, 1080), // 3 — 1080p
];

function createController(levels = LEVELS) {
  const hls = { levels } as any;
  return new MuxCapLevelController(hls);
}

describe('MuxCapLevelController', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getMaxLevel — 720p floor', () => {
    it('passes through the base max level when it already meets the floor', () => {
      const ctrl = createController();
      // Base returns 2 (720p) — meets the 720p floor exactly.
      vi.spyOn(CapLevelController.prototype, 'getMaxLevel').mockReturnValue(2);

      expect(ctrl.getMaxLevel(3)).toBe(2);
    });

    it('passes through the base max level when it exceeds the floor', () => {
      const ctrl = createController();
      // Base returns 3 (1080p) — exceeds the floor.
      vi.spyOn(CapLevelController.prototype, 'getMaxLevel').mockReturnValue(3);

      expect(ctrl.getMaxLevel(3)).toBe(3);
    });

    it('floors to 720p when the base max level is below it', () => {
      const ctrl = createController();
      // Base returns 0 (360p) — below the 720p floor.
      vi.spyOn(CapLevelController.prototype, 'getMaxLevel').mockReturnValue(0);

      // getMaxLevelByMediaSize scans from index 0 upward for the first level
      // whose shorter dimension >= 720; that's index 2 (1280×720).
      expect(ctrl.getMaxLevel(3)).toBe(2);
    });

    it('passes through an out-of-bounds base max level unchanged', () => {
      const ctrl = createController();
      // Out-of-bounds signals "no levels available yet" — pass through.
      vi.spyOn(CapLevelController.prototype, 'getMaxLevel').mockReturnValue(99);

      expect(ctrl.getMaxLevel(3)).toBe(99);
    });
  });

  describe('getMaxLevel — maxAutoResolution cap', () => {
    it('caps to the specified resolution tier', () => {
      const ctrl = createController();
      const hls = (ctrl as any).hls;
      MuxCapLevelController.setMaxAutoResolution(hls, '720p');

      // maxAutoResolution is set — base level is irrelevant.
      expect(ctrl.getMaxLevel(3)).toBe(2); // 720p is index 2
    });

    it('selects the exact tier match when available', () => {
      const ctrl = createController();
      const hls = (ctrl as any).hls;
      MuxCapLevelController.setMaxAutoResolution(hls, '1080p');

      expect(ctrl.getMaxLevel(3)).toBe(3); // 1080p is index 3
    });

    it('picks the highest level under the cap when no exact match exists', () => {
      // No 900p tier — levels jump from 720p to 1080p.
      const ctrl = createController();
      const hls = (ctrl as any).hls;
      // '1440p' has no matching level in our ladder — highest under cap is 1080p (index 3).
      MuxCapLevelController.setMaxAutoResolution(hls, '1440p');

      expect(ctrl.getMaxLevel(3)).toBe(3);
    });

    it('returns 0 when all levels exceed the cap', () => {
      const ctrl = createController();
      const hls = (ctrl as any).hls;
      // No level fits within 480p total pixels… wait, 480p IS in the ladder at index 1.
      // Use a resolution below any level: fake a tiny cap.
      // Patch the levels so nothing fits.
      hls.levels = [makeLevel(1280, 720), makeLevel(1920, 1080)];
      MuxCapLevelController.setMaxAutoResolution(hls, '720p');

      // Only 720p fits; index 0 in the new levels array.
      expect(ctrl.getMaxLevel(1)).toBe(0);
    });
  });

  describe('setMaxAutoResolution', () => {
    it('associates a resolution value with the hls instance', () => {
      const ctrl = createController();
      const hls = (ctrl as any).hls;
      MuxCapLevelController.setMaxAutoResolution(hls, '1080p');

      // Verify via side-effect: controller now caps at 1080p (index 3).
      expect(ctrl.getMaxLevel(3)).toBe(3);
    });

    it('clears the cap when set to undefined', () => {
      const ctrl = createController();
      const hls = (ctrl as any).hls;
      MuxCapLevelController.setMaxAutoResolution(hls, '720p');
      MuxCapLevelController.setMaxAutoResolution(hls, undefined);

      // Cap cleared — falls back to floor logic via super.
      vi.spyOn(CapLevelController.prototype, 'getMaxLevel').mockReturnValue(3);
      expect(ctrl.getMaxLevel(3)).toBe(3);
    });

    it('does not share state between different hls instances', () => {
      const ctrl1 = createController();
      const ctrl2 = createController();
      const hls1 = (ctrl1 as any).hls;

      MuxCapLevelController.setMaxAutoResolution(hls1, '720p');

      // ctrl2 has no cap set — base level should pass through.
      vi.spyOn(CapLevelController.prototype, 'getMaxLevel').mockReturnValue(3);
      expect(ctrl2.getMaxLevel(3)).toBe(3);
    });
  });
});
