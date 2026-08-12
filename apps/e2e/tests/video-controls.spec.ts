import { expect, type Page, test } from '@playwright/test';
import { ALL_VIDEO_PAGES, type PageEntry, VIDEO_PAGES } from '../fixtures/media';
import { DATA_ATTRS, SELECTORS } from '../fixtures/selectors';
import { PlayerPage } from '../page-objects/player';

const UI_VIDEO_PAGES = VIDEO_PAGES.filter(({ media }) => media === 'video');
const EJECTED_HTML_VIDEO_PATH = '/pages/ejected-html-video-mp4.html';

function getMediaVolume(page: Page): Promise<number> {
  return page.evaluate((selector) => {
    const media = document.querySelector(selector) as HTMLMediaElement | null;
    const actual = (media?.querySelector?.('video') as HTMLMediaElement) ?? media;
    return actual?.volume ?? 1;
  }, SELECTORS.media);
}

async function mockPresentation(page: Page): Promise<void> {
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

for (const { name, path, skipBrowsers } of ALL_VIDEO_PAGES as readonly PageEntry[]) {
  const rateMenu = !path.includes('/cdn-video') && !path.includes('/ejected');
  test.describe(`Video Controls — ${name}`, () => {
    test.skip(({ browserName }) => {
      return skipBrowsers?.includes(browserName as 'chromium' | 'webkit' | 'firefox') ?? false;
    }, 'Skipped on this browser');
    let player: PlayerPage;

    test.beforeEach(async ({ page }) => {
      player = new PlayerPage(page);
      await page.goto(path);
      await player.waitForMediaReady();
    });

    // --- Grouped: control presence & attributes (one navigation) ---

    test('all controls are present with correct attributes', async () => {
      await expect(player.muteButton).toHaveAttribute(DATA_ATTRS.volumeLevel);
      await expect(player.fullscreenButton).toHaveAttribute(DATA_ATTRS.availability);
      // PiP is unsupported on WebKit and the button receives the `hidden` attribute.
      // Only assert `data-availability` when the pip button is visible.
      if (await player.pipButton.isVisible()) {
        await expect(player.pipButton).toHaveAttribute(DATA_ATTRS.availability);
      }
      await expect(player.settingsButton).toBeAttached();
      await expect(player.duration).not.toHaveText('');
      await player.showControls();
      await expect(player.controls).toBeAttached();
    });

    // --- Play / Pause ---

    test('play button starts playback', async () => {
      await expect(player.playButton).toHaveAttribute(DATA_ATTRS.paused, '');
      await player.play();
      await expect(player.playButton).not.toHaveAttribute(DATA_ATTRS.paused);
    });

    test('play button pauses playback', async () => {
      await player.play();
      await player.pause();
      await expect(player.playButton).toHaveAttribute(DATA_ATTRS.paused, '');
    });

    // --- Time Slider ---

    test('time slider allows seeking', async ({ page }) => {
      await player.seekTo(50);

      await expect
        .poll(
          async () => {
            return page.evaluate((selector) => {
              const el = document.querySelector(selector);
              const media = (el?.querySelector?.('video') as HTMLMediaElement) ?? (el as HTMLMediaElement);
              return media?.currentTime ?? 0;
            }, SELECTORS.media);
          },
          { timeout: 10_000 }
        )
        .toBeGreaterThan(0);
    });

    test('time slider shows interactive state on hover', async () => {
      await player.hoverTimeSlider(50);
      await expect(player.timeSlider).toHaveAttribute(DATA_ATTRS.pointing, '');
    });

    // --- Mute ---

    test('mute button toggles mute', async () => {
      await expect(player.muteButton).toHaveAttribute(DATA_ATTRS.muted, '');
      await player.muteButton.click();
      await expect(player.muteButton).not.toHaveAttribute(DATA_ATTRS.muted);
      await player.muteButton.click();
      await expect(player.muteButton).toHaveAttribute(DATA_ATTRS.muted, '');
    });

    // --- Playback Rate ---

    (rateMenu ? test : test.skip)('playback rate menu changes selected rate', async () => {
      const initialRate = await player.getPlaybackRate();

      await player.selectAlternativePlaybackRate();

      await expect.poll(async () => player.getPlaybackRate()).not.toBe(initialRate);
    });

    // --- Poster ---

    test('poster hides after playback starts', async () => {
      await expect(player.poster).toBeAttached();
      await player.play();

      await expect(player.poster).not.toHaveAttribute(DATA_ATTRS.visible);
    });
  });
}

test.describe('Video Controls — Ejected HTML registration', () => {
  test('upgrades connected markup before registration', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    const player = new PlayerPage(page);
    await page.goto(EJECTED_HTML_VIDEO_PATH);
    await player.waitForMediaReady();
    await player.showControls();
    await player.muteButton.hover();

    await expect(player.volumeSlider).toBeVisible();
    await player.selectAlternativePlaybackRate();
    expect(errors).toEqual([]);
  });
});

