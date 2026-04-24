import { afterEach, describe, expect, it, vi } from 'vitest';

import type { WebKitVideoElement } from '../../presentation/types';
import { createMockVideo } from '../../tests/test-helpers';
import { HTMLVideoElementHost } from '../video-host';

describe('HTMLVideoElementHost', () => {
  afterEach(() => {
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(document, 'pictureInPictureElement', {
      value: null,
      writable: true,
      configurable: true,
    });
  });

  describe('fullscreen', () => {
    describe('requestFullscreen()', () => {
      it('calls native requestFullscreen on the target', async () => {
        const video = createMockVideo();
        video.requestFullscreen = vi.fn().mockResolvedValue(undefined);

        const host = new HTMLVideoElementHost();
        host.attach(video);

        await host.requestFullscreen();

        expect(video.requestFullscreen).toHaveBeenCalled();
      });

      it('prefers webkitEnterFullscreen when available (iOS Safari)', async () => {
        const video = createMockVideo() as HTMLVideoElement & WebKitVideoElement;
        video.requestFullscreen = vi.fn().mockResolvedValue(undefined);
        video.webkitEnterFullscreen = vi.fn();

        const host = new HTMLVideoElementHost();
        host.attach(video);

        await host.requestFullscreen();

        expect(video.webkitEnterFullscreen).toHaveBeenCalled();
        expect(video.requestFullscreen).not.toHaveBeenCalled();
      });

      it('rejects with NotSupportedError when no target is attached', async () => {
        const host = new HTMLVideoElementHost();

        await expect(host.requestFullscreen()).rejects.toThrow('Fullscreen not supported');
      });

      it('rejects with NotSupportedError when neither API is available', async () => {
        const video = createMockVideo();
        (video as unknown as { requestFullscreen: undefined }).requestFullscreen = undefined;

        const host = new HTMLVideoElementHost();
        host.attach(video);

        await expect(host.requestFullscreen()).rejects.toThrow('Fullscreen not supported');
      });
    });

    describe('exitFullscreen()', () => {
      it('calls document.exitFullscreen by default', async () => {
        const originalExit = document.exitFullscreen;
        document.exitFullscreen = vi.fn().mockResolvedValue(undefined);

        const video = createMockVideo();
        const host = new HTMLVideoElementHost();
        host.attach(video);

        await host.exitFullscreen();

        expect(document.exitFullscreen).toHaveBeenCalled();

        document.exitFullscreen = originalExit;
      });

      it('calls webkitExitFullscreen when video is in WebKit fullscreen', async () => {
        const originalExit = document.exitFullscreen;
        document.exitFullscreen = vi.fn();

        const video = createMockVideo() as HTMLVideoElement & WebKitVideoElement;
        video.webkitExitFullscreen = vi.fn();
        video.webkitDisplayingFullscreen = true;

        const host = new HTMLVideoElementHost();
        host.attach(video);

        await host.exitFullscreen();

        expect(video.webkitExitFullscreen).toHaveBeenCalled();
        expect(document.exitFullscreen).not.toHaveBeenCalled();

        document.exitFullscreen = originalExit;
      });
    });

    describe('isFullscreen', () => {
      it('returns false when no target is attached', () => {
        const host = new HTMLVideoElementHost();
        expect(host.isFullscreen).toBe(false);
      });

      it('returns true when document.fullscreenElement matches target', () => {
        const video = createMockVideo();
        const host = new HTMLVideoElementHost();
        host.attach(video);

        Object.defineProperty(document, 'fullscreenElement', {
          value: video,
          writable: true,
          configurable: true,
        });

        expect(host.isFullscreen).toBe(true);
      });

      it('returns true for WebKit fullscreen (iOS Safari)', () => {
        const video = createMockVideo() as HTMLVideoElement & WebKitVideoElement;
        video.webkitDisplayingFullscreen = true;
        video.webkitPresentationMode = 'fullscreen';

        const host = new HTMLVideoElementHost();
        host.attach(video);

        expect(host.isFullscreen).toBe(true);
      });

      it('returns false when fullscreenElement does not match', () => {
        const video = createMockVideo();
        const host = new HTMLVideoElementHost();
        host.attach(video);

        Object.defineProperty(document, 'fullscreenElement', {
          value: document.createElement('div'),
          writable: true,
          configurable: true,
        });

        expect(host.isFullscreen).toBe(false);
      });
    });
  });

  describe('picture-in-picture', () => {
    describe('requestPictureInPicture()', () => {
      it('calls native requestPictureInPicture on the target', async () => {
        const video = createMockVideo();
        video.requestPictureInPicture = vi.fn().mockResolvedValue({});

        const host = new HTMLVideoElementHost();
        host.attach(video);

        await host.requestPictureInPicture();

        expect(video.requestPictureInPicture).toHaveBeenCalled();
      });

      it('prefers webkitSetPresentationMode when available (iOS Safari)', async () => {
        const video = createMockVideo() as HTMLVideoElement & WebKitVideoElement;
        video.requestPictureInPicture = vi.fn().mockResolvedValue({});
        video.webkitSetPresentationMode = vi.fn((mode) => {
          video.webkitPresentationMode = mode;
          video.dispatchEvent(new Event('webkitpresentationmodechanged'));
        });

        const host = new HTMLVideoElementHost();
        host.attach(video);

        await host.requestPictureInPicture();

        expect(video.webkitSetPresentationMode).toHaveBeenCalledWith('picture-in-picture');
        expect(video.requestPictureInPicture).not.toHaveBeenCalled();
      });

      it('resolves only after the enterpictureinpicture event fires (WebKit)', async () => {
        const video = createMockVideo() as HTMLVideoElement & WebKitVideoElement;
        video.webkitSetPresentationMode = vi.fn();

        const host = new HTMLVideoElementHost();
        host.attach(video);

        const promise = host.requestPictureInPicture();
        const settled = vi.fn();
        promise.then(settled);

        // Defer microtask drain — the promise must not resolve before the event.
        await Promise.resolve();
        expect(settled).not.toHaveBeenCalled();

        video.webkitPresentationMode = 'picture-in-picture';
        video.dispatchEvent(new Event('webkitpresentationmodechanged'));

        await promise;
        expect(settled).toHaveBeenCalled();
      });

      it('resolves immediately when already in picture-in-picture', async () => {
        const video = createMockVideo() as HTMLVideoElement & WebKitVideoElement;
        video.webkitPresentationMode = 'picture-in-picture';
        video.webkitSetPresentationMode = vi.fn();

        const host = new HTMLVideoElementHost();
        host.attach(video);

        await host.requestPictureInPicture();

        expect(video.webkitSetPresentationMode).not.toHaveBeenCalled();
      });

      it('rejects with NotSupportedError when no target is attached', async () => {
        const host = new HTMLVideoElementHost();

        await expect(host.requestPictureInPicture()).rejects.toThrow('Picture-in-Picture not supported');
      });

      it('rejects with NotSupportedError when neither API is available', async () => {
        const video = createMockVideo();
        (video as unknown as { requestPictureInPicture: undefined }).requestPictureInPicture = undefined;

        const host = new HTMLVideoElementHost();
        host.attach(video);

        await expect(host.requestPictureInPicture()).rejects.toThrow('Picture-in-Picture not supported');
      });
    });

    describe('exitPictureInPicture()', () => {
      it('calls document.exitPictureInPicture when in standard PiP', async () => {
        const originalExit = document.exitPictureInPicture;
        const originalElement = Object.getOwnPropertyDescriptor(Document.prototype, 'pictureInPictureElement');
        document.exitPictureInPicture = vi.fn().mockResolvedValue(undefined);

        const video = createMockVideo();
        Object.defineProperty(document, 'pictureInPictureElement', {
          value: video,
          writable: true,
          configurable: true,
        });

        const host = new HTMLVideoElementHost();
        host.attach(video);

        await host.exitPictureInPicture();

        expect(document.exitPictureInPicture).toHaveBeenCalled();

        document.exitPictureInPicture = originalExit;
        if (originalElement) {
          Object.defineProperty(document, 'pictureInPictureElement', originalElement);
        }
      });

      it('uses webkitSetPresentationMode("inline") when in WebKit PiP', async () => {
        const originalExit = document.exitPictureInPicture;
        document.exitPictureInPicture = vi.fn();

        const video = createMockVideo() as HTMLVideoElement & WebKitVideoElement;
        video.webkitPresentationMode = 'picture-in-picture';
        video.webkitSetPresentationMode = vi.fn((mode) => {
          video.webkitPresentationMode = mode;
          video.dispatchEvent(new Event('webkitpresentationmodechanged'));
        });

        const host = new HTMLVideoElementHost();
        host.attach(video);

        await host.exitPictureInPicture();

        expect(video.webkitSetPresentationMode).toHaveBeenCalledWith('inline');
        expect(document.exitPictureInPicture).not.toHaveBeenCalled();

        document.exitPictureInPicture = originalExit;
      });

      it('resolves only after the leavepictureinpicture event fires (WebKit)', async () => {
        const video = createMockVideo() as HTMLVideoElement & WebKitVideoElement;
        video.webkitPresentationMode = 'picture-in-picture';
        video.webkitSetPresentationMode = vi.fn();

        const host = new HTMLVideoElementHost();
        host.attach(video);

        const promise = host.exitPictureInPicture();
        const settled = vi.fn();
        promise.then(settled);

        await Promise.resolve();
        expect(settled).not.toHaveBeenCalled();

        video.webkitPresentationMode = 'inline';
        video.dispatchEvent(new Event('webkitpresentationmodechanged'));

        await promise;
        expect(settled).toHaveBeenCalled();
      });

      it('resolves immediately when not in picture-in-picture', async () => {
        const originalExit = document.exitPictureInPicture;
        document.exitPictureInPicture = vi.fn().mockResolvedValue(undefined);

        const video = createMockVideo();
        const host = new HTMLVideoElementHost();
        host.attach(video);

        await host.exitPictureInPicture();

        expect(document.exitPictureInPicture).not.toHaveBeenCalled();

        document.exitPictureInPicture = originalExit;
      });
    });

    describe('webkit event normalization', () => {
      it('synthesized fullscreenchange bubbles (matching the native event)', () => {
        const video = createMockVideo() as HTMLVideoElement & WebKitVideoElement;
        video.webkitPresentationMode = 'inline';
        video.webkitDisplayingFullscreen = false;

        const host = new HTMLVideoElementHost();
        host.attach(video);

        const fullscreenListener = vi.fn<(e: Event) => void>();
        host.addEventListener('fullscreenchange', fullscreenListener);

        video.webkitPresentationMode = 'fullscreen';
        video.webkitDisplayingFullscreen = true;
        video.dispatchEvent(new Event('webkitpresentationmodechanged'));

        expect(fullscreenListener.mock.calls[0]?.[0].bubbles).toBe(true);
      });

      it('dispatches fullscreenchange when webkitfullscreenchange fires on the target', () => {
        const video = createMockVideo() as HTMLVideoElement & WebKitVideoElement;
        video.webkitDisplayingFullscreen = false;

        const host = new HTMLVideoElementHost();
        host.attach(video);

        const fullscreenListener = vi.fn();
        host.addEventListener('fullscreenchange', fullscreenListener);

        video.webkitDisplayingFullscreen = true;
        video.webkitPresentationMode = 'fullscreen';
        video.dispatchEvent(new Event('webkitfullscreenchange'));

        expect(fullscreenListener).toHaveBeenCalledTimes(1);
      });

      it('dispatches fullscreenchange when entering WebKit fullscreen', () => {
        const video = createMockVideo() as HTMLVideoElement & WebKitVideoElement;
        video.webkitPresentationMode = 'inline';
        video.webkitDisplayingFullscreen = false;

        const host = new HTMLVideoElementHost();
        host.attach(video);

        const fullscreenListener = vi.fn();
        host.addEventListener('fullscreenchange', fullscreenListener);

        video.webkitPresentationMode = 'fullscreen';
        video.webkitDisplayingFullscreen = true;
        video.dispatchEvent(new Event('webkitpresentationmodechanged'));

        expect(fullscreenListener).toHaveBeenCalledTimes(1);
      });

      it('dispatches fullscreenchange when exiting WebKit fullscreen', () => {
        const video = createMockVideo() as HTMLVideoElement & WebKitVideoElement;
        video.webkitPresentationMode = 'fullscreen';
        video.webkitDisplayingFullscreen = true;

        const host = new HTMLVideoElementHost();
        host.attach(video);

        const fullscreenListener = vi.fn();
        host.addEventListener('fullscreenchange', fullscreenListener);

        video.webkitPresentationMode = 'inline';
        video.webkitDisplayingFullscreen = false;
        video.dispatchEvent(new Event('webkitpresentationmodechanged'));

        expect(fullscreenListener).toHaveBeenCalledTimes(1);
      });

      it('does not dispatch fullscreenchange when only the PiP state changes', () => {
        const video = createMockVideo() as HTMLVideoElement & WebKitVideoElement;
        video.webkitPresentationMode = 'picture-in-picture';

        const host = new HTMLVideoElementHost();
        host.attach(video);

        const fullscreenListener = vi.fn();
        host.addEventListener('fullscreenchange', fullscreenListener);

        video.webkitPresentationMode = 'inline';
        video.dispatchEvent(new Event('webkitpresentationmodechanged'));

        expect(fullscreenListener).not.toHaveBeenCalled();
      });

      it('dispatches enterpictureinpicture when entering WebKit PiP', () => {
        const video = createMockVideo() as HTMLVideoElement & WebKitVideoElement;
        video.webkitPresentationMode = 'inline';

        const host = new HTMLVideoElementHost();
        host.attach(video);

        const enterListener = vi.fn();
        const leaveListener = vi.fn();
        host.addEventListener('enterpictureinpicture', enterListener);
        host.addEventListener('leavepictureinpicture', leaveListener);

        video.webkitPresentationMode = 'picture-in-picture';
        video.dispatchEvent(new Event('webkitpresentationmodechanged'));

        expect(enterListener).toHaveBeenCalledTimes(1);
        expect(leaveListener).not.toHaveBeenCalled();
      });

      it('dispatches leavepictureinpicture when exiting WebKit PiP', () => {
        const video = createMockVideo() as HTMLVideoElement & WebKitVideoElement;
        video.webkitPresentationMode = 'picture-in-picture';

        const host = new HTMLVideoElementHost();
        host.attach(video);

        const enterListener = vi.fn();
        const leaveListener = vi.fn();
        host.addEventListener('enterpictureinpicture', enterListener);
        host.addEventListener('leavepictureinpicture', leaveListener);

        video.webkitPresentationMode = 'inline';
        video.dispatchEvent(new Event('webkitpresentationmodechanged'));

        expect(leaveListener).toHaveBeenCalledTimes(1);
        expect(enterListener).not.toHaveBeenCalled();
      });

      it('does not dispatch when the PiP state does not change (e.g. fullscreen transition)', () => {
        const video = createMockVideo() as HTMLVideoElement & WebKitVideoElement;
        video.webkitPresentationMode = 'inline';

        const host = new HTMLVideoElementHost();
        host.attach(video);

        const enterListener = vi.fn();
        const leaveListener = vi.fn();
        host.addEventListener('enterpictureinpicture', enterListener);
        host.addEventListener('leavepictureinpicture', leaveListener);

        video.webkitPresentationMode = 'fullscreen';
        video.dispatchEvent(new Event('webkitpresentationmodechanged'));

        expect(enterListener).not.toHaveBeenCalled();
        expect(leaveListener).not.toHaveBeenCalled();
      });

      it('stops forwarding after detach', () => {
        const video = createMockVideo() as HTMLVideoElement & WebKitVideoElement;
        video.webkitPresentationMode = 'inline';

        const host = new HTMLVideoElementHost();
        host.attach(video);

        const enterListener = vi.fn();
        host.addEventListener('enterpictureinpicture', enterListener);

        host.detach();

        video.webkitPresentationMode = 'picture-in-picture';
        video.dispatchEvent(new Event('webkitpresentationmodechanged'));

        expect(enterListener).not.toHaveBeenCalled();
      });
    });

    describe('isPictureInPicture', () => {
      it('returns false when no target is attached', () => {
        const host = new HTMLVideoElementHost();
        expect(host.isPictureInPicture).toBe(false);
      });

      it('returns true when document.pictureInPictureElement matches target', () => {
        const video = createMockVideo();
        const host = new HTMLVideoElementHost();
        host.attach(video);

        Object.defineProperty(document, 'pictureInPictureElement', {
          value: video,
          writable: true,
          configurable: true,
        });

        expect(host.isPictureInPicture).toBe(true);
      });

      it('returns true for WebKit PiP presentation mode (iOS Safari)', () => {
        const video = createMockVideo() as HTMLVideoElement & WebKitVideoElement;
        video.webkitPresentationMode = 'picture-in-picture';

        const host = new HTMLVideoElementHost();
        host.attach(video);

        expect(host.isPictureInPicture).toBe(true);
      });

      it('returns false when not in PiP', () => {
        const video = createMockVideo();
        const host = new HTMLVideoElementHost();
        host.attach(video);

        expect(host.isPictureInPicture).toBe(false);
      });
    });
  });
});
