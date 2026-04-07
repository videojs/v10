import { expect, test } from '@playwright/test';
import { STORYBOARD_PAGES } from '../fixtures/media';
import { PlayerPage } from '../page-objects/player';

for (const { name, path } of STORYBOARD_PAGES) {
  test.describe(`Storyboard — ${name}`, () => {
    let player: PlayerPage;

    test.beforeEach(async ({ page }) => {
      player = new PlayerPage(page);
      await page.goto(path);
      await player.waitForMediaReady();
    });

    test('thumbnail renders on time slider hover', async ({ page }) => {
      await player.hoverTimeSlider(50);

      const thumbnail = player.thumbnail;

      // Thumbnail should be attached and not in error/hidden state
      await expect(thumbnail).toBeAttached({ timeout: 10_000 });
      await expect(thumbnail).not.toHaveAttribute('data-error', { timeout: 10_000 });
      await expect(thumbnail).not.toHaveAttribute('data-hidden');

      // Verify the thumbnail has non-zero dimensions (image actually loaded)
      const box = await thumbnail.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.width).toBeGreaterThan(0);
      expect(box!.height).toBeGreaterThan(0);
    });
  });
}
