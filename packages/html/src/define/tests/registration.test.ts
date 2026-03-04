import { afterAll, beforeAll, describe, expect, it, type MockInstance, vi } from 'vitest';

/**
 * Tests that composite define files register all expected custom elements
 * and that provider/parent elements are defined before consumer/child elements.
 *
 * Tests run sequentially. Each dynamically imports a composite define file and
 * checks the batch of `customElements.define()` calls that resulted. Because
 * modules are cached within a test file, shared sub-elements (e.g. slider parts)
 * are only registered by the first composite that imports them — subsequent
 * composites skip them via `safeDefine`. This is intentional and tested.
 */
describe('composite define registration', () => {
  let spy: MockInstance;

  /** Tag names registered since `offset` (the call count before an import). */
  function batchSince(offset: number): string[] {
    return spy.mock.calls.slice(offset).map((call) => call[0] as string);
  }

  beforeAll(() => {
    spy = vi.spyOn(customElements, 'define');
  });

  afterAll(() => {
    spy.mockRestore();
  });

  // ── Player composites ────────────────────────────────────────────────

  describe('video/player', () => {
    it('registers video-player before media-container', async () => {
      const before = spy.mock.calls.length;
      await import('../video/player');
      const batch = batchSince(before);

      expect(batch).toContain('video-player');
      expect(batch).toContain('media-container');
      expect(batch.indexOf('video-player')).toBeLessThan(batch.indexOf('media-container'));
    });
  });

  describe('audio/player', () => {
    it('registers audio-player', async () => {
      const before = spy.mock.calls.length;
      await import('../audio/player');
      const batch = batchSince(before);

      expect(batch).toContain('audio-player');
      // media-container already registered by video/player — safeDefine skips it
      expect(batch).not.toContain('media-container');
    });
  });

  describe('background/player', () => {
    it('registers background-video-player', async () => {
      const before = spy.mock.calls.length;
      await import('../background/player');
      const batch = batchSince(before);

      expect(batch).toContain('background-video-player');
      expect(batch).not.toContain('media-container');
    });
  });

  // ── Slider composites ────────────────────────────────────────────────

  describe('ui/time-slider', () => {
    it('registers media-time-slider before sub-elements', async () => {
      const before = spy.mock.calls.length;
      await import('../ui/time-slider');
      const batch = batchSince(before);

      // Parent slider must be first (provider for sliderContext)
      expect(batch[0]).toBe('media-time-slider');

      // All sub-elements registered (first composite to claim them)
      expect(batch).toContain('media-slider-buffer');
      expect(batch).toContain('media-slider-fill');
      expect(batch).toContain('media-slider-thumb');
      expect(batch).toContain('media-slider-track');
      expect(batch).toContain('media-slider-value');
    });
  });

  describe('ui/volume-slider', () => {
    it('registers media-volume-slider and skips already-defined sub-elements', async () => {
      const before = spy.mock.calls.length;
      await import('../ui/volume-slider');
      const batch = batchSince(before);

      expect(batch).toContain('media-volume-slider');

      // Sub-elements already registered by time-slider — safeDefine skips them
      expect(batch).not.toContain('media-slider-fill');
      expect(batch).not.toContain('media-slider-thumb');
      expect(batch).not.toContain('media-slider-track');
      expect(batch).not.toContain('media-slider-value');
    });
  });

  describe('ui/slider', () => {
    it('registers media-slider', async () => {
      const before = spy.mock.calls.length;
      await import('../ui/slider');
      const batch = batchSince(before);

      expect(batch).toContain('media-slider');
    });
  });

  // ── Other composites ─────────────────────────────────────────────────

  describe('ui/time', () => {
    it('registers media-time before sub-elements', async () => {
      const before = spy.mock.calls.length;
      await import('../ui/time');
      const batch = batchSince(before);

      expect(batch[0]).toBe('media-time');
      expect(batch).toContain('media-time-group');
      expect(batch).toContain('media-time-separator');
    });
  });

  describe('ui/controls', () => {
    it('registers media-controls before sub-elements', async () => {
      const before = spy.mock.calls.length;
      await import('../ui/controls');
      const batch = batchSince(before);

      expect(batch[0]).toBe('media-controls');
      expect(batch).toContain('media-controls-group');
    });
  });

  // ── Final state ──────────────────────────────────────────────────────

  describe('registry completeness', () => {
    it('all expected elements are registered after importing all composites', () => {
      const expected = [
        // Players + container
        'video-player',
        'audio-player',
        'background-video-player',
        'media-container',
        // Sliders
        'media-slider',
        'media-time-slider',
        'media-volume-slider',
        // Slider sub-elements
        'media-slider-buffer',
        'media-slider-fill',
        'media-slider-thumb',
        'media-slider-track',
        'media-slider-value',
        // Time
        'media-time',
        'media-time-group',
        'media-time-separator',
        // Controls
        'media-controls',
        'media-controls-group',
      ];

      for (const tagName of expected) {
        expect(customElements.get(tagName), `${tagName} should be registered`).toBeDefined();
      }
    });
  });
});
