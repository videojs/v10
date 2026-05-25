import { expect, type FrameLocator, type Page, test } from '@playwright/test';
import { PlayerPage } from '../page-objects/player';

const SANDBOX_BASE = process.env.SANDBOX_URL ?? 'http://localhost:5299';

const QUERY = 'locale=es&styling=css&skin=default&source=hls-1&autoplay=0&muted=0&loop=0&preload=metadata';

async function expectSpanishPlayLabelAndTooltip(scope: Page | FrameLocator): Promise<void> {
  const playButton = scope.locator('media-play-button').first();
  await expect(playButton).toHaveAttribute('aria-label', 'Reproducir', { timeout: 15_000 });

  const tooltip = scope.locator('#play-tooltip');
  await playButton.hover();
  await tooltip.evaluate((el) => el.setAttribute('open', ''));
  await expect(tooltip).toHaveText('Reproducir', { timeout: 15_000 });
}

test.describe('Sandbox HTML i18n', () => {
  test('direct HTML page shows Spanish play label and tooltip', async ({ page }) => {
    await page.goto(`${SANDBOX_BASE}/html-video/?${QUERY}`);
    const player = new PlayerPage(page);
    await player.waitForMediaReady();
    await expectSpanishPlayLabelAndTooltip(page);
  });

  test('shell iframe shows Spanish play label and tooltip', async ({ page }) => {
    await page.goto(`${SANDBOX_BASE}/?platform=html&preset=video&${QUERY}`);
    const frame = page.frameLocator('iframe[title="player demo"]');
    await frame.locator('video').waitFor({ state: 'attached', timeout: 15_000 });
    await expectSpanishPlayLabelAndTooltip(frame);
  });
});

test.describe('Sandbox React i18n', () => {
  test('direct React page shows Spanish play label and tooltip', async ({ page }) => {
    await page.goto(`${SANDBOX_BASE}/react-video/?${QUERY}`);
    const player = new PlayerPage(page);
    await player.waitForMediaReady();
    await expectSpanishPlayLabelAndTooltip(page);
  });

  test('shell iframe shows Spanish play label and tooltip', async ({ page }) => {
    await page.goto(`${SANDBOX_BASE}/?platform=react&preset=video&${QUERY}`);
    const frame = page.frameLocator('iframe[title="player demo"]');
    await frame.locator('video').waitFor({ state: 'attached', timeout: 15_000 });
    await expectSpanishPlayLabelAndTooltip(frame);
  });
});
