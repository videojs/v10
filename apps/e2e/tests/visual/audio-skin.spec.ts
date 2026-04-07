import { expect, test } from '@playwright/test';
import { PlayerPage } from '../../page-objects/player';

/**
 * Visual snapshot tests for the audio skin.
 *
 * Same non-fragile strategy as video skin snapshots:
 * component-level crops, masked dynamic content, generous thresholds.
 */

const VISUAL_PAGES = [
  { name: 'HTML', path: '/html-audio-mp4.html' },
  { name: 'React', path: '/react-audio-mp4.html' },
];

for (const { name, path } of VISUAL_PAGES) {
  test.describe(`Visual — Audio Skin (${name})`, () => {
    let player: PlayerPage;

    test.beforeEach(async ({ page }) => {
      player = new PlayerPage(page);
      await page.goto(path);
      await player.waitForMediaReady();
    });

    test('default paused state', async ({ page }) => {
      await page.waitForTimeout(300);

      await expect(player.playerRoot).toHaveScreenshot(`audio-${name.toLowerCase()}-paused.png`, {
        mask: [player.currentTime],
      });
    });

    test('muted state', async ({ page }) => {
      await player.muteButton.click();
      await page.waitForTimeout(300);

      await expect(player.playerRoot).toHaveScreenshot(`audio-${name.toLowerCase()}-muted.png`, {
        mask: [player.currentTime],
      });
    });
  });
}
