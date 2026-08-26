import { afterAll, beforeAll, describe, expect, it, type MockInstance, vi } from 'vite-plus/test';

/**
 * Tests that composite define files register all expected custom elements and that provider/parent elements are defined
 * before consumer/child elements.
 *
 * Tests run sequentially. Each dynamically imports a composite define file and checks the batch of
 * `customElements.define()` calls that resulted. Because modules are cached within a test file, shared sub-elements
 * (e.g. slider parts) are only registered by the first composite that imports them — subsequent composites skip them
 * via `safeDefine`. This is intentional and tested.
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
    it('registers only video-player', async () => {
      const before = spy.mock.calls.length;

      await import('../video/player');
      const batch = batchSince(before);

      expect(batch).toEqual(['video-player']);
    });
  });

  describe('audio/player', () => {
    it('registers audio-player', async () => {
      const before = spy.mock.calls.length;

      await import('../audio/player');
      const batch = batchSince(before);

      expect(batch).toEqual(['audio-player']);
    });
  });

  describe('background/player', () => {
    it('registers background-video-player', async () => {
      const before = spy.mock.calls.length;

      await import('../background/player');
      const batch = batchSince(before);

      expect(batch).toEqual(['background-video-player']);
    });
  });

  describe('live-video/player', () => {
    it('registers only live-video-player', async () => {
      const before = spy.mock.calls.length;

      await import('../live-video/player');

      expect(batchSince(before)).toEqual(['live-video-player']);
    });
  });

  describe('live-audio/player', () => {
    it('registers only live-audio-player', async () => {
      const before = spy.mock.calls.length;

      await import('../live-audio/player');

      expect(batchSince(before)).toEqual(['live-audio-player']);
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
      expect(batch).not.toContain('media-time-slider-chapters');
      expect(batch).not.toContain('media-time-slider-chapter-title');
    });
  });

  describe('ui/time-slider-chapters', () => {
    it('registers the opt-in chapter elements', async () => {
      const before = spy.mock.calls.length;

      await import('../ui/time-slider-chapters');
      const batch = batchSince(before);

      expect(batch).toContain('media-time-slider-chapters');
      expect(batch).toContain('media-time-slider-chapter-title');
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

  describe('ui/alert-dialog', () => {
    it('registers media-alert-dialog before sub-elements', async () => {
      const before = spy.mock.calls.length;

      await import('../ui/alert-dialog');
      const batch = batchSince(before);

      expect(batch[0]).toBe('media-alert-dialog');
      expect(batch).toContain('media-dialog-backdrop');
      expect(batch).toContain('media-dialog-close');
      expect(batch).toContain('media-dialog-description');
      expect(batch).toContain('media-dialog-popup');
      expect(batch).toContain('media-dialog-title');
    });
  });

  describe('ui/error-dialog', () => {
    it('registers media-error-dialog and reuses dialog parts', async () => {
      const before = spy.mock.calls.length;

      await import('../ui/error-dialog');
      const batch = batchSince(before);

      expect(batch).toContain('media-error-dialog');
      expect(batch).not.toContain('media-dialog-backdrop');
      expect(batch).not.toContain('media-dialog-close');
      expect(batch).not.toContain('media-dialog-popup');
    });
  });

  describe('ui/controls', () => {
    it('registers media-controls before sub-elements', async () => {
      const before = spy.mock.calls.length;

      await import('../ui/controls');
      const batch = batchSince(before);

      expect(batch[0]).toBe('media-controls');
      expect(batch).toContain('media-controls-backdrop');
      expect(batch).toContain('media-controls-content');
      expect(batch).toContain('media-controls-group');
    });
  });

  describe('video/ui', () => {
    it('registers the elements used by video skins', async () => {
      const before = spy.mock.calls.length;

      await import('../video/ui');
      const batch = batchSince(before);

      expect(batch).toContain('media-container');
      expect(batch).toContain('media-text');
      expect(batch).toContain('media-menu');
      expect(batch).toContain('media-menu-item');
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
        'live-video-player',
        'live-audio-player',
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
        'media-time-slider-chapters',
        'media-time-slider-chapter-title',
        // Time
        'media-time',
        'media-time-group',
        'media-time-separator',
        // Controls
        'media-controls',
        'media-controls-backdrop',
        'media-controls-content',
        'media-controls-group',
        // Dialogs
        'media-alert-dialog',
        'media-dialog-backdrop',
        'media-dialog-close',
        'media-dialog-description',
        'media-dialog-popup',
        'media-dialog-title',
        'media-error-dialog',
      ];

      for (const tagName of expected) {
        expect(customElements.get(tagName), `${tagName} should be registered`).toBeDefined();
      }
    });
  });
});
