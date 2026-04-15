import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('dashjs', () => {
  function create() {
    return {
      initialize: vi.fn(),
      attachView: vi.fn(),
      attachSource: vi.fn(),
      destroy: vi.fn(),
    };
  }
  return { MediaPlayer: () => ({ create }), default: { MediaPlayer: () => ({ create }) } };
});

import { DashMedia } from '../browser';

afterEach(() => {
  document.body.innerHTML = '';
});

function setup() {
  const video = document.createElement('video');
  document.body.appendChild(video);

  const media = new DashMedia();
  media.attach(video);

  return { media, video };
}

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

    it('nullifies the target reference', () => {
      const { media } = setup();

      expect(media.target).not.toBeNull();

      media.destroy();

      expect(media.target).toBeNull();
    });
  });
});
