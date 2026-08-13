import { afterEach, describe, expect, it, vi } from 'vitest';
import { getScreenResolution } from '../screen';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getScreenResolution', () => {
  it('reads the ambient screen', () => {
    // The real browser screen — its size is the environment's to decide, so
    // assert the shape rather than the numbers.
    const resolution = getScreenResolution();

    expect(resolution).toBeDefined();
    expect(resolution!.width).toBeGreaterThan(0);
    expect(resolution!.height).toBeGreaterThan(0);
  });

  it('reports a portrait screen with its axes as given', () => {
    // Not normalized to landscape: whether a cap should flap on rotation is the
    // cap's question, so the reading stays literal.
    vi.stubGlobal('screen', { width: 390, height: 844 });
    vi.stubGlobal('devicePixelRatio', 1);

    expect(getScreenResolution()).toEqual({ width: 390, height: 844 });
  });

  it('returns undefined when there is no screen', () => {
    // The answer a cap needs in order to not cap.
    vi.stubGlobal('screen', undefined);

    expect(getScreenResolution()).toBeUndefined();
  });

  describe('useDevicePixelRatio', () => {
    it('scales into device pixels by default', () => {
      vi.stubGlobal('screen', { width: 1440, height: 900 });
      vi.stubGlobal('devicePixelRatio', 2);

      expect(getScreenResolution()).toEqual({ width: 2880, height: 1800 });
      expect(getScreenResolution({ useDevicePixelRatio: true })).toEqual({ width: 2880, height: 1800 });
    });

    it('reports CSS pixels when opted out', () => {
      vi.stubGlobal('screen', { width: 1440, height: 900 });
      vi.stubGlobal('devicePixelRatio', 2);

      expect(getScreenResolution({ useDevicePixelRatio: false })).toEqual({ width: 1440, height: 900 });
    });

    it('rounds to whole device pixels on a fractional ratio', () => {
      // 390 * 2.75 = 1072.5 → nearest; 844 * 2.75 = 2321 exactly.
      vi.stubGlobal('screen', { width: 390, height: 844 });
      vi.stubGlobal('devicePixelRatio', 2.75);

      expect(getScreenResolution()).toEqual({ width: 1073, height: 2321 });
    });

    it('falls back to CSS pixels for an unusable ratio rather than failing the reading', () => {
      // A CSS-pixel reading is still true and still cappable, so an unusable
      // ratio costs the refinement, not the whole answer.
      vi.stubGlobal('screen', { width: 1440, height: 900 });

      for (const devicePixelRatio of [0, Number.NaN, undefined]) {
        vi.stubGlobal('devicePixelRatio', devicePixelRatio);

        expect(getScreenResolution()).toEqual({ width: 1440, height: 900 });
      }
    });
  });
});
