import type { Page } from '@playwright/test';

export async function mockPresentation(page: Page): Promise<void> {
  await page.addInitScript(() => {
    let fullscreenElement: Element | null = null;
    let pipElement: Element | null = null;

    Object.defineProperties(document, {
      fullscreenElement: { configurable: true, get: () => fullscreenElement },
      fullscreenEnabled: { configurable: true, get: () => true },
      pictureInPictureElement: { configurable: true, get: () => pipElement },
      pictureInPictureEnabled: { configurable: true, get: () => true },
    });

    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: async function requestFullscreen(this: HTMLElement) {
        fullscreenElement = this;
        document.dispatchEvent(new Event('fullscreenchange'));
      },
    });

    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: async () => {
        fullscreenElement = null;
        document.dispatchEvent(new Event('fullscreenchange'));
      },
    });

    Object.defineProperty(HTMLVideoElement.prototype, 'requestPictureInPicture', {
      configurable: true,
      value: async function requestPictureInPicture(this: HTMLVideoElement) {
        pipElement = this;
        this.dispatchEvent(new Event('enterpictureinpicture'));
        return {};
      },
    });

    Object.defineProperties(HTMLVideoElement.prototype, {
      webkitPresentationMode: {
        configurable: true,
        get: function webkitPresentationMode(this: HTMLVideoElement) {
          return pipElement === this ? 'picture-in-picture' : 'inline';
        },
      },
      webkitSetPresentationMode: {
        configurable: true,
        value: function webkitSetPresentationMode(this: HTMLVideoElement, mode: string) {
          const wasPip = pipElement === this;

          pipElement = mode === 'picture-in-picture' ? this : null;

          if (!wasPip && pipElement === this) {
            this.dispatchEvent(new Event('enterpictureinpicture'));
          } else if (wasPip && pipElement !== this) {
            this.dispatchEvent(new Event('leavepictureinpicture'));
          }
        },
      },
    });

    Object.defineProperty(document, 'exitPictureInPicture', {
      configurable: true,
      value: async () => {
        const video = pipElement;

        pipElement = null;
        video?.dispatchEvent(new Event('leavepictureinpicture'));
      },
    });
  });
}
