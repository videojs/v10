import { expect, test } from '@playwright/test';
import { PlayerPage } from '../page-objects/player';

test.describe('CDN i18n', () => {
  let player: PlayerPage;

  test.beforeEach(async ({ page }) => {
    player = new PlayerPage(page);
    await page.goto('/pages/cdn-i18n-es.html');
    await player.waitForMediaReady();
  });

  test('locale module shares the CDN registry with the player bundle', async ({ page }) => {
    await expect.poll(() => page.evaluate(() => window.__cdnI18nEsPlay)).toBe('Reproducir');
  });

  test('play button uses the registered Spanish label', async () => {
    await expect(player.playButton).toHaveAttribute('aria-label', 'Reproducir');
  });
});