for (const { name, path } of UI_VIDEO_PAGES) {
  test.describe(`Video Controls — ${name} UI`, () => {
    let player: PlayerPage;

    test.beforeEach(async ({ page }) => {
      await mockPresentation(page);
      player = new PlayerPage(page);
      await page.goto(path);
      await player.waitForMediaReady();
    });

    test('volume slider changes volume', async ({ page }) => {
      await player.showControls();
      await player.muteButton.hover();

      await expect(player.volumeSlider).toBeVisible();

      const box = await player.volumeSlider.boundingBox();
      if (!box) throw new Error('Volume slider not visible');

      await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.75);

      await expect.poll(() => getMediaVolume(page)).toBeLessThan(0.5);
    });

    test('controls remain visible while the settings menu is open', async ({ page }) => {
      await player.showControls();
      await player.settingsButton.click();
      await expect(player.settingsSpeedItem).toBeVisible();
      await player.playMedia();

      await page.waitForTimeout(2_500);

      await expect(player.controls).toHaveAttribute(DATA_ATTRS.visible, '');
      await expect(player.settingsSpeedItem).toBeVisible();
    });

    test('controls remain visible during a stationary time slider drag', async ({ page }) => {
      await player.play();
      await player.showControls();

      const box = await player.timeSlider.boundingBox();
      if (!box) throw new Error('Time slider not visible');

      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();

      try {
        await expect(player.timeSlider).toHaveAttribute(DATA_ATTRS.dragging, '');
        await page.waitForTimeout(2_500);

        await expect(player.controls).toHaveAttribute(DATA_ATTRS.visible, '');
        await expect(player.timeSlider).toHaveAttribute(DATA_ATTRS.dragging, '');
      } finally {
        await page.mouse.up();
      }
    });

    test('settings button shows its tooltip on focus and still opens the menu', async ({ page }) => {
      await player.showControls();
      await player.settingsButton.focus();

      await expect(player.settingsTooltip).toHaveAttribute(DATA_ATTRS.open, '', { timeout: 2_000 });

      const playerBox = await player.playerRoot.boundingBox();
      const triggerBox = await player.settingsButton.boundingBox();
      const tooltipBox = await player.settingsTooltip.boundingBox();
      if (!playerBox || !triggerBox || !tooltipBox) throw new Error('Settings tooltip not visible');
      expect(tooltipBox.x).toBeGreaterThanOrEqual(playerBox.x);
      expect(tooltipBox.y).toBeGreaterThanOrEqual(playerBox.y);
      expect(tooltipBox.x + tooltipBox.width).toBeLessThanOrEqual(playerBox.x + playerBox.width);
      expect(tooltipBox.y + tooltipBox.height).toBeLessThanOrEqual(playerBox.y + playerBox.height);
      expect(tooltipBox.y + tooltipBox.height).toBeLessThanOrEqual(triggerBox.y);
      expect(tooltipBox.y + tooltipBox.height).toBeGreaterThanOrEqual(triggerBox.y - 16);

      await player.settingsButton.click();
      await expect(player.settingsSpeedItem).toBeVisible();
      await expect(player.settingsTooltip).not.toBeVisible();

      await page.waitForTimeout(500);
      await expect(player.settingsSpeedItem).toBeVisible();

      await page.waitForTimeout(700);
      await expect(player.settingsTooltip).not.toBeVisible();
    });

    test('buffering indicator follows waiting state', async ({ page }) => {
      await player.play();
      await page.evaluate((selector) => {
        const media = document.querySelector(selector) as HTMLMediaElement | null;
        const actual = (media?.querySelector?.('video') as HTMLMediaElement) ?? media;
        if (!actual) return;

        Object.defineProperties(actual, {
          paused: { configurable: true, get: () => false },
          readyState: { configurable: true, get: () => HTMLMediaElement.HAVE_CURRENT_DATA },
        });
        actual.dispatchEvent(new Event('waiting'));
      }, SELECTORS.media);

      await expect(player.bufferingIndicator).toHaveAttribute(DATA_ATTRS.visible, '', { timeout: 2_000 });

      await page.evaluate((selector) => {
        const media = document.querySelector(selector) as HTMLMediaElement | null;
        const actual = (media?.querySelector?.('video') as HTMLMediaElement) ?? media;
        if (!actual) return;

        Object.defineProperty(actual, 'readyState', {
          configurable: true,
          get: () => HTMLMediaElement.HAVE_ENOUGH_DATA,
        });
        actual.dispatchEvent(new Event('playing'));
      }, SELECTORS.media);

      await expect(player.bufferingIndicator).not.toHaveAttribute(DATA_ATTRS.visible);
    });

    test('play button shows its tooltip on hover', async ({ page }) => {
      await player.showControls();
      await player.playButton.hover();

      await expect(player.playTooltip).toHaveAttribute(DATA_ATTRS.open, '', { timeout: 2_000 });
    });

    test('play button reflects ended playback', async ({ page }) => {
      await page.evaluate((selector) => {
        const media = document.querySelector(selector) as HTMLMediaElement | null;
        const actual = (media?.querySelector?.('video') as HTMLMediaElement) ?? media;
        if (!actual) return;

        Object.defineProperties(actual, {
          ended: { configurable: true, get: () => true },
          paused: { configurable: true, get: () => true },
        });
        actual.dispatchEvent(new Event('ended'));
      }, SELECTORS.media);

      await expect(player.playButton).toHaveAttribute(DATA_ATTRS.ended, '');
    });

    test('fullscreen button toggles fullscreen', async () => {
      await expect(player.fullscreenButton).toHaveAttribute(DATA_ATTRS.availability, 'available');

      await player.fullscreenButton.click();
      await expect(player.fullscreenButton).toHaveAttribute(DATA_ATTRS.fullscreen, '');

      await player.fullscreenButton.click();
      await expect(player.fullscreenButton).not.toHaveAttribute(DATA_ATTRS.fullscreen);
    });

    test('PiP button toggles picture-in-picture', async () => {
      await expect(player.pipButton).toHaveAttribute(DATA_ATTRS.availability, 'available');

      await player.pipButton.click();
      await expect(player.pipButton).toHaveAttribute(DATA_ATTRS.pip, '');

      await player.pipButton.click();
      await expect(player.pipButton).not.toHaveAttribute(DATA_ATTRS.pip);
    });
  });
}
