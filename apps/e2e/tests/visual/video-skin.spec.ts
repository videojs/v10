import { expect, test } from '@playwright/test';
import { PlayerPage } from '../../page-objects/player';

/**
 * Visual snapshot tests for the video skin.
 *
 * Non-fragile strategy:
 * - Screenshot the visible skin container (not the wrapper or full page)
 * - Mask dynamic elements (current time, buffering indicator)
 * - Disable animations globally
 * - Use generous pixel thresholds (configured in playwright.config.ts)
 * - Pause and seek to deterministic positions before capture
 */

const VISUAL_PAGES = [
  { name: 'HTML', path: '/html-video-mp4.html' },
  { name: 'React', path: '/react-video-mp4.html' },
];

for (const { name, path } of VISUAL_PAGES) {
  test.describe(`Visual — Video Skin (${name})`, () => {
    let player: PlayerPage;

    test.beforeEach(async ({ page }) => {
      player = new PlayerPage(page);
      await page.goto(path);
      await player.waitForMediaReady();
    });

    test('paused with poster', async ({ page }) => {
      await player.showControls();
      await page.waitForTimeout(300);

      await expect(player.playerRoot).toHaveScreenshot(`video-${name.toLowerCase()}-paused-poster.png`, {
        mask: [player.bufferingIndicator, player.currentTime, player.duration],
      });
    });

    test('paused at 25%', async ({ page }) => {
      await player.seekTo(25);
      await player.showControls();
      await page.waitForTimeout(300);

      await expect(player.playerRoot).toHaveScreenshot(`video-${name.toLowerCase()}-paused-25pct.png`, {
        mask: [player.currentTime, player.bufferingIndicator, player.duration],
      });
    });

    test('muted state', async ({ page }) => {
      await player.muteButton.click();
      await player.showControls();
      await page.waitForTimeout(300);

      await expect(player.playerRoot).toHaveScreenshot(`video-${name.toLowerCase()}-muted.png`, {
        mask: [player.currentTime, player.bufferingIndicator, player.duration],
      });
    });
  });
}
