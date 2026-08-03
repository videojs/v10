import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('dashjs', () => {
  function create() {
    return {
      initialize: vi.fn(),
      attachView: vi.fn(),
      attachSource: vi.fn(),
      updateSettings: vi.fn(),
      resetSettings: vi.fn(),
      destroy: vi.fn(),
    };
  }
  return { MediaPlayer: () => ({ create }), default: { MediaPlayer: () => ({ create }) } };
});

import type { DashSource } from '../index';
import { DashMedia } from '../index';

afterEach(() => {
  document.body.innerHTML = '';
});

function setup() {
  const video = document.createElement('video');
  document.body.appendChild(video);

  const media = new DashMedia();
  media.attach(video);

  return { media, video, engine: spies(media) };
}

function spies(media: DashMedia) {
  const engine = media.engine as unknown as Record<string, ReturnType<typeof vi.fn>>;
  return {
    attachSource: engine.attachSource!,
    updateSettings: engine.updateSettings!,
    resetSettings: engine.resetSettings!,
  };
}

const MANIFEST = 'https://example.com/manifest.mpd';

describe('DashMedia', () => {
  describe('destroy', () => {
    it('removes forwarding listeners from the native element', () => {
      const { media, video } = setup();

      const playHandler = vi.fn();
      media.addEventListener('play', playHandler);

      video.dispatchEvent(new Event('play'));
      expect(playHandler).toHaveBeenCalledOnce();

      media.destroy();
      playHandler.mockClear();

      video.dispatchEvent(new Event('play'));
      expect(playHandler).not.toHaveBeenCalled();
    });

    it('detaches the dash view from the target on destroy', () => {
      const { media } = setup();
      const attachView = media.engine!.attachView as ReturnType<typeof vi.fn>;
      attachView.mockClear();

      media.destroy();

      expect(attachView).toHaveBeenCalledWith(null);
    });
  });

  describe('source', () => {
    it('forwards engine settings to the dash.js player', () => {
      const { media, engine } = setup();

      media.source = { src: MANIFEST, engine: { streaming: { abandonLoadTimeout: 1000 } } };

      expect(engine.updateSettings).toHaveBeenCalledWith({ streaming: { abandonLoadTimeout: 1000 } });
    });

    it('derives src and attaches the manifest', () => {
      const { media, engine } = setup();
      const sourcechange = vi.fn();
      media.addEventListener('sourcechange', sourcechange);

      media.source = { src: MANIFEST };

      expect(media.src).toBe(MANIFEST);
      expect(engine.attachSource).toHaveBeenCalledWith(MANIFEST);
      expect(sourcechange).toHaveBeenCalledTimes(1);
    });

    it('leaves the engine alone for a structurally equal source', () => {
      const { media, engine } = setup();
      const source: DashSource = { src: MANIFEST, engine: { streaming: { abandonLoadTimeout: 1000 } } };
      media.source = source;

      const sourcechange = vi.fn();
      media.addEventListener('sourcechange', sourcechange);
      engine.attachSource.mockClear();
      engine.updateSettings.mockClear();
      engine.resetSettings.mockClear();

      media.source = { src: MANIFEST, engine: { streaming: { abandonLoadTimeout: 1000 } } };

      // Assigning is always announced, but nothing reaches dash.js, so an inline
      // React prop cannot disturb what is already playing.
      expect(sourcechange).toHaveBeenCalledOnce();
      expect(engine.attachSource).not.toHaveBeenCalled();
      expect(engine.updateSettings).not.toHaveBeenCalled();
      expect(engine.resetSettings).not.toHaveBeenCalled();
      expect(media.source).toEqual(source);
    });

    it('does not re-attach the manifest when only engine options change', () => {
      const { media, engine } = setup();
      media.source = { src: MANIFEST, engine: { streaming: { abandonLoadTimeout: 1000 } } };
      engine.attachSource.mockClear();

      media.source = { src: MANIFEST, engine: { streaming: { abandonLoadTimeout: 2000 } } };

      expect(engine.attachSource).not.toHaveBeenCalled();
      expect(engine.updateSettings).toHaveBeenLastCalledWith({ streaming: { abandonLoadTimeout: 2000 } });
    });

    it('resets settings instead of merging when an engine option is dropped', () => {
      const { media, engine } = setup();
      media.source = {
        src: MANIFEST,
        engine: { streaming: { abandonLoadTimeout: 1000, cacheInitSegments: true } },
      };
      engine.updateSettings.mockClear();
      engine.resetSettings.mockClear();

      media.source = { src: MANIFEST, engine: { streaming: { cacheInitSegments: true } } };

      expect(engine.resetSettings).toHaveBeenCalledOnce();
      expect(engine.resetSettings.mock.invocationCallOrder[0]!).toBeLessThan(
        engine.updateSettings.mock.invocationCallOrder[0]!
      );
      expect(engine.updateSettings).toHaveBeenCalledExactlyOnceWith({ streaming: { cacheInitSegments: true } });
    });

    it('resets settings when engine options are removed entirely', () => {
      const { media, engine } = setup();
      media.source = { src: MANIFEST, engine: { streaming: { abandonLoadTimeout: 1000 } } };
      engine.updateSettings.mockClear();
      engine.resetSettings.mockClear();

      media.source = { src: MANIFEST };

      expect(engine.resetSettings).toHaveBeenCalledOnce();
      expect(engine.updateSettings).not.toHaveBeenCalled();
    });

    it('clears src when set to null', () => {
      const { media, engine } = setup();
      media.source = { src: MANIFEST };
      engine.attachSource.mockClear();

      media.source = null;

      expect(media.src).toBe('');
      expect(media.source).toBeNull();
      expect(engine.attachSource).toHaveBeenCalledWith('');
    });
  });

  describe('src', () => {
    it('preserves source engine options across a src change', () => {
      const { media, engine } = setup();
      media.source = { src: MANIFEST, engine: { streaming: { abandonLoadTimeout: 1000 } } };
      engine.updateSettings.mockClear();
      engine.resetSettings.mockClear();

      media.src = 'https://example.com/other.mpd';

      expect(media.source).toEqual({
        src: 'https://example.com/other.mpd',
        engine: { streaming: { abandonLoadTimeout: 1000 } },
      });
      expect(engine.attachSource).toHaveBeenLastCalledWith('https://example.com/other.mpd');
      // Carried-over options are already applied to the live player.
      expect(engine.resetSettings).not.toHaveBeenCalled();
      expect(engine.updateSettings).not.toHaveBeenCalled();
    });

    it('fires sourcechange through the source setter', () => {
      const { media, engine } = setup();
      const sourcechange = vi.fn(() => media.source?.src);
      media.addEventListener('sourcechange', sourcechange);

      media.src = MANIFEST;

      expect(sourcechange).toHaveBeenCalledTimes(1);
      expect(sourcechange).toHaveReturnedWith(MANIFEST);

      engine.attachSource.mockClear();
      media.src = MANIFEST;

      // Every assignment is announced, but the same URL is not re-attached.
      expect(sourcechange).toHaveBeenCalledTimes(2);
      expect(engine.attachSource).not.toHaveBeenCalled();
    });
  });
});
