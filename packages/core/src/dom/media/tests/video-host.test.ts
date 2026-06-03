import type { WebKitDocument, WebKitVideoElement } from '@videojs/utils/dom';
import { afterEach, describe, expect, it } from 'vitest';
import { EMPTY_CONFIG, EMPTY_TIME_RANGES } from '../constants';
import { HTMLVideoElementHost } from '../html-video-element-host';

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
  describe('delegating props', () => {
    it('returns defaults when no target is attached', () => {
      const host = new HTMLVideoElementHost();

      expect(host.crossOrigin).toBeNull();
      expect(host.defaultPlaybackRate).toBe(1);
      expect(host.played).toBe(EMPTY_TIME_RANGES);
      expect(host.autoplay).toBe(false);
      expect(host.defaultMuted).toBe(false);
      expect(host.controls).toBe(false);
      expect(host.config).toBe(EMPTY_CONFIG);
      expect(host.playsInline).toBe(false);
      expect(host.disablePictureInPicture).toBe(false);
      expect(host.videoWidth).toBe(0);
      expect(host.videoHeight).toBe(0);
    });

    it('delegates reads to the attached target', () => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.defaultPlaybackRate = 2;
      video.autoplay = true;
      video.defaultMuted = true;
      video.controls = true;
      video.playsInline = true;
      video.disablePictureInPicture = true;

      const host = new HTMLVideoElementHost();
      host.target = video;

      expect(host.crossOrigin).toBe('anonymous');
      expect(host.defaultPlaybackRate).toBe(2);
      expect(host.autoplay).toBe(true);
      expect(host.defaultMuted).toBe(true);
      expect(host.controls).toBe(true);
      expect(host.playsInline).toBe(true);
      expect(host.disablePictureInPicture).toBe(true);
    });

    it('delegates writes to the attached target', () => {
      const video = document.createElement('video');
      const host = new HTMLVideoElementHost();
      host.target = video;

      host.crossOrigin = 'use-credentials';
      host.defaultPlaybackRate = 1.5;
      host.autoplay = true;
      host.controls = true;
      host.playsInline = true;
      host.disablePictureInPicture = true;

      expect(video.crossOrigin).toBe('use-credentials');
      expect(video.defaultPlaybackRate).toBe(1.5);
      expect(video.autoplay).toBe(true);
      expect(video.controls).toBe(true);
      expect(video.playsInline).toBe(true);
      expect(video.disablePictureInPicture).toBe(true);
    });
  });

  describe('isPictureInPicture', () => {
    it('returns false when no target is attached', () => {
      const host = new HTMLVideoElementHost();
      expect(host.isPictureInPicture).toBe(false);
    });

    it('returns true when target is the PiP element', () => {
      const video = document.createElement('video');
      const host = new HTMLVideoElementHost();
      host.target = video;

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

      host.target = a;
      expect(host.isPictureInPicture).toBe(false);

      host.target = null;
      host.target = b;
      expect(host.isPictureInPicture).toBe(true);
    });

    it('detects WebKit picture-in-picture presentation mode', () => {
      const video = document.createElement('video') as HTMLVideoElement & WebKitVideoElement;
      video.webkitPresentationMode = 'picture-in-picture';

      const host = new HTMLVideoElementHost();
      host.target = video;

      expect(host.isPictureInPicture).toBe(true);
    });

    it('returns false when WebKit presentation mode is inline', () => {
      const video = document.createElement('video') as HTMLVideoElement & WebKitVideoElement;
      video.webkitPresentationMode = 'inline';

      const host = new HTMLVideoElementHost();
      host.target = video;

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
      host.target = video;

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
      host.target = video;

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
      host.target = video;

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
      host.target = video;

      expect(host.isFullscreen).toBe(true);
    });

    it('returns false when WebKit presentation mode is inline', () => {
      const video = document.createElement('video') as HTMLVideoElement & WebKitVideoElement;
      video.webkitPresentationMode = 'inline';

      const host = new HTMLVideoElementHost();
      host.target = video;

      expect(host.isFullscreen).toBe(false);
    });
  });
});
