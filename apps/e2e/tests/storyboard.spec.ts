import { expect, test } from '@playwright/test';
import { STORYBOARD_PAGES } from '../fixtures/media';
import { PlayerPage } from '../page-objects/player';

for (const { name, path, media } of STORYBOARD_PAGES) {
  test.describe(`Storyboard — ${name}`, () => {
    let player: PlayerPage;

    test.beforeEach(async ({ page, browserName }) => {
      test.skip(browserName === 'webkit' && media === 'hls', 'WebKit native HLS is unreliable in headless mode');

      player = new PlayerPage(page);
      await page.goto(path);
      await player.waitForMediaReady();
    });

    test('thumbnail appears on time slider hover', async ({ page }) => {
      // Hover over the middle of the time slider
      await player.hoverTimeSlider(50);

      // The thumbnail element should exist and eventually not be hidden
      const thumbnail = player.thumbnail;
      await expect(thumbnail).toBeAttached({ timeout: 10_000 });

      // Wait for thumbnail to load (not in loading or error state)
      await expect(thumbnail).not.toHaveAttribute('data-error', { timeout: 10_000 });
    });

    test('thumbnail changes position when hovering different points', async ({ page }) => {
      // Hover at 25%
      await player.hoverTimeSlider(25);
      await player.page.waitForTimeout(500);

      const thumbnail = player.thumbnail;
      await expect(thumbnail).toBeAttached({ timeout: 10_000 });

      // Hover at 75% — thumbnail should still be present
      await player.hoverTimeSlider(75);
      await player.page.waitForTimeout(500);

      await expect(thumbnail).toBeAttached();
    });
  });
}
