import { expect, type Frame, type Page, test } from '@playwright/test';
import { SELECTORS } from '../fixtures/selectors';
import { PlayerPage } from '../page-objects/player';

const SANDBOX_BASE = process.env.SANDBOX_URL ?? 'http://localhost:5299';

test.use({ trace: 'off' });

async function getPreviewFrame(page: Page, path: string): Promise<Frame> {
  await expect(page.locator('iframe[title="player demo"]')).toHaveAttribute('src', new RegExp(`^${path}`));
  await expect
    .poll(() =>
      page
        .frames()
        .find((frame) => frame.url().includes(path))
        ?.url()
    )
    .toContain(path);

  const frame = page.frames().find((frame) => frame.url().includes(path));
  if (!frame) throw new Error(`Preview frame not found: ${path}`);

  return frame;
}

test.describe('Sandbox CDN i18n', () => {
  test('direct CDN page shows Spanish play label', async ({ page }) => {
    await page.goto(
      `${SANDBOX_BASE}/cdn/?preset=video&locale=es&styling=css&skin=default&source=hls-1&autoplay=0&muted=0&loop=0&preload=metadata`,
      { waitUntil: 'domcontentloaded' }
    );
    const player = new PlayerPage(page);
    await expect(player.playButton).toHaveAttribute('aria-label', 'Reproducir', { timeout: 15_000 });
  });

  test('shell iframe shows Spanish play label', async ({ page }) => {
    await page.goto(
      `${SANDBOX_BASE}/?platform=cdn&preset=video&locale=es&styling=css&skin=default&source=hls-1&autoplay=0&muted=0&loop=0&preload=metadata`,
      { waitUntil: 'domcontentloaded' }
    );
    const frame = await getPreviewFrame(page, '/cdn/');
    const playButton = frame.locator(SELECTORS.playButton).first();
    await expect(playButton).toHaveAttribute('aria-label', 'Reproducir', {
      timeout: 15_000,
    });
  });
});
