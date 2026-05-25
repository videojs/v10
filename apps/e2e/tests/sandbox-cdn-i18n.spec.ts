import { expect, test } from '@playwright/test';
import { PlayerPage } from '../page-objects/player';

const SANDBOX_BASE = process.env.SANDBOX_URL ?? 'http://localhost:5299';

test.describe('Sandbox CDN i18n', () => {
  test('direct CDN page shows Spanish play label and tooltip', async ({ page }) => {
    await page.goto(
      `${SANDBOX_BASE}/cdn/?preset=video&locale=es&styling=css&skin=default&source=hls-1&autoplay=0&muted=0&loop=0&preload=metadata`
    );
    const player = new PlayerPage(page);
    await player.waitForMediaReady();
    await expect(player.playButton).toHaveAttribute('aria-label', 'Reproducir', { timeout: 15_000 });

    const tooltip = page.locator('#play-tooltip');
    await player.playButton.hover();
    await tooltip.evaluate((el) => el.setAttribute('open', ''));
    await expect(tooltip).toHaveText('Reproducir', { timeout: 15_000 });
  });

  test('shell iframe shows Spanish play label and tooltip', async ({ page }) => {
    await page.goto(
      `${SANDBOX_BASE}/?platform=cdn&preset=video&locale=es&styling=css&skin=default&source=hls-1&autoplay=0&muted=0&loop=0&preload=metadata`
    );
    const frame = page.frameLocator('iframe[title="player demo"]');
    await frame.locator('video').waitFor({ state: 'attached', timeout: 15_000 });
    const playButton = frame.locator('media-play-button').first();
    await expect(playButton).toHaveAttribute('aria-label', 'Reproducir', {
      timeout: 15_000,
    });

    const tooltip = frame.locator('#play-tooltip');
    await playButton.hover();
    await tooltip.evaluate((el) => el.setAttribute('open', ''));
    await expect(tooltip).toHaveText('Reproducir', { timeout: 15_000 });
  });
});
