import { expect, type Page, test } from '@playwright/test';

import { ALL_VIDEO_PAGES, type PageEntry, VIDEO_PAGES } from '../../../shared/fixtures/media';
import { mockPresentation } from '../../../shared/fixtures/presentation';
import { DATA_ATTRS, SELECTORS } from '../../../shared/fixtures/selectors';
import { PlayerPage } from '../../../shared/page-objects/player';

const UI_CONTRACT_PAGES = VIDEO_PAGES.filter(({ media }) => media === 'video');
const HTML_VIDEO_MP4_PATH = '/pages/html-video-mp4.html';

function getMediaVolume(page: Page): Promise<number> {
  return page.evaluate((selector) => {
    const media = document.querySelector(selector) as HTMLMediaElement | null;
    const actual = (media?.querySelector?.('video') as HTMLMediaElement) ?? media;

    return actual?.volume ?? 1;
  }, SELECTORS.media);
}

for (const { name, path, skipBrowsers } of ALL_VIDEO_PAGES as readonly PageEntry[]) {
  const rateMenu = !path.includes('/cdn-video');

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

    test('supports the shared media controls contract', async () => {
      await test.step('exposes the expected controls and state', async () => {
        await expect(player.muteButton).toHaveAttribute(DATA_ATTRS.volumeLevel);
        await expect(player.fullscreenButton).toHaveAttribute(DATA_ATTRS.availability);

        // PiP is unsupported on WebKit and the button receives the `hidden` attribute.
        // Only assert `data-availability` when the pip button is visible.
        if (await player.pipButton.isVisible()) {
          await expect(player.pipButton).toHaveAttribute(DATA_ATTRS.availability);
        }

        await expect(player.settingsButton).toBeAttached();
        await expect(player.duration).not.toHaveText('');
        await expect(player.poster).toBeAttached();
        await player.showControls();
        await expect(player.controls).toBeAttached();
      });

      if (rateMenu) {
        await test.step('changes the selected playback rate', async () => {
          const initialRate = await player.getPlaybackRate();

          await player.selectAlternativePlaybackRate();

          await expect.poll(async () => player.getPlaybackRate()).not.toBe(initialRate);
        });
      }

      await test.step('plays and pauses playback', async () => {
        await expect(player.playButton).toHaveAttribute(DATA_ATTRS.paused, '');
        await player.play();
        await expect(player.playButton).not.toHaveAttribute(DATA_ATTRS.paused);
        await expect(player.poster).not.toHaveAttribute(DATA_ATTRS.visible);

        await player.pause();
        await expect(player.playButton).toHaveAttribute(DATA_ATTRS.paused, '');
      });

      await test.step('seeks and exposes pointer interaction', async () => {
        await player.seekTo(50);
        await player.hoverTimeSlider(50);
        await expect(player.timeSlider).toHaveAttribute(DATA_ATTRS.pointing, '');
      });

      await test.step('toggles mute', async () => {
        await expect(player.muteButton).toHaveAttribute(DATA_ATTRS.muted, '');
        await player.muteButton.click();
        await expect(player.muteButton).not.toHaveAttribute(DATA_ATTRS.muted);
        await player.muteButton.click();
        await expect(player.muteButton).toHaveAttribute(DATA_ATTRS.muted, '');
      });
    });
  });
}

