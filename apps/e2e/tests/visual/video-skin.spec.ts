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
  { name: 'HTML', path: '/html-video-mp4.html' },
  { name: 'React', path: '/react-video-mp4.html' },
  { name: 'Ejected-HTML', path: '/ejected-html-video-mp4.html' },
  { name: 'Ejected-React', path: '/ejected-react-video-mp4.html' },
  { name: 'CDN', path: '/cdn-video-mp4.html' },
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
