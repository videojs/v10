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

import { DashMedia } from '../index';

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

    it('detaches the dash view from the target on destroy', () => {
      const { media } = setup();
      const attachView = media.engine!.attachView as ReturnType<typeof vi.fn>;
      attachView.mockClear();

      media.destroy();

      expect(attachView).toHaveBeenCalledWith(null);
    });
  });
});
