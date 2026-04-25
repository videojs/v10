import { afterEach, describe, expect, it } from 'vitest';
import type { WebKitDocument, WebKitVideoElement } from '../../presentation/types';
import { HTMLVideoElementHost } from '../video-host';

afterEach(() => {
  document.body.innerHTML = '';
  Object.defineProperty(document, 'pictureInPictureElement', {
    value: null,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(document, 'fullscreenElement', {
    value: null,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(document, 'webkitFullscreenElement', {
    value: null,
    writable: true,
    configurable: true,
  });
});

describe('HTMLVideoElementHost', () => {
  describe('isPictureInPicture', () => {
    it('returns false when no target is attached', () => {
      const host = new HTMLVideoElementHost();
      expect(host.isPictureInPicture).toBe(false);
    });

    it('returns true when target is the PiP element', () => {
      const video = document.createElement('video');
      const host = new HTMLVideoElementHost();
      host.attach(video);

      Object.defineProperty(document, 'pictureInPictureElement', {
        value: video,
        writable: true,
        configurable: true,
      });

      expect(host.isPictureInPicture).toBe(true);
    });

    it('reflects target swaps', () => {
      const a = document.createElement('video');
      const b = document.createElement('video');
      const host = new HTMLVideoElementHost();

      Object.defineProperty(document, 'pictureInPictureElement', {
        value: b,
        writable: true,
        configurable: true,
      });

      host.attach(a);
      expect(host.isPictureInPicture).toBe(false);

      host.detach();
      host.attach(b);
      expect(host.isPictureInPicture).toBe(true);
    });

    it('detects WebKit picture-in-picture presentation mode', () => {
      const video = document.createElement('video') as HTMLVideoElement & WebKitVideoElement;
      video.webkitPresentationMode = 'picture-in-picture';

      const host = new HTMLVideoElementHost();
      host.attach(video);

      expect(host.isPictureInPicture).toBe(true);
    });

    it('returns false when WebKit presentation mode is inline', () => {
      const video = document.createElement('video') as HTMLVideoElement & WebKitVideoElement;
      video.webkitPresentationMode = 'inline';

      const host = new HTMLVideoElementHost();
      host.attach(video);

      expect(host.isPictureInPicture).toBe(false);
    });
  });

  describe('isFullscreen', () => {
    it('returns false when no target is attached', () => {
      const host = new HTMLVideoElementHost();
      expect(host.isFullscreen).toBe(false);
    });

    it('returns true when document.fullscreenElement matches the target', () => {
      const video = document.createElement('video');
      const host = new HTMLVideoElementHost();
      host.attach(video);

      Object.defineProperty(document, 'fullscreenElement', {
        value: video,
        writable: true,
        configurable: true,
      });

      expect(host.isFullscreen).toBe(true);
    });

    it('returns true when webkitFullscreenElement matches the target', () => {
      const video = document.createElement('video');
      const host = new HTMLVideoElementHost();
      host.attach(video);

      Object.defineProperty(document as WebKitDocument, 'webkitFullscreenElement', {
        value: video,
        writable: true,
        configurable: true,
      });

      expect(host.isFullscreen).toBe(true);
    });

    it('returns false when fullscreen element is something else', () => {
      const video = document.createElement('video');
      const other = document.createElement('div');
      const host = new HTMLVideoElementHost();
      host.attach(video);

      Object.defineProperty(document, 'fullscreenElement', {
        value: other,
        writable: true,
        configurable: true,
      });

      expect(host.isFullscreen).toBe(false);
    });

    it('detects WebKit fullscreen presentation mode', () => {
      const video = document.createElement('video') as HTMLVideoElement & WebKitVideoElement;
      video.webkitPresentationMode = 'fullscreen';

      const host = new HTMLVideoElementHost();
      host.attach(video);

      expect(host.isFullscreen).toBe(true);
    });

    it('returns false when WebKit presentation mode is inline', () => {
      const video = document.createElement('video') as HTMLVideoElement & WebKitVideoElement;
      video.webkitPresentationMode = 'inline';

      const host = new HTMLVideoElementHost();
      host.attach(video);

      expect(host.isFullscreen).toBe(false);
    });
  });
});
