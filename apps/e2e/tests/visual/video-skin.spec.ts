import { expect, test } from '@playwright/test';
import { DATA_ATTRS, SELECTORS } from '../../fixtures/selectors';
import { PlayerPage } from '../../page-objects/player';

/**
 * Visual snapshot tests for the video skin.
 *
 * These verify the skin's CSS and layout aren't broken — not UX interactions.
 * Strategy:
 * - Screenshot the skin container in its initial paused state
 * - Generous pixel thresholds absorb cross-platform rendering differences
 * - Animations disabled globally (configured in playwright.config.ts)
 */

const VISUAL_PAGES = [
  { name: 'HTML', path: '/pages/html-video-mp4.html' },
  { name: 'React', path: '/pages/react-video-mp4.html' },
  { name: 'Ejected-HTML', path: '/pages/ejected-html-video-mp4.html' },
  { name: 'Ejected-React', path: '/pages/ejected-react-video-mp4.html' },
  { name: 'CDN', path: '/pages/cdn-video-mp4.html' },
];

for (const { name, path } of VISUAL_PAGES) {
  test.describe(`Visual — Video Skin (${name})`, () => {
    let player: PlayerPage;

    test.beforeEach(async ({ page }) => {
      player = new PlayerPage(page);
      await page.goto(path);
      await player.waitForMediaReady();
    });

    test('default paused state', async ({ page }) => {
      await player.showControls();
      await page.waitForTimeout(300);

      await expect(player.playerRoot).toHaveScreenshot(`video-${name.toLowerCase()}-default.png`);
    });

    test('storyboard thumbnail on hover', async ({ page }) => {
      await player.hoverTimeSlider(50);

      // Wait for thumbnail to finish loading (deterministic, no fixed timeout)
      const thumbnail = page.locator(SELECTORS.thumbnail).first();
      await expect(thumbnail).toBeAttached({ timeout: 10_000 });
      await expect(thumbnail).not.toHaveAttribute(DATA_ATTRS.loading, { timeout: 10_000 });

      await expect(player.playerRoot).toHaveScreenshot(`video-${name.toLowerCase()}-storyboard.png`);
    });
  });
}

// --- Portrait media layout ---

test.describe('Visual — HTML Portrait Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pages/html-video-mp4.html', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => customElements.get('video-skin'));
    await page.evaluate(() => {
      const root = document.getElementById('root');
      if (!root) return;

      root.innerHTML = `
        <video-player>
          <video-skin style="width: 320px; aspect-ratio: 16/9">
            <video width="270" height="480" playsinline></video>
          </video-skin>
        </video-player>
      `;
    });
  });

  test('keeps the authored skin aspect ratio', async ({ page }) => {
    const box = await page.evaluate(() => {
      const container = document.querySelector('video-skin')?.shadowRoot?.querySelector('media-container');
      const rect = container?.getBoundingClientRect();

      return rect ? { height: rect.height, width: rect.width } : null;
    });

    expect(box).not.toBeNull();
    expect(box!.width / box!.height).toBeCloseTo(16 / 9, 1);
  });

  test('caps portrait thumbnails to the configured max height', async ({ page }) => {
    const src = `data:image/svg+xml,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="270" height="480" viewBox="0 0 270 480"><rect width="270" height="480" fill="black"/></svg>'
    )}`;

    await page.evaluate((url) => {
      const thumbnail = document
        .querySelector('video-skin')
        ?.shadowRoot?.querySelector('media-slider-thumbnail') as HTMLElement & {
        thumbnails?: Array<{ url: string; startTime: number; width: number; height: number }>;
      };

      if (!thumbnail) return;
      thumbnail.thumbnails = [{ url, startTime: 0, width: 270, height: 480 }];
    }, src);

    await page.waitForFunction(() => {
      const thumbnail = document.querySelector('video-skin')?.shadowRoot?.querySelector('media-slider-thumbnail');

      return (
        thumbnail &&
        !thumbnail.hasAttribute('data-hidden') &&
        !thumbnail.hasAttribute('data-loading') &&
        parseFloat(getComputedStyle(thumbnail).height) > 0
      );
    });

    const size = await page.evaluate(() => {
      const thumbnail = document.querySelector('video-skin')!.shadowRoot!.querySelector('media-slider-thumbnail')!;
      const style = getComputedStyle(thumbnail);
      const probe = document.createElement('div');
      probe.style.height = style.getPropertyValue('--media-slider-thumbnail-max-height');
      document.body.append(probe);

      const configuredMaxHeight = parseFloat(getComputedStyle(probe).height);
      probe.remove();

      return {
        height: parseFloat(style.height),
        configuredMaxHeight,
        maxHeight: parseFloat(style.maxHeight),
      };
    });

    expect(size.maxHeight).toBeCloseTo(size.configuredMaxHeight, 0);
    expect(size.height).toBeLessThanOrEqual(size.maxHeight);
  });
});

// --- Captions snapshot (dedicated page with subtitle track baked in) ---

test.describe('Visual — Captions', () => {
  let player: PlayerPage;

  test.beforeEach(async ({ page }) => {
    player = new PlayerPage(page);
    await page.goto('/pages/html-video-captions.html');
    await player.waitForMediaReady();
  });

  test('captions enabled', async ({ page, browserName }) => {
    // WebKit doesn't render data:text/vtt subtitle tracks in headless mode
    test.skip(browserName === 'webkit', 'WebKit headless does not render data:text/vtt captions');

    await player.showControls();
    await player.openCaptionsSettings();
    await expect(page.locator(SELECTORS.activeMenuOptions)).toHaveCount(2);
    await page.locator(SELECTORS.activeMenuOptions).nth(1).dispatchEvent('click');

    // Play briefly so the caption cue at 0:00 activates, then pause
    await player.play();
    await page.waitForTimeout(500);
    await player.pause();
    await player.showControls();

    await expect(player.playerRoot).toHaveScreenshot('captions-enabled.png');
  });
});

// --- Mobile viewport snapshot (375×667) ---

test.describe('Visual — Mobile Layout', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  let player: PlayerPage;

  test.beforeEach(async ({ page }) => {
    player = new PlayerPage(page);
    await page.goto('/pages/html-video-mp4.html');
    await player.waitForMediaReady();
  });

  test('mobile layout', async ({ page }) => {
    await player.showControls();
    await page.waitForTimeout(300);

    await expect(player.playerRoot).toHaveScreenshot('mobile-default.png');
  });
});