for (const { framework, name, path } of UI_CONTRACT_PAGES) {
  test.describe(`Video Controls — ${name} UI`, () => {
    test.skip(
      ({ browserName }) => framework === 'react' && browserName !== 'chromium',
      'HTML covers browser-specific UI behavior; React UI integration runs in Chromium.'
    );

    let player: PlayerPage;

    test.beforeEach(async ({ page }) => {
      await page.clock.install();
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

    test('volume popover stays anchored after scrolling the page', async ({ page }) => {
      await page.evaluate(() => {
        document.body.style.minHeight = '300vh';
        document.body.style.paddingTop = '150vh';
        window.scrollTo(0, window.innerHeight * 1.5);
      });
      await player.showControls();
      await player.muteButton.hover();
      await expect(player.volumeSlider).toBeVisible();

      const triggerBox = await player.muteButton.boundingBox();
      const popupBox = await page.locator('.media-volume-popover').first().boundingBox();
      if (!triggerBox || !popupBox) throw new Error('Volume popover not visible');

      expect(popupBox.y + popupBox.height).toBeLessThanOrEqual(triggerBox.y);
      expect(popupBox.y + popupBox.height).toBeGreaterThanOrEqual(triggerBox.y - 16);
    });

    test('controls remain visible while the settings menu is open', async ({ page }) => {
      await player.showControls();
      await player.settingsButton.click();
      await expect(player.settingsSpeedItem).toBeVisible();
      await player.playMedia();

      await page.clock.runFor(2_500);

      await expect(player.controls).toHaveAttribute(DATA_ATTRS.visible, '');
      await expect(player.settingsSpeedItem).toBeVisible();
    });

    // A stationary press never crosses the drag threshold, so the slider stays
    // interactive without becoming `data-dragging`. Controls must still stay up.
    test('controls remain visible during a stationary time slider press', async ({ page }) => {
      await player.play();
      await player.showControls();

      const box = await player.timeSlider.boundingBox();
      if (!box) throw new Error('Time slider not visible');

      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();

      try {
        await expect(player.timeSlider).toHaveAttribute(DATA_ATTRS.interactive, '');
        await page.clock.runFor(2_500);

        await expect(player.controls).toHaveAttribute(DATA_ATTRS.visible, '');
        await expect(player.timeSlider).toHaveAttribute(DATA_ATTRS.interactive, '');
      } finally {
        await page.mouse.up();
      }
    });

    test('controls remain visible while dragging the time slider', async ({ page }) => {
      await player.play();
      await player.showControls();

      const box = await player.timeSlider.boundingBox();
      if (!box) throw new Error('Time slider not visible');

      const y = box.y + box.height / 2;

      await page.mouse.move(box.x + box.width / 2, y);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.6, y);

      try {
        await expect(player.timeSlider).toHaveAttribute(DATA_ATTRS.dragging, '');
        await page.clock.runFor(2_500);

        await expect(player.controls).toHaveAttribute(DATA_ATTRS.visible, '');
        await expect(player.timeSlider).toHaveAttribute(DATA_ATTRS.dragging, '');
      } finally {
        await page.mouse.up();
      }
    });

    test('time slider preserves hover after a mouse drag release', async ({ page }) => {
      await player.showControls();

      const box = await player.timeSlider.boundingBox();
      if (!box) throw new Error('Time slider not visible');

      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;

      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(x + 1, y);
      await page.mouse.up();

      await expect(player.timeSlider).not.toHaveAttribute(DATA_ATTRS.dragging);
      await expect(player.timeSlider).toHaveAttribute(DATA_ATTRS.pointing, '');
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

      await page.clock.runFor(500);
      await expect(player.settingsSpeedItem).toBeVisible();

      await page.clock.runFor(700);
      await expect(player.settingsTooltip).not.toBeVisible();
    });

    test('buffering indicator follows waiting state', async ({ page }) => {
      await player.play();
      await page.evaluate((selector) => {
        const media = document.querySelector(selector) as HTMLMediaElement | null;
        const actual = (media?.querySelector?.('video') as HTMLMediaElement) ?? media;
        if (!actual) return;

        // The store clears `waiting` once playback advances past the stall, so hold the clock where the stall began.
        const stalledAt = actual.currentTime;

        Object.defineProperties(actual, {
          paused: { configurable: true, get: () => false },
          readyState: { configurable: true, get: () => HTMLMediaElement.HAVE_CURRENT_DATA },
          currentTime: { configurable: true, get: () => stalledAt, set: () => {} },
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

    test('play button shows its tooltip on hover', async () => {
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

test.describe('Video Controls — HTML settings transition', () => {
  let player: PlayerPage;

  test.beforeEach(async ({ page }) => {
    player = new PlayerPage(page);
    await page.goto(HTML_VIDEO_MP4_PATH);
    await player.waitForMediaReady();
    await player.showControls();
  });

  test('applies starting styles before the settings menu first becomes visible', async () => {
    const initialFrame = await player.settingsButton.evaluate(
      (element) =>
        new Promise<{ filter: string; opacity: string; open: boolean; scale: string; starting: boolean }>((resolve) => {
          const root = element.getRootNode();

          if (!(element instanceof HTMLElement) || (!(root instanceof Document) && !(root instanceof ShadowRoot))) {
            throw new Error('Expected the HTML settings menu trigger.');
          }

          const popup = root.querySelector<HTMLElement>('media-menu.media-menu-popup');
          if (!popup) throw new Error('Expected the HTML settings menu popup.');

          element.click();
          requestAnimationFrame(() => {
            const style = getComputedStyle(popup);

            resolve({
              filter: style.filter,
              opacity: style.opacity,
              open: popup.matches(':popover-open'),
              scale: style.scale,
              starting: popup.hasAttribute('data-starting-style'),
            });
          });
        })
    );

    expect(initialFrame).toEqual({
      filter: 'blur(4px)',
      opacity: '0',
      open: true,
      scale: '0.95',
      starting: true,
    });
  });
});
