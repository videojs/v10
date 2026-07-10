import { expect, type Frame, type Page, test } from '@playwright/test';
import { SELECTORS } from '../fixtures/selectors';

const SANDBOX_BASE = process.env.SANDBOX_URL ?? 'http://localhost:5299';

const QUERY = 'locale=es&styling=css&skin=default&source=hls-1&autoplay=0&muted=0&loop=0&preload=metadata';

test.use({ trace: 'off' });

async function expectSpanishPlayLabel(scope: Page | Frame): Promise<void> {
  const playButton = scope.locator(SELECTORS.playButton).first();
  await expect(playButton).toHaveAttribute('aria-label', 'Reproducir', { timeout: 15_000 });
}

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

test.describe('Sandbox HTML i18n', () => {
  test('direct HTML page shows Spanish play label', async ({ page }) => {
    await page.goto(`${SANDBOX_BASE}/html-video/?${QUERY}`, { waitUntil: 'domcontentloaded' });
    await expectSpanishPlayLabel(page);
  });

  test('shell iframe shows Spanish play label', async ({ page }) => {
    await page.goto(`${SANDBOX_BASE}/?platform=html&preset=video&${QUERY}`, {
      waitUntil: 'domcontentloaded',
    });
    const frame = await getPreviewFrame(page, '/html-video/');
    await expectSpanishPlayLabel(frame);
  });
});

test.describe('Sandbox React i18n', () => {
  test('direct React page shows Spanish play label', async ({ page }) => {
    await page.goto(`${SANDBOX_BASE}/react-video/?${QUERY}`, { waitUntil: 'domcontentloaded' });
    await expectSpanishPlayLabel(page);
  });

  test('shell iframe shows Spanish play label', async ({ page }) => {
    await page.goto(`${SANDBOX_BASE}/?platform=react&preset=video&${QUERY}`, {
      waitUntil: 'domcontentloaded',
    });
    const frame = await getPreviewFrame(page, '/react-video/');
    await expectSpanishPlayLabel(frame);
  });
});
